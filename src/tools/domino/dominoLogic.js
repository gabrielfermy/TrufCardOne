/**
 * dominoLogic.js
 * Core Rule and Scoring Engine for Domino Gaple (Individu & 2v2 Teams) and Domino QiuQiu
 */

export const DOMINO_MODES = {
  GAPLE: 'gaple',
  QIUQIU: 'qiuqiu'
}

export const GAPLE_TEAM_MODES = {
  INDIVIDUAL: 'individual',
  TEAMS_2V2: 'teams_2v2'
}

export const GAPLE_END_TYPES = {
  OUT: 'out', // Normal finish (first to empty hand)
  DEADLOCK: 'deadlock' // Gaple / Macet / Buntu (No player can move)
}

export const QIUQIU_SPECIAL_HANDS = [
  { id: 'none', name: 'Nilai Normal (0–9 / 0–9)', rank: 0, multiplier: 1 },
  { id: 'qiu_qiu', name: 'Qiu Qiu (9 - 9)', rank: 1, multiplier: 2 },
  { id: 'murni_besar', name: 'Murni Besar (Total Titik ≥ 39)', rank: 2, multiplier: 3 },
  { id: 'murni_kecil', name: 'Murni Kecil (Total Titik ≤ 9)', rank: 3, multiplier: 4 },
  { id: 'four_doubles', name: '4 Balak (Semua Kartu Kembar)', rank: 4, multiplier: 5 },
  { id: 'six_devils', name: '6 Dewa (Semua 4 Kartu Bernilai 6)', rank: 5, multiplier: 6 }
]

/**
 * Calculates penalty points for a Gaple round
 * @param {Object} roundInput - { endType: 'out'|'deadlock', winnerId, deadlockCauserPlayerId, players: [{ id, name, teamId, remainingPips, balakZerosCount, balakSixesCount }] }
 * @param {Object} settings - { penaltyThreshold: 100, balakZeroPenalty: 10, balakSixPenalty: 12, deadlockRule: 'lowest_wins'|'causer_punished' }
 */
export function calculateGapleRound(roundInput = {}, settings = {}) {
  const {
    endType = GAPLE_END_TYPES.OUT,
    winnerId = null,
    deadlockCauserPlayerId = null,
    players = []
  } = roundInput

  const {
    balakZeroPenalty = 10,
    balakSixPenalty = 12,
    deadlockRule = 'lowest_wins' // 'lowest_wins' | 'causer_punished'
  } = settings

  const roundPenalties = {}
  let actualWinnerId = winnerId

  players.forEach(p => {
    let pips = Math.max(0, p.remainingPips || 0)
    // Extra balak mati penalties
    if (p.balakZerosCount > 0) pips += p.balakZerosCount * balakZeroPenalty
    if (p.balakSixesCount > 0) pips += p.balakSixesCount * balakSixPenalty
    roundPenalties[p.id] = pips
  })

  // Skenario 1: Menang Keluar (Out)
  if (endType === GAPLE_END_TYPES.OUT) {
    if (actualWinnerId && roundPenalties[actualWinnerId] !== undefined) {
      roundPenalties[actualWinnerId] = 0 // Winner receives 0 penalty
    }
  } 
  // Skenario 2: Gaple / Macet (Deadlock)
  else if (endType === GAPLE_END_TYPES.DEADLOCK) {
    // Find player with the lowest pips
    let minPips = Infinity
    let lowestPlayerIds = []

    players.forEach(p => {
      const pips = roundPenalties[p.id] || 0
      if (pips < minPips) {
        minPips = pips
        lowestPlayerIds = [p.id]
      } else if (pips === minPips) {
        lowestPlayerIds.push(p.id)
      }
    })

    // If deadlock causer is punished rule is on:
    if (deadlockRule === 'causer_punished' && deadlockCauserPlayerId) {
      const isCauserLowest = lowestPlayerIds.includes(deadlockCauserPlayerId)
      if (!isCauserLowest) {
        // Causer failed to win deadlock -> takes penalty equal to sum of all players' pips
        const totalTablePips = Object.values(roundPenalties).reduce((a, b) => a + b, 0)
        players.forEach(p => {
          roundPenalties[p.id] = p.id === deadlockCauserPlayerId ? totalTablePips : 0
        })
        actualWinnerId = lowestPlayerIds[0] || null
        return { roundPenalties, winnerId: actualWinnerId, isCauserPenalized: true }
      }
    }

    // Default lowest_wins rule: lowest gets 0, others keep their penalty
    lowestPlayerIds.forEach(id => {
      roundPenalties[id] = 0
    })
    actualWinnerId = lowestPlayerIds[0] || null
  }

  return { roundPenalties, winnerId: actualWinnerId, isCauserPenalized: false }
}

/**
 * Evaluates a Domino QiuQiu hand
 * @param {Array} fourTiles - [{ top: number, bot: number }, ... 4 tiles]
 * @returns {Object} { specialHandId, leftPairVal, rightPairVal, totalScoreDesc, rankValue }
 */
export function evaluateQiuQiuHand(fourTiles = []) {
  if (!fourTiles || fourTiles.length < 4) {
    return { specialHandId: 'none', leftPairVal: 0, rightPairVal: 0, rankValue: 0 }
  }

  const tilePips = fourTiles.map(t => (t.top || 0) + (t.bot || 0))
  const totalPips = tilePips.reduce((a, b) => a + b, 0)
  const isDoubles = fourTiles.map(t => (t.top || 0) === (t.bot || 0))
  const allDoubles = isDoubles.every(Boolean)

  // 1. Enam Dewa (Six Devils: each of the 4 tiles has total 6 pips)
  const isSixDevils = tilePips.every(p => p === 6)
  if (isSixDevils) {
    return { specialHandId: 'six_devils', leftPairVal: 9, rightPairVal: 9, rankValue: 500 }
  }

  // 2. 4 Balak (4 Doubles)
  if (allDoubles) {
    return { specialHandId: 'four_doubles', leftPairVal: 9, rightPairVal: 9, rankValue: 400 }
  }

  // 3. Murni Kecil (Total Pips <= 9)
  if (totalPips <= 9) {
    return { specialHandId: 'murni_kecil', leftPairVal: 9, rightPairVal: 9, rankValue: 300 }
  }

  // 4. Murni Besar (Total Pips >= 39)
  if (totalPips >= 39) {
    return { specialHandId: 'murni_besar', leftPairVal: 9, rightPairVal: 9, rankValue: 200 }
  }

  // Normal 2-pair evaluation: Find best combination of 2 pairs to maximize left and right mod 10
  // There are 3 possible splits of 4 cards into 2 pairs: (0,1)/(2,3), (0,2)/(1,3), (0,3)/(1,2)
  const splits = [
    { p1: (tilePips[0] + tilePips[1]) % 10, p2: (tilePips[2] + tilePips[3]) % 10 },
    { p1: (tilePips[0] + tilePips[2]) % 10, p2: (tilePips[1] + tilePips[3]) % 10 },
    { p1: (tilePips[0] + tilePips[3]) % 10, p2: (tilePips[1] + tilePips[2]) % 10 }
  ]

  let bestSplit = splits[0]
  let bestScore = -1

  splits.forEach(s => {
    // Sort pair so higher is on left
    const high = Math.max(s.p1, s.p2)
    const low = Math.min(s.p1, s.p2)
    const score = high * 10 + low
    if (score > bestScore) {
      bestScore = score
      bestSplit = { high, low }
    }
  })

  const isQiuQiu = bestSplit.high === 9 && bestSplit.low === 9
  return {
    specialHandId: isQiuQiu ? 'qiu_qiu' : 'none',
    leftPairVal: bestSplit.high,
    rightPairVal: bestSplit.low,
    rankValue: isQiuQiu ? 100 : bestScore
  }
}

/**
 * Calculates QiuQiu round payout/points against dealer or round pot
 * @param {Array} players - [{ id, name, isDealer, betAmount, specialHandId, leftPairVal, rightPairVal, rankValue }]
 */
export function calculateQiuQiuRound(players = []) {
  const roundDeltas = {}
  players.forEach(p => { roundDeltas[p.id] = 0 })

  const dealer = players.find(p => p.isDealer) || players[0]
  if (!dealer) return { roundDeltas, winnerId: null }

  let winnerId = dealer.id
  let highestRank = dealer.rankValue || 0

  // Standard Ceme/QiuQiu dealer vs players comparison
  players.forEach(p => {
    if (p.id !== dealer.id) {
      const bet = p.betAmount || 1
      const playerRank = p.rankValue || 0
      const dealerRank = dealer.rankValue || 0

      // If player hand is strictly higher than dealer, player wins
      if (playerRank > dealerRank) {
        // Special 2x bonus for QiuQiu or special hand
        const multiplier = p.specialHandId !== 'none' ? 2 : 1
        const winAmount = bet * multiplier
        roundDeltas[p.id] += winAmount
        roundDeltas[dealer.id] -= winAmount
        if (playerRank > highestRank) {
          highestRank = playerRank
          winnerId = p.id
        }
      } else {
        // Dealer wins ties and lower hands
        roundDeltas[p.id] -= bet
        roundDeltas[dealer.id] += bet
      }
    }
  })

  return { roundDeltas, winnerId, dealerId: dealer.id }
}
