import test from 'node:test'
import assert from 'node:assert'
import {
  calculateCapsaSusunRound,
  calculateCapsaBantingRound,
  isLegalSusunArrangement,
  CAPSA_HAND_RANKS
} from '../src/tools/capsa/capsaLogic.js'

test('Capsa Susun: Legal arrangement validation', () => {
  // Legal: Bot (Fullhouse=6) >= Mid (Straight=4) >= Top (Pair=1)
  assert.strictEqual(isLegalSusunArrangement(1, 4, 6), true)
  // Legal: Equal ranks
  assert.strictEqual(isLegalSusunArrangement(2, 2, 2), true)
  // Illegal: Top > Mid
  assert.strictEqual(isLegalSusunArrangement(3, 1, 5), false)
  // Illegal: Mid > Bot
  assert.strictEqual(isLegalSusunArrangement(1, 7, 6), false)
})

test('Capsa Susun: Standard 4-player head-to-head comparison without sweep', () => {
  const players = [
    { id: 'p1', name: 'Alice', isPao: false, tiers: { top: 3, mid: 6, bot: 8 } },
    { id: 'p2', name: 'Bob', isPao: false, tiers: { top: 1, mid: 4, bot: 7 } },
    { id: 'p3', name: 'Charlie', isPao: false, tiers: { top: 2, mid: 5, bot: 5 } },
    { id: 'p4', name: 'David', isPao: false, tiers: { top: 0, mid: 2, bot: 4 } }
  ]

  const result = calculateCapsaSusunRound(players, { pointMultiplier: 1, sweepMultiplier: 2 })
  // Total deltas in closed economy must sum to 0
  const totalDelta = Object.values(result.roundDeltas).reduce((a, b) => a + b, 0)
  assert.strictEqual(totalDelta, 0)

  // Alice has superior ranks on all tiers over David & Bob & Charlie -> should have highest positive score
  assert.ok(result.roundDeltas.p1 > 0)
  assert.ok(result.roundDeltas.p4 < 0)
})

test('Capsa Susun: Pao (Salah Susun) penalty applies to each non-pao opponent', () => {
  const players = [
    { id: 'p1', name: 'Alice', isPao: true, tiers: { top: 5, mid: 2, bot: 1 } },
    { id: 'p2', name: 'Bob', isPao: false, tiers: { top: 3, mid: 5, bot: 7 } },
    { id: 'p3', name: 'Charlie', isPao: false, tiers: { top: 3, mid: 5, bot: 7 } }
  ]

  const result = calculateCapsaSusunRound(players, { paoPenalty: 9 })
  // Bob and Charlie tie with each other (0 delta), and both gain 9 from Alice
  assert.strictEqual(result.roundDeltas.p1, -18)
  assert.strictEqual(result.roundDeltas.p2, 9)
  assert.strictEqual(result.roundDeltas.p3, 9)
  const total = Object.values(result.roundDeltas).reduce((a, b) => a + b, 0)
  assert.strictEqual(total, 0)
})

test('Capsa Susun: Dragon instant win awards 13 points from every player', () => {
  const players = [
    { id: 'p1', name: 'Alice', specialComboId: 'dragon', isPao: false, tiers: {} },
    { id: 'p2', name: 'Bob', isPao: false, tiers: {} },
    { id: 'p3', name: 'Charlie', isPao: false, tiers: {} },
    { id: 'p4', name: 'David', isPao: false, tiers: {} }
  ]

  const result = calculateCapsaSusunRound(players, { pointMultiplier: 1 })
  assert.strictEqual(result.roundDeltas.p1, 39) // 13 * 3
  assert.strictEqual(result.roundDeltas.p2, -13)
  assert.strictEqual(result.roundDeltas.p3, -13)
  assert.strictEqual(result.roundDeltas.p4, -13)
})

test('Capsa Banting: Calculates standard single winner and unplayed cards penalty', () => {
  const players = [
    { id: 'p1', name: 'Winner', remainingCards: 0, cardsTwoCount: 0, bomsCount: 0 },
    { id: 'p2', name: 'Bob', remainingCards: 4, cardsTwoCount: 0, bomsCount: 0 },
    { id: 'p3', name: 'Charlie', remainingCards: 11, cardsTwoCount: 1, bomsCount: 0 }, // 11 cards (double) + 1 two
    { id: 'p4', name: 'David', remainingCards: 13, cardsTwoCount: 0, bomsCount: 1 }   // 13 cards (triple) + 1 bom
  ]

  const result = calculateCapsaBantingRound('p1', players, {
    pointMultiplier: 1,
    doubleAt10: true,
    tripleAt13: true,
    twoCardPenalty: 2,
    bomPenalty: 5
  })

  // Bob: 4 cards * 1 = -4
  assert.strictEqual(result.roundDeltas.p2, -4)
  // Charlie: (11 * 2) + 2 = -24
  assert.strictEqual(result.roundDeltas.p3, -24)
  // David: (13 * 3) + 5 = -44
  assert.strictEqual(result.roundDeltas.p4, -44)
  // Winner: 4 + 24 + 44 = +72
  assert.strictEqual(result.roundDeltas.p1, 72)

  const total = Object.values(result.roundDeltas).reduce((a, b) => a + b, 0)
  assert.strictEqual(total, 0)
})
