/**
 * bridgeLogic.js
 * Official World Bridge Federation (WBF) / ACBL Contract Bridge Scoring Engine
 */

export const BRIDGE_SUITS = {
  CLUBS: { id: 'clubs', symbol: '♣', name: 'Clubs (Keriting)', type: 'minor', baseValue: 20 },
  DIAMONDS: { id: 'diamonds', symbol: '♦', name: 'Diamonds (Wajik)', type: 'minor', baseValue: 20 },
  HEARTS: { id: 'hearts', symbol: '♥', name: 'Hearts (Hati)', type: 'major', baseValue: 30 },
  SPADES: { id: 'spades', symbol: '♠', name: 'Spades (Sekop)', type: 'major', baseValue: 30 },
  NOTRUMP: { id: 'notrump', symbol: 'NT', name: 'No Trump (Tanpa Truf)', type: 'notrump', baseValue: 30, firstValue: 40 }
}

export const BRIDGE_DOUBLES = {
  UNDOUBLED: { id: 'undoubled', name: 'Normal (1x)', multiplier: 1 },
  DOUBLED: { id: 'doubled', name: 'Doubled (X)', multiplier: 2 },
  REDOUBLED: { id: 'redoubled', name: 'Redoubled (XX)', multiplier: 4 }
}

export const BRIDGE_VULNERABILITY = {
  NONE: { id: 'none', name: 'Tidak Rentan (None)', ns: false, ew: false },
  NS: { id: 'ns', name: 'NS Rentan (NS Vul)', ns: true, ew: false },
  EW: { id: 'ew', name: 'EW Rentan (EW Vul)', ns: false, ew: true },
  BOTH: { id: 'both', name: 'Keduanya Rentan (Both Vul)', ns: true, ew: true }
}

/**
 * Calculates official Duplicate/Rubber Bridge contract score
 * @param {Object} contract - { level: 1..7, suit: 'clubs'|'diamonds'|'hearts'|'spades'|'notrump', doubled: 'undoubled'|'doubled'|'redoubled', declarerTeam: 'ns'|'ew' }
 * @param {number} tricksWon - Number of tricks won by declarer (0..13)
 * @param {boolean} isVulnerable - Whether declarer team is vulnerable
 * @returns {Object} Full breakdown of points awarded
 */
export function calculateBridgeScore(contract, tricksWon, isVulnerable = false) {
  const level = Number(contract.level) || 1
  const suitId = contract.suit || 'notrump'
  const doubledId = contract.doubled || 'undoubled'
  const suit = BRIDGE_SUITS[suitId.toUpperCase()] || BRIDGE_SUITS.NOTRUMP
  const double = BRIDGE_DOUBLES[doubledId.toUpperCase()] || BRIDGE_DOUBLES.UNDOUBLED

  const targetTricks = 6 + level
  const diff = tricksWon - targetTricks
  const isMade = diff >= 0

  const breakdown = {
    trickPoints: 0,
    overtrickPoints: 0,
    gameBonus: 0,
    partScoreBonus: 0,
    slamBonus: 0,
    insultBonus: 0,
    undertrickPenalty: 0,
    totalScore: 0
  }

  if (isMade) {
    // 1. Trick Points
    let baseTrickPoints = 0
    if (suit.id === 'notrump') {
      baseTrickPoints = 40 + (level - 1) * 30
    } else {
      baseTrickPoints = level * suit.baseValue
    }
    breakdown.trickPoints = baseTrickPoints * double.multiplier

    // 2. Overtrick Points
    const overtricks = diff
    if (overtricks > 0) {
      if (double.id === 'undoubled') {
        const perOvertrick = suit.id === 'notrump' ? 30 : suit.baseValue
        breakdown.overtrickPoints = overtricks * perOvertrick
      } else if (double.id === 'doubled') {
        const perOvertrick = isVulnerable ? 200 : 100
        breakdown.overtrickPoints = overtricks * perOvertrick
      } else if (double.id === 'redoubled') {
        const perOvertrick = isVulnerable ? 400 : 200
        breakdown.overtrickPoints = overtricks * perOvertrick
      }
    }

    // 3. Game vs Part-Score Bonus
    // Game threshold is 100 trick points
    if (breakdown.trickPoints >= 100) {
      breakdown.gameBonus = isVulnerable ? 500 : 300
    } else {
      breakdown.partScoreBonus = 50
    }

    // 4. Slam Bonus
    if (level === 6) {
      // Small Slam (12 tricks bid and made)
      breakdown.slamBonus = isVulnerable ? 750 : 500
    } else if (level === 7) {
      // Grand Slam (13 tricks bid and made)
      breakdown.slamBonus = isVulnerable ? 1500 : 1000
    }

    // 5. Insult Bonus for making doubled/redoubled contract
    if (double.id === 'doubled') {
      breakdown.insultBonus = 50
    } else if (double.id === 'redoubled') {
      breakdown.insultBonus = 100
    }

    breakdown.totalScore = 
      breakdown.trickPoints + 
      breakdown.overtrickPoints + 
      breakdown.gameBonus + 
      breakdown.partScoreBonus + 
      breakdown.slamBonus + 
      breakdown.insultBonus
  } else {
    // Contract Defeated / Down (Undertricks)
    const undertricks = Math.abs(diff)

    if (double.id === 'undoubled') {
      const perUndertrick = isVulnerable ? 100 : 50
      breakdown.undertrickPenalty = undertricks * perUndertrick
    } else if (double.id === 'doubled') {
      if (!isVulnerable) {
        // NV Doubled: 1st down = 100, 2nd & 3rd = 200 each, 4th+ = 300 each
        let pen = 100
        if (undertricks >= 2) pen += 200
        if (undertricks >= 3) pen += 200
        if (undertricks >= 4) pen += (undertricks - 3) * 300
        breakdown.undertrickPenalty = pen
      } else {
        // V Doubled: 1st down = 200, 2nd+ = 300 each
        let pen = 200
        if (undertricks >= 2) pen += (undertricks - 1) * 300
        breakdown.undertrickPenalty = pen
      }
    } else if (double.id === 'redoubled') {
      // Redoubled is exactly 2x Doubled penalty
      let baseDoubledPen = 0
      if (!isVulnerable) {
        let pen = 100
        if (undertricks >= 2) pen += 200
        if (undertricks >= 3) pen += 200
        if (undertricks >= 4) pen += (undertricks - 3) * 300
        baseDoubledPen = pen
      } else {
        let pen = 200
        if (undertricks >= 2) pen += (undertricks - 1) * 300
        baseDoubledPen = pen
      }
      breakdown.undertrickPenalty = baseDoubledPen * 2
    }

    // Negative score for declarer team
    breakdown.totalScore = -breakdown.undertrickPenalty
  }

  return {
    isMade,
    diff,
    targetTricks,
    breakdown,
    scoreDelta: breakdown.totalScore
  }
}
