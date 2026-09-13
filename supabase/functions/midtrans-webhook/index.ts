// Supabase Edge Function: midtrans-webhook
// Handles Midtrans Payment Notifications & Auto-activates User Pro/Venue Subscriptions

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts'

serve(async (req) => {
  try {
    const notification = await req.json()
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

    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY') || ''
    
    // Verify Midtrans SHA512 Signature Key
    const hashData = `${order_id}${status_code}${gross_amount}${serverKey}`
    const encoder = new TextEncoder()
    const data = encoder.encode(hashData)
    const hashBuffer = await crypto.subtle.digest('SHA-512', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    if (signature_key !== expectedSignature) {
      return new Response(JSON.stringify({ message: 'Invalid signature key' }), { status: 403 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    const isSuccess = (transaction_status === 'capture' && fraud_status === 'accept') || transaction_status === 'settlement'

    if (isSuccess && userId) {
      const isYearly = billingCycle === 'yearly'
      const durationMonths = isYearly ? 12 : 1
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + durationMonths)

      await supabase
        .from('profiles')
        .update({
          is_pro: true,
          subscription_tier: planTier || 'pro',
          pro_expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)

      console.log(`[Midtrans Webhook] Successfully granted Pro status for user ${userId}`)
    }

    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
