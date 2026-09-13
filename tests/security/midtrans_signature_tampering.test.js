import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'

/**
 * Helper to compute Midtrans SHA-512 signature
 */
function computeMidtransSignature(orderId, statusCode, grossAmount, serverKey) {
  const payload = `${orderId}${statusCode}${grossAmount}${serverKey}`
  return crypto.createHash('sha512').update(payload).digest('hex')
}

/**
 * Helper simulating the Edge Function signature verification logic
 */
function verifyMidtransWebhook({ order_id, status_code, gross_amount, signature_key }, serverKey) {
  const expectedSignature = computeMidtransSignature(order_id, status_code, gross_amount, serverKey)
  return signature_key === expectedSignature
}

test('Security VAPT: Midtrans Cryptographic Signature & Anti-Tampering Suite', async (t) => {
  const SERVER_KEY = 'SB-Mid-server-test-sandbox-secret-123'
  const ORDER_ID = 'KANCA-PRO-TEST-9988'
  const GROSS_AMOUNT = '129000.00'
  const STATUS_CODE = '200'

  const validSignature = computeMidtransSignature(ORDER_ID, STATUS_CODE, GROSS_AMOUNT, SERVER_KEY)

  await t.test('accepts authentic webhook notifications with valid SHA-512 signature', () => {
    const isValid = verifyMidtransWebhook({
      order_id: ORDER_ID,
      status_code: STATUS_CODE,
      gross_amount: GROSS_AMOUNT,
      signature_key: validSignature,
    }, SERVER_KEY)

    assert.strictEqual(isValid, true, 'Valid signature must be verified successfully')
  })

  await t.test('detects and rejects price/amount tampering attacks', () => {
    // Hacker attempts to modify gross_amount from 129000 to 1000 without server key
    const tamperedPayload = {
      order_id: ORDER_ID,
      status_code: STATUS_CODE,
      gross_amount: '1000.00', // Tampered amount!
      signature_key: validSignature,
    }

    const isValid = verifyMidtransWebhook(tamperedPayload, SERVER_KEY)
    assert.strictEqual(isValid, false, 'Tampered amount must be rejected')
  })

  await t.test('detects and rejects order_id spoofing attacks', () => {
    // Hacker attempts to credit another user order ID with an existing signature
    const tamperedPayload = {
      order_id: 'KANCA-PRO-VICTIM-0001',
      status_code: STATUS_CODE,
      gross_amount: GROSS_AMOUNT,
      signature_key: validSignature,
    }

    const isValid = verifyMidtransWebhook(tamperedPayload, SERVER_KEY)
    assert.strictEqual(isValid, false, 'Spoofed order_id must be rejected')
  })

  await t.test('rejects forged signatures with wrong server secret key', () => {
    const forgedSignature = computeMidtransSignature(ORDER_ID, STATUS_CODE, GROSS_AMOUNT, 'ATTACKER_FAKE_KEY')

    const isValid = verifyMidtransWebhook({
      order_id: ORDER_ID,
      status_code: STATUS_CODE,
      gross_amount: GROSS_AMOUNT,
      signature_key: forgedSignature,
    }, SERVER_KEY)

    assert.strictEqual(isValid, false, 'Forged signature must be rejected')
  })
})
