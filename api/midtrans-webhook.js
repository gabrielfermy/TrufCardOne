import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

/**
 * Vercel Serverless Function: /api/midtrans-webhook
 * Handles Midtrans Webhook Payment Notifications & Activates Pro / Venue Tier
 */
export default async function handler(req, res) {
  // Respond 200 OK to Midtrans ping checks and OPTIONS
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return res.status(200).json({ status: 'OK', service: 'KancaSela Midtrans Webhook Receiver' })
  }

  if (req.method !== 'POST') {
    return res.status(200).json({ status: 'OK' })
  }

  try {
    const notification = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
      custom_field1: userId,
      custom_field2: planTier,
      custom_field3: billingCycle,
    } = notification

    console.log(`[Midtrans Webhook] Received notification for Order: ${order_id}, status: ${transaction_status}`)

    const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
    
    // 1. Verify Cryptographic SHA-512 Signature if serverKey is configured
    if (serverKey && signature_key) {
      const hashPayload = `${order_id}${status_code}${gross_amount}${serverKey}`
      const expectedSignature = crypto.createHash('sha512').update(hashPayload).digest('hex')

      if (signature_key !== expectedSignature) {
        console.error('[Midtrans Webhook] Signature mismatch! Forged webhook rejected.')
        return res.status(403).json({ error: 'Invalid signature key' })
      }
    }

    // 2. Check if transaction was successful
    const isSuccess = (transaction_status === 'capture' && fraud_status === 'accept') || transaction_status === 'settlement'

    if (isSuccess && userId && userId !== 'guest-reviewer-user' && !userId.startsWith('guest')) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)

        const isYearly = billingCycle === 'yearly'
        const durationMonths = isYearly ? 12 : 1
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + durationMonths)

        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            is_pro: true,
            subscription_tier: planTier || 'pro',
            pro_expires_at: expiresAt.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (updateErr) {
          console.error('[Midtrans Webhook] Error updating profile in Supabase:', updateErr)
        } else {
          console.log(`[Midtrans Webhook] Successfully activated Pro status for user: ${userId}`)
        }
      }
    }

    // Always respond 200 OK so Midtrans marks the notification as successfully delivered
    return res.status(200).json({ status: 'OK', message: 'Notification processed' })
  } catch (err) {
    console.error('[Midtrans Webhook] Handler error:', err)
    return res.status(200).json({ status: 'ERROR_RECORDED', error: err.message })
  }
}
