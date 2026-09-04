/**
 * Truf Card Game Scoring Logic & Rule Engine
 */

export const SUITS = [
  { id: 0, label: '♠', key: 'spade', name: 'Sekop', color: '#60A5FA' },
  { id: 1, label: '♥', key: 'heart', name: 'Hati', color: '#F87171' },
  { id: 2, label: '♦', key: 'diamond', name: 'Wajik', color: '#FB923C' },
  { id: 3, label: '♣', key: 'club', name: 'Keriting', color: '#34D399' }
]

/**
 * Calculates round score change for all 4 players
 */
export function calculateTrufRoundScores(bids, wons, settings, totalBid, forcedMode = null) {
  const isMainAtas = forcedMode ? forcedMode === 'atas' : totalBid > 13
  const mult = settings.multiplier || 1
  const bonus0 = settings.bid0Bonus || 0

  return bids.map((bid, index) => {
    const won = wons[index]
    const diff = Math.abs(won - bid)
    let scoreChange = 0

    if (won === bid) {
      // Met the bid target
      if (bid === 0) {
        scoreChange = bonus0 * mult
      } else {
        scoreChange = bid * mult
      }
    } else {
      // Failed to meet the target
      if (bid === 0) {
        // Special penalty for failed Bid 0
        scoreChange = won * (settings.atasLackMult || -2) * mult
      } else {
        if (won < bid) {
          const lackMult = isMainAtas ? (settings.atasLackMult || -2) : (settings.bawahLackMult || -1)
          scoreChange = diff * lackMult * mult
        } else {
          const excessMult = isMainAtas ? (settings.atasExcessMult || -1) : (settings.bawahExcessMult || -2)
          scoreChange = diff * excessMult * mult
        }
      }
    }
    return scoreChange
  })
}

/**
 * Evaluates tiebreaker among highest bidders
 */
export function determineTrufSuitWinner(bids) {
  const maxBid = Math.max(...bids)
  const maxBidIndices = bids.map((b, idx) => b === maxBid ? idx : -1).filter(idx => idx !== -1)

  return {
    maxBid,
    highestBidderIndices: maxBidIndices,
    isTie: maxBidIndices.length > 1
  }
}

/**
 * Determines dealer index for a Truf round.
 * Round 1: firstDealer
 * Round 2+: Player with the lowest cumulative score.
 * Tie-breaker: If previous round's dealer is among the tied lowest scorers, they remain dealer.
 * Otherwise, clockwise starting from (previous dealer + 1) % 4.
 */
export function determineNextDealer(roundsList, firstDealer = 0) {
  if (!roundsList || roundsList.length === 0) {
    return firstDealer
  }

  // Calculate cumulative scores
  const cumulativeScores = [0, 0, 0, 0]
  const lastRound = roundsList[roundsList.length - 1]
  const hasCumulative = lastRound?.player_scores?.some(ps => ps.score_cumulative !== undefined && ps.score_cumulative !== null)

  if (hasCumulative) {
    lastRound.player_scores.forEach(ps => {
      if (ps.player_index !== undefined) {
        cumulativeScores[ps.player_index] = ps.score_cumulative ?? 0
      }
    })
  } else {
    roundsList.forEach(r => {
      const pScores = r.player_scores || r.playerScores || []
      pScores.forEach(ps => {
        const pIdx = ps.player_index ?? 0
        cumulativeScores[pIdx] += (ps.score_change ?? 0)
      })
    })
  }

  const minScore = Math.min(...cumulativeScores)
  const lowestScorers = [0, 1, 2, 3].filter(idx => cumulativeScores[idx] === minScore)

  if (lowestScorers.length === 1) {
    return lowestScorers[0]
  }

  // Tie-breaker: If previous round dealer is among tied lowest scorers, keep them
  const prevRound = roundsList[roundsList.length - 1]
  const prevDealer = prevRound.round_data?.dealerIndex ?? prevRound.round_data?.dealer_index ?? prevRound.dealer_index ?? prevRound.dealerIndex ?? firstDealer
  if (lowestScorers.includes(prevDealer)) {
    return prevDealer
  }

  // Otherwise, check clockwise starting from previous dealer + 1
  for (let step = 1; step <= 3; step++) {
    const candidate = (prevDealer + step) % 4
    if (lowestScorers.includes(candidate)) {
      return candidate
    }
  }

  return lowestScorers[0]
}

/**
 * Calculates consecutive dealer streak from recorded rounds
 */
export function getDealerConsecutiveStreak(roundsList, targetDealer, firstDealer = 0) {
  if (!roundsList || roundsList.length === 0) return 0
  let count = 0
  for (let i = roundsList.length - 1; i >= 0; i--) {
    const r = roundsList[i]
    const d = r.round_data?.dealerIndex ?? r.round_data?.dealer_index ?? r.dealer_index ?? r.dealerIndex ?? (i === 0 ? firstDealer : null)
    if (d === targetDealer) {
      count++
    } else {
      break
    }
  }
  return count
}
