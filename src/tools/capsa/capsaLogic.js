/**
 * capsaLogic.js
 * Core Rule and Calculation Engine for Capsa Susun (Chinese Poker) & Capsa Banting (Big Two)
 */

export const CAPSA_MODES = {
  SUSUN: 'susun',
  BANTING: 'banting'
}

export const CAPSA_HAND_RANKS = [
  { id: 'high_card', name: 'High Card (Kartu Satuan)', value: 0 },
  { id: 'one_pair', name: 'One Pair (1 Pasang)', value: 1 },
  { id: 'two_pair', name: 'Two Pair (2 Pasang)', value: 2 },
  { id: 'tris', name: 'Three of a Kind (Tris)', value: 3 },
  { id: 'straight', name: 'Straight (Seri Kembang Campur)', value: 4 },
  { id: 'flush', name: 'Flush (Kembang Sama)', value: 5 },
  { id: 'full_house', name: 'Full House (Polo)', value: 6 },
  { id: 'four_of_a_kind', name: 'Four of a Kind (Piting / Quads)', value: 7 },
  { id: 'straight_flush', name: 'Straight Flush (Plis)', value: 8 },
  { id: 'royal_flush', name: 'Royal Flush', value: 9 }
]

export const CAPSA_SPECIAL_COMBOS = [
  { id: 'none', name: 'Susunan Standar', bonus: 0 },
  { id: 'dragon', name: 'Dragon / 13 Kartu Lengkap (A–K)', bonus: 13 },
  { id: 'royal_flush_bot', name: 'Royal Flush Bawah', bonus: 7 },
  { id: 'straight_flush_bot', name: 'Straight Flush Bawah', bonus: 5 },
  { id: 'four_kind_bot', name: 'Piting (4 of a Kind) Bawah', bonus: 4 },
  { id: 'straight_flush_mid', name: 'Straight Flush Tengah', bonus: 10 },
  { id: 'four_kind_mid', name: 'Piting (4 of a Kind) Tengah', bonus: 8 },
  { id: 'full_house_mid', name: 'Full House Tengah', bonus: 2 },
  { id: 'tris_top', name: 'Tris di Baris Atas (3-Cards)', bonus: 3 }
]

/**
 * Validates whether a 3-tier Susun hand is legally arranged
 * Rule: Bottom (5 cards) >= Middle (5 cards) >= Top (3 cards)
 */
export function isLegalSusunArrangement(topValue, midValue, botValue) {
  return botValue >= midValue && midValue >= topValue
}

/**
 * Calculates net score deltas for a Capsa Susun round
 * @param {Array} players - Array of player hand objects:
 *   [{ id, name, isPao, specialComboId, tiers: { top: scoreVal, mid: scoreVal, bot: scoreVal }, bonusPoints }]
 * @param {Object} settings - { pointMultiplier: 1, sweepMultiplier: 2, superSweepBonus: 4, paoPenalty: 9 }
 * @returns {Object} { roundDeltas: { [playerId]: number }, comparisonMatrix: Array, sweeps: Array }
 */
export function calculateCapsaSusunRound(players = [], settings = {}) {
  const {
    pointMultiplier = 1,
    sweepMultiplier = 2,
    paoPenalty = 9 // standard default penalty points paid to each player if Pao
  } = settings

  const n = players.length
  const roundDeltas = {}
  players.forEach(p => {
    roundDeltas[p.id] = 0
  })

  if (n < 2) {
    return { roundDeltas, comparisons: [], sweeps: [] }
  }

  // Check if any player has an instant Dragon
  const dragonPlayer = players.find(p => p.specialComboId === 'dragon' && !p.isPao)
  if (dragonPlayer) {
    const dragonBonusPerPlayer = 13 * pointMultiplier
    players.forEach(p => {
      if (p.id === dragonPlayer.id) {
        roundDeltas[p.id] = dragonBonusPerPlayer * (n - 1)
      } else {
        roundDeltas[p.id] = -dragonBonusPerPlayer
      }
    })
    return {
      roundDeltas,
      comparisons: [],
      sweeps: [{ winnerId: dragonPlayer.id, type: 'dragon' }]
    }
  }

  const comparisons = []
  const sweeps = []
  const playerWinsAgainst = {}
  players.forEach(p => { playerWinsAgainst[p.id] = 0 })

  // Head-to-Head comparison between every pair of players (i, j)
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const p1 = players[i]
      const p2 = players[j]

      let p1PointsVsP2 = 0

      // Case 1: Both Pao (Salah Susun)
      if (p1.isPao && p2.isPao) {
        p1PointsVsP2 = 0
      } 
      // Case 2: P1 Pao only
      else if (p1.isPao && !p2.isPao) {
        p1PointsVsP2 = -paoPenalty * pointMultiplier
      }
      // Case 3: P2 Pao only
      else if (!p1.isPao && p2.isPao) {
        p1PointsVsP2 = paoPenalty * pointMultiplier
      }
      // Case 4: Normal head-to-head tier comparison
      else {
        let p1TierWins = 0
        let p2TierWins = 0

        // Top Tier
        const topDiff = (p1.tiers?.top || 0) - (p2.tiers?.top || 0)
        let topPts = 0
        if (topDiff > 0) { topPts = 1; p1TierWins++ }
        else if (topDiff < 0) { topPts = -1; p2TierWins++ }

        // Mid Tier
        const midDiff = (p1.tiers?.mid || 0) - (p2.tiers?.mid || 0)
        let midPts = 0
        if (midDiff > 0) { midPts = 1; p1TierWins++ }
        else if (midDiff < 0) { midPts = -1; p2TierWins++ }

        // Bot Tier
        const botDiff = (p1.tiers?.bot || 0) - (p2.tiers?.bot || 0)
        let botPts = 0
        if (botDiff > 0) { botPts = 1; p1TierWins++ }
        else if (botDiff < 0) { botPts = -1; p2TierWins++ }

        let netTierPts = (topPts + midPts + botPts) * pointMultiplier

        // Check Tembus (Sweep across all 3 tiers against this single opponent)
        if (p1TierWins === 3) {
          netTierPts = 3 * sweepMultiplier * pointMultiplier
          sweeps.push({ winnerId: p1.id, loserId: p2.id, type: 'sweep_pair' })
          playerWinsAgainst[p1.id]++
        } else if (p2TierWins === 3) {
          netTierPts = -3 * sweepMultiplier * pointMultiplier
          sweeps.push({ winnerId: p2.id, loserId: p1.id, type: 'sweep_pair' })
          playerWinsAgainst[p2.id]++
        }

        // Special tier bonuses (e.g. Tris at top, Royal Flush at bottom)
        const p1SpecialBonus = (p1.bonusPoints || 0) * pointMultiplier
        const p2SpecialBonus = (p2.bonusPoints || 0) * pointMultiplier
        netTierPts += (p1SpecialBonus - p2SpecialBonus)

        p1PointsVsP2 = netTierPts
      }

      roundDeltas[p1.id] += p1PointsVsP2
      roundDeltas[p2.id] -= p1PointsVsP2

      comparisons.push({
        player1Id: p1.id,
        player2Id: p2.id,
        p1Points: p1PointsVsP2
      })
    }
  }

  // Check Tembus Keliling (Super Sweep: swept all opponents)
  if (n > 2) {
    players.forEach(p => {
      if (playerWinsAgainst[p.id] === (n - 1) && !p.isPao) {
        sweeps.push({ winnerId: p.id, type: 'sweep_all' })
      }
    })
  }

  return { roundDeltas, comparisons, sweeps }
}

/**
 * Calculates net score deltas for a Capsa Banting (Big Two) round
 * @param {string} winnerId - ID of the player who shed all cards (0 cards left)
 * @param {Array} players - [{ id, name, remainingCards, cardsTwoCount, bomsCount }]
 * @param {Object} settings - { pointMultiplier, doubleAt10, tripleAt13, twoCardPenalty, bomPenalty }
 */
export function calculateCapsaBantingRound(winnerId, players = [], settings = {}) {
  const {
    pointMultiplier = 1,
    doubleAt10 = true,
    tripleAt13 = true,
    twoCardPenalty = 2,
    bomPenalty = 5
  } = settings

  const roundDeltas = {}
  let totalPotFromLosers = 0

  players.forEach(p => {
    if (p.id === winnerId) {
      roundDeltas[p.id] = 0
    } else {
      const remaining = Math.max(0, p.remainingCards || 0)
      let multiplier = 1

      if (remaining === 13 && tripleAt13) {
        multiplier = 3 // Hang / Telur (Never played)
      } else if (remaining >= 10 && doubleAt10) {
        multiplier = 2 // Heavy penalty
      }

      let penalty = remaining * multiplier * pointMultiplier

      // Penalty for holding '2' cards
      if (p.cardsTwoCount > 0) {
        penalty += p.cardsTwoCount * twoCardPenalty * pointMultiplier
      }

      // Penalty for holding Bom / Quads
      if (p.bomsCount > 0) {
        penalty += p.bomsCount * bomPenalty * pointMultiplier
      }

      roundDeltas[p.id] = -penalty
      totalPotFromLosers += penalty
    }
  })

  // Winner gains all points lost by opponents
  if (winnerId && roundDeltas[winnerId] !== undefined) {
    roundDeltas[winnerId] = totalPotFromLosers
  }

  return { roundDeltas, totalPot: totalPotFromLosers }
}
