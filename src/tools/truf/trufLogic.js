/**
 * Truf Card Game Scoring Logic & Rule Engine
 */

export const SUITS = [
  { id: 0, label: '♠', name: 'Sekop', color: '#60A5FA' },
  { id: 1, label: '♥', name: 'Hati', color: '#F87171' },
  { id: 2, label: '♦', name: 'Wajik', color: '#FB923C' },
  { id: 3, label: '♣', name: 'Keriting', color: '#34D399' }
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
