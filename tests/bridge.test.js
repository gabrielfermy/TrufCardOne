import test from 'node:test'
import assert from 'node:assert'
import { calculateBridgeScore, BRIDGE_SUITS } from '../src/tools/bridge/bridgeLogic.js'

test('Bridge: 4 Spades made exactly (Non-Vulnerable) -> 420 points', () => {
  // 4 Spades: Level 4, Spades, Undoubled, 10 tricks made.
  // Trick pts: 4 * 30 = 120 (Game >= 100). Game bonus NV = 300. Total = 420.
  const res = calculateBridgeScore({
    level: 4,
    suit: 'spades',
    doubled: 'undoubled'
  }, 10, false)

  assert.strictEqual(res.isMade, true)
  assert.strictEqual(res.breakdown.trickPoints, 120)
  assert.strictEqual(res.breakdown.gameBonus, 300)
  assert.strictEqual(res.scoreDelta, 420)
})

test('Bridge: 3 No Trump with 1 overtrick (Vulnerable) -> 630 points', () => {
  // 3NT: Level 3 (target 9 tricks), made 10 tricks (1 overtrick).
  // Trick pts: 40 + 30*2 = 100 (Game >= 100).
  // Game bonus V = 500. Overtrick pts (1 * 30) = 30. Total = 630.
  const res = calculateBridgeScore({
    level: 3,
    suit: 'notrump',
    doubled: 'undoubled'
  }, 10, true)

  assert.strictEqual(res.isMade, true)
  assert.strictEqual(res.breakdown.trickPoints, 100)
  assert.strictEqual(res.breakdown.overtrickPoints, 30)
  assert.strictEqual(res.breakdown.gameBonus, 500)
  assert.strictEqual(res.scoreDelta, 630)
})

test('Bridge: Part-score 2 Hearts made exactly (Non-Vulnerable) -> 110 points', () => {
  // 2 Hearts: Level 2 (target 8 tricks), made 8.
  // Trick pts: 2 * 30 = 60 (< 100). Part score bonus = 50. Total = 110.
  const res = calculateBridgeScore({
    level: 2,
    suit: 'hearts',
    doubled: 'undoubled'
  }, 8, false)

  assert.strictEqual(res.isMade, true)
  assert.strictEqual(res.breakdown.trickPoints, 60)
  assert.strictEqual(res.breakdown.partScoreBonus, 50)
  assert.strictEqual(res.scoreDelta, 110)
})

test('Bridge: Small Slam 6 Diamonds made (Vulnerable) -> 1370 points', () => {
  // 6 Diamonds: Level 6 (target 12 tricks), made 12.
  // Trick pts: 6 * 20 = 120 (Game >= 100).
  // Game bonus V = 500. Slam bonus V = 750. Total = 120 + 500 + 750 = 1370.
  const res = calculateBridgeScore({
    level: 6,
    suit: 'diamonds',
    doubled: 'undoubled'
  }, 12, true)

  assert.strictEqual(res.isMade, true)
  assert.strictEqual(res.breakdown.slamBonus, 750)
  assert.strictEqual(res.scoreDelta, 1370)
})

test('Bridge: Undertricks / Defeated Contract (Down 2 Doubled, Non-Vulnerable) -> -300 points', () => {
  // Contract target 10 tricks, made 8 (Down 2). NV Doubled: 1st down = 100, 2nd down = 200 -> Total -300.
  const res = calculateBridgeScore({
    level: 4,
    suit: 'hearts',
    doubled: 'doubled'
  }, 8, false)

  assert.strictEqual(res.isMade, false)
  assert.strictEqual(res.breakdown.undertrickPenalty, 300)
  assert.strictEqual(res.scoreDelta, -300)
})
