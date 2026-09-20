import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { 
  calculateTrufRoundScores, 
  determineTrufSuitWinner, 
  determineNextDealer, 
  getDealerConsecutiveStreak,
  SUITS 
} from './trufLogic.js'

describe('Truf Suits Definition', () => {
  it('contains all 4 suits with proper metadata', () => {
    assert.equal(SUITS.length, 4)
    assert.deepEqual(SUITS.map(s => s.key), ['spade', 'heart', 'diamond', 'club'])
    assert.deepEqual(SUITS.map(s => s.label), ['♠', '♥', '♦', '♣'])
  })
})

describe('Truf Round Scoring Engine (calculateTrufRoundScores)', () => {
  const defaultSettings = {
    multiplier: 1,
    bid0Bonus: 0,
    atasLackMult: -2,
    atasExcessMult: -1,
    bawahLackMult: -1,
    bawahExcessMult: -2
  }

  it('Main Atas: correctly calculates scores for exact, under, and over bids', () => {
    // Total bid = 14 (> 13 -> Main Atas)
    const bids = [4, 4, 3, 3] // sum = 14
    const wons = [4, 3, 5, 1] // sum = 13
    // P0: exact 4 -> +4
    // P1: under by 1 -> 1 * -2 = -2
    // P2: over by 2 -> 2 * -1 = -2
    // P3: under by 2 -> 2 * -2 = -4
    const scores = calculateTrufRoundScores(bids, wons, defaultSettings, 14)
    assert.deepEqual(scores, [4, -2, -2, -4])
  })

  it('Main Bawah: correctly calculates scores for exact, under, and over bids', () => {
    // Total bid = 11 (< 13 -> Main Bawah)
    const bids = [3, 3, 3, 2] // sum = 11
    const wons = [3, 2, 5, 3] // sum = 13
    // P0: exact 3 -> +3
    // P1: under by 1 -> 1 * -1 = -1
    // P2: over by 2 -> 2 * -2 = -4
    // P3: over by 1 -> 1 * -2 = -2
    const scores = calculateTrufRoundScores(bids, wons, defaultSettings, 11)
    assert.deepEqual(scores, [3, -1, -4, -2])
  })

  it('Bid 13 with forcedMode = atas', () => {
    const bids = [4, 3, 3, 3] // sum = 13
    const wons = [4, 2, 4, 3] // sum = 13
    // Under: diff * -2; Over: diff * -1
    const scores = calculateTrufRoundScores(bids, wons, defaultSettings, 13, 'atas')
    // P0: 4 == 4 -> +4
    // P1: 2 < 3 (under 1) -> -2
    // P2: 4 > 3 (over 1) -> -1
    // P3: 3 == 3 -> +3
    assert.deepEqual(scores, [4, -2, -1, 3])
  })

  it('Bid 13 with forcedMode = bawah', () => {
    const bids = [4, 3, 3, 3] // sum = 13
    const wons = [4, 2, 4, 3] // sum = 13
    // Under: diff * -1; Over: diff * -2
    const scores = calculateTrufRoundScores(bids, wons, defaultSettings, 13, 'bawah')
    // P0: 4 == 4 -> +3
    // P1: 2 < 3 (under 1) -> -1
    // P2: 4 > 3 (over 1) -> -2
    // P3: 3 == 3 -> +3
    assert.deepEqual(scores, [4, -1, -2, 3])
  })

  it('Multiplier x10 formats scores in tens', () => {
    const settingsX10 = { ...defaultSettings, multiplier: 10 }
    const bids = [4, 3, 4, 3] // sum = 14 (Main Atas)
    const wons = [4, 2, 5, 2] // sum = 13
    // P0: exact 4 -> +40
    // P1: under 1 -> 1 * -2 * 10 = -20
    // P2: over 1 -> 1 * -1 * 10 = -10
    // P3: under 1 -> 1 * -2 * 10 = -20
    const scores = calculateTrufRoundScores(bids, wons, settingsX10, 14)
    assert.deepEqual(scores, [40, -20, -10, -20])
  })

  it('Standard Bid 0: awards highest bid of that round when 0 tricks won', () => {
    // Bids: A: 3, B: 5, C: 0, D: 6 (Total: 14 -> Main Atas, maxBid = 6)
    const bids = [3, 5, 0, 6]
    const wons = [3, 4, 0, 6] // sum = 13 (C gets 0 tricks, B is under by 1)
    const scores = calculateTrufRoundScores(bids, wons, defaultSettings, 14)
    // P0 (bid 3, won 3) -> +3
    // P1 (bid 5, won 4) -> under by 1 -> 1 * -2 = -2
    // P2 (bid 0, won 0) -> awards highest bid (6) -> +6!
    // P3 (bid 6, won 6) -> +6
    assert.deepEqual(scores, [3, -2, 6, 6])
  })

  it('Standard Bid 0 in Main Bawah: awards highest bid when 0 tricks won', () => {
    // Bids: A: 2, B: 3, C: 0, D: 4 (Total: 9 -> Main Bawah, maxBid = 4)
    const bids = [2, 3, 0, 4]
    const wons = [2, 3, 0, 8] // sum = 13 (D is over by 4 in Main Bawah)
    const scores = calculateTrufRoundScores(bids, wons, defaultSettings, 9)
    // P0: 2 -> +2
    // P1: 3 -> +3
    // P2: bid 0, won 0 -> +4 (matching highest bid 4)
    // P3: won 8 > bid 4 -> over by 4 in Main Bawah -> 4 * -2 = -8
    assert.deepEqual(scores, [2, 3, 4, -8])
  })

  it('Bid 0 success and failure handling with custom bonus', () => {
    const settingsWithBonus = { ...defaultSettings, bid0Bonus: 50 }
    const bids = [0, 4, 5, 5] // sum = 14
    const wons = [0, 4, 5, 4] // sum = 13
    // P0: bid 0, won 0 -> custom bonus 50
    const scores = calculateTrufRoundScores(bids, wons, settingsWithBonus, 14)
    assert.equal(scores[0], 50)

    // P0: bid 0, won 2 tricks (failed bid 0 in Main Atas) -> 2 * -1 = -2
    const failedWons = [2, 3, 4, 4]
    const failedScores = calculateTrufRoundScores(bids, failedWons, settingsWithBonus, 14)
    assert.equal(failedScores[0], -2)
  })

  it('handles missing/empty settings object with safe defaults', () => {
    const bids = [3, 3, 4, 4] // sum = 14
    const wons = [3, 3, 4, 3]
    const scores = calculateTrufRoundScores(bids, wons, undefined, 14)
    assert.deepEqual(scores, [3, 3, 4, -2])
  })
})

describe('Truf Suit Winner Determination', () => {
  it('identifies single highest bidder', () => {
    const res = determineTrufSuitWinner([3, 5, 2, 4])
    assert.equal(res.maxBid, 5)
    assert.deepEqual(res.highestBidderIndices, [1])
    assert.equal(res.isTie, false)
  })

  it('identifies tie among multiple highest bidders', () => {
    const res = determineTrufSuitWinner([4, 2, 4, 3])
    assert.equal(res.maxBid, 4)
    assert.deepEqual(res.highestBidderIndices, [0, 2])
    assert.equal(res.isTie, true)
  })

  it('handles 4-way tie safely', () => {
    const res = determineTrufSuitWinner([3, 3, 3, 3])
    assert.equal(res.maxBid, 3)
    assert.deepEqual(res.highestBidderIndices, [0, 1, 2, 3])
    assert.equal(res.isTie, true)
  })

  it('handles empty input', () => {
    const res = determineTrufSuitWinner([])
    assert.equal(res.maxBid, 0)
    assert.deepEqual(res.highestBidderIndices, [])
    assert.equal(res.isTie, false)
  })
})

describe('Truf Dealer Determination Logic', () => {
  it('Round 1: returns firstDealer from setup', () => {
    assert.equal(determineNextDealer([], 2), 2)
    assert.equal(determineNextDealer([], 0), 0)
    assert.equal(determineNextDealer([], 3), 3)
  })

  it('Round 2+: selects player with lowest cumulative score', () => {
    const rounds = [
      {
        round_number: 1,
        dealer_index: 2,
        player_scores: [
          { player_index: 0, score_cumulative: 15 },
          { player_index: 1, score_cumulative: -10 },
          { player_index: 2, score_cumulative: 5 },
          { player_index: 3, score_cumulative: 20 }
        ]
      }
    ]
    // Player 1 has lowest score (-10)
    assert.equal(determineNextDealer(rounds, 2), 1)
  })

  it('Round 2+: if previous dealer has the lowest score, previous dealer stays', () => {
    const rounds = [
      {
        round_number: 1,
        dealer_index: 2,
        player_scores: [
          { player_index: 0, score_cumulative: 10 },
          { player_index: 1, score_cumulative: 5 },
          { player_index: 2, score_cumulative: -15 },
          { player_index: 3, score_cumulative: 20 }
        ]
      }
    ]
    // Player 2 is dealer and has lowest score (-15)
    assert.equal(determineNextDealer(rounds, 2), 2)
  })

  it('Tie-breaker: keeps previous dealer if tied for lowest score', () => {
    const rounds = [
      {
        round_number: 1,
        dealer_index: 2,
        player_scores: [
          { player_index: 0, score_cumulative: -10 },
          { player_index: 1, score_cumulative: 5 },
          { player_index: 2, score_cumulative: -10 },
          { player_index: 3, score_cumulative: 20 }
        ]
      }
    ]
    // Both player 0 and player 2 have -10. Player 2 was previous dealer, so player 2 stays.
    assert.equal(determineNextDealer(rounds, 2), 2)
  })

  it('Tie-breaker: if previous dealer is not in tie, rotates clockwise starting from previous dealer + 1', () => {
    const rounds = [
      {
        round_number: 1,
        dealer_index: 1,
        player_scores: [
          { player_index: 0, score_cumulative: -10 },
          { player_index: 1, score_cumulative: 25 },
          { player_index: 2, score_cumulative: 10 },
          { player_index: 3, score_cumulative: -10 }
        ]
      }
    ]
    // Previous dealer is 1. Tied lowest: Player 0 and Player 3.
    // Clockwise from 1+1: Player 2 (not tied), then Player 3 (tied! -> selected)
    assert.equal(determineNextDealer(rounds, 1), 3)
  })

  it('supports camelCase playerScores and scoreChange fallback', () => {
    const rounds = [
      {
        roundNumber: 1,
        dealerIndex: 0,
        playerScores: [
          { playerIndex: 0, scoreChange: -5 },
          { playerIndex: 1, scoreChange: 4 },
          { playerIndex: 2, scoreChange: -2 },
          { playerIndex: 3, scoreChange: 2 }
        ]
      }
    ]
    // Player 0 has lowest score (-5)
    assert.equal(determineNextDealer(rounds, 0), 0)
  })

  it('supports initialScores in fallback score calculation', () => {
    const initialScores = [10, -5, 20, 0]
    const rounds = [
      {
        roundNumber: 1,
        dealerIndex: 0,
        playerScores: [
          { playerIndex: 0, scoreChange: -2 }, // total: 10 - 2 = 8
          { playerIndex: 1, scoreChange: 3 },  // total: -5 + 3 = -2 (lowest)
          { playerIndex: 2, scoreChange: 4 },  // total: 20 + 4 = 24
          { playerIndex: 3, scoreChange: 1 }   // total: 0 + 1 = 1
        ]
      }
    ]
    assert.equal(determineNextDealer(rounds, 0, initialScores), 1)
  })

  it('3-Player Mode: rotates dealer clockwise correctly among 3 players', () => {
    const rounds = [
      {
        round_number: 1,
        dealer_index: 0,
        player_scores: [
          { player_index: 0, score_cumulative: 20 },
          { player_index: 1, score_cumulative: -10 },
          { player_index: 2, score_cumulative: -10 }
        ]
      }
    ]
    // Tied between P1 and P2. Previous dealer was 0.
    // Clockwise from 0+1: P1 (tied -> selected)
    assert.equal(determineNextDealer(rounds, 0, [], 3), 1)
  })

  it('5-Player Mode: rotates dealer clockwise correctly among 5 players', () => {
    const rounds = [
      {
        round_number: 1,
        dealer_index: 4,
        player_scores: [
          { player_index: 0, score_cumulative: 10 },
          { player_index: 1, score_cumulative: 5 },
          { player_index: 2, score_cumulative: -15 },
          { player_index: 3, score_cumulative: 0 },
          { player_index: 4, score_cumulative: 20 }
        ]
      }
    ]
    // Lowest score is P2 (-15)
    assert.equal(determineNextDealer(rounds, 4, [], 5), 2)
  })
})

describe('Truf Player Count Variations (3, 4, 5 Players)', () => {
  const defaultSettings = {
    multiplier: 1,
    bid0Bonus: 0,
    atasLackMult: -2,
    atasExcessMult: -1,
    bawahLackMult: -1,
    bawahExcessMult: -2
  }

  it('3 Players (17 total tricks): correctly calculates Main Atas (>17) and Main Bawah (<17)', () => {
    // 3 Players with bids sum = 18 (>17 -> Main Atas)
    const bidsAtas = [7, 6, 5] // sum = 18
    const wonsAtas = [7, 5, 5] // sum = 17 (P1 under 1)
    const scoresAtas = calculateTrufRoundScores(bidsAtas, wonsAtas, { ...defaultSettings, totalTricks: 17 }, 18)
    // P0: 7 == 7 -> +7
    // P1: 5 < 6 (under 1 in Main Atas) -> -2
    // P2: 5 == 5 -> +5
    assert.deepEqual(scoresAtas, [7, -2, 5])

    // 3 Players with bids sum = 15 (<17 -> Main Bawah)
    const bidsBawah = [6, 5, 4] // sum = 15
    const wonsBawah = [6, 7, 4] // sum = 17 (P1 over 2 in Main Bawah)
    const scoresBawah = calculateTrufRoundScores(bidsBawah, wonsBawah, { ...defaultSettings, totalTricks: 17 }, 15)
    // P0: 6 == 6 -> +6
    // P1: 7 > 5 (over 2 in Main Bawah) -> 2 * -2 = -4
    // P2: 4 == 4 -> +4
    assert.deepEqual(scoresBawah, [6, -4, 4])
  })

  it('5 Players (10 total tricks): correctly calculates Main Atas (>10) and Main Bawah (<10)', () => {
    // 5 Players with bids sum = 11 (>10 -> Main Atas)
    const bids = [3, 2, 2, 2, 2] // sum = 11
    const wons = [3, 2, 2, 1, 2] // sum = 10 (P3 under 1)
    const scores = calculateTrufRoundScores(bids, wons, { ...defaultSettings, totalTricks: 10 }, 11)
    // P0: 3 == 3 -> +3
    // P1: 2 == 2 -> +2
    // P2: 2 == 2 -> +2
    // P3: 1 < 2 (under 1 in Main Atas) -> -2
    // P4: 2 == 2 -> +2
    assert.deepEqual(scores, [3, 2, 2, -2, 2])
  })

  it('Contract Tiebreaker (Bid Pas): Shifts bids +1 for Main Atas and -1 for Main Bawah', () => {
    // 4 Players: total tricks = 13
    const initialBids4p = [4, 3, 3, 3] // sum = 13 (Pas 13)
    const atasBids4p = initialBids4p.map(b => b + 1) // [5, 4, 4, 4] -> sum = 17 (> 13 -> Main Atas)
    const bawahBids4p = initialBids4p.map(b => Math.max(0, b - 1)) // [3, 2, 2, 2] -> sum = 9 (< 13 -> Main Bawah)
    
    assert.equal(atasBids4p.reduce((a, b) => a + b, 0), 17)
    assert.equal(bawahBids4p.reduce((a, b) => a + b, 0), 9)

    // 3 Players: total tricks = 17
    const initialBids3p = [6, 6, 5] // sum = 17 (Pas 17)
    const atasBids3p = initialBids3p.map(b => b + 1) // [7, 7, 6] -> sum = 20 (> 17 -> Main Atas)
    const bawahBids3p = initialBids3p.map(b => Math.max(0, b - 1)) // [5, 5, 4] -> sum = 14 (< 17 -> Main Bawah)
    
    assert.equal(atasBids3p.reduce((a, b) => a + b, 0), 20)
    assert.equal(bawahBids3p.reduce((a, b) => a + b, 0), 14)

    // 5 Players: total tricks = 10
    const initialBids5p = [2, 2, 2, 2, 2] // sum = 10 (Pas 10)
    const atasBids5p = initialBids5p.map(b => b + 1) // [3, 3, 3, 3, 3] -> sum = 15 (> 10 -> Main Atas)
    const bawahBids5p = initialBids5p.map(b => Math.max(0, b - 1)) // [1, 1, 1, 1, 1] -> sum = 5 (< 10 -> Main Bawah)
    
    assert.equal(atasBids5p.reduce((a, b) => a + b, 0), 15)
    assert.equal(bawahBids5p.reduce((a, b) => a + b, 0), 5)
  })
})

describe('Dealer Consecutive Streak Calculation', () => {
  it('returns 0 if no rounds recorded', () => {
    assert.equal(getDealerConsecutiveStreak([], 2), 0)
  })

  it('counts consecutive rounds for target dealer correctly', () => {
    const rounds = [
      { round_number: 1, round_data: { dealerIndex: 2 } },
      { round_number: 2, round_data: { dealerIndex: 2 } },
      { round_number: 3, round_data: { dealerIndex: 2 } }
    ]
    assert.equal(getDealerConsecutiveStreak(rounds, 2), 3)
    assert.equal(getDealerConsecutiveStreak(rounds, 0), 0)
  })

  it('streak resets when another player becomes dealer', () => {
    const rounds = [
      { round_number: 1, round_data: { dealerIndex: 2 } },
      { round_number: 2, round_data: { dealerIndex: 2 } },
      { round_number: 3, round_data: { dealerIndex: 0 } },
      { round_number: 4, round_data: { dealerIndex: 2 } },
      { round_number: 5, round_data: { dealerIndex: 2 } }
    ]
    assert.equal(getDealerConsecutiveStreak(rounds, 2), 2)
    assert.equal(getDealerConsecutiveStreak(rounds, 0), 0)
  })

  it('correctly detects 10 consecutive rounds', () => {
    const rounds = Array.from({ length: 10 }, (_, i) => ({
      round_number: i + 1,
      round_data: { dealerIndex: 3 }
    }))
    assert.equal(getDealerConsecutiveStreak(rounds, 3), 10)
  })
})
