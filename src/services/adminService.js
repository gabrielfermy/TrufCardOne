import { supabase } from './supabaseClient'

export const adminService = {
  // 1. Get Global Platform Analytics
  async getGlobalStats() {
    try {
      // Total Users
      const { count: totalUsers, error: userErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      if (userErr) throw userErr

      // Total Game Sessions
      const { data: allSessions, error: sessionErr } = await supabase
        .from('game_sessions')
        .select('id, game_type, is_completed, created_at')

      if (sessionErr) throw sessionErr

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
        totalGames,
        activeToday,
        distribution
      }
    } catch (err) {
      console.warn('Admin stats fetch error', err)
      return {
        totalUsers: 1,
        totalGames: 0,
        activeToday: 0,
        distribution: { truf: 0, remi: 0, omben: 0, generic: 0, chess: 0 }
      }
    }
  },

  // 2. Search & Fetch User Directory
  async getUsersList(searchTerm = '') {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (searchTerm) {
        query = query.or(`display_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      }

      const { data, error } = await query.limit(50)
      if (error) throw error
      return data || []
    } catch (err) {
      console.warn('Admin user list error', err)
      return []
    }
  },

  // 3. Toggle User Role (User <-> Admin)
  async updateUserRole(userId, newRole) {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) throw error
    return true
  },

  // 4. Inspect Global Game Sessions
  async getGlobalSessions(limit = 30) {
    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .select(`
          *,
          profiles:user_id (display_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw error
      return data || []
    } catch (err) {
      console.warn('Admin session explorer error', err)
      return []
    }
  }
}
