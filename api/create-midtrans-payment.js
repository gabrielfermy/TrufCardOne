/**
 * Vercel Serverless Function: /api/create-midtrans-payment
 * Securely generates Midtrans Snap Token directly from Vercel backend
 */

export default async function handler(req, res) {
  // Setup CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  )

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {}
    const { orderId, planTier, billingCycle, grossAmount, userId, userEmail, userName } = body

    const isProduction = process.env.VITE_MIDTRANS_IS_PRODUCTION === 'true' || process.env.MIDTRANS_IS_PRODUCTION === 'true'
    
    const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
    if (!serverKey) {
      return res.status(500).json({ error: 'MIDTRANS_SERVER_KEY is not configured in Environment Variables.' })
    }

    const snapUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

    const authHeader = 'Basic ' + Buffer.from(serverKey + ':').toString('base64')

    const targetOrderId = orderId || `KANCA-${(planTier || 'PRO').toUpperCase()}-${Date.now()}`
    const targetAmount = Number(grossAmount) || (planTier === 'venue' ? (billingCycle === 'yearly' ? 1199000 : 149000) : (billingCycle === 'yearly' ? 129000 : 19000))

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
        'https://www.kancasela.my.id/api/midtrans-webhook'
      ],
      callbacks: {
        finish: 'https://www.kancasela.my.id/?payment=success',
        unfinish: 'https://www.kancasela.my.id/?payment=unfinish',
        error: 'https://www.kancasela.my.id/?payment=error',
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

    const midtransData = await midtransRes.json()

    if (!midtransRes.ok) {
      console.error('[Vercel API create-midtrans-payment] Midtrans error response:', midtransData)
      return res.status(midtransRes.status).json({
        error: midtransData.error_messages ? midtransData.error_messages.join(', ') : 'Midtrans API error',
        details: midtransData,
      })
    }

    return res.status(200).json(midtransData)
  } catch (err) {
    console.error('[Vercel API create-midtrans-payment] Catch error:', err)
    return res.status(500).json({ error: err.message })
  }
}
