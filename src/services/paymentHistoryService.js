import { supabase } from './supabaseClient'
import { soundService } from './soundService'
import { hapticsService } from './hapticsService'

export const paymentHistoryService = {
  /**
   * Fetch all payment transactions for a given user ID
   * @param {string} userId - User UUID
   * @returns {Promise<Array>} List of transaction objects
   */
  async getUserTransactions(userId) {
    if (!userId || userId.startsWith('guest')) return []

    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_time', { ascending: false })

      if (error) {
        console.warn('[paymentHistoryService] Error fetching transactions:', error.message)
        return []
      }

      return data || []
    } catch (err) {
      console.error('[paymentHistoryService] Fetch error:', err)
      return []
    }
  },

  /**
   * Resume pending Midtrans Snap Payment
   * @param {string} snapToken - Midtrans Snap Token
   * @param {object} callbacks - onSuccess, onPending, onError, onClose
   */
  resumePendingPayment(snapToken, callbacks = {}) {
    if (!snapToken) {
      alert('Tautan pembayaran tidak ditemukan atau telah kedaluwarsa.')
      return
    }

    if (typeof window === 'undefined' || !window.snap) {
      alert('Sistem pembayaran Midtrans sedang memuat. Silakan tunggu beberapa saat.')
      return
    }

    hapticsService.medium()
    try { soundService.playClick() } catch {}

    window.snap.pay(snapToken, {
      onSuccess: (result) => {
        soundService.playVictory()
        hapticsService.success()
        if (callbacks.onSuccess) callbacks.onSuccess(result)
      },
      onPending: (result) => {
        hapticsService.light()
        if (callbacks.onPending) callbacks.onPending(result)
      },
      onError: (result) => {
        hapticsService.error()
        if (callbacks.onError) callbacks.onError(result)
      },
      onClose: () => {
        if (callbacks.onClose) callbacks.onClose()
      }
    })
  }
}
