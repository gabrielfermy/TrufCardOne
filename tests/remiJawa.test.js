import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  REMI_JAWA_POINTS,
  calculatePlayerScoreBreakdown,
  calculateRemiJawaRoundScores,
  determineRemiJawaNextDealer,
  getRemiJawaDealerStreak,
  formatDealerStreakStatus,
  checkRemiJawaGameOver
} from '../src/tools/remijawa/remiJawaLogic.js'

describe('Remi Jawa Scoring & Rule Engine Suite', () => {
  it('calculates player positive meld score correctly (Angka +1, Gambar +2, As +3)', () => {
    // 3 Angka (+3), 2 Gambar (+4), 1 As (+3) -> 10 pts
    const result = calculatePlayerScoreBreakdown({
      jadiAngka: 3,
      jadiGambar: 2,
      jadiAs: 1
    }, false)

    assert.equal(result.pointsJadi, 10)
    assert.equal(result.pointsMati, 0)
    assert.equal(result.pointsBonusTutup, 0)
    assert.equal(result.totalScoreChange, 10)
  })

  it('calculates player deadwood penalty correctly (Angka -1, Gambar -2, As -3, Joker -10)', () => {
    // 2 Angka (-2), 1 Gambar (-2), 1 As (-3), 1 Joker (-10) -> -17 pts
    const result = calculatePlayerScoreBreakdown({
      matiAngka: 2,
      matiGambar: 1,
      matiAs: 1,
      matiJoker: 1
    }, false)

    assert.equal(result.pointsJadi, 0)
    assert.equal(result.pointsMati, -17)
    assert.equal(result.totalScoreChange, -17)
  })

  it('calculates Tutup Atas bonus correctly (+10 pts)', () => {
    // Closer with 4 Angka jadi (+4) and Tutup Atas (+10) -> +14 pts
    const result = calculatePlayerScoreBreakdown({
      jadiAngka: 4
    }, true, 'atas', 'biasa', false)

    assert.equal(result.pointsBonusTutup, 10)
    assert.equal(result.totalScoreChange, 14)
  })

  it('calculates Tutup Bawah bonus correctly (+25 pts)', () => {
    const result = calculatePlayerScoreBreakdown({
      jadiAngka: 3
    }, true, 'bawah', 'biasa', false)

    assert.equal(result.pointsBonusTutup, 25)
    assert.equal(result.totalScoreChange, 28)
  })

  it('calculates Tutup with As bonus (+5 pts)', () => {
    // Tutup Atas (+10) + As (+5) = 15 bonus
    const resultAtas = calculatePlayerScoreBreakdown({}, true, 'atas', 'as', false)
    assert.equal(resultAtas.pointsBonusTutup, 15)

    // Tutup Bawah (+25) + As (+5) = 30 bonus
    const resultBawah = calculatePlayerScoreBreakdown({}, true, 'bawah', 'as', false)
    assert.equal(resultBawah.pointsBonusTutup, 30)
  })

  it('calculates Tutup with Joker bonus (+15 pts)', () => {
    // Tutup Atas (+10) + Joker (+15) = 25 bonus
    const resultAtas = calculatePlayerScoreBreakdown({}, true, 'atas', 'joker', false)
    assert.equal(resultAtas.pointsBonusTutup, 25)

    // Tutup Bawah (+25) + Joker (+15) = 40 bonus
    const resultBawah = calculatePlayerScoreBreakdown({}, true, 'bawah', 'joker', false)
    assert.equal(resultBawah.pointsBonusTutup, 40)
  })

  it('handles Deck Empty / No Closer scenario (0 bonus tutup)', () => {
    const roundScores = calculateRemiJawaRoundScores({
      playersData: [
        { jadiAngka: 3, matiAngka: 2 }, // +3 - 2 = +1
        { jadiGambar: 2, matiGambar: 2 }, // +4 - 4 = 0
        { matiAs: 2 }, // -6
        { jadiAs: 1, matiAngka: 4 } // +3 - 4 = -1
      ],
      closerIndex: 0,
      isDeckEmpty: true
    })

    assert.equal(roundScores[0].pointsBonusTutup, 0)
    assert.equal(roundScores[0].totalScoreChange, 1)
    assert.equal(roundScores[1].totalScoreChange, 0)
    assert.equal(roundScores[2].totalScoreChange, -6)
    assert.equal(roundScores[3].totalScoreChange, -1)
  })
})

describe('Remi Jawa Dealer Logic & Streak Suite', () => {
  it('returns firstDealer for round 1', () => {
    const nextDealer = determineRemiJawaNextDealer([], 2, 4)
    assert.equal(nextDealer, 2)
  })

  it('assigns next dealer to player with lowest round score', () => {
    const rounds = [
      {
        dealer_index: 0,
        player_scores: [
          { player_index: 0, score_change: 15 },
          { player_index: 1, score_change: 2 },
          { player_index: 2, score_change: -8 }, // Lowest
          { player_index: 3, score_change: 4 }
        ]
      }
    ]

    const nextDealer = determineRemiJawaNextDealer(rounds, 0, 4)
    assert.equal(nextDealer, 2)
  })

  it('tie-breaker: retains previous dealer if previous dealer is among tied lowest scorers', () => {
    const rounds = [
      {
        dealer_index: 1,
        player_scores: [
          { player_index: 0, score_change: 10 },
          { player_index: 1, score_change: -5 }, // Tie lowest & was dealer
          { player_index: 2, score_change: 20 },
          { player_index: 3, score_change: -5 }  // Tie lowest
        ]
      }
    ]

    const nextDealer = determineRemiJawaNextDealer(rounds, 1, 4)
    assert.equal(nextDealer, 1)
  })

  it('tie-breaker: rotates clockwise if previous dealer is not in tied lowest scorers', () => {
    const rounds = [
      {
        dealer_index: 0,
        player_scores: [
          { player_index: 0, score_change: 25 },
          { player_index: 1, score_change: -4 }, // Tied lowest (step 1 clockwise from 0)
          { player_index: 2, score_change: 10 },
          { player_index: 3, score_change: -4 }  // Tied lowest (step 3 clockwise from 0)
        ]
      }
    ]

    const nextDealer = determineRemiJawaNextDealer(rounds, 0, 4)
    assert.equal(nextDealer, 1)
  })

  it('calculates consecutive dealer streak accurately', () => {
    const rounds = [
      { round_data: { dealerIndex: 0 } },
      { round_data: { dealerIndex: 2 } },
      { round_data: { dealerIndex: 2 } },
      { round_data: { dealerIndex: 2 } }
    ]

    assert.equal(getRemiJawaDealerStreak(rounds, 2), 3)
    assert.equal(getRemiJawaDealerStreak(rounds, 0), 0)
  })

  it('formats CHOLOKOPOK streak word properly', () => {
    const formatted3 = formatDealerStreakStatus(3, 'CHOLOKOPOK', 'word')
    assert.equal(formatted3.activeCount, 3)
    assert.equal(formatted3.maxLimit, 10)
    assert.equal(formatted3.activeLetters, 'C-H-O')
    assert.equal(formatted3.isLimitReached, false)

    const formatted10 = formatDealerStreakStatus(10, 'CHOLOKOPOK', 'word')
    assert.equal(formatted10.activeCount, 10)
    assert.equal(formatted10.isLimitReached, true)
    assert.equal(formatted10.activeLetters, 'C-H-O-L-O-K-O-P-O-K')
  })

  it('evaluates Game Over conditions correctly', () => {
    // 1. Streak limit game over
    const streakGameOver = checkRemiJawaGameOver([50, 40, 30, 20], 10, { streakLimit: 10 })
    assert.equal(streakGameOver.isGameOver, true)
    assert.equal(streakGameOver.reason, 'dealer_streak')

    // 2. Target win score reached
    const winGameOver = checkRemiJawaGameOver([80, 115, 90, 70], 2, { targetWin: 100, streakLimit: 10 })
    assert.equal(winGameOver.isGameOver, true)
    assert.equal(winGameOver.reason, 'target_win')
    assert.equal(winGameOver.winnerIndex, 1)

    // 3. Not game over
    const activeGame = checkRemiJawaGameOver([40, 50, 60, 70], 3, { targetWin: 100, streakLimit: 10 })
    assert.equal(activeGame.isGameOver, false)
  })
})
