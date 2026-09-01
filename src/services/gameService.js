import { supabase } from './supabaseClient'

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
  // 1. Create a Game Session (Cloud First, Accessible across all devices)
  async createSession({ userId, gameType = 'truf', playerNames, settings, title }) {
    const roomCode = generateRoomCode(gameType)
    const isRealUser = userId && userId !== 'guest-user'

    const sessionPayload = {
      user_id: isRealUser ? userId : null,
      game_type: gameType,
      room_code: roomCode,
      title: title || `${gameType.toUpperCase()} Match - ${new Date().toLocaleDateString()}`,
      player_names: playerNames,
      player_user_ids: Array(playerNames.length).fill(null),
      settings: settings || {},
      is_completed: false,
      created_at: new Date().toISOString()
    }

    // 1. Always attempt saving to Supabase so roomCode is globally joinable across devices
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

      // 2. Fetch Associated Game Rounds & Player Scores
      try {
        const { data: rounds, error: roundsErr } = await supabase
          .from('game_rounds')
          .select(`
            id,
            round_number,
            round_data,
            created_at,
            player_scores (
              id,
              player_index,
              stats,
              score_change,
              score_cumulative
            )
          `)
          .eq('session_id', session.id)
          .order('round_number', { ascending: true })

        if (!roundsErr && rounds) {
          session.game_rounds = rounds
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

  // 4. Save a Game Round + Player Scores
  async saveRound({ sessionId, roundNumber, roundData, playerScores }) {
    if (!sessionId || sessionId.startsWith('guest-session')) {
      const guestList = JSON.parse(localStorage.getItem(GUEST_STORAGE_KEY) || '[]')
      const session = guestList.find(s => s.id === sessionId)
      if (session) {
        const roundId = `guest-round-${Date.now()}`
        const newRound = {
          id: roundId,
          session_id: sessionId,
          round_number: roundNumber,
          round_data: roundData,
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

    try {
      // 1. Insert game round
      const { data: round, error: roundError } = await supabase
        .from('game_rounds')
        .insert([{
          session_id: sessionId,
          round_number: roundNumber,
          round_data: roundData
        }])
        .select()
        .single()

      if (roundError) throw roundError

      // 2. Insert player scores
      const scoreRecords = playerScores.map((ps, idx) => ({
        round_id: round.id,
        player_index: idx,
        stats: ps.stats || {},
        score_change: ps.score_change,
        score_cumulative: ps.score_cumulative
      }))

      const { error: scoresError } = await supabase
        .from('player_scores')
        .insert(scoreRecords)

      if (scoresError) throw scoresError

      return { ...round, player_scores: scoreRecords }
    } catch (err) {
      console.warn('Cloud saveRound error, falling back locally so game progress is preserved:', err)
      const roundId = `local-round-${Date.now()}`
      return {
        id: roundId,
        session_id: sessionId,
        round_number: roundNumber,
        round_data: roundData,
        created_at: new Date().toISOString(),
        player_scores: playerScores.map((ps, idx) => ({
          id: `ps-${roundId}-${idx}`,
          player_index: idx,
          stats: ps.stats || {},
          score_change: ps.score_change,
          score_cumulative: ps.score_cumulative
        }))
      }
    }
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
    if (sessionId?.startsWith('guest-session')) {
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
    if (sessionId?.startsWith('guest-session')) {
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

  // 7. Claim Seat by a Logged-In User
  async claimSeat(sessionId, playerIndex, userId) {
    const { data: session } = await supabase
      .from('game_sessions')
      .select('player_user_ids')
      .eq('id', sessionId)
      .single()

    if (session) {
      const userIds = [...(session.player_user_ids || [])]
      userIds[playerIndex] = userId
      const { error } = await supabase
        .from('game_sessions')
        .update({ player_user_ids: userIds })
        .eq('id', sessionId)

      if (error) throw error
      return true
    }
    return false
  },

  // 8. Subscribe to Live Realtime Room Changes
  subscribeToLiveRoom(sessionId, onUpdate) {
    if (!sessionId || sessionId.startsWith('guest-session')) return null

    const channel = supabase
      .channel(`session-room:${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_rounds',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        onUpdate(payload)
      })
      .subscribe()

    return channel
  },

  // 9. Unsubscribe Live Room
  unsubscribeLiveRoom(channel) {
    if (channel) {
      supabase.removeChannel(channel)
    }
  }
}
