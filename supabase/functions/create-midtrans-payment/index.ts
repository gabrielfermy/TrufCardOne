// Supabase Edge Function: create-midtrans-payment
// Generates Midtrans Snap Token securely using Server Key

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { orderId, planTier, billingCycle, grossAmount, userId, userEmail, userName } = await req.json()

    const serverKey = Deno.env.get('MIDTRANS_SERVER_KEY') || ''
    const isProduction = Deno.env.get('MIDTRANS_IS_PRODUCTION') === 'true'
    const snapUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

    const authHeader = 'Basic ' + btoa(serverKey + ':')

    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: grossAmount,
      },
      item_details: [
        {
          id: `${planTier}_${billingCycle}`,
          price: grossAmount,
          quantity: 1,
          name: `KancaSela ${planTier === 'venue' ? 'Venue' : 'Pro'} (${billingCycle})`,
        }
      ],
      customer_details: {
        first_name: userName || 'Player',
        email: userEmail || 'player@kancasela.local',
      },
      custom_field1: userId,
      custom_field2: planTier,
      custom_field3: billingCycle,
    }

    const midtransRes = await fetch(snapUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(payload),
    })

    const midtransData = await midtransRes.json()

    if (!midtransRes.ok) {
      throw new Error(midtransData.error_messages ? midtransData.error_messages.join(', ') : 'Midtrans API error')
    }

    return new Response(JSON.stringify(midtransData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
