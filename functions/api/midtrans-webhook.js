import { createClient } from '@supabase/supabase-js'

/**
 * Cloudflare Pages Function: /api/midtrans-webhook
 * Handles Midtrans Webhook Payment Notifications & Activates Pro / Venue Tier
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

async function sha512Hex(message) {
  const msgUint8 = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-512', msgUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

export async function onRequestGet() {
  return Response.json({ status: 'OK', service: 'KancaSela Cloudflare Webhook Receiver' }, { headers: CORS_HEADERS })
}

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    const notification = await request.json().catch(() => ({}))
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

    console.log(`[Cloudflare Midtrans Webhook] Notification for Order: ${order_id}, status: ${transaction_status}`)

    const serverKey = env.MIDTRANS_SERVER_KEY || ''

    // 1. Verify Cryptographic SHA-512 Signature if serverKey is configured
    if (serverKey && signature_key) {
      const hashPayload = `${order_id}${status_code}${gross_amount}${serverKey}`
      const expectedSignature = await sha512Hex(hashPayload)

      if (signature_key !== expectedSignature) {
        console.error('[Cloudflare Midtrans Webhook] Signature mismatch! Forged webhook rejected.')
        return Response.json({ error: 'Invalid signature key' }, { status: 403, headers: CORS_HEADERS })
      }
    }

    // 2. Check if transaction was successful
    const isSuccess = (transaction_status === 'capture' && fraud_status === 'accept') || transaction_status === 'settlement'

    const targetEmail = notification.customer_details?.email || ''
    let targetUserId = userId && !userId.startsWith('guest') ? userId : null

    const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || ''
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || ''

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)

      // If no targetUserId, attempt lookup by targetEmail
      if (!targetUserId && targetEmail) {
        try {
          const { data: foundProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', targetEmail)
            .maybeSingle()
          if (foundProfile?.id) {
            targetUserId = foundProfile.id
          }
        } catch (e) {
          console.warn('[Cloudflare Midtrans Webhook] User lookup error:', e)
        }
      }

      // 1. If transaction is successful, activate Pro / Venue in profiles table
      const isYearly = billingCycle === 'yearly' || Number(gross_amount) >= 100000
      const durationMonths = isYearly ? 12 : 1
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths)
      const targetTier = planTier || (order_id?.includes('VENUE') ? 'venue' : 'pro')

      let profileUpdated = false
      if (isSuccess && (targetUserId || targetEmail)) {
        const updates = {
          is_pro: true,
          subscription_tier: targetTier,
          pro_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        }

        if (targetUserId) {
          const { data: d1, error: e1 } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', targetUserId)
            .select()
          if (!e1 && d1?.length > 0) profileUpdated = true
        }

        if (!profileUpdated && targetEmail) {
          const { data: d2, error: e2 } = await supabase
            .from('profiles')
            .update(updates)
            .eq('email', targetEmail)
            .select()
          if (!e2 && d2?.length > 0) profileUpdated = true
        }
      }

      // 2. Extract Bank & VA Number information
      let bank = null
      let vaNumber = null
      if (notification.va_numbers && notification.va_numbers.length > 0) {
        bank = notification.va_numbers[0].bank || null
        vaNumber = notification.va_numbers[0].va_number || null
      } else if (notification.permata_va_number) {
        bank = 'permata'
        vaNumber = notification.permata_va_number
      } else if (notification.biller_code && notification.bill_key) {
        bank = 'mandiri'
        vaNumber = `${notification.biller_code} / ${notification.bill_key}`
      }

      // 3. Upsert record into public.payment_transactions
      if (targetUserId && order_id) {
        try {
          const txStatus = transaction_status || 'pending'
          await supabase
            .from('payment_transactions')
            .upsert({
              user_id: targetUserId,
              order_id: order_id,
              transaction_id: notification.transaction_id || null,
              plan_tier: targetTier,
              billing_cycle: isYearly ? 'yearly' : 'monthly',
              gross_amount: Number(gross_amount) || (targetTier === 'venue' ? (isYearly ? 1199000 : 149000) : (isYearly ? 129000 : 19000)),
              status: txStatus,
              payment_type: notification.payment_type || null,
              bank: bank,
              va_number: vaNumber,
              pdf_url: notification.pdf_url || null,
              transaction_time: notification.transaction_time || new Date().toISOString(),
              settlement_time: notification.settlement_time || (isSuccess ? new Date().toISOString() : null),
              expiry_time: notification.expiry_time || null,
              raw_response: notification,
              updated_at: new Date().toISOString()
            }, { onConflict: 'order_id' })
          console.log(`[Cloudflare Midtrans Webhook] payment_transactions synced for Order: ${order_id}, status: ${txStatus}`)
        } catch (txErr) {
          console.warn('[Cloudflare Midtrans Webhook] Failed to sync payment_transactions:', txErr.message)
        }
      }

      return Response.json({
        status: 'OK',
        message: 'Notification processed',
        profileUpdated,
        order_id
      }, {
        status: 200,
        headers: CORS_HEADERS
      })
    } else {
      return Response.json({ status: 'OK', error: 'Missing supabase credentials in env' }, { headers: CORS_HEADERS })
    }
  } catch (err) {
    console.error('[Cloudflare Midtrans Webhook] Handler error:', err)
    return Response.json({ status: 'ERROR_RECORDED', error: err.message }, { status: 200, headers: CORS_HEADERS })
  }
}
