import { supabase } from './supabaseClient'
import { networkService } from './networkService'

const GUEST_STORAGE_KEY = 'gamenight_guest_sessions'

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
  let cleaned = input.trim().toUpperCase().replace(/\s+/g, '')
  if (/^[A-Z]{3}[A-Z0-9]{4}$/.test(cleaned)) {
    cleaned = `${cleaned.substring(0, 3)}-${cleaned.substring(3)}`
  }
  return cleaned
}

export const gameService = {
  // 1. Create a Game Session (Cloud First or Local Offline)
  async createSession({ userId, creatorClientId, gameType = 'truf', playerNames, settings, title, isOfflineLocal = false }) {
    const roomCode = generateRoomCode(gameType)
    const isRealUser = userId && userId !== 'guest-user'
    const hostClientId = creatorClientId || (isRealUser ? userId : 'host')

    const initialUserIds = Array(playerNames.length).fill(null)
    if (initialUserIds.length > 0) {
      initialUserIds[0] = hostClientId
    }

    const sessionPayload = {
      user_id: isRealUser ? userId : null,
      game_type: gameType,
      room_code: roomCode,
      title: title || `${gameType.toUpperCase()} Match - ${new Date().toLocaleDateString()}`,
      player_names: playerNames,
      player_user_ids: initialUserIds,
      settings: { ...settings, isOfflineLocal: Boolean(isOfflineLocal) },
      is_completed: false,
      created_at: new Date().toISOString()
    }

    // If explicit offline local mode or offline, save directly to localStorage and skip cloud insert
    if (isOfflineLocal || !networkService.isOnline()) {
      console.log('📱 Creating Offline / 1-HP Local Session in LocalStorage:', roomCode)
      const guestId = `guest-session-${Date.now()}`
      const guestSession = { ...sessionPayload, id: guestId, rounds: [], scores: {} }
      const existing = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || '[]')
      existing.unshift(guestSession)
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(existing.slice(0, 20)))
      return guestSession
    }
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .insert([sessionPayload])
        .select()
        .single()

      if (!error && data) {
        console.log('✅ Session created successfully in Supabase Cloud:', data.id, data.room_code)
        return data
      }

      if (error) {
        console.error('❌ Supabase session insert failed:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        })

        // Fallback retry with user_id = null if user profile wasn't ready
        if (sessionPayload.user_id) {
          const { data: retryData, error: retryError } = await supabase
            .from('game_sessions')
            .insert([{ ...sessionPayload, user_id: null }])
            .select()
            .single()

          if (!retryError && retryData) {
            console.log('✅ Session created with user_id=null fallback:', retryData.id)
            return retryData
          }
          if (retryError) {
            console.error('❌ Retry without user_id also failed:', retryError.message)
          }
        }
      }
    } catch (err) {
      console.error('❌ Cloud session save exception:', err)
    }

    // 2. Offline / Local fallback
    console.warn('⚠️ Falling back to browser LocalStorage for session', roomCode)
    const guestId = `guest-session-${Date.now()}`
    const guestSession = { ...sessionPayload, id: guestId, rounds: [], scores: {} }
    const existing = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || '[]')
    existing.unshift(guestSession)
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(existing.slice(0, 20)))
    return guestSession
  },

  // 2. Fetch User Match Diary (Hosted + Participated)
  async getUserSessions(userId) {
    if (!userId || userId === 'guest-user') {
      return JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || '[]')
    }

    try {
      // Fetch games where user is host OR claimed a seat
      const { data, error } = await supabase
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

      if (error) throw error
      return data || []
    } catch (err) {
      console.warn('Error loading cloud sessions', err)
      return JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || '[]')
    }
  },

  // 3. Fetch Single Session by ID or Room Code
  async getSession(sessionId, roomCode) {
    if (sessionId?.startsWith('guest-session')) {
      const guestList = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || '[]')
      return guestList.find(s => s.id === sessionId) || null
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

      if (sessionErr) {
        console.error('❌ getSession error from Supabase:', sessionErr)
      }

      // Check local guest storage if not in Cloud
      if (!session) {
        if (roomCode) {
          const guestList = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || '[]')
          const code = normalizeRoomCode(roomCode)
          return guestList.find(s => normalizeRoomCode(s.room_code) === code) || null
        }
        return null
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

      console.log('✅ Session loaded successfully:', session.room_code || session.id)
      return session
    } catch (err) {
      console.error('❌ Exception in getSession:', err)
      if (roomCode) {
        const guestList = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || '[]')
        const code = normalizeRoomCode(roomCode)
        return guestList.find(s => normalizeRoomCode(s.room_code) === code) || null
      }
      return null
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

  // 4b. Save a Game Round (Cloud First with Resilient Late Sync Queue)
  async saveRound({ sessionId, roundNumber, roundData, playerScores }) {
    if (!sessionId || sessionId.startsWith('guest-session') || sessionId.startsWith('local-session')) {
      const guestList = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || '[]')
      const session = guestList.find(s => s.id === sessionId)
      if (session) {
        const roundId = `guest-round-${Date.now()}`
        const newRound = {
          id: roundId,
          session_id: sessionId,
          round_number: roundNumber,
          round_data: roundData,
          roundData: roundData,
          created_at: new Date().toISOString(),
          player_scores: playerScores.map((ps, idx) => ({
            id: `ps-${roundId}-${idx}`,
            player_index: idx,
            stats: ps.stats || {},
            score_change: ps.score_change,
            score_cumulative: ps.score_cumulative
          }))
        }
        session.rounds = session.rounds || []
        session.rounds.push(newRound)
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestList))
        return newRound
      }
      return null
    }

    // Check online status
    if (!networkService.isOnline()) {
      console.warn('⚠️ Offline: Enqueuing round to late sync queue for session', sessionId)
      const roundId = `queued-round-${Date.now()}`
      const offlineRound = {
        id: roundId,
        session_id: sessionId,
        round_number: roundNumber,
        round_data: roundData,
        created_at: new Date().toISOString(),
        is_pending_sync: true,
        player_scores: playerScores.map((ps, idx) => ({
          id: `ps-${roundId}-${idx}`,
          player_index: idx,
          stats: ps.stats || {},
          score_change: ps.score_change,
          score_cumulative: ps.score_cumulative
        }))
      }
      networkService.enqueue({
        type: 'SAVE_ROUND',
        sessionId,
        payload: { sessionId, roundNumber, roundData, playerScores }
      })
      return offlineRound
    }

    try {
      return await this._saveRoundToCloud({ sessionId, roundNumber, roundData, playerScores })
    } catch (err) {
      console.warn('⚠️ Cloud saveRound error, enqueuing for late sync:', err)
      const roundId = `queued-round-${Date.now()}`
      const offlineRound = {
        id: roundId,
        session_id: sessionId,
        round_number: roundNumber,
        round_data: roundData,
        created_at: new Date().toISOString(),
        is_pending_sync: true,
        player_scores: playerScores.map((ps, idx) => ({
          id: `ps-${roundId}-${idx}`,
          player_index: idx,
          stats: ps.stats || {},
          score_change: ps.score_change,
          score_cumulative: ps.score_cumulative
        }))
      }
      networkService.enqueue({
        type: 'SAVE_ROUND',
        sessionId,
        payload: { sessionId, roundNumber, roundData, playerScores }
      })
      return offlineRound
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
    if (sessionId?.startsWith('guest-session')) {
      const guestList = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || '[]')
      const session = guestList.find(s => s.id === sessionId)
      if (session && session.rounds) {
        session.rounds = session.rounds.filter(r => r.id !== roundId)
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestList))
      }
      return true
    }

    const { error } = await supabase
      .from('game_rounds')
      .delete()
      .eq('id', roundId)

    if (error) throw error
    return true
  },

  // 6. Complete Session
  async completeSession(sessionId) {
    if (sessionId?.startsWith('guest-session') || sessionId?.startsWith('local-session')) {
      const guestList = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || '[]')
      const session = guestList.find(s => s.id === sessionId)
      if (session) {
        session.is_completed = true
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestList))
      }
      return true
    }

    const { error } = await supabase
      .from('game_sessions')
      .update({ is_completed: true, updated_at: new Date().toISOString() })
      .eq('id', sessionId)

    if (error) throw error
    return true
  },

  // 7. Delete Session
  async deleteSession(sessionId) {
    if (sessionId?.startsWith('guest-session') || sessionId?.startsWith('local-session')) {
      const guestList = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || '[]')
      const updated = guestList.filter(s => s.id !== sessionId)
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updated))
      return true
    }

    const { error } = await supabase
      .from('game_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      console.warn('Cloud delete session warning:', error)
    }
    return true
  },

  // 7. Claim Seat (Guest or Logged-In User)
  async claimSeat(sessionId, playerIndex, clientId) {
    if (!sessionId || playerIndex === undefined || playerIndex === null) return false

    // 1. Handle local guest session
    if (sessionId.startsWith('guest-session')) {
      const guestList = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || '[]')
      const session = guestList.find(s => s.id === sessionId)
      if (session) {
        if (!session.player_user_ids) {
          session.player_user_ids = Array(session.player_names?.length || 4).fill(null)
        }
        session.player_user_ids[playerIndex] = clientId
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestList))
        return session.player_user_ids
      }
      return false
    }

    // 2. Handle Supabase Cloud session
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
          console.error('Supabase claimSeat error:', error)
          return false
        }
        return userIds
      }
    } catch (err) {
      console.warn('claimSeat exception:', err)
    }
    return false
  },

  // 8. Subscribe to Live Realtime Room Changes (Postgres Changes + Instant Broadcast)
  subscribeToLiveRoom(sessionId, handlers) {
    if (!sessionId || sessionId.startsWith('guest-session')) return null

    try {
      const topic = `live-room:${sessionId}`
      if (typeof supabase.getChannels === 'function') {
        const existingChannels = supabase.getChannels() || []
        const existing = existingChannels.find(ch => ch.topic === `realtime:${topic}` || ch.topic === topic)
        if (existing) {
          supabase.removeChannel(existing)
        }
      }

      const onDbUpdate = typeof handlers === 'function' ? handlers : handlers?.onDbUpdate
      const onLiveState = typeof handlers === 'object' ? handlers?.onLiveState : null
      const onRoundAdvance = typeof handlers === 'object' ? handlers?.onRoundAdvance : null
      const onSeatClaim = typeof handlers === 'object' ? handlers?.onSeatClaim : null
      const onActivityLog = typeof handlers === 'object' ? handlers?.onActivityLog : null

      const channel = supabase.channel(topic, {
        config: {
          broadcast: { ack: false, self: false }
        }
      })

      if (onDbUpdate) {
        channel.on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'game_rounds',
          filter: `session_id=eq.${sessionId}`
        }, (payload) => {
          onDbUpdate(payload)
        })
      }

      if (onLiveState) {
        channel.on('broadcast', { event: 'live_state' }, ({ payload }) => {
          onLiveState(payload)
        })
      }

      if (onRoundAdvance) {
        channel.on('broadcast', { event: 'round_advance' }, ({ payload }) => {
          onRoundAdvance(payload)
        })
      }

      if (onSeatClaim) {
        channel.on('broadcast', { event: 'seat_claim' }, ({ payload }) => {
          onSeatClaim(payload)
        })
      }

      if (onActivityLog) {
        channel.on('broadcast', { event: 'activity_log' }, ({ payload }) => {
          onActivityLog(payload)
        })
      }

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`🔌 Connected to Realtime Live Room: ${sessionId}`)
        }
      })

      return channel
    } catch (err) {
      console.warn('Realtime subscribe safe error catch:', err)
      return null
    }
  },

  // 9. Broadcast Live Input State to Tabletop Peers
  broadcastLiveState(channel, statePayload) {
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
  broadcastRoundAdvance(channel, roundPayload) {
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
  broadcastSeatClaim(channel, seatPayload) {
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
  broadcastActivityLog(channel, logPayload) {
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

  // 13. Unsubscribe Live Room
  unsubscribeLiveRoom(channel) {
    if (channel) {
      try {
        supabase.removeChannel(channel)
      } catch (e) {}
    }
  }
}
