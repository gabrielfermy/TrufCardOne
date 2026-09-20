import { dedupeRounds } from '../../utils/roundUtils.js'

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
export function calculateTrufRoundScores(bids, wons, settings = {}, totalBid, forcedMode = null) {
  const totalTricks = settings?.totalTricks || (bids?.length === 3 ? 17 : bids?.length === 5 ? 10 : 13)
  const isMainAtas = forcedMode ? forcedMode === 'atas' : totalBid > totalTricks
  const mult = settings?.multiplier || 1
  const customBonus0 = settings?.bid0Bonus
  const maxBid = (bids && bids.length > 0) ? Math.max(...bids) : 0

  return bids.map((bid, index) => {
    const won = wons[index] ?? 0
    const diff = Math.abs(won - bid)
    let scoreChange = 0

    if (won === bid) {
      // Met the bid target
      if (bid === 0) {
        // Standard Truf rule: Bid 0 earns the highest bid of that round!
        // If a positive custom bonus is explicitly configured, use it instead.
        const earnedPoints = (customBonus0 && customBonus0 > 0) ? customBonus0 : maxBid
        scoreChange = earnedPoints * mult
      } else {
        scoreChange = bid * mult
      }
    } else {
      // Failed to meet the target
      if (bid === 0) {
        // Special penalty for failed Bid 0 (excess tricks)
        const excessMult = isMainAtas ? (settings?.atasExcessMult ?? -1) : (settings?.bawahExcessMult ?? -2)
        scoreChange = won * excessMult * mult
      } else {
        if (won < bid) {
          const lackMult = isMainAtas ? (settings?.atasLackMult ?? -2) : (settings?.bawahLackMult ?? -1)
          scoreChange = diff * lackMult * mult
        } else {
          const excessMult = isMainAtas ? (settings?.atasExcessMult ?? -1) : (settings?.bawahExcessMult ?? -2)
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
  if (!bids || bids.length === 0) {
    return { maxBid: 0, highestBidderIndices: [], isTie: false }
  }
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
 * Otherwise, clockwise starting from (previous dealer + 1) % playerCount.
 */
export function determineNextDealer(roundsList, firstDealer = 0, initialScores = [], playerCount = 4) {
  const cleanList = dedupeRounds(roundsList)
  if (!cleanList || cleanList.length === 0) {
    return firstDealer
  }

  const pCount = (initialScores && initialScores.length > 0)
    ? initialScores.length
    : (cleanList?.[0]?.player_scores?.length || playerCount || 4)

  // Calculate cumulative scores
  const cumulativeScores = Array(pCount).fill(0).map((_, idx) => initialScores[idx] || 0)
  const lastRound = cleanList[cleanList.length - 1]
  const lastScores = lastRound?.player_scores || lastRound?.playerScores || []
  const hasCumulative = lastScores.some(ps => (ps.score_cumulative !== undefined && ps.score_cumulative !== null) || (ps.scoreCumulative !== undefined && ps.scoreCumulative !== null))

  if (hasCumulative) {
    lastScores.forEach(ps => {
      const pIdx = ps.player_index ?? ps.playerIndex
      if (pIdx !== undefined && pIdx >= 0 && pIdx < pCount) {
        cumulativeScores[pIdx] = ps.score_cumulative ?? ps.scoreCumulative ?? 0
      }
    })
  } else {
    cleanList.forEach(r => {
      const pScores = r.player_scores || r.playerScores || []
      pScores.forEach(ps => {
        const pIdx = ps.player_index ?? ps.playerIndex ?? 0
        if (pIdx >= 0 && pIdx < pCount) {
          cumulativeScores[pIdx] += (ps.score_change ?? ps.scoreChange ?? 0)
        }
      })
    })
  }

  const minScore = Math.min(...cumulativeScores)
  const lowestScorers = Array.from({ length: pCount }, (_, i) => i).filter(idx => cumulativeScores[idx] === minScore)

  if (lowestScorers.length === 1) {
    return lowestScorers[0]
  }

  // Tie-breaker: If previous round dealer is among tied lowest scorers, keep them
  const prevRound = cleanList[cleanList.length - 1]
  const prevDealer = prevRound.round_data?.dealerIndex ?? prevRound.round_data?.dealer_index ?? prevRound.roundData?.dealerIndex ?? prevRound.roundData?.dealer_index ?? prevRound.dealer_index ?? prevRound.dealerIndex ?? firstDealer
  if (lowestScorers.includes(prevDealer)) {
    return prevDealer
  }

  // Otherwise, check clockwise starting from previous dealer + 1
  for (let step = 1; step < pCount; step++) {
    const candidate = (prevDealer + step) % pCount
    if (lowestScorers.includes(candidate)) {
      return candidate
    }
  }

  return lowestScorers[0]
}

export const DEFAULT_DEALER_WORD = 'CHOLOKOPOK'

/**
 * Calculates consecutive dealer streak from recorded rounds
 */
export function getDealerConsecutiveStreak(roundsList, targetDealer, firstDealer = 0) {
  const cleanList = dedupeRounds(roundsList)
  if (!cleanList || cleanList.length === 0) return 0
  let count = 0
  for (let i = cleanList.length - 1; i >= 0; i--) {
    const r = cleanList[i]
    const d = r.round_data?.dealerIndex ?? r.round_data?.dealer_index ?? r.roundData?.dealerIndex ?? r.roundData?.dealer_index ?? r.dealer_index ?? r.dealerIndex ?? (i === 0 ? firstDealer : null)
    if (d === targetDealer) {
      count++
    } else {
      break
    }
  }
  return count
}

/**
 * Formats dealer streak as letter badges or numeric progress
 */
export function formatDealerStreakStatus(streakCount, word = DEFAULT_DEALER_WORD, displayMode = 'word') {
  const sanitizedWord = (word && word.trim().length > 0 ? word.trim().toUpperCase() : DEFAULT_DEALER_WORD)
  const letters = sanitizedWord.split('')
  const maxLimit = letters.length
  const activeCount = Math.min(streakCount, maxLimit)

  return {
    streakCount,
    maxLimit,
    word: sanitizedWord,
    letters,
    activeCount,
    isLimitReached: streakCount >= maxLimit,
    displayMode,
    progressText: `${activeCount}/${maxLimit}`,
    activeLetters: letters.slice(0, activeCount).join('-')
  }
}
