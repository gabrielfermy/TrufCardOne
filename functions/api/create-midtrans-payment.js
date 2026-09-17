/**
 * Cloudflare Pages Function: /api/create-midtrans-payment
 * Generates Midtrans Snap Transaction Token for Kanca Pro & Venue Plans
 */

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

export async function onRequestGet() {
  return Response.json({ status: 'OK', service: 'KancaSela Cloudflare Payment API' }, { headers: CORS_HEADERS })
}

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    const body = await request.json().catch(() => ({}))
    const { planTier, billingCycle, userId, userEmail, userName, orderId, grossAmount } = body

    const isProduction = (env.VITE_MIDTRANS_IS_PRODUCTION === 'true' || env.MIDTRANS_IS_PRODUCTION === 'true')
    const serverKey = env.MIDTRANS_SERVER_KEY || 'SB-Mid-server-sample-sandbox-key'

    const snapUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

    // Encode Basic Auth Header (serverKey + ':')
    let authHeader
    if (typeof btoa === 'function') {
      authHeader = 'Basic ' + btoa(serverKey + ':')
    } else {
      authHeader = 'Basic ' + Buffer.from(serverKey + ':').toString('base64')
    }

    const targetOrderId = orderId || `KANCA-${(planTier || 'PRO').toUpperCase()}-${Date.now()}`
    const targetAmount = Number(grossAmount) || (planTier === 'venue' ? (billingCycle === 'yearly' ? 1199000 : 149000) : (billingCycle === 'yearly' ? 129000 : 19000))

    // Dynamically resolve application host origin
    const url = new URL(request.url)
    const forwardedHost = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host
    const forwardedProto = request.headers.get('x-forwarded-proto') || (forwardedHost?.includes('localhost') ? 'http' : 'https')
    const appOrigin = env.APP_URL || `${forwardedProto}://${forwardedHost}`

    const payload = {
      transaction_details: {
        order_id: targetOrderId,
        gross_amount: targetAmount,
      },
      item_details: [
        {
          id: `${planTier || 'pro'}_${billingCycle || 'yearly'}`,
          price: targetAmount,
          quantity: 1,
          name: `KancaSela ${planTier === 'venue' ? 'Venue' : 'Pro'} (${billingCycle || 'yearly'})`,
        }
      ],
      customer_details: {
        first_name: userName || 'Player',
        email: userEmail || 'player@kancasela.local',
      },
      custom_field1: userId || '',
      custom_field2: planTier || 'pro',
      custom_field3: billingCycle || 'yearly',
      // Override default dashboard notification webhook specifically for KancaSela transactions
      override_notification_urls: [
        `${appOrigin}/api/midtrans-webhook`
      ],
      callbacks: {
        finish: `${appOrigin}/?payment=success`,
        unfinish: `${appOrigin}/?payment=unfinish`,
        error: `${appOrigin}/?payment=error`,
      }
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

    const data = await midtransRes.json()

    if (!midtransRes.ok) {
      console.error('[Cloudflare Midtrans API Error]', data)
      return Response.json({
        error: data.error_messages ? data.error_messages.join(', ') : 'Midtrans API error',
        details: data,
      }, {
        status: midtransRes.status,
        headers: CORS_HEADERS
      })
    }

    return Response.json({
      token: data.token,
      redirect_url: data.redirect_url,
      order_id: targetOrderId,
    }, {
      status: 200,
      headers: CORS_HEADERS
    })
  } catch (err) {
    console.error('[Cloudflare Payment Handler Error]', err)
    return Response.json({
      error: 'Internal Server Error',
      message: err.message
    }, {
      status: 500,
      headers: CORS_HEADERS
    })
  }
}
