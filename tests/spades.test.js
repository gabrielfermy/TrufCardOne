import test from 'node:test'
import assert from 'node:assert'
import { calculateSpadesRound } from '../src/tools/spades/spadesLogic.js'

test('Spades: Team makes contract with 2 bags (Target 6, Won 8) -> +62 points and 2 bags', () => {
  const players = [
    { id: 'p0', teamId: 'team_a', bid: 3, won: 4 },
    { id: 'p2', teamId: 'team_a', bid: 3, won: 4 },
    { id: 'p1', teamId: 'team_b', bid: 4, won: 3 }, // Set
    { id: 'p3', teamId: 'team_b', bid: 3, won: 2 }  // Team B total bid = 7, won = 5
  ]

  const res = calculateSpadesRound({ players }, {}, { team_a: 0, team_b: 0 })

  // Team A: 6 bid * 10 = 60 + 2 bags = 62 pts
  assert.strictEqual(res.roundDeltas.team_a, 62)
  assert.strictEqual(res.newBags.team_a, 2)

  // Team B: 7 bid, won 5 -> Set (-70 pts)
  assert.strictEqual(res.roundDeltas.team_b, -70)
  assert.strictEqual(res.newBags.team_b, 0)
})

test('Spades: Nil bid success (+100 pts) and partner makes contract', () => {
  const players = [
    { id: 'p0', teamId: 'team_a', bid: 0, isNil: true, won: 0 }, // Nil made! +100
    { id: 'p2', teamId: 'team_a', bid: 4, won: 5 },              // Partner bid 4, won 5 -> +41
    { id: 'p1', teamId: 'team_b', bid: 4, won: 4 },
    { id: 'p3', teamId: 'team_b', bid: 4, won: 4 }
  ]

  const res = calculateSpadesRound({ players }, {}, { team_a: 0, team_b: 0 })

  // Team A: 100 (Nil) + 41 (Partner made with 1 bag) = +141
  assert.strictEqual(res.roundDeltas.team_a, 141)
  assert.strictEqual(res.newBags.team_a, 1)
})

test('Spades: Nil bid failed (-100 pts) and extra tricks count as bags', () => {
  const players = [
    { id: 'p0', teamId: 'team_a', bid: 0, isNil: true, won: 2 }, // Nil failed! -100
    { id: 'p2', teamId: 'team_a', bid: 4, won: 4 },              // Partner made: +40
    { id: 'p1', teamId: 'team_b', bid: 4, won: 4 },
    { id: 'p3', teamId: 'team_b', bid: 3, won: 3 }
  ]

  const res = calculateSpadesRound({ players }, {}, { team_a: 0, team_b: 0 })

  // Team A: -100 (Nil failed) + 40 (Partner contract) = -60. Bags = 2 from the failed nil
  assert.strictEqual(res.roundDeltas.team_a, -60)
  assert.strictEqual(res.newBags.team_a, 2)
})

test('Spades: Accumulating 10 bags triggers -100 point penalty and resets bags modulo 10', () => {
  const players = [
    { id: 'p0', teamId: 'team_a', bid: 4, won: 6 }, // 2 bags
    { id: 'p2', teamId: 'team_a', bid: 1, isNil: false, won: 1 },
    { id: 'p1', teamId: 'team_b', bid: 3, won: 3 },
    { id: 'p3', teamId: 'team_b', bid: 3, won: 3 }
  ]

  // Team A target = 5, won = 7 (2 bags). Starts with 9 bags -> 9 + 2 = 11 bags -> Penalty (-100 pts), remaining = 1
  const res = calculateSpadesRound({ players }, {}, { team_a: 9, team_b: 0 })

  // Contract: +50 + 2 bags = +52. Penalty: -100. Net = -48.
  assert.strictEqual(res.bagPenaltiesTriggered.team_a, true)
  assert.strictEqual(res.roundDeltas.team_a, -48)
  assert.strictEqual(res.newBags.team_a, 1)
})
