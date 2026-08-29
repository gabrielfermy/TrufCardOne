import { supabase } from './supabaseClient'

export const gameService = {
  // Create a new game session
  async createSession(userId, playerNames, settings) {
    const { data, error } = await supabase
      .from('game_sessions')
      .insert({
        user_id: userId,
        player1_name: playerNames[0],
        player2_name: playerNames[1],
        player3_name: playerNames[2],
        player4_name: playerNames[3],
        settings: settings,
        is_completed: false
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Get all sessions for a user
  async getSessions(userId) {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  // Get full details of a session (session info, rounds, and scores)
  async getSessionDetails(sessionId) {
    // 1. Get session info
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (sessionError) throw sessionError

    // 2. Get rounds in this session
    const { data: rounds, error: roundsError } = await supabase
      .from('game_rounds')
      .select('*')
      .eq('session_id', sessionId)
      .order('round_number', { ascending: true })

    if (roundsError) throw roundsError

    if (rounds.length === 0) {
      return { session, rounds: [], scoresByRound: {} }
    }

    const roundIds = rounds.map(r => r.id)

    // 3. Get player scores for these rounds
    const { data: scores, error: scoresError } = await supabase
      .from('player_scores')
      .select('*')
      .in('round_id', roundIds)
      .order('player_index', { ascending: true })

    if (scoresError) throw scoresError

    // Group scores by round_id
    const scoresByRound = {}
    scores.forEach(score => {
      if (!scoresByRound[score.round_id]) {
        scoresByRound[score.round_id] = []
      }
      scoresByRound[score.round_id].push(score)
    })

    return {
      session,
      rounds,
      scoresByRound
    }
  },

  // Save a round with all 4 players' scores
  async saveRoundWithScores(sessionId, roundNumber, dealerIndex, trufSuitIndex, playersData, playMode = null) {
    // 1. Insert the round
    const { data: round, error: roundError } = await supabase
      .from('game_rounds')
      .insert({
        session_id: sessionId,
        round_number: roundNumber,
        dealer_index: dealerIndex,
        truf_suit_index: trufSuitIndex,
        play_mode: playMode
      })
      .select()
      .single()

    if (roundError) throw roundError

    // 2. Prepare score records
    const scoreRecords = playersData.map((player, index) => ({
      round_id: round.id,
      player_index: index,
      bid: player.bid,
      won: player.won,
      score_change: player.scoreChange,
      score_cumulative: player.scoreCumulative
    }))

    // 3. Insert scores in bulk
    const { error: scoresError } = await supabase
      .from('player_scores')
      .insert(scoreRecords)

    if (scoresError) {
      // Rollback the inserted round to preserve database integrity
      await supabase.from('game_rounds').delete().eq('id', round.id)
      throw scoresError
    }

    return round
  },

  // Undo (delete) the last round in a session
  async deleteLastRound(sessionId) {
    // 1. Find the round with the highest round_number
    const { data: rounds, error: findError } = await supabase
      .from('game_rounds')
      .select('id, round_number')
      .eq('session_id', sessionId)
      .order('round_number', { ascending: false })
      .limit(1)

    if (findError) throw findError
    if (rounds.length === 0) return null // Nothing to delete

    const lastRound = rounds[0]

    // 2. Delete the round (cascade will delete the player_scores automatically)
    const { error: deleteError } = await supabase
      .from('game_rounds')
      .delete()
      .eq('id', lastRound.id)

    if (deleteError) throw deleteError
    return lastRound
  },

  // Complete a game session
  async completeSession(sessionId) {
    const { data, error } = await supabase
      .from('game_sessions')
      .update({ is_completed: true })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Delete an entire session
  async deleteSession(sessionId) {
    const { error } = await supabase
      .from('game_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) throw error
  }
}
