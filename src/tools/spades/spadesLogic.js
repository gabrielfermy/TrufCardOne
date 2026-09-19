/**
 * spadesLogic.js
 * Classic Partnership (2v2) & Solo Cutthroat Spades Scoring Engine with Nil & Sandbag Tracking
 */

export const SPADES_MODES = {
  PARTNERSHIP_2V2: 'partnership_2v2',
  SOLO_CUTTHROAT: 'solo_cutthroat'
}

export const SPADES_BID_SPECIAL = {
  NORMAL: 'normal',
  NIL: 'nil',
  BLIND_NIL: 'blind_nil'
}

/**
 * Calculates scores and bags for a Spades round
 * @param {Object} roundInput - {
 *   players: [{ id, name, teamId: 'team_a'|'team_b', bid: number, isNil: boolean, isBlindNil: boolean, won: number }]
 * }
 * @param {Object} settings - { nilBonus: 100, nilPenalty: 100, blindNilBonus: 200, blindNilPenalty: 200, bagPenalty: 100 }
 * @param {Object} currentBags - { team_a: number, team_b: number }
 */
export function calculateSpadesRound(roundInput = {}, settings = {}, currentBags = { team_a: 0, team_b: 0 }) {
  const {
    nilBonus = 100,
    nilPenalty = 100,
    blindNilBonus = 200,
    blindNilPenalty = 200,
    bagPenalty = 100
  } = settings

  const { players = [] } = roundInput
  const isPartnership = players.some(p => p.teamId)

  const teams = isPartnership ? ['team_a', 'team_b'] : players.map(p => p.id)
  const roundDeltas = {}
  const newBags = { ...currentBags }
  const bagPenaltiesTriggered = {}
  const details = {}

  teams.forEach(tId => {
    const teamPlayers = isPartnership ? players.filter(p => p.teamId === tId) : players.filter(p => p.id === tId)
    
    let teamTargetBid = 0
    let teamTricksForContract = 0
    let teamBags = 0
    let teamPoints = 0
    let nilPoints = 0

    teamPlayers.forEach(p => {
      const isNil = p.isNil || p.bid === 0
      const isBlindNil = p.isBlindNil

      if (isNil) {
        const bonus = isBlindNil ? blindNilBonus : nilBonus
        const penalty = isBlindNil ? blindNilPenalty : nilPenalty

        if (p.won === 0) {
          nilPoints += bonus
        } else {
          nilPoints -= penalty
          // Overtricks from failed nil count as bags
          teamBags += p.won
        }
      } else {
        teamTargetBid += Number(p.bid) || 0
        teamTricksForContract += Number(p.won) || 0
      }
    })

    // Evaluate Team Main Contract
    if (teamTargetBid > 0) {
      if (teamTricksForContract >= teamTargetBid) {
        // Made Contract
        teamPoints += teamTargetBid * 10
        const extraTricks = teamTricksForContract - teamTargetBid
        teamBags += extraTricks
        teamPoints += extraTricks // 1 pt per bag
      } else {
        // Failed / Set
        teamPoints -= teamTargetBid * 10
      }
    }

    // Cumulative Sandbagging Penalty Calculation
    const prevBags = currentBags[tId] || 0
    let totalAccBags = prevBags + teamBags
    let bagPenaltyDeduction = 0

    if (totalAccBags >= 10) {
      const penaltyMultiples = Math.floor(totalAccBags / 10)
      bagPenaltyDeduction = penaltyMultiples * bagPenalty
      teamPoints -= bagPenaltyDeduction
      totalAccBags = totalAccBags % 10
      bagPenaltiesTriggered[tId] = true
    } else {
      bagPenaltiesTriggered[tId] = false
    }

    newBags[tId] = totalAccBags

    const netTeamDelta = teamPoints + nilPoints
    roundDeltas[tId] = netTeamDelta

    details[tId] = {
      targetBid: teamTargetBid,
      tricksWon: teamTricksForContract,
      bagsEarned: teamBags,
      accBags: totalAccBags,
      bagPenaltyDeduction,
      nilPoints,
      netScore: netTeamDelta
    }
  })

  return {
    roundDeltas,
    newBags,
    bagPenaltiesTriggered,
    details
  }
}
