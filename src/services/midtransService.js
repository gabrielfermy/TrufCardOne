import { supabase } from './supabaseClient'
import { soundService } from './soundService'
import { hapticsService } from './hapticsService'

/**
 * Midtrans Payment Gateway Integration Service
 * Supports Midtrans Snap Sandbox & Production environments.
 */
class MidtransService {
  constructor() {
    this.isLoaded = false
    this.clientKey = import.meta.env.VITE_MIDTRANS_CLIENT_KEY || 'SB-Mid-client-test-sandbox'
    this.isProduction = import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true'
    this.snapScriptUrl = this.isProduction
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js'
  }

  /**
   * Dynamically loads Midtrans Snap.js script
   */
  loadSnapScript() {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') return reject(new Error('Window not defined'))

      if (window.snap) {
        this.isLoaded = true
        return resolve(window.snap)
      }

      const existingScript = document.querySelector(`script[src="${this.snapScriptUrl}"]`)
      if (existingScript) {
        existingScript.addEventListener('load', () => {
          this.isLoaded = true
          resolve(window.snap)
        })
        existingScript.addEventListener('error', reject)
        return
      }

      const script = document.createElement('script')
      script.src = this.snapScriptUrl
      script.setAttribute('data-client-key', this.clientKey)
      script.async = true
      script.onload = () => {
        this.isLoaded = true
        console.log(`[MidtransService] Snap JS loaded (${this.isProduction ? 'Production' : 'Sandbox'})`)
        resolve(window.snap)
      }
      script.onerror = (err) => {
        console.warn('[MidtransService] Failed to load Midtrans Snap JS:', err)
        reject(err)
      }
      document.head.appendChild(script)
    })
  }

  /**
   * Plan Catalog & Pricing Matrix (in IDR)
   */
  getPlanDetails(planTier, billingCycle = 'yearly') {
    const isYearly = billingCycle === 'yearly'
    if (planTier === 'venue' || planTier === 'Kanca Warkop') {
      return {
        id: `venue_${billingCycle}`,
        tier: 'venue',
        name: 'Kanca Warkop (Venue B2B)',
        price: isYearly ? 1199000 : 149000,
        cycle: billingCycle,
        durationMonths: isYearly ? 12 : 1,
      }
    }

    // Default: Kanca Pro
    return {
      id: `pro_${billingCycle}`,
      tier: 'pro',
      name: 'Kanca Pro (Ad-Free & Unlimited)',
      price: isYearly ? 129000 : 19000,
      cycle: billingCycle,
      durationMonths: isYearly ? 12 : 1,
    }
  }

  /**
   * Request Snap Token from Supabase Edge Function or Local Sandbox Generator
   */
  async createTransactionToken({ planTier, billingCycle, user }) {
    const plan = this.getPlanDetails(planTier, billingCycle)
    const orderId = `KANCA-${plan.tier.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`

    try {
      // 1. Try calling Supabase Serverless Edge Function
      const { data, error } = await supabase.functions.invoke('create-midtrans-payment', {
        body: {
          orderId,
          planTier: plan.tier,
          billingCycle: plan.cycle,
          grossAmount: plan.price,
          userId: user?.id,
          userEmail: user?.email,
          userName: user?.profile?.display_name || user?.email?.split('@')[0] || 'Player',
        }
      })

      if (!error && data?.token) {
        return { token: data.token, orderId }
      }
    } catch (edgeFnErr) {
      console.debug('[MidtransService] Edge function invoke fallback to client-sandbox mode:', edgeFnErr)
    }

    // 2. Local Sandbox Fallback Token Generator for Development Testing
    return {
      token: `SANDBOX-SNAP-TOKEN-${orderId}`,
      orderId,
      isLocalSandbox: true,
      plan,
    }
  }

  /**
   * Execute Payment Checkout via Midtrans Snap
   */
  async checkout({ planTier, billingCycle, user, onSuccess, onPending, onError, onClose }) {
    const effectiveUser = user || {
      id: 'guest-reviewer-user',
      email: 'guest@kancasela.my.id',
      profile: { display_name: 'Pengguna Tamu (Reviewer)' }
    }

    const plan = this.getPlanDetails(planTier, billingCycle)

    try {
      await this.loadSnapScript()
    } catch (e) {
      console.warn('[MidtransService] Snap JS failed to load, using sandbox prompt fallback')
    }

    const transaction = await this.createTransactionToken({ planTier, billingCycle, user: effectiveUser })

    // If Snap JS is available in Sandbox/Prod with a valid token
    if (window.snap && !transaction.isLocalSandbox) {
      window.snap.pay(transaction.token, {
        onSuccess: async (result) => {
          console.log('[MidtransService] Payment Success:', result)
          if (user?.id && !user.id.startsWith('guest')) {
            await this.grantProAccess(user.id, plan.tier, plan.durationMonths)
          }
          try { soundService.playVictory() } catch (e) {}
          try { hapticsService.success() } catch (e) {}
          if (onSuccess) onSuccess(result)
        },
        onPending: (result) => {
          console.log('[MidtransService] Payment Pending:', result)
          if (onPending) onPending(result)
        },
        onError: (result) => {
          console.error('[MidtransService] Payment Error:', result)
          if (onError) onError(result)
        },
        onClose: () => {
          console.log('[MidtransService] Payment popup closed')
          if (onClose) onClose()
        }
      })
      return
    }

    // Local Development & Reviewer Sandbox Simulation Trigger
    window.dispatchEvent(new CustomEvent('kancasela:show-midtrans-sandbox-dialog', {
      detail: {
        plan,
        transaction,
        user: effectiveUser,
        onConfirm: async () => {
          if (user?.id && !user.id.startsWith('guest')) {
            await this.grantProAccess(user.id, plan.tier, plan.durationMonths)
          }
          try { soundService.playVictory() } catch (e) {}
          try { hapticsService.success() } catch (e) {}
          if (onSuccess) onSuccess({ status: 'settlement', order_id: transaction.orderId })
        },
        onCancel: () => {
          if (onClose) onClose()
        }
      }
    }))
  }

  /**
   * Activates Pro / Venue subscription in Supabase profile
   */
  async grantProAccess(userId, tier = 'pro', durationMonths = 1) {
    if (!userId) return null

    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + durationMonths)

    const updates = {
      is_pro: true,
      subscription_tier: tier,
      pro_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .maybeSingle()

    if (error) {
      console.warn('[MidtransService] Error granting Pro profile access:', error)
    } else {
      console.log('[MidtransService] Pro access granted successfully:', data)
    }

    return data
  }
}

export const midtransService = new MidtransService()
export default midtransService
