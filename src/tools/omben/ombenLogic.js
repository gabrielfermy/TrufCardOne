/**
 * Omben (Indonesian Cangkulan Card Game) Scoring Engine
 */

export function calculateOmbenRoundScores(finishingRanks, unplayedCards = []) {
  const maxRank = Math.max(...finishingRanks)

  return finishingRanks.map((rank, idx) => {
    const isOmben = rank === maxRank // Last place gets Omben
    const cardsLeft = unplayedCards[idx] || 0

    return {
      rank,
      isOmben,
      cardsLeft,
      ombenDelta: isOmben ? 1 : 0
    }
  })
}
