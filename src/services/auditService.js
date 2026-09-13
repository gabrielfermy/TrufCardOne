import { supabase } from './supabaseClient'

/**
 * Audit Logging Service
 * Records system-wide immutable events into public.audit_logs
 */
export const auditService = {
  /**
   * Log an event to public.audit_logs
   * @param {object} param0
   * @param {string} param0.action - Action name (e.g. 'auth.login', 'room.create', 'payment.checkout_initiated')
   * @param {string} param0.category - 'auth' | 'game' | 'billing' | 'social' | 'support' | 'admin_action'
   * @param {string} [param0.targetId] - Target ID (order_id, session_id, user_id, ticket_id)
   * @param {object} [param0.details] - Detailed JSON payload
   * @param {object} [param0.user] - Optional user object override
   */
  async logEvent({ action, category = 'game', targetId = null, details = {}, user = null }) {
    try {
      let activeUserId = user?.id || null
      let activeEmail = user?.email || null
      let activeName = user?.profile?.display_name || user?.user_metadata?.full_name || null

      // If user wasn't passed directly, get current session user if available
      if (!activeUserId) {
        try {
          const { data } = await supabase.auth.getSession()
          if (data?.session?.user) {
            activeUserId = data.session.user.id
            activeEmail = data.session.user.email
            activeName = data.session.user.user_metadata?.full_name || data.session.user.email?.split('@')[0]
          }
        } catch {}
      }

      const payload = {
        user_id: activeUserId && !activeUserId.startsWith('guest') ? activeUserId : null,
        actor_email: activeEmail || (activeUserId?.startsWith('guest') ? 'guest@device' : 'anonymous'),
        actor_name: activeName || 'Guest User',
        action,
        category,
        target_id: targetId ? String(targetId) : null,
        details: {
          ...details,
          path: typeof window !== 'undefined' ? window.location.pathname : '',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
        },
        created_at: new Date().toISOString()
      }

      // Non-blocking fire-and-forget insert
      supabase
        .from('audit_logs')
        .insert([payload])
        .then(({ error }) => {
          if (error) {
            console.warn('[auditService] Log error:', error.message)
          }
        })
        .catch(err => {
          console.warn('[auditService] Log catch:', err)
        })
    } catch (e) {
      console.warn('[auditService] Failed to emit audit log:', e)
    }
  }
}
