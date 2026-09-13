import { supabase } from './supabaseClient'
import { auditService } from './auditService'

export const adminService = {
  // ============================================================================
  // 1. GLOBAL PLATFORM & FINANCIAL ANALYTICS
  // ============================================================================
  async getGlobalStats() {
    try {
      // Total Users
      const { count: totalUsers, error: userErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      if (userErr) throw userErr

      // Total Pro Users
      const { count: totalProUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_pro', true)

      // Total Game Sessions
      const { data: allSessions, error: sessionErr } = await supabase
        .from('game_sessions')
        .select('id, game_type, is_completed, created_at')

      if (sessionErr) throw sessionErr

      // Total Financial Transactions & Revenue
      const { data: allTx } = await supabase
        .from('payment_transactions')
        .select('gross_amount, status, plan_tier, billing_cycle')

      let totalRevenue = 0
      let pendingTxCount = 0
      allTx?.forEach(tx => {
        if (tx.status === 'settlement' || tx.status === 'capture') {
          totalRevenue += Number(tx.gross_amount || 0)
        } else if (tx.status === 'pending') {
          pendingTxCount++
        }
      })

      // Support Tickets Count
      const { count: openTicketsCount } = await supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'in_progress'])

      const totalGames = allSessions?.length || 0
      const distribution = { truf: 0, remi: 0, omben: 0, generic: 0, chess: 0 }
      let activeToday = 0
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      allSessions?.forEach(s => {
        const type = s.game_type || 'generic'
        if (type in distribution) {
          distribution[type]++
        } else {
          distribution.generic++
        }
        if (s.created_at >= oneDayAgo) {
          activeToday++
        }
      })

      return {
        totalUsers: totalUsers || 0,
        totalProUsers: totalProUsers || 0,
        totalGames,
        activeToday,
        totalRevenue,
        pendingTxCount,
        openTicketsCount: openTicketsCount || 0,
        distribution
      }
    } catch (err) {
      console.warn('Admin stats fetch error', err)
      return {
        totalUsers: 1,
        totalProUsers: 0,
        totalGames: 0,
        activeToday: 0,
        totalRevenue: 0,
        pendingTxCount: 0,
        openTicketsCount: 0,
        distribution: { truf: 0, remi: 0, omben: 0, generic: 0, chess: 0 }
      }
    }
  },

  // ============================================================================
  // 2. USER MANAGEMENT & ACCESS CONTROL
  // ============================================================================
  async getUsersList(searchTerm = '', filterTier = 'all', filterRole = 'all') {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (searchTerm) {
        query = query.or(`display_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      }

      if (filterTier === 'pro') {
        query = query.eq('is_pro', true)
      } else if (filterTier === 'venue') {
        query = query.eq('subscription_tier', 'venue')
      } else if (filterTier === 'free') {
        query = query.eq('is_pro', false)
      }

      if (filterRole !== 'all') {
        query = query.eq('role', filterRole)
      }

      const { data, error } = await query.limit(100)
      if (error) throw error
      return data || []
    } catch (err) {
      console.warn('Admin user list error', err)
      return []
    }
  },

  async updateUserRole(userId, newRole) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw error

    auditService.logEvent({
      action: 'admin.role_update',
      category: 'admin_action',
      targetId: userId,
      details: { newRole }
    })
    return true
  },

  async updateUserSubscription(userId, { tier = 'pro', durationMonths = 1, isPro = true }) {
    let proExpiresAt = null
    if (isPro) {
      const exp = new Date()
      if (durationMonths >= 999) {
        exp.setFullYear(exp.getFullYear() + 50) // Lifetime
      } else {
        exp.setMonth(exp.getMonth() + durationMonths)
      }
      proExpiresAt = exp.toISOString()
    }

    const updates = {
      is_pro: isPro,
      subscription_tier: isPro ? tier : 'free',
      pro_expires_at: proExpiresAt,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    auditService.logEvent({
      action: isPro ? 'admin.grant_subscription' : 'admin.revoke_subscription',
      category: 'admin_action',
      targetId: userId,
      details: { tier, durationMonths, isPro, proExpiresAt }
    })

    return data
  },

  async sendPasswordResetEmail(email) {
    if (!email) throw new Error('Email tidak boleh kosong')
    const redirectTo = typeof window !== 'undefined' ? window.location.origin : 'https://kancasela.my.id'
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo
    })
    if (error) throw error

    auditService.logEvent({
      action: 'admin.trigger_password_reset',
      category: 'admin_action',
      details: { targetEmail: email }
    })

    return true
  },

  async deleteUserAccount(userId, userEmail) {
    if (!userId) throw new Error('User ID diperlukan')

    // Delete profile record (cascades to game_sessions and transactions)
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (error) throw error

    auditService.logEvent({
      action: 'admin.delete_user_account',
      category: 'admin_action',
      targetId: userId,
      details: { deletedEmail: userEmail }
    })

    return true
  },

  // ============================================================================
  // 3. GAME MANAGEMENT & ROUND INSPECTION
  // ============================================================================
  async getGlobalSessions(limit = 50, filterGameType = 'all') {
    try {
      let query = supabase
        .from('game_sessions')
        .select(`
          *,
          profiles:user_id (display_name, email)
        `)
        .order('created_at', { ascending: false })

      if (filterGameType !== 'all') {
        query = query.eq('game_type', filterGameType)
      }

      const { data, error } = await query.limit(limit)
      if (error) throw error
      return data || []
    } catch (err) {
      console.warn('Admin session explorer error', err)
      return []
    }
  },

  async getSessionRoundLogs(sessionId) {
    if (!sessionId) return []
    try {
      const { data, error } = await supabase
        .from('game_rounds')
        .select(`
          *,
          player_scores (*)
        `)
        .eq('session_id', sessionId)
        .order('round_number', { ascending: true })

      if (error) throw error
      return data || []
    } catch (err) {
      console.warn('Failed to load session round logs:', err)
      return []
    }
  },

  async forceCompleteSession(sessionId) {
    const { error } = await supabase
      .from('game_sessions')
      .update({ is_completed: true })
      .eq('id', sessionId)

    if (error) throw error

    auditService.logEvent({
      action: 'admin.force_complete_session',
      category: 'admin_action',
      targetId: sessionId
    })
    return true
  },

  async deleteSession(sessionId) {
    const { error } = await supabase
      .from('game_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) throw error

    auditService.logEvent({
      action: 'admin.delete_session',
      category: 'admin_action',
      targetId: sessionId
    })
    return true
  },

  // ============================================================================
  // 4. SUPPORT & TROUBLE TICKETS DESK
  // ============================================================================
  async getSupportTickets(statusFilter = 'all') {
    try {
      let query = supabase
        .from('support_tickets')
        .select(`
          *,
          profiles:user_id (display_name, avatar_url, role, is_pro)
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query.limit(100)
      if (error) throw error
      return data || []
    } catch (err) {
      console.warn('Admin support tickets fetch error:', err)
      return []
    }
  },

  async createSupportTicket({ email, subject, message, category = 'payment', priority = 'normal', userId = null }) {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert([{
        user_id: userId && !userId.startsWith('guest') ? userId : null,
        email,
        subject,
        message,
        category,
        priority,
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) throw error

    auditService.logEvent({
      action: 'support.ticket_created',
      category: 'support',
      targetId: data?.id,
      details: { subject, category, priority, email }
    })

    return data
  },

  async updateTicketStatus(ticketId, status, adminNotes = '') {
    const updates = {
      status,
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString()
    }
    if (status === 'resolved' || status === 'closed') {
      updates.resolved_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', ticketId)
      .select()
      .single()

    if (error) throw error

    auditService.logEvent({
      action: 'admin.ticket_status_updated',
      category: 'admin_action',
      targetId: ticketId,
      details: { newStatus: status, adminNotes }
    })

    return data
  },

  // ============================================================================
  // 5. IMMUTABLE AUDIT LOGS EXPLORER
  // ============================================================================
  async getAuditLogs({ category = 'all', searchTerm = '', limit = 100 } = {}) {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })

      if (category !== 'all') {
        query = query.eq('category', category)
      }

      if (searchTerm) {
        query = query.or(`action.ilike.%${searchTerm}%,actor_email.ilike.%${searchTerm}%,actor_name.ilike.%${searchTerm}%,target_id.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query.limit(limit)
      if (error) throw error
      return data || []
    } catch (err) {
      console.warn('Admin audit logs fetch error:', err)
      return []
    }
  },

  // ============================================================================
  // 6. GLOBAL PAYMENT TRANSACTIONS EXPLORER
  // ============================================================================
  async getAllPaymentTransactions({ statusFilter = 'all', tierFilter = 'all', searchTerm = '', limit = 100 } = {}) {
    try {
      let query = supabase
        .from('payment_transactions')
        .select(`
          *,
          profiles:user_id (
            id,
            display_name,
            email,
            avatar_url,
            role,
            is_pro,
            subscription_tier
          )
        `)
        .order('transaction_time', { ascending: false })

      if (statusFilter === 'settlement') {
        query = query.in('status', ['settlement', 'capture'])
      } else if (statusFilter === 'pending') {
        query = query.eq('status', 'pending')
      } else if (statusFilter === 'failed') {
        query = query.in('status', ['expire', 'deny', 'cancel', 'failure'])
      }

      if (tierFilter !== 'all') {
        query = query.eq('plan_tier', tierFilter)
      }

      if (searchTerm) {
        query = query.or(`order_id.ilike.%${searchTerm}%,payment_type.ilike.%${searchTerm}%,va_number.ilike.%${searchTerm}%,bank.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query.limit(limit)
      if (error) throw error
      return data || []
    } catch (err) {
      console.warn('Admin payment transactions fetch error:', err)
      return []
    }
  },

  async manualSettleTransaction(transactionId, userId, planTier = 'pro', billingCycle = 'yearly', adminNotes = '') {
    const now = new Date().toISOString()
    
    // 1. Update transaction status
    const { data: tx, error: txErr } = await supabase
      .from('payment_transactions')
      .update({
        status: 'settlement',
        settlement_time: now,
        raw_response: { manual_settlement_by_admin: true, admin_notes: adminNotes, settled_at: now }
      })
      .eq('id', transactionId)
      .select()
      .single()

    if (txErr) throw txErr

    // 2. Grant Pro / Venue to user profile
    if (userId) {
      const durationMonths = billingCycle === 'yearly' ? 12 : 1
      await this.updateUserSubscription(userId, {
        tier: planTier,
        durationMonths,
        isPro: true
      })
    }

    // 3. Immutable audit log
    auditService.logEvent({
      action: 'admin.manual_settle_payment',
      category: 'financial',
      targetId: transactionId,
      details: {
        userId,
        planTier,
        billingCycle,
        adminNotes,
        orderId: tx?.order_id
      }
    })

    return tx
  }
}
