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

    const targetEmail = notification.customer_details?.email || ''
    const targetUserId = userId && !userId.startsWith('guest') ? userId : null

    if (isSuccess && (targetUserId || targetEmail)) {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || ''
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''

      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)

        const isYearly = billingCycle === 'yearly' || Number(gross_amount) >= 100000
        const durationMonths = isYearly ? 12 : 1
        const expiresAt = new Date()
        expiresAt.setMonth(expiresAt.getMonth() + durationMonths)

        const targetTier = planTier || (order_id?.includes('VENUE') ? 'venue' : 'pro')

        const updates = {
          is_pro: true,
          subscription_tier: targetTier,
          pro_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        }

        console.log(`[Midtrans Webhook] Updating Pro for User: ${targetUserId || targetEmail}, tier: ${targetTier}`)

        let updated = false
        let err1 = null
        let d1 = null
        let err2 = null
        let d2 = null

        if (targetUserId) {
          const res1 = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', targetUserId)
            .select()
          err1 = res1.error
          d1 = res1.data
          if (!err1 && d1?.length > 0) {
            updated = true
            console.log(`[Midtrans Webhook] Successfully activated Pro by UUID: ${targetUserId}`)
          } else if (err1) {
            console.warn('[Midtrans Webhook] UUID update warning (likely RLS if no service_role key):', err1.message)
          }
        }

        if (!updated && targetEmail) {
          const res2 = await supabase
            .from('profiles')
            .update(updates)
            .eq('email', targetEmail)
            .select()
          err2 = res2.error
          d2 = res2.data
          if (!err2 && d2?.length > 0) {
            updated = true
            console.log(`[Midtrans Webhook] Successfully activated Pro by email: ${targetEmail}`)
          } else if (err2) {
            console.warn('[Midtrans Webhook] Email update warning:', err2.message)
          }
        }
        // Always respond 200 OK so Midtrans marks the notification as successfully delivered
        return res.status(200).json({ 
          status: 'OK', 
          message: 'Notification processed', 
          updated, 
          hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          supabaseUrl: supabaseUrl ? supabaseUrl.replace(/https?:\/\//, '').split('.')[0] : 'MISSING',
          err1: err1?.message || null,
          err2: err2?.message || null,
          d1: d1 || null,
          d2: d2 || null
        })
      } else {
        return res.status(200).json({ status: 'OK', error: 'Missing supabase credentials in env' })
      }
    }

    // Always respond 200 OK so Midtrans marks the notification as successfully delivered
    return res.status(200).json({ status: 'OK', message: 'Notification processed (no target)' })
  } catch (err) {
    console.error('[Midtrans Webhook] Handler error:', err)
    return res.status(200).json({ status: 'ERROR_RECORDED', error: err.message })
  }
}
