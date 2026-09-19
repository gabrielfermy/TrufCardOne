import test from 'node:test'
import assert from 'node:assert'
import {
  calculateGapleRound,
  evaluateQiuQiuHand,
  calculateQiuQiuRound,
  GAPLE_END_TYPES
} from '../src/tools/domino/dominoLogic.js'

test('Domino Gaple: Out (Normal Win) gives 0 penalty to winner and tallies pips for opponents', () => {
  const players = [
    { id: 'p1', name: 'Winner', remainingPips: 0, balakZerosCount: 0, balakSixesCount: 0 },
    { id: 'p2', name: 'Bob', remainingPips: 14, balakZerosCount: 0, balakSixesCount: 0 },
    { id: 'p3', name: 'Charlie', remainingPips: 8, balakZerosCount: 1, balakSixesCount: 0 }, // 8 + 10 = 18
    { id: 'p4', name: 'David', remainingPips: 5, balakZerosCount: 0, balakSixesCount: 1 }   // 5 + 12 = 17
  ]

  const result = calculateGapleRound({
    endType: GAPLE_END_TYPES.OUT,
    winnerId: 'p1',
    players
  }, {
    balakZeroPenalty: 10,
    balakSixPenalty: 12
  })

  assert.strictEqual(result.winnerId, 'p1')
  assert.strictEqual(result.roundPenalties.p1, 0)
  assert.strictEqual(result.roundPenalties.p2, 14)
  assert.strictEqual(result.roundPenalties.p3, 18)
  assert.strictEqual(result.roundPenalties.p4, 17)
})

test('Domino Gaple: Deadlock (Gaple Macet) where player with lowest pips wins', () => {
  const players = [
    { id: 'p1', name: 'Alice', remainingPips: 3, balakZerosCount: 0, balakSixesCount: 0 },
    { id: 'p2', name: 'Bob', remainingPips: 12, balakZerosCount: 0, balakSixesCount: 0 },
    { id: 'p3', name: 'Charlie', remainingPips: 6, balakZerosCount: 0, balakSixesCount: 0 }
  ]

  const result = calculateGapleRound({
    endType: GAPLE_END_TYPES.DEADLOCK,
    players
  }, { deadlockRule: 'lowest_wins' })

  assert.strictEqual(result.winnerId, 'p1')
  assert.strictEqual(result.roundPenalties.p1, 0)
  assert.strictEqual(result.roundPenalties.p2, 12)
  assert.strictEqual(result.roundPenalties.p3, 6)
})

test('Domino Gaple: Deadlock penalty causer punished rule', () => {
  const players = [
    { id: 'p1', name: 'Alice', remainingPips: 2 },
    { id: 'p2', name: 'Bob', remainingPips: 8 }, // Bob caused deadlock but had 8 pips (Alice had 2)
    { id: 'p3', name: 'Charlie', remainingPips: 10 }
  ]

  const result = calculateGapleRound({
    endType: GAPLE_END_TYPES.DEADLOCK,
    deadlockCauserPlayerId: 'p2',
    players
  }, { deadlockRule: 'causer_punished' })

  // Total table pips = 2 + 8 + 10 = 20
  assert.strictEqual(result.isCauserPenalized, true)
  assert.strictEqual(result.roundPenalties.p2, 20)
  assert.strictEqual(result.roundPenalties.p1, 0)
  assert.strictEqual(result.roundPenalties.p3, 0)
})

test('Domino QiuQiu: Special hand recognition (Six Devils, 4 Balak, Murni Kecil, Qiu Qiu)', () => {
  // 6 Dewa: 4 tiles all having 6 pips (e.g. 0-6, 1-5, 2-4, 3-3)
  const sixDevilsHand = [
    { top: 0, bot: 6 },
    { top: 1, bot: 5 },
    { top: 2, bot: 4 },
    { top: 3, bot: 3 }
  ]
  assert.strictEqual(evaluateQiuQiuHand(sixDevilsHand).specialHandId, 'six_devils')

  // 4 Balak: 4 doubles (e.g. 0-0, 1-1, 2-2, 3-3)
  const fourDoublesHand = [
    { top: 0, bot: 0 },
    { top: 1, bot: 1 },
    { top: 2, bot: 2 },
    { top: 3, bot: 3 }
  ]
  assert.strictEqual(evaluateQiuQiuHand(fourDoublesHand).specialHandId, 'four_doubles')

  // Murni Kecil: Total pips <= 9 (e.g. 0-0, 0-1, 0-2, 0-3 -> total 6)
  const murniKecilHand = [
    { top: 0, bot: 0 },
    { top: 0, bot: 1 },
    { top: 0, bot: 2 },
    { top: 0, bot: 3 }
  ]
  assert.strictEqual(evaluateQiuQiuHand(murniKecilHand).specialHandId, 'murni_kecil')

  // Qiu Qiu (9-9): e.g. (4-5=9) and (3-6=9)
  const qiuQiuHand = [
    { top: 2, bot: 2 }, // 4
    { top: 2, bot: 3 }, // 5  => 9
    { top: 1, bot: 2 }, // 3
    { top: 3, bot: 3 }  // 6  => 9
  ]
  assert.strictEqual(evaluateQiuQiuHand(qiuQiuHand).specialHandId, 'qiu_qiu')
})

test('Domino QiuQiu: Dealer vs players settlement calculation', () => {
  const players = [
    { id: 'dealer', name: 'Dealer', isDealer: true, rankValue: 80, betAmount: 0 }, // 8-0 hand
    { id: 'p1', name: 'Alice', isDealer: false, rankValue: 90, betAmount: 10, specialHandId: 'none' }, // 9-0 (wins)
    { id: 'p2', name: 'Bob', isDealer: false, rankValue: 70, betAmount: 10, specialHandId: 'none' }    // 7-0 (loses)
  ]

  const result = calculateQiuQiuRound(players)
  assert.strictEqual(result.roundDeltas.p1, 10)
  assert.strictEqual(result.roundDeltas.p2, -10)
  assert.strictEqual(result.roundDeltas.dealer, 0) // +10 from Bob, -10 to Alice

  const total = Object.values(result.roundDeltas).reduce((a, b) => a + b, 0)
  assert.strictEqual(total, 0)
})
