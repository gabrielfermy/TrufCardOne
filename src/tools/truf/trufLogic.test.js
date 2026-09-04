import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { determineNextDealer, getDealerConsecutiveStreak } from './trufLogic.js'

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
