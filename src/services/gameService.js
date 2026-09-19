import { supabase } from './supabaseClient.js'
import { networkService } from './networkService.js'
import { sanitizePlayerNames, sanitizeText, sanitizeRoomCode } from '../utils/securityUtils.js'
import { auditService } from './auditService.js'

const LOCAL_SESSIONS_KEY = 'gns_local_sessions'

function getLocalSessions() {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_SESSIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveLocalSession(session) {
  if (typeof localStorage === 'undefined' || !session?.id) return
  try {
    const sessions = getLocalSessions()
    const idx = sessions.findIndex(s => s.id === session.id)
    if (idx >= 0) {
      sessions[idx] = { ...sessions[idx], ...session }
    } else {
      sessions.unshift(session)
    }
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions.slice(0, 30)))
  } catch (err) {
    console.warn('saveLocalSession error:', err)
  }
}

function deleteLocalSession(sessionId) {
  if (typeof localStorage === 'undefined' || !sessionId) return
  try {
    const sessions = getLocalSessions().filter(s => s.id !== sessionId)
    localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions))
  } catch (err) {
    console.warn('deleteLocalSession error:', err)
  }
}

function generateRoomCode(gameType = 'TRUF') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  const prefix = gameType.substring(0, 3).toUpperCase()
  return `${prefix}-${code}`
}

function normalizeRoomCode(input) {
  if (!input) return ''
  let cleaned = sanitizeRoomCode(input)
  if (/^[A-Z]{3}[A-Z0-9]{4}$/.test(cleaned)) {
    cleaned = `${cleaned.substring(0, 3)}-${cleaned.substring(3)}`
  }
  return cleaned
}

export const gameService = {
  // Export local storage helpers
  getLocalSessions,
  saveLocalSession,
  deleteLocalSession,

  // 1. Create a Game Session (Cloud First or Local Offline)
  async createSession({ userId, creatorClientId, gameType = 'truf', playerNames, firstDealer = 0, settings, title, isOfflineLocal = false }) {
    const roomCode = generateRoomCode(gameType)
    const isRealUser = userId && userId !== 'guest-user'
    const hostClientId = creatorClientId || (isRealUser ? userId : 'host')
    const safePlayerNames = sanitizePlayerNames(playerNames)
    const safeTitle = sanitizeText(title || `${gameType.toUpperCase()} Match - ${new Date().toLocaleDateString()}`)

    const initialUserIds = Array(safePlayerNames.length).fill(null)
    if (initialUserIds.length > 0) {
      initialUserIds[0] = hostClientId
    }

    const resolvedFirstDealer = firstDealer ?? settings?.first_dealer ?? settings?.firstDealer ?? 0

    const dbPayload = {
      user_id: isRealUser ? userId : null,
      game_type: gameType,
      room_code: roomCode,
      title: safeTitle,
      player_names: safePlayerNames,
      player_user_ids: initialUserIds,
      settings: {
        ...settings,
        first_dealer: resolvedFirstDealer,
        firstDealer: resolvedFirstDealer,
        isOfflineLocal: Boolean(isOfflineLocal)
      },
      is_completed: false,
      created_at: new Date().toISOString()
    }

    // Supply legacy player columns for maximum backward-compatibility with older DB instances
    if (safePlayerNames && safePlayerNames.length >= 4) {
      dbPayload.player1_name = safePlayerNames[0] || 'Pemain 1'
      dbPayload.player2_name = safePlayerNames[1] || 'Pemain 2'
      dbPayload.player3_name = safePlayerNames[2] || 'Pemain 3'
      dbPayload.player4_name = safePlayerNames[3] || 'Pemain 4'
    }

    auditService.logEvent({
      action: 'room.create',
      category: 'game',
      targetId: roomCode,
      details: { gameType, roomCode, title: safeTitle, players: safePlayerNames, isOfflineLocal }
    })

    // If explicit offline local mode or offline, save immediately to local storage
    if (isOfflineLocal || !networkService.isOnline()) {
      const localId = `local-session-${Date.now()}`
      const localSession = {
        ...dbPayload,
        id: localId,
        first_dealer: resolvedFirstDealer,
        game_rounds: [],
        rounds: []
      }
      saveLocalSession(localSession)
      console.log('📱 Session created locally in LocalStorage:', localId)
      return localSession
    }

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .insert([dbPayload])
        .select()
        .single()

      if (!error && data) {
        console.log('✅ Session created successfully in Supabase Cloud:', data.id, data.room_code)
        const result = {
          ...data,
          first_dealer: resolvedFirstDealer,
          settings: {
            ...data.settings,
            first_dealer: resolvedFirstDealer,
            firstDealer: resolvedFirstDealer
          },
          game_rounds: []
        }
        saveLocalSession(result)
        return result
      }

      if (error) {
        console.error('❌ Supabase session insert failed:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })

        // Fallback retry with user_id = null if guest or user profile wasn't ready
        if (dbPayload.user_id) {
          const { data: retryData, error: retryError } = await supabase
            .from('game_sessions')
            .insert([{ ...dbPayload, user_id: null }])
            .select()
            .single()

          if (!retryError && retryData) {
            console.log('✅ Session created with user_id=null fallback:', retryData.id)
            const result = {
              ...retryData,
              first_dealer: resolvedFirstDealer,
              settings: {
                ...retryData.settings,
                first_dealer: resolvedFirstDealer,
                firstDealer: resolvedFirstDealer
              },
              game_rounds: []
            }
            saveLocalSession(result)
            return result
          }
        }
      }
    } catch (err) {
      console.error('❌ Cloud session save exception:', err)
    }

    // Local fallback if temporary network error occurs during match setup
    const tempId = `local-session-${Date.now()}`
    const localFallback = {
      ...dbPayload,
      id: tempId,
      first_dealer: resolvedFirstDealer,
      game_rounds: [],
      rounds: [],
      scores: {}
    }
    saveLocalSession(localFallback)
    return localFallback
  },

  // 2. Fetch User Match Diary (Hosted + Participated + Local Guest)
  async getUserSessions(userId, isPro = false) {
    const isGuest = !userId || userId === 'guest-user' || (typeof userId === 'string' && userId.startsWith('guest'))

    if (isGuest) {
      return getLocalSessions()
    }

    try {
      let query = supabase
        .from('game_sessions')
        .select(`
          *,
          game_rounds (
            id,
            round_number,
            round_data,
            player_scores (
              player_index,
              stats,
              score_change,
              score_cumulative
            )
          )
        `)
        .or(`user_id.eq.${userId},player_user_ids.cs.["${userId}"]`)
        .order('created_at', { ascending: false })

      // Free tier saves up to 15 recent sessions; Pro/Venue has unlimited lifetime history
      if (!isPro) {
        query = query.limit(15)
      }

      const { data, error } = await query
      if (error) throw error

      const cloudSessions = (data || []).map(s => ({
        ...s,
        player_names: (Array.isArray(s.player_names) && s.player_names.length > 0)
          ? s.player_names
          : [s.player1_name, s.player2_name, s.player3_name, s.player4_name].filter(Boolean),
        first_dealer: s.first_dealer ?? s.settings?.first_dealer ?? s.settings?.firstDealer ?? 0
      }))

      // Merge local uncompleted sessions
      const local = getLocalSessions()
      const merged = [...cloudSessions]
      local.forEach(ls => {
        if (!merged.some(cs => cs.id === ls.id)) {
          merged.push(ls)
        }
      })
      return merged
    } catch (err) {
      console.warn('Error loading cloud sessions, falling back to local storage', err)
      return getLocalSessions()
    }
  },

  // 3. Fetch Single Session by ID or Room Code
  async getSession(sessionId, roomCode) {
    if (!sessionId && !roomCode) return null

    // Check local storage first for local/guest sessions
    if (sessionId && (sessionId.startsWith('guest-') || sessionId.startsWith('temp-') || sessionId.startsWith('local-'))) {
      const local = getLocalSessions().find(s => s.id === sessionId)
      if (local) return local
    }

    try {
      // 1. Fetch Session Header first (case-insensitive & robust)
      let sessionQuery = supabase.from('game_sessions').select('*')

      if (sessionId) {
        sessionQuery = sessionQuery.eq('id', sessionId)
      } else if (roomCode) {
        const code = normalizeRoomCode(roomCode)
        sessionQuery = sessionQuery.ilike('room_code', code)
      }

      let { data: session, error: sessionErr } = await sessionQuery.maybeSingle()

      // Fallback suffix search if user only typed 4 chars (e.g. "6WTN")
      if (!session && roomCode && !roomCode.includes('-')) {
        const cleanSuffix = normalizeRoomCode(roomCode)
        const { data: suffixMatch } = await supabase
          .from('game_sessions')
          .select('*')
          .ilike('room_code', `%${cleanSuffix}`)
          .maybeSingle()
        if (suffixMatch) {
          session = suffixMatch
        }
      }

      if (!session) {
        const localMatch = getLocalSessions().find(s =>
          (sessionId && s.id === sessionId) ||
          (roomCode && (s.room_code === roomCode || s.room_code?.endsWith(roomCode)))
        )
        return localMatch || null
      }

      // Ensure player_names is valid array (handling legacy columns if any)
      if (!Array.isArray(session.player_names) || session.player_names.length === 0) {
        session.player_names = [
          session.player1_name,
          session.player2_name,
          session.player3_name,
          session.player4_name
        ].filter(Boolean)
        if (session.player_names.length === 0) {
          session.player_names = ['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4']
        }
      }

      // 2. Fetch Associated Game Rounds & Player Scores safely
      try {
        const { data: rawRounds, error: roundsErr } = await supabase
          .from('game_rounds')
          .select('*')
          .eq('session_id', session.id)
          .order('round_number', { ascending: true })

        if (!roundsErr && rawRounds && rawRounds.length > 0) {
          const roundIds = rawRounds.map(r => r.id)
          const { data: rawScores } = await supabase
            .from('player_scores')
            .select('*')
            .in('round_id', roundIds)
            .order('player_index', { ascending: true })

          session.game_rounds = rawRounds.map(r => ({
            ...r,
            round_data: {
              dealerIndex: r.round_data?.dealerIndex ?? r.dealer_index ?? 0,
              trufSuit: r.round_data?.trufSuit ?? r.round_data?.truf_suit ?? r.truf_suit_index ?? 0,
              forcedPlayMode: r.round_data?.forcedPlayMode ?? r.play_mode ?? null
            },
            player_scores: (rawScores || []).filter(s => s.round_id === r.id).map(s => ({
              ...s,
              stats: s.stats || { bid: s.bid, won: s.won }
            }))
          }))
        } else {
          session.game_rounds = []
        }
      } catch (rErr) {
        console.warn('Could not fetch nested rounds, default to empty:', rErr)
        session.game_rounds = []
      }

      saveLocalSession(session)
      console.log('✅ Session loaded successfully:', session.room_code || session.id)
      return session
    } catch (err) {
      console.error('❌ Exception in getSession:', err)
      const localMatch = getLocalSessions().find(s =>
        (sessionId && s.id === sessionId) ||
        (roomCode && (s.room_code === roomCode || s.room_code?.endsWith(roomCode)))
      )
      return localMatch || null
    }
  },

  // 4a. Helper to Save Round directly to Supabase Cloud
  async _saveRoundToCloud({ sessionId, roundNumber, roundData, playerScores }) {
    // 1. Insert game round (supports both new JSONB round_data and legacy columns)
    const roundPayload = {
      session_id: sessionId,
      round_number: roundNumber,
      round_data: roundData || {},
      dealer_index: roundData?.dealerIndex ?? 0,
      truf_suit_index: roundData?.trufSuit ?? roundData?.truf_suit ?? 0,
      play_mode: roundData?.forcedPlayMode ?? null
    }

    let { data: round, error: roundError } = await supabase
      .from('game_rounds')
      .insert([roundPayload])
      .select()
      .single()

    // Fallback: If round_data column missing in DB, retry with legacy columns only
    if (roundError) {
      console.warn('Primary game_rounds insert error, trying legacy schema:', roundError.message)
      const legacyRoundPayload = {
        session_id: sessionId,
        round_number: roundNumber,
        dealer_index: roundData?.dealerIndex ?? 0,
        truf_suit_index: roundData?.trufSuit ?? roundData?.truf_suit ?? 0,
        play_mode: roundData?.forcedPlayMode ?? null
      }
      const { data: retryRound, error: retryRoundError } = await supabase
        .from('game_rounds')
        .insert([legacyRoundPayload])
        .select()
        .single()

      if (!retryRoundError && retryRound) {
        round = retryRound
        roundError = null
      } else {
        console.error('❌ Supabase game_rounds insert failed:', retryRoundError || roundError)
        throw retryRoundError || roundError
      }
    }

    // 2. Insert player scores (supports both new stats JSONB and legacy bid/won)
    const scoreRecords = playerScores.map((ps, idx) => ({
      round_id: round.id,
      player_index: idx,
      bid: ps.stats?.bid ?? (ps.bid ?? 0),
      won: ps.stats?.won ?? (ps.won ?? 0),
      stats: ps.stats || {},
      score_change: ps.score_change,
      score_cumulative: ps.score_cumulative
    }))

    let { error: scoresError } = await supabase
      .from('player_scores')
      .insert(scoreRecords)

    // Fallback: If stats column missing in DB, retry with legacy columns only
    if (scoresError) {
      console.warn('Primary player_scores insert error, trying legacy schema:', scoresError.message)
      const legacyScoreRecords = playerScores.map((ps, idx) => ({
        round_id: round.id,
        player_index: idx,
        bid: ps.stats?.bid ?? (ps.bid ?? 0),
        won: ps.stats?.won ?? (ps.won ?? 0),
        score_change: ps.score_change,
        score_cumulative: ps.score_cumulative
      }))
      const { error: retryScoresError } = await supabase
        .from('player_scores')
        .insert(legacyScoreRecords)

      if (!retryScoresError) {
        scoresError = null
      } else {
        console.error('❌ Supabase player_scores insert failed:', retryScoresError)
        throw retryScoresError
      }
    }

    console.log('✅ Round & scores saved successfully to Supabase Cloud:', round.id, 'Round:', roundNumber)
    return { ...round, player_scores: scoreRecords }
  },

  // 4b. Save a Game Round (Cloud First with Local Persistence and Late Sync)
  async saveRound({ sessionId, roundNumber, roundData, playerScores }) {
    if (!sessionId) return null

    const roundId = `round-${Date.now()}-${roundNumber}`
    const localRound = {
      id: roundId,
      session_id: sessionId,
      round_number: roundNumber,
      round_data: roundData,
      created_at: new Date().toISOString(),
      player_scores: playerScores.map((ps, idx) => ({
        id: `ps-${roundId}-${idx}`,
        player_index: idx,
        stats: ps.stats || {},
        bid: ps.stats?.bid ?? (ps.bid ?? 0),
        won: ps.stats?.won ?? (ps.won ?? 0),
        score_change: ps.score_change,
        score_cumulative: ps.score_cumulative
      }))
    }

    // Always update local storage immediately for 100% loss prevention
    const sessions = getLocalSessions()
    const targetSession = sessions.find(s => s.id === sessionId)
    if (targetSession) {
      const existingRounds = targetSession.game_rounds || targetSession.rounds || []
      const roundIdx = existingRounds.findIndex(r => r.round_number === roundNumber)
      if (roundIdx >= 0) {
        existingRounds[roundIdx] = localRound
      } else {
        existingRounds.push(localRound)
      }
      targetSession.game_rounds = existingRounds
      targetSession.rounds = existingRounds
      saveLocalSession(targetSession)
    }

    // Check if session is offline local or temporary local
    if (sessionId.startsWith('local-') || sessionId.startsWith('guest-') || targetSession?.settings?.isOfflineLocal) {
      return localRound
    }

    // If offline, enqueue for late sync
    if (!networkService.isOnline()) {
      console.warn('⚠️ Offline: Enqueuing round to late sync queue for session', sessionId)
      networkService.enqueue({
        type: 'SAVE_ROUND',
        sessionId,
        payload: { sessionId, roundNumber, roundData, playerScores }
      })
      return { ...localRound, is_pending_sync: true }
    }

    try {
      const cloudRound = await this._saveRoundToCloud({ sessionId, roundNumber, roundData, playerScores })
      if (targetSession) {
        targetSession.game_rounds = (targetSession.game_rounds || []).map(r => r.round_number === roundNumber ? cloudRound : r)
        saveLocalSession(targetSession)
      }
      return cloudRound
    } catch (err) {
      console.warn('⚠️ Cloud saveRound error, enqueuing for late sync:', err)
      networkService.enqueue({
        type: 'SAVE_ROUND',
        sessionId,
        payload: { sessionId, roundNumber, roundData, playerScores }
      })
      return { ...localRound, is_pending_sync: true }
    }
  },

  // 4c. Flush Late Sync Queue when connection returns
  async flushPendingRounds(sessionId) {
    if (!networkService.isOnline()) return { synced: 0 }
    const queue = sessionId ? networkService.getPendingForSession(sessionId) : networkService.getQueue()
    if (!queue || queue.length === 0) return { synced: 0 }

    let syncedCount = 0
    console.log(`🚀 [gameService] Flushing ${queue.length} pending items to Supabase...`)

    for (const item of queue) {
      if (item.type === 'SAVE_ROUND') {
        try {
          const savedRound = await this._saveRoundToCloud(item.payload)
          networkService.dequeue(item.id)
          syncedCount++
          if (sessionId && this.broadcastRound) {
            this.broadcastRound(sessionId, savedRound)
          }
        } catch (err) {
          console.error('[gameService] Error flushing round from queue:', item.id, err)
          break // Keep chronological order
        }
      }
    }

    console.log(`✅ [gameService] Late sync completed: ${syncedCount} items uploaded.`)
    return { synced: syncedCount }
  },

  // 5. Undo / Delete Round
  async deleteRound(roundId, sessionId) {
    if (sessionId) {
      const sessions = getLocalSessions()
      const target = sessions.find(s => s.id === sessionId)
      if (target) {
        target.game_rounds = (target.game_rounds || target.rounds || []).filter(r => r.id !== roundId)
        target.rounds = target.game_rounds
        saveLocalSession(target)
      }
    }

    if (!roundId || String(roundId).startsWith('round-') || String(roundId).startsWith('local-')) return true

    try {
      const { error } = await supabase
        .from('game_rounds')
        .delete()
        .eq('id', roundId)

      if (error) console.warn('Supabase deleteRound note:', error.message)
    } catch (err) {
      console.warn('deleteRound cloud sync exception:', err)
    }
    return true
  },

  // 6. Complete Session
  async completeSession(sessionId) {
    if (!sessionId) return true

    const sessions = getLocalSessions()
    const target = sessions.find(s => s.id === sessionId)
    if (target) {
      target.is_completed = true
      target.updated_at = new Date().toISOString()
      saveLocalSession(target)
    }

    if (String(sessionId).startsWith('local-') || String(sessionId).startsWith('guest-')) return true

    try {
      const { error } = await supabase
        .from('game_sessions')
        .update({ is_completed: true, updated_at: new Date().toISOString() })
        .eq('id', sessionId)

      if (error) console.warn('Supabase completeSession note:', error.message)
    } catch (err) {
      console.warn('completeSession cloud sync exception:', err)
    }
    return true
  },

  // 7. Delete Session
  async deleteSession(sessionId) {
    if (!sessionId) return true

    deleteLocalSession(sessionId)

    if (String(sessionId).startsWith('local-') || String(sessionId).startsWith('guest-')) return true

    try {
      const { error } = await supabase
        .from('game_sessions')
        .delete()
        .eq('id', sessionId)

      if (error) {
        console.warn('Cloud delete session warning:', error)
      }
    } catch (err) {
      console.warn('deleteSession cloud sync exception:', err)
    }
    return true
  },

  // 7. Claim Seat (Guest or Logged-In User)
  async claimSeat(sessionId, playerIndex, clientId, playerName) {
    if (!sessionId || playerIndex === undefined || playerIndex === null) return false

    // 1. Update local storage session if exists
    try {
      const localSessions = getLocalSessions()
      const local = localSessions.find(s => s.id === sessionId)
      if (local) {
        const userIds = [...(local.player_user_ids || Array(local.player_names?.length || 4).fill(null))]
        userIds[playerIndex] = clientId
        local.player_user_ids = userIds
        saveLocalSession(local)
      }
    } catch {}

    const payload = {
      sessionId,
      playerIndex,
      clientId,
      playerName: playerName || `Pemain ${playerIndex + 1}`
    }

    // 2. Broadcast immediately over active or new Realtime channel
    this._broadcastSeatClaimOverChannel(sessionId, payload)

    // 3. Handle Supabase Cloud session update
    try {
      const { data: session, error: fetchErr } = await supabase
        .from('game_sessions')
        .select('player_user_ids, player_names')
        .eq('id', sessionId)
        .single()

      if (session && !fetchErr) {
        const userIds = [...(session.player_user_ids || Array(session.player_names?.length || 4).fill(null))]
        userIds[playerIndex] = clientId
        const { error } = await supabase
          .from('game_sessions')
          .update({ player_user_ids: userIds })
          .eq('id', sessionId)

        if (error) {
          console.warn('Supabase claimSeat cloud update warning:', error.message)
        }
        return userIds
      }
    } catch (err) {
      console.warn('claimSeat exception:', err)
    }
    return true
  },

  // Helper to reliably broadcast seat claim / release across WebSocket
  _broadcastSeatClaimOverChannel(sessionId, payload) {
    if (!sessionId) return
    try {
      if (!this._roomChannels) this._roomChannels = new Map()
      const room = this._roomChannels.get(sessionId)

      // 1. Immediately invoke local in-memory listeners
      if (room?.listeners) {
        for (const h of room.listeners) {
          try { if (h.onSeatClaim) h.onSeatClaim(payload) } catch (err) {}
        }
      }

      // 2. Broadcast to peers over WebSocket
      if (room && room.channel) {
        this.broadcastSeatClaim(room.channel, payload)
      } else {
        const topic = `live-room:${sessionId}`
        const ch = supabase.channel(topic, {
          config: { broadcast: { ack: false, self: true } }
        })
        ch.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.broadcastSeatClaim(ch, payload)
          }
        })
      }
    } catch (e) {
      console.warn('_broadcastSeatClaimOverChannel error:', e)
    }
  },

  // 7b. Authoritative Update of Player User IDs (Used by Host to persist table seats to Supabase)
  async updateSessionPlayerUserIds(sessionId, playerUserIds) {
    if (!sessionId || !Array.isArray(playerUserIds) || playerUserIds.length === 0) return false
    try {
      // Update local storage
      const localSessions = getLocalSessions()
      const local = localSessions.find(s => s.id === sessionId)
      if (local) {
        local.player_user_ids = playerUserIds
        saveLocalSession(local)
      }

      // Update Supabase Cloud
      const { error } = await supabase
        .from('game_sessions')
        .update({ player_user_ids: playerUserIds })
        .eq('id', sessionId)

      if (error) {
        console.warn('updateSessionPlayerUserIds error:', error.message)
        return false
      }
      return true
    } catch (e) {
      console.warn('updateSessionPlayerUserIds exception:', e)
      return false
    }
  },

  // 7d. Authoritative Update of Session Settings (Used for scorerIndex & match rules)
  async updateSessionSettings(sessionId, settings) {
    if (!sessionId || !settings) return false
    try {
      const localSessions = getLocalSessions()
      const local = localSessions.find(s => s.id === sessionId)
      if (local) {
        local.settings = { ...(local.settings || {}), ...settings }
        saveLocalSession(local)
      }

      const { error } = await supabase
        .from('game_sessions')
        .update({ settings })
        .eq('id', sessionId)

      if (error) {
        console.warn('updateSessionSettings error:', error.message)
        return false
      }
      return true
    } catch (e) {
      console.warn('updateSessionSettings exception:', e)
      return false
    }
  },

  // 7c. Release / Stand Up from Seat
  async releaseSeat(sessionId, playerIndex, clientId) {
    if (!sessionId || playerIndex === undefined || playerIndex === null) return false

    // 1. Update local storage
    try {
      const localSessions = getLocalSessions()
      const local = localSessions.find(s => s.id === sessionId)
      if (local && Array.isArray(local.player_user_ids)) {
        if (!clientId || local.player_user_ids[playerIndex] === clientId) {
          local.player_user_ids[playerIndex] = null
          saveLocalSession(local)
        }
      }
    } catch {}

    const payload = {
      sessionId,
      playerIndex,
      clientId: null,
      isRelease: true
    }

    // 2. Broadcast seat release over Realtime
    this._broadcastSeatClaimOverChannel(sessionId, payload)

    // 3. Update Supabase Cloud
    try {
      const { data: session, error: fetchErr } = await supabase
        .from('game_sessions')
        .select('player_user_ids')
        .eq('id', sessionId)
        .single()

      if (session && !fetchErr && Array.isArray(session.player_user_ids)) {
        const userIds = [...session.player_user_ids]
        if (!clientId || userIds[playerIndex] === clientId) {
          userIds[playerIndex] = null
          const { error } = await supabase
            .from('game_sessions')
            .update({ player_user_ids: userIds })
            .eq('id', sessionId)

          if (error) {
            console.warn('Supabase releaseSeat warning:', error.message)
          }
          return userIds
        }
      }
    } catch (err) {
      console.warn('releaseSeat exception:', err)
    }
    return true
  },

  // 8. Subscribe to Live Realtime Room Changes (Postgres Changes + Multi-Listener Broadcast Hub)
  subscribeToLiveRoom(sessionId, handlers = {}) {
    if (!sessionId || sessionId.startsWith('guest-session') || sessionId.startsWith('local-session')) return null

    try {
      if (!this._roomChannels) this._roomChannels = new Map()
      const topic = `live-room:${sessionId}`

      let room = this._roomChannels.get(sessionId)
      if (!room) {
        // Clean up any stale channels with this topic in Supabase client first
        if (typeof supabase.getChannels === 'function') {
          const existingChannels = supabase.getChannels() || []
          const match = existingChannels.find(ch => ch.topic === `realtime:${topic}` || ch.topic === topic)
          if (match) {
            try { supabase.removeChannel(match) } catch (e) {}
          }
        }

        const channel = supabase.channel(topic, {
          config: {
            broadcast: { ack: false, self: true }
          }
        })

        const listeners = new Set()
        room = {
          channel,
          refCount: 0,
          listeners,
          status: 'CONNECTING'
        }

        // Attach centralized multiplexed dispatchers
        channel.on('broadcast', { event: 'seat_claim' }, ({ payload }) => {
          for (const h of listeners) {
            try { if (h.onSeatClaim) h.onSeatClaim(payload) } catch (err) { console.warn('onSeatClaim dispatch error:', err) }
          }
        })

        channel.on('broadcast', { event: 'live_state' }, ({ payload }) => {
          for (const h of listeners) {
            try { if (h.onLiveState) h.onLiveState(payload) } catch (err) { console.warn('onLiveState dispatch error:', err) }
          }
        })

        channel.on('broadcast', { event: 'round_advance' }, ({ payload }) => {
          for (const h of listeners) {
            try { if (h.onRoundAdvance) h.onRoundAdvance(payload) } catch (err) { console.warn('onRoundAdvance dispatch error:', err) }
          }
        })

        channel.on('broadcast', { event: 'activity_log' }, ({ payload }) => {
          for (const h of listeners) {
            try { if (h.onActivityLog) h.onActivityLog(payload) } catch (err) { console.warn('onActivityLog dispatch error:', err) }
          }
        })

        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'game_rounds',
          filter: `session_id=eq.${sessionId}`
        }, (payload) => {
          for (const h of listeners) {
            try { if (h.onDbUpdate) h.onDbUpdate(payload) } catch (err) { console.warn('onDbUpdate dispatch error:', err) }
          }
        })

        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `id=eq.${sessionId}`
        }, (payload) => {
          for (const h of listeners) {
            try { if (h.onDbUpdate) h.onDbUpdate(payload) } catch (err) { console.warn('onDbUpdate dispatch error:', err) }
          }
        })

        channel.subscribe((status) => {
          room.status = status
          if (status === 'SUBSCRIBED') {
            console.log(`🔌 Connected to Realtime Live Room: ${sessionId}`)
          }
        })

        this._roomChannels.set(sessionId, room)
      }

      const handlerObj = typeof handlers === 'function' ? { onDbUpdate: handlers } : handlers
      room.listeners.add(handlerObj)
      room.refCount += 1

      return {
        channel: room.channel,
        sessionId,
        handlerObj
      }
    } catch (err) {
      console.warn('Realtime subscribe safe error catch:', err)
      return null
    }
  },

  // 9. Broadcast Live Input State to Tabletop Peers
  broadcastLiveState(channelOrToken, statePayload) {
    const channel = channelOrToken?.channel || channelOrToken
    if (!channel) return
    try {
      channel.send({
        type: 'broadcast',
        event: 'live_state',
        payload: statePayload
      })
    } catch (e) {
      console.warn('broadcastLiveState error:', e)
    }
  },

  // 10. Broadcast Round Advance to Tabletop Peers
  broadcastRoundAdvance(channelOrToken, roundPayload) {
    const channel = channelOrToken?.channel || channelOrToken
    if (!channel) return
    try {
      channel.send({
        type: 'broadcast',
        event: 'round_advance',
        payload: roundPayload
      })
    } catch (e) {
      console.warn('broadcastRoundAdvance error:', e)
    }
  },

  // 11. Broadcast Seat Claim to Tabletop Peers
  broadcastSeatClaim(channelOrToken, seatPayload) {
    const channel = channelOrToken?.channel || channelOrToken
    if (!channel) return
    try {
      channel.send({
        type: 'broadcast',
        event: 'seat_claim',
        payload: seatPayload
      })
    } catch (e) {
      console.warn('broadcastSeatClaim error:', e)
    }
  },

  // 12. Broadcast Activity Log to Tabletop Peers
  broadcastActivityLog(channelOrToken, logPayload) {
    const channel = channelOrToken?.channel || channelOrToken
    if (!channel) return
    try {
      channel.send({
        type: 'broadcast',
        event: 'activity_log',
        payload: logPayload
      })
    } catch (e) {
      console.warn('broadcastActivityLog error:', e)
    }
  },

  // 13. Unsubscribe Live Room (Ref-counted tear down)
  unsubscribeLiveRoom(handleOrChannel, sessionId) {
    let sId = sessionId || handleOrChannel?.sessionId
    if (!this._roomChannels) return

    if (!sId && handleOrChannel) {
      for (const [id, room] of this._roomChannels.entries()) {
        if (room.channel === handleOrChannel || room.channel === handleOrChannel?.channel) {
          sId = id
          break
        }
      }
    }
    if (!sId) return

    const room = this._roomChannels.get(sId)
    if (!room) return

    if (handleOrChannel?.handlerObj) {
      room.listeners.delete(handleOrChannel.handlerObj)
    } else if (typeof handleOrChannel === 'object') {
      room.listeners.delete(handleOrChannel)
    }
    room.refCount = Math.max(0, room.refCount - 1)

    // Only remove channel when all listeners have unsubscribed
    if (room.refCount === 0 || room.listeners.size === 0) {
      try {
        supabase.removeChannel(room.channel)
      } catch (e) {}
      this._roomChannels.delete(sId)
    }
  },

  unsubscribeFromLiveRoom(handleOrChannel, sessionId) {
    return this.unsubscribeLiveRoom(handleOrChannel, sessionId)
  }
}
