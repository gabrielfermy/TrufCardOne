import React, { useState, useEffect } from 'react'
import { adminService } from '../../services/adminService'
import { useTranslation } from '../../i18n/I18nContext'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'

export default function AdminDashboard({ onBack }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'users' | 'games' | 'transactions' | 'tickets' | 'audit'
  const [loading, setLoading] = useState(true)

  // Metrics
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalProUsers: 0,
    totalGames: 0,
    activeToday: 0,
    totalRevenue: 0,
    pendingTxCount: 0,
    openTicketsCount: 0,
    distribution: { truf: 0, remi: 0, omben: 0, generic: 0, chess: 0 }
  })

  // Users Tab
  const [users, setUsers] = useState([])
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [userFilterTier, setUserFilterTier] = useState('all')
  const [userFilterRole, setUserFilterRole] = useState('all')
  const [selectedUserAction, setSelectedUserAction] = useState(null)
  const [customDurationMonths, setCustomDurationMonths] = useState(1)
  const [userActionLoading, setUserActionLoading] = useState(false)

  // Games Tab
  const [sessions, setSessions] = useState([])
  const [gameFilterType, setGameFilterType] = useState('all')
  const [selectedSessionRounds, setSelectedSessionRounds] = useState(null)
  const [loadingRounds, setLoadingRounds] = useState(false)

  // Payment Transactions Tab
  const [transactions, setTransactions] = useState([])
  const [txStatusFilter, setTxStatusFilter] = useState('all')
  const [txTierFilter, setTxTierFilter] = useState('all')
  const [txSearchTerm, setTxSearchTerm] = useState('')
  const [selectedReceiptTx, setSelectedReceiptTx] = useState(null)
  const [processingTxId, setProcessingTxId] = useState(null)
  const [copiedTxId, setCopiedTxId] = useState(null)

  // Support Tickets Tab
  const [tickets, setTickets] = useState([])
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [ticketAdminNotes, setTicketAdminNotes] = useState('')
  const [updatingTicket, setUpdatingTicket] = useState(false)

  // Audit Logs Tab
  const [auditLogs, setAuditLogs] = useState([])
  const [auditCategory, setAuditCategory] = useState('all')
  const [auditSearchTerm, setAuditSearchTerm] = useState('')
  const [expandedLogId, setExpandedLogId] = useState(null)

  // Load All Tab Data
  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const [statsData, usersData, sessionsData, transactionsData, ticketsData, auditData] = await Promise.all([
        adminService.getGlobalStats(),
        adminService.getUsersList(userSearchTerm, userFilterTier, userFilterRole),
        adminService.getGlobalSessions(50, gameFilterType),
        adminService.getAllPaymentTransactions({ statusFilter: txStatusFilter, tierFilter: txTierFilter, searchTerm: txSearchTerm, limit: 100 }),
        adminService.getSupportTickets(ticketStatusFilter),
        adminService.getAuditLogs({ category: auditCategory, searchTerm: auditSearchTerm, limit: 100 })
      ])
      setStats(statsData)
      setUsers(usersData)
      setSessions(sessionsData)
      setTransactions(transactionsData)
      setTickets(ticketsData)
      setAuditLogs(auditData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // ============================================================================
  // USER ACTIONS
  // ============================================================================
  const handleSearchUsers = async (e) => {
    e?.preventDefault()
    setLoading(true)
    const usersData = await adminService.getUsersList(userSearchTerm, userFilterTier, userFilterRole)
    setUsers(usersData)
    setLoading(false)
  }

  const handleGrantPro = async (userId, tier, durationMonths) => {
    setUserActionLoading(true)
    try {
      await adminService.updateUserSubscription(userId, { tier, durationMonths, isPro: true })
      soundService.playVictory()
      hapticsService.success()
      alert(`Berhasil memberikan paket ${tier.toUpperCase()} selama ${durationMonths >= 999 ? 'Seumur Hidup' : durationMonths + ' bulan'}!`)
      setSelectedUserAction(null)
      loadDashboardData()
    } catch (err) {
      alert('Gagal mengupdate langganan: ' + err.message)
    } finally {
      setUserActionLoading(false)
    }
  }

  const handleRevokePro = async (userId) => {
    if (!window.confirm('Apakah Anda yakin ingin mencabut status Pro / Warkop dari pengguna ini dan mengembalikannya ke Free?')) return
    setUserActionLoading(true)
    try {
      await adminService.updateUserSubscription(userId, { isPro: false })
      soundService.playClick()
      hapticsService.medium()
      alert('Status langganan berhasil dikembalikan ke Free.')
      setSelectedUserAction(null)
      loadDashboardData()
    } catch (err) {
      alert('Gagal mencabut langganan: ' + err.message)
    } finally {
      setUserActionLoading(false)
    }
  }

  const handleSendResetPassword = async (email) => {
    if (!email) return alert('Email pengguna tidak ditemukan.')
    if (!window.confirm(`Kirim tautan reset password resmi ke ${email}?`)) return
    try {
      await adminService.sendPasswordResetEmail(email)
      soundService.playClick()
      alert(`Tautan reset password berhasil dikirim ke ${email}!`)
    } catch (err) {
      alert('Gagal mengirim email reset password: ' + err.message)
    }
  }

  const handleDeleteUser = async (userId, email) => {
    const confirmName = window.prompt(`PERINGATAN: Tindakan ini akan menghapus akun ${email || userId} dan seluruh datanya secara permanen.\n\nKetik "HAPUS" untuk konfirmasi:`)
    if (confirmName !== 'HAPUS') return

    try {
      await adminService.deleteUserAccount(userId, email)
      soundService.playClick()
      alert('Akun pengguna berhasil dihapus permanen.')
      setSelectedUserAction(null)
      loadDashboardData()
    } catch (err) {
      alert('Gagal menghapus akun: ' + err.message)
    }
  }

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    if (window.confirm(`Ubah peran pengguna ini menjadi "${newRole.toUpperCase()}"?`)) {
      await adminService.updateUserRole(userId, newRole)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
  }

  // ============================================================================
  // GAME INSPECTION ACTIONS
  // ============================================================================
  const handleInspectRounds = async (session) => {
    setLoadingRounds(true)
    setSelectedSessionRounds({ session, rounds: [] })
    try {
      const rounds = await adminService.getSessionRoundLogs(session.id)
      setSelectedSessionRounds({ session, rounds })
    } finally {
      setLoadingRounds(false)
    }
  }

  const handleForceCompleteSession = async (sessionId) => {
    if (!window.confirm('Tandai sesi game ini sebagai Selesai?')) return
    await adminService.forceCompleteSession(sessionId)
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, is_completed: true } : s))
  }

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Hapus sesi game ini dari cloud?')) return
    await adminService.deleteSession(sessionId)
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (selectedSessionRounds?.session?.id === sessionId) setSelectedSessionRounds(null)
  }

  // ============================================================================
  // SUPPORT TICKET ACTIONS
  // ============================================================================
  const handleUpdateTicket = async (status) => {
    if (!selectedTicket) return
    setUpdatingTicket(true)
    try {
      await adminService.updateTicketStatus(selectedTicket.id, status, ticketAdminNotes)
      soundService.playClick()
      hapticsService.success()
      setSelectedTicket(null)
      const freshTickets = await adminService.getSupportTickets(ticketStatusFilter)
      setTickets(freshTickets)
    } catch (err) {
      alert('Gagal mengupdate tiket: ' + err.message)
    } finally {
      setUpdatingTicket(false)
    }
  }

  // ============================================================================
  // PAYMENT TRANSACTIONS EXPLORER & MANUAL ACTIONS
  // ============================================================================
  const handleSearchTransactions = async (e) => {
    e?.preventDefault()
    setLoading(true)
    try {
      const data = await adminService.getAllPaymentTransactions({
        statusFilter: txStatusFilter,
        tierFilter: txTierFilter,
        searchTerm: txSearchTerm,
        limit: 100
      })
      setTransactions(data)
    } finally {
      setLoading(false)
    }
  }

  const handleManualSettlePayment = async (tx) => {
    const confirmMsg = `Konfirmasi pelunasan manual untuk:\nOrder ID: ${tx.order_id}\nCustomer: ${tx.profiles?.display_name || tx.profiles?.email || 'User'}\nPaket: ${tx.plan_tier.toUpperCase()} (${tx.billing_cycle})\nNominal: ${formatRupiah(tx.gross_amount)}\n\nStatus transaksi akan diubah menjadi SETTLEMENT dan paket PRO pengguna akan langsung diaktifkan.`
    if (!window.confirm(confirmMsg)) return

    const adminNotes = window.prompt('Masukkan catatan audit pelunasan manual (misal: Transfer Bank Manual / Konfirmasi WhatsApp):', 'Manual settlement via Superadmin console')
    if (adminNotes === null) return

    setProcessingTxId(tx.id)
    try {
      await adminService.manualSettleTransaction(tx.id, tx.user_id, tx.plan_tier, tx.billing_cycle, adminNotes)
      soundService.playVictory()
      hapticsService.success()
      alert('Transaksi berhasil dilunasi dan paket Kanca Pro pengguna telah aktif!')
      await loadDashboardData()
    } catch (err) {
      alert('Gagal melunasi transaksi: ' + err.message)
    } finally {
      setProcessingTxId(null)
    }
  }

  const exportTransactionsToCSV = () => {
    if (!transactions.length) return alert('Tidak ada data transaksi untuk diekspor.')
    const headers = ['Order ID', 'Waktu Transaksi (UTC)', 'Pelanggan Nama', 'Pelanggan Email', 'Paket Tier', 'Siklus Tagihan', 'Nominal (IDR)', 'Status', 'Metode Bayar', 'Bank / VA', 'Waktu Lunas (UTC)']
    const rows = transactions.map(tx => [
      tx.order_id,
      tx.transaction_time || tx.created_at,
      tx.profiles?.display_name || '',
      tx.profiles?.email || '',
      tx.plan_tier,
      tx.billing_cycle,
      tx.gross_amount,
      tx.status,
      tx.payment_type || '',
      tx.va_number || tx.bank || '',
      tx.settlement_time || ''
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `kancasela_transactions_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCopyTx = (text, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      hapticsService.light()
      setCopiedTxId(id)
      setTimeout(() => setCopiedTxId(null), 2000)
    }
  }

  // ============================================================================
  // AUDIT LOGS SEARCH & EXPORT
  // ============================================================================
  const handleFilterAuditLogs = async () => {
    setLoading(true)
    const data = await adminService.getAuditLogs({ category: auditCategory, searchTerm: auditSearchTerm, limit: 100 })
    setAuditLogs(data)
    setLoading(false)
  }

  const exportAuditLogsToCSV = () => {
    if (!auditLogs.length) return alert('Tidak ada log untuk diekspor.')
    const headers = ['ID', 'Waktu (UTC)', 'Aksi', 'Kategori', 'Aktor Email', 'Aktor Nama', 'Target ID', 'Details JSON']
    const rows = auditLogs.map(log => [
      log.id,
      log.created_at,
      log.action,
      log.category,
      log.actor_email || '',
      log.actor_name || '',
      log.target_id || '',
      JSON.stringify(log.details || {}).replace(/"/g, '""')
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `kancasela_audit_logs_${new Date().toISOString().slice(0,10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatRupiah = (num) => 'Rp ' + Number(num || 0).toLocaleString('id-ID')

  return (
    <div style={{ maxWidth: '980px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* Superadmin Header */}
      <div className="glass-panel" style={{ padding: '18px 24px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '0.75rem', color: '#A78BFA', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>
            👑 SUPERADMIN ENTERPRISE CONSOLE
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 900, margin: '2px 0 0 0' }}>
            🛡️ Web Admin Portal
          </h2>
        </div>
        {onBack && (
          <button className="btn btn-secondary btn-sm" onClick={onBack}>
            ← Kembali ke Hub
          </button>
        )}
      </div>

      {/* Admin Navigation Tabs */}
      <div style={{
        display: 'flex',
        gap: '6px',
        marginBottom: '20px',
        overflowX: 'auto',
        paddingBottom: '4px'
      }}>
        <button
          className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap', borderRadius: '10px' }}
          onClick={() => setActiveTab('overview')}
        >
          📊 Ringkasan Platform
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap', borderRadius: '10px' }}
          onClick={() => { setActiveTab('users'); handleSearchUsers() }}
        >
          👥 Manajemen Pengguna ({users.length})
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'games' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap', borderRadius: '10px' }}
          onClick={() => setActiveTab('games')}
        >
          🎮 Manajemen Game ({sessions.length})
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'transactions' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap', borderRadius: '10px', position: 'relative' }}
          onClick={() => { setActiveTab('transactions'); handleSearchTransactions() }}
        >
          💳 Riwayat Transaksi ({transactions.length})
          {stats.pendingTxCount > 0 && (
            <span style={{ background: '#F59E0B', color: '#000', fontSize: '0.68rem', fontWeight: 900, padding: '1px 6px', borderRadius: '999px', marginLeft: '6px' }}>
              {stats.pendingTxCount}
            </span>
          )}
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'tickets' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap', borderRadius: '10px', position: 'relative' }}
          onClick={() => setActiveTab('tickets')}
        >
          🎫 Tiket Kendala
          {stats.openTicketsCount > 0 && (
            <span style={{ background: '#EF4444', color: '#FFF', fontSize: '0.68rem', fontWeight: 900, padding: '1px 6px', borderRadius: '999px', marginLeft: '6px' }}>
              {stats.openTicketsCount}
            </span>
          )}
        </button>

        <button
          className={`btn btn-sm ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ whiteSpace: 'nowrap', borderRadius: '10px' }}
          onClick={() => { setActiveTab('audit'); handleFilterAuditLogs() }}
        >
          🛡️ Audit Log Sistem (Immutable)
        </button>
      </div>

      {/* ============================================================================ */}
      {/* TAB 1: OVERVIEW METRICS                                                      */}
      {/* ============================================================================ */}
      {activeTab === 'overview' && (
        <div>
          {/* Top KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Pengguna</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#38BDF8', marginTop: '2px' }}>
                {stats.totalUsers}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '18px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
              <div style={{ fontSize: '0.8rem', color: '#34D399' }}>👑 User Pro Aktif</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#34D399', marginTop: '2px' }}>
                {stats.totalProUsers}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '18px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Game Dimainkan</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: '#F59E0B', marginTop: '2px' }}>
                {stats.totalGames}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '18px', border: '1px solid rgba(139, 92, 246, 0.4)' }}>
              <div style={{ fontSize: '0.8rem', color: '#C084FC' }}>💰 Total Omset (GMV)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFF', marginTop: '6px' }}>
                {formatRupiah(stats.totalRevenue)}
              </div>
            </div>
          </div>

          {/* Game Distribution */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '14px' }}>
              Distribusi Permainan
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {Object.entries(stats.distribution).map(([game, count]) => {
                const percentage = stats.totalGames > 0 ? Math.round((count / stats.totalGames) * 100) : 0
                const color = game === 'truf' ? '#8B5CF6' : game === 'remi' ? '#F59E0B' : game === 'omben' ? '#F97316' : '#10B981'
                return (
                  <div key={game}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 800, textTransform: 'uppercase' }}>{game}</span>
                      <span>{count} game ({percentage}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(0,0,0,0.3)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* TAB 2: USER MANAGEMENT                                                       */}
      {/* ============================================================================ */}
      {activeTab === 'users' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          {/* Filters Bar */}
          <form onSubmit={handleSearchUsers} style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Cari nama atau email..."
              value={userSearchTerm}
              onChange={e => setUserSearchTerm(e.target.value)}
              style={{ flex: 1, minWidth: '200px' }}
            />
            <select
              className="form-input"
              value={userFilterTier}
              onChange={e => setUserFilterTier(e.target.value)}
              style={{ width: '130px', background: '#1E293B', color: '#FFF' }}
            >
              <option value="all">Semua Tier</option>
              <option value="pro">👑 Pro</option>
              <option value="venue">☕ Venue</option>
              <option value="free">🎮 Free</option>
            </select>
            <select
              className="form-input"
              value={userFilterRole}
              onChange={e => setUserFilterRole(e.target.value)}
              style={{ width: '130px', background: '#1E293B', color: '#FFF' }}
            >
              <option value="all">Semua Role</option>
              <option value="admin">🛡️ Admin</option>
              <option value="user">User</option>
            </select>
            <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0 18px' }}>
              Cari
            </button>
          </form>

          {/* User List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {users.map(u => {
              const isUserPro = u.is_pro
              const isVenue = u.subscription_tier === 'venue'
              return (
                <div
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-glass)',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div 
                      className="avatar-circle" 
                      style={{ 
                        width: '42px', 
                        height: '42px', 
                        fontSize: '1.1rem',
                        border: isUserPro ? '2px solid #10B981' : '1px solid var(--border-glass)'
                      }}
                    >
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
                      ) : (
                        u.display_name?.charAt(0)?.toUpperCase() || 'U'
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: '#FFF', fontSize: '0.95rem' }}>{u.display_name || 'Tanpa Nama'}</strong>
                        {isUserPro && (
                          <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399', fontSize: '0.7rem', fontWeight: 800, padding: '1px 8px', borderRadius: '999px', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                            👑 PRO {u.pro_expires_at ? `(${new Date(u.pro_expires_at).toLocaleDateString()})` : ''}
                          </span>
                        )}
                        {isVenue && (
                          <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#FCD34D', fontSize: '0.7rem', fontWeight: 800, padding: '1px 8px', borderRadius: '999px' }}>
                            ☕ WARKOP
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {u.email || 'Tanpa Email'} • <span style={{ color: 'var(--text-dim)' }}>ID: {u.id?.slice(0, 8)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '999px',
                      background: u.role === 'admin' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                      color: u.role === 'admin' ? '#A78BFA' : 'var(--text-dim)'
                    }}>
                      {u.role?.toUpperCase()}
                    </span>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '5px 12px' }}
                      onClick={() => setSelectedUserAction(u)}
                    >
                      ⚙️ Kelola Akun
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* TAB 3: GAME MANAGEMENT                                                       */}
      {/* ============================================================================ */}
      {activeTab === 'games' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
              🎮 Seluruh Sesi Game & Meja Realtime
            </h3>

            <select
              className="form-input"
              value={gameFilterType}
              onChange={e => setGameFilterType(e.target.value)}
              style={{ width: '140px', background: '#1E293B', color: '#FFF' }}
            >
              <option value="all">Semua Game</option>
              <option value="truf">🃏 Truf</option>
              <option value="remi">🎴 Remi</option>
              <option value="omben">🍺 Omben</option>
              <option value="chess">♟️ Chess</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sessions.map(s => (
              <div
                key={s.id}
                style={{
                  padding: '14px 16px',
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 900, color: '#A78BFA' }}>[{s.game_type?.toUpperCase()}]</span>
                    <strong style={{ color: '#FFF' }}>{s.title}</strong>
                    {s.room_code && (
                      <span style={{ fontSize: '0.74rem', background: 'rgba(99, 102, 241, 0.2)', color: '#A5B4FC', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                        ROOM: {s.room_code}
                      </span>
                    )}
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: s.is_completed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: s.is_completed ? '#34D399' : '#FCD34D'
                    }}>
                      {s.is_completed ? '✓ Selesai' : '⏳ Sedang Main'}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Host: <strong>{s.profiles?.display_name || s.profiles?.email || 'Guest'}</strong> • Pemain: {s.player_names?.join(', ') || '-'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Dibuat: {new Date(s.created_at).toLocaleString('id-ID')}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                    onClick={() => handleInspectRounds(s)}
                  >
                    🔍 Log Ronde
                  </button>

                  {!s.is_completed && (
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#FCD34D' }}
                      onClick={() => handleForceCompleteSession(s.id)}
                    >
                      Selesaikan
                    </button>
                  )}

                  <button
                    className="btn btn-danger btn-sm"
                    style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    onClick={() => handleDeleteSession(s.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* TAB: GLOBAL PAYMENT TRANSACTIONS EXPLORER                                    */}
      {/* ============================================================================ */}
      {activeTab === 'transactions' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          {/* Top Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '18px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', padding: '12px 14px' }}>
              <div style={{ fontSize: '0.74rem', color: '#34D399', fontWeight: 800 }}>💰 OMSET LUNAS (GMV)</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FFF', marginTop: '2px' }}>
                {formatRupiah(stats.totalRevenue)}
              </div>
            </div>

            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', padding: '12px 14px' }}>
              <div style={{ fontSize: '0.74rem', color: '#FCD34D', fontWeight: 800 }}>🟡 MENUNGGU PEMBAYARAN</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FCD34D', marginTop: '2px' }}>
                {stats.pendingTxCount} Transaksi
              </div>
            </div>

            <div style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '12px', padding: '12px 14px' }}>
              <div style={{ fontSize: '0.74rem', color: '#C084FC', fontWeight: 800 }}>👑 PRO AKTIF</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#C084FC', marginTop: '2px' }}>
                {stats.totalProUsers} Akun
              </div>
            </div>

            <div style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '12px 14px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 800 }}>📜 TOTAL TRANSAKSI</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#FFF', marginTop: '2px' }}>
                {transactions.length} Catatan
              </div>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '18px' }}>
            <form onSubmit={handleSearchTransactions} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Cari Order ID, Email, Nama, Bank, No. VA..."
                value={txSearchTerm}
                onChange={e => setTxSearchTerm(e.target.value)}
                style={{ flex: 1, minWidth: '220px' }}
              />

              <select
                className="form-input"
                value={txStatusFilter}
                onChange={e => {
                  setTxStatusFilter(e.target.value)
                  adminService.getAllPaymentTransactions({
                    statusFilter: e.target.value,
                    tierFilter: txTierFilter,
                    searchTerm: txSearchTerm
                  }).then(setTransactions)
                }}
                style={{ width: '150px', background: '#1E293B', color: '#FFF' }}
              >
                <option value="all">Semua Status</option>
                <option value="settlement">🟢 Lunas (Settlement)</option>
                <option value="pending">🟡 Menunggu (Pending)</option>
                <option value="failed">🔴 Gagal / Expired</option>
              </select>

              <select
                className="form-input"
                value={txTierFilter}
                onChange={e => {
                  setTxTierFilter(e.target.value)
                  adminService.getAllPaymentTransactions({
                    statusFilter: txStatusFilter,
                    tierFilter: e.target.value,
                    searchTerm: txSearchTerm
                  }).then(setTransactions)
                }}
                style={{ width: '130px', background: '#1E293B', color: '#FFF' }}
              >
                <option value="all">Semua Paket</option>
                <option value="pro">👑 Kanca Pro</option>
                <option value="venue">☕ Kanca Venue</option>
              </select>

              <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0 18px' }}>
                Cari
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={exportTransactionsToCSV}
                title="Unduh seluruh data transaksi dalam format CSV"
              >
                📥 Ekspor CSV
              </button>
            </form>
          </div>

          {/* Transactions List */}
          {transactions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Tidak ada transaksi yang cocok dengan filter pencarian.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {transactions.map(tx => {
                const isSuccess = tx.status === 'settlement' || tx.status === 'capture'
                const isPending = tx.status === 'pending'
                const isFailed = ['expire', 'deny', 'cancel', 'failure'].includes(tx.status)
                const isCopied = copiedTxId === tx.id

                return (
                  <div
                    key={tx.id}
                    style={{
                      background: isPending ? 'rgba(245, 158, 11, 0.05)' : 'rgba(0,0,0,0.3)',
                      padding: '16px',
                      borderRadius: '12px',
                      border: isPending ? '1px solid rgba(245, 158, 11, 0.35)' : isSuccess ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-glass)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    {/* Header Row: Order ID & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <strong style={{ color: '#FFF', fontSize: '0.95rem' }}>
                          {tx.order_id}
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleCopyTx(tx.order_id, tx.id)}
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid var(--border-glass)',
                            borderRadius: '6px',
                            color: isCopied ? '#34D399' : 'var(--text-muted)',
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            cursor: 'pointer'
                          }}
                        >
                          {isCopied ? '✓ Disalin' : '📋 Salin'}
                        </button>
                      </div>

                      <div>
                        {isSuccess && (
                          <span style={{ background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.5)', color: '#34D399', fontSize: '0.74rem', fontWeight: 900, padding: '3px 12px', borderRadius: '999px' }}>
                            🟢 LUNAS / BERHASIL
                          </span>
                        )}
                        {isPending && (
                          <span style={{ background: 'rgba(245, 158, 11, 0.2)', border: '1px solid rgba(245, 158, 11, 0.5)', color: '#FCD34D', fontSize: '0.74rem', fontWeight: 900, padding: '3px 12px', borderRadius: '999px', animation: 'pulse 2s infinite' }}>
                            🟡 MENUNGGU PEMBAYARAN
                          </span>
                        )}
                        {isFailed && (
                          <span style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)', color: '#F87171', fontSize: '0.74rem', fontWeight: 800, padding: '3px 12px', borderRadius: '999px' }}>
                            🔴 {tx.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Customer Profile & Plan Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.84rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="avatar-circle" style={{ width: '36px', height: '36px', fontSize: '0.95rem' }}>
                          {tx.profiles?.display_name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: '#FFF' }}>
                            {tx.profiles?.display_name || 'Tanpa Nama'}
                          </div>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            {tx.profiles?.email || 'Guest / Tanpa Email'}
                          </div>
                        </div>
                      </div>

                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Paket & Siklus</div>
                        <div style={{ fontWeight: 800, color: tx.plan_tier === 'venue' ? '#FBBF24' : '#C084FC' }}>
                          {tx.plan_tier === 'venue' ? '☕ Kanca Venue' : '👑 Kanca Pro'} • {tx.billing_cycle === 'yearly' ? '1 Tahun Penuh' : '1 Bulan'}
                        </div>
                      </div>

                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Nominal Pembayaran</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 900, color: isSuccess ? '#34D399' : '#FFF' }}>
                          {formatRupiah(tx.gross_amount)}
                        </div>
                      </div>

                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Metode Bayar / VA</div>
                        <div style={{ fontWeight: 700, color: '#FFF' }}>
                          {tx.payment_type ? tx.payment_type.replace('_', ' ').toUpperCase() : 'MIDTRANS SNAP'}
                          {tx.bank ? ` (${tx.bank.toUpperCase()})` : ''}
                        </div>
                        {tx.va_number && (
                          <div style={{ fontSize: '0.76rem', color: '#38BDF8', fontFamily: 'monospace' }}>
                            VA: {tx.va_number}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timestamps & Actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-glass)', paddingTop: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        Waktu Order: {new Date(tx.transaction_time || tx.created_at).toLocaleString('id-ID')}
                        {tx.settlement_time && (
                          <span style={{ color: '#34D399', marginLeft: '8px' }}>
                            • Lunas: {new Date(tx.settlement_time).toLocaleString('id-ID')}
                          </span>
                        )}
                        {tx.expiry_time && isPending && (
                          <span style={{ color: '#FBBF24', marginLeft: '8px' }}>
                            • Batas: {new Date(tx.expiry_time).toLocaleString('id-ID')}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '8px' }}>
                        {isPending && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            style={{
                              background: '#10B981',
                              color: '#FFF',
                              fontWeight: 800,
                              fontSize: '0.76rem',
                              border: 'none',
                              padding: '5px 12px'
                            }}
                            disabled={processingTxId === tx.id}
                            onClick={() => handleManualSettlePayment(tx)}
                            title="Selesaikan transaksi secara manual dan aktifkan paket Pro pengguna"
                          >
                            {processingTxId === tx.id ? 'Memproses...' : '⚡ Settle Manual & Aktifkan Pro'}
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.76rem', padding: '5px 12px', borderColor: 'rgba(167, 139, 250, 0.4)', color: '#C084FC' }}
                          onClick={() => setSelectedReceiptTx(tx)}
                        >
                          🧾 Lihat Struk Digital
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================================ */}
      {/* TAB 4: SUPPORT & TROUBLE TICKETS                                             */}
      {/* ============================================================================ */}
      {activeTab === 'tickets' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
              🎫 Helpdesk & Tiket Kendala Pengguna
            </h3>

            <div style={{ display: 'flex', gap: '6px' }}>
              {['all', 'open', 'in_progress', 'resolved'].map(st => (
                <button
                  key={st}
                  type="button"
                  className={`btn btn-sm ${ticketStatusFilter === st ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '999px' }}
                  onClick={() => setTicketStatusFilter(st)}
                >
                  {st.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {tickets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              🎉 Tidak ada tiket trouble terbuka saat ini.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tickets.map(t => (
                <div
                  key={t.id}
                  style={{
                    padding: '16px',
                    background: t.status === 'open' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    border: t.status === 'open' ? '1px solid rgba(239, 68, 68, 0.35)' : '1px solid var(--border-glass)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: 900, background: '#1E293B', color: '#A78BFA', padding: '2px 8px', borderRadius: '4px' }}>
                        {t.category?.toUpperCase()}
                      </span>
                      <strong style={{ fontSize: '1rem', color: '#FFF' }}>{t.subject}</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background: t.status === 'open' ? '#EF4444' : (t.status === 'resolved' ? '#10B981' : '#F59E0B'),
                        color: '#FFF'
                      }}>
                        {t.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0', lineHeight: 1.4 }}>
                    {t.message}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-dim)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '8px' }}>
                    <span>Pengirim: <strong>{t.email}</strong> ({t.profiles?.display_name || 'User'})</span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.74rem', padding: '3px 12px' }}
                      onClick={() => {
                        setSelectedTicket(t)
                        setTicketAdminNotes(t.admin_notes || '')
                      }}
                    >
                      ✏️ Tanggapi Tiket
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================================ */}
      {/* TAB 5: IMMUTABLE AUDIT LOGS                                                  */}
      {/* ============================================================================ */}
      {activeTab === 'audit' && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#10B981', fontWeight: 900 }}>
                🔒 IMMUTABLE POSTGRESQL ENFORCED
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                🛡️ Audit Trail Aktivitas Seluruh Sistem
              </h3>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.76rem' }}
              onClick={exportAuditLogsToCSV}
            >
              📥 Ekspor CSV
            </button>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Cari aksi, aktor, target ID..."
              value={auditSearchTerm}
              onChange={e => setAuditSearchTerm(e.target.value)}
              style={{ flex: 1, minWidth: '200px' }}
            />

            <select
              className="form-input"
              value={auditCategory}
              onChange={e => setAuditCategory(e.target.value)}
              style={{ width: '150px', background: '#1E293B', color: '#FFF' }}
            >
              <option value="all">Semua Kategori</option>
              <option value="billing">💳 Billing / Payment</option>
              <option value="game">🎮 Game & Room</option>
              <option value="auth">👤 Auth & Akun</option>
              <option value="admin_action">👑 Admin Action</option>
              <option value="support">🎫 Support</option>
            </select>

            <button type="button" className="btn btn-primary btn-sm" onClick={handleFilterAuditLogs}>
              Filter
            </button>
          </div>

          {/* Logs Stream */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {auditLogs.map(log => {
              const isExpanded = expandedLogId === log.id
              const isBilling = log.category === 'billing'
              const isAdmin = log.category === 'admin_action'

              return (
                <div
                  key={log.id}
                  style={{
                    padding: '12px 14px',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '10px',
                    border: '1px solid var(--border-glass)',
                    fontSize: '0.82rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '0.7rem',
                        fontWeight: 900,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: isBilling ? 'rgba(16, 185, 129, 0.2)' : (isAdmin ? 'rgba(239, 68, 68, 0.2)' : 'rgba(99, 102, 241, 0.2)'),
                        color: isBilling ? '#34D399' : (isAdmin ? '#F87171' : '#A5B4FC')
                      }}>
                        {log.action}
                      </span>
                      <strong style={{ color: '#FFF' }}>{log.actor_name || log.actor_email}</strong>
                      {log.target_id && (
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>
                          Target: <code>{log.target_id}</code>
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>
                        {new Date(log.created_at).toLocaleString('id-ID')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        style={{ background: 'none', border: 'none', color: '#A78BFA', cursor: 'pointer', fontSize: '0.75rem' }}
                      >
                        {isExpanded ? '▲ Tutup' : '▼ Details'}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <pre style={{
                      background: 'rgba(0,0,0,0.5)',
                      padding: '10px',
                      borderRadius: '8px',
                      marginTop: '8px',
                      fontSize: '0.74rem',
                      color: '#38BDF8',
                      overflowX: 'auto'
                    }}>
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* MODAL: USER ACTIONS DRAWER                                                   */}
      {/* ============================================================================ */}
      {selectedUserAction && (
        <div className="modal-overlay" onClick={() => setSelectedUserAction(null)} style={{ zIndex: 9999 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', width: '95%', padding: '24px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                ⚙️ Kelola Akun: {selectedUserAction.display_name || selectedUserAction.email}
              </h3>
              <button className="btn-close" onClick={() => setSelectedUserAction(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.85rem' }}>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                <div>Email: <strong style={{ color: '#FFF' }}>{selectedUserAction.email || 'Tanpa Email'}</strong></div>
                <div>User ID: <code>{selectedUserAction.id}</code></div>
                <div>Status Saat Ini: <strong>{selectedUserAction.is_pro ? `👑 PRO (${selectedUserAction.subscription_tier})` : '🎮 FREE'}</strong></div>
                {selectedUserAction.pro_expires_at && (
                  <div style={{ color: '#34D399', fontSize: '0.78rem' }}>
                    Kadaluarsa: {new Date(selectedUserAction.pro_expires_at).toLocaleString('id-ID')}
                  </div>
                )}
              </div>

              {/* Subscription Management Section */}
              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                <strong style={{ display: 'block', marginBottom: '8px', color: '#A78BFA' }}>
                  👑 Atur Langganan Pengguna
                </strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{ borderColor: '#10B981', color: '#34D399' }}
                    disabled={userActionLoading}
                    onClick={() => handleGrantPro(selectedUserAction.id, 'pro', 1)}
                  >
                    +1 Bulan Pro
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{ borderColor: '#10B981', color: '#34D399' }}
                    disabled={userActionLoading}
                    onClick={() => handleGrantPro(selectedUserAction.id, 'pro', 12)}
                  >
                    +1 Tahun Pro
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{ borderColor: '#F59E0B', color: '#FCD34D' }}
                    disabled={userActionLoading}
                    onClick={() => handleGrantPro(selectedUserAction.id, 'venue', 12)}
                  >
                    ☕ Grant Warkop (1 Thn)
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    style={{ borderColor: '#A78BFA', color: '#C084FC' }}
                    disabled={userActionLoading}
                    onClick={() => handleGrantPro(selectedUserAction.id, 'pro', 999)}
                  >
                    ⭐ VIP Seumur Hidup
                  </button>
                </div>

                {selectedUserAction.is_pro && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary btn-block"
                    style={{ color: '#F87171', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                    disabled={userActionLoading}
                    onClick={() => handleRevokePro(selectedUserAction.id)}
                  >
                    Cabut Status Pro / Kembalikan ke Free
                  </button>
                )}
              </div>

              {/* Password & Role Section */}
              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleSendResetPassword(selectedUserAction.email)}
                >
                  ✉️ Kirim Tautan Reset Password
                </button>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleToggleRole(selectedUserAction.id, selectedUserAction.role)}
                >
                  🛡️ {selectedUserAction.role === 'admin' ? 'Cabut Akses Admin (Jadikan User)' : 'Jadikan Superadmin'}
                </button>
              </div>

              {/* Danger Zone */}
              <div style={{ borderTop: '1px solid rgba(239, 68, 68, 0.3)', paddingTop: '12px' }}>
                <button
                  type="button"
                  className="btn btn-danger btn-sm btn-block"
                  onClick={() => handleDeleteUser(selectedUserAction.id, selectedUserAction.email)}
                >
                  🗑️ Hapus Akun Pengguna Secara Permanen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* MODAL: GAME ROUNDS LOGS                                                      */}
      {/* ============================================================================ */}
      {selectedSessionRounds && (
        <div className="modal-overlay" onClick={() => setSelectedSessionRounds(null)} style={{ zIndex: 9999 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', width: '95%', padding: '24px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                📜 Log Ronde: {selectedSessionRounds.session?.title}
              </h3>
              <button className="btn-close" onClick={() => setSelectedSessionRounds(null)}>✕</button>
            </div>

            {loadingRounds ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>⏳ Memuat riwayat ronde...</div>
            ) : selectedSessionRounds.rounds.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Belum ada ronde yang disimpan pada sesi ini.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedSessionRounds.rounds.map(r => (
                  <div key={r.id} style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <strong>Ronde #{r.round_number}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{new Date(r.created_at).toLocaleTimeString()}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', fontSize: '0.78rem' }}>
                      {r.player_scores?.map((ps, idx) => (
                        <div key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '6px', textAlign: 'center' }}>
                          <div style={{ color: 'var(--text-muted)' }}>{selectedSessionRounds.session.player_names?.[ps.player_index] || `P${ps.player_index+1}`}</div>
                          <div>Bid: <strong>{ps.bid}</strong> | Won: <strong>{ps.won}</strong></div>
                          <div style={{ color: ps.score_change >= 0 ? '#34D399' : '#F87171', fontWeight: 800 }}>
                            {ps.score_change >= 0 ? `+${ps.score_change}` : ps.score_change} (Tot: {ps.score_cumulative})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* MODAL: SUPPORT TICKET RESOLUTION                                             */}
      {/* ============================================================================ */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)} style={{ zIndex: 9999 }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '95%', padding: '24px' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                🎫 Tanggapi Tiket #{selectedTicket.id?.slice(0, 8)}
              </h3>
              <button className="btn-close" onClick={() => setSelectedTicket(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <strong style={{ color: '#FFF' }}>{selectedTicket.subject}</strong>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pengirim: {selectedTicket.email}</div>
              </div>

              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', fontSize: '0.85rem' }}>
                {selectedTicket.message}
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Catatan Resolusi Admin (Internal / Riwayat)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={ticketAdminNotes}
                  onChange={e => setTicketAdminNotes(e.target.value)}
                  placeholder="Tulis tindakan yang telah dilakukan (misal: Sudah dikonfirmasi Midtrans, Pro diaktifkan manual)..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={updatingTicket}
                  onClick={() => handleUpdateTicket('open')}
                >
                  🔴 Set Open
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#FCD34D' }}
                  disabled={updatingTicket}
                  onClick={() => handleUpdateTicket('in_progress')}
                >
                  🟡 In Progress
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ background: '#10B981', border: 'none', fontWeight: 800 }}
                  disabled={updatingTicket}
                  onClick={() => handleUpdateTicket('resolved')}
                >
                  🟢 Selesaikan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* MODAL: ADMIN DIGITAL RECEIPT INSPECTOR                                       */}
      {/* ============================================================================ */}
      {selectedReceiptTx && (
        <div 
          className="modal-overlay" 
          onClick={() => setSelectedReceiptTx(null)}
          style={{ zIndex: 9999, background: 'rgba(0,0,0,0.85)' }}
        >
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{
              maxWidth: '480px',
              width: '95%',
              background: '#0F172A',
              border: '2px solid #334155',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              position: 'relative'
            }}
          >
            {/* Watermark Status */}
            <div style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-25deg)',
              fontSize: '4rem',
              fontWeight: 900,
              color: selectedReceiptTx.status === 'settlement' || selectedReceiptTx.status === 'capture'
                ? 'rgba(16, 185, 129, 0.08)'
                : 'rgba(245, 158, 11, 0.08)',
              border: '6px dashed currentColor',
              padding: '10px 30px',
              borderRadius: '16px',
              pointerEvents: 'none',
              letterSpacing: '6px',
              textTransform: 'uppercase'
            }}>
              {selectedReceiptTx.status === 'settlement' || selectedReceiptTx.status === 'capture' ? 'LUNAS' : selectedReceiptTx.status.toUpperCase()}
            </div>

            {/* Receipt Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #334155', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>♠️ KancaSela</div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFF', margin: '0 0 4px 0' }}>
                STRUK PEMBAYARAN RESMI
              </h4>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Midtrans Official Payment Gateway • Superadmin Copy
              </div>

              <div style={{
                display: 'inline-block',
                marginTop: '10px',
                background: selectedReceiptTx.status === 'settlement' || selectedReceiptTx.status === 'capture'
                  ? 'rgba(16, 185, 129, 0.2)'
                  : 'rgba(245, 158, 11, 0.2)',
                border: selectedReceiptTx.status === 'settlement' || selectedReceiptTx.status === 'capture'
                  ? '1px solid #10B981'
                  : '1px solid #F59E0B',
                color: selectedReceiptTx.status === 'settlement' || selectedReceiptTx.status === 'capture'
                  ? '#34D399'
                  : '#FCD34D',
                fontWeight: 900,
                fontSize: '0.78rem',
                padding: '3px 14px',
                borderRadius: '999px',
                letterSpacing: '1px'
              }}>
                {selectedReceiptTx.status === 'settlement' || selectedReceiptTx.status === 'capture' ? '✓ PEMBAYARAN LUNAS' : '⏳ ' + selectedReceiptTx.status.toUpperCase()}
              </div>
            </div>

            {/* Key Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Order ID:</span>
                <strong style={{ color: '#A78BFA' }}>{selectedReceiptTx.order_id}</strong>
              </div>
              {selectedReceiptTx.transaction_id && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Midtrans ID:</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.76rem' }}>{selectedReceiptTx.transaction_id}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pelanggan:</span>
                <span style={{ color: '#FFF' }}>
                  {selectedReceiptTx.profiles?.display_name || 'User'} ({selectedReceiptTx.profiles?.email || 'No email'})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>User ID:</span>
                <code style={{ fontSize: '0.74rem' }}>{selectedReceiptTx.user_id}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Waktu Order:</span>
                <span style={{ color: '#FFF' }}>
                  {new Date(selectedReceiptTx.transaction_time || selectedReceiptTx.created_at).toLocaleString('id-ID')}
                </span>
              </div>
              {selectedReceiptTx.settlement_time && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#34D399' }}>Waktu Lunas:</span>
                  <span style={{ color: '#34D399', fontWeight: 800 }}>
                    {new Date(selectedReceiptTx.settlement_time).toLocaleString('id-ID')}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Metode Bayar:</span>
                <span style={{ color: '#FFF', textTransform: 'capitalize' }}>
                  {selectedReceiptTx.payment_type ? selectedReceiptTx.payment_type.replace('_', ' ') : 'Snap VA / QRIS'} 
                  {selectedReceiptTx.bank ? ` (${selectedReceiptTx.bank.toUpperCase()})` : ''}
                </span>
              </div>
              {selectedReceiptTx.va_number && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>No. Virtual Account:</span>
                  <span style={{ color: '#38BDF8', fontWeight: 800, fontFamily: 'monospace' }}>
                    {selectedReceiptTx.va_number}
                  </span>
                </div>
              )}
            </div>

            {/* Itemized breakdown */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '12px',
              padding: '12px',
              border: '1px solid #334155',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800, color: '#FFF', marginBottom: '8px' }}>
                <span>Item Tagihan</span>
                <span>Nominal</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>
                  KancaSela {selectedReceiptTx.plan_tier === 'venue' ? 'Venue (B2B)' : 'Pro'} 
                  ({selectedReceiptTx.billing_cycle === 'yearly' ? '1 Tahun Penuh' : '1 Bulan'})
                </span>
                <span style={{ color: '#FFF' }}>{formatRupiah(selectedReceiptTx.gross_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
                <span>Biaya Platform & PPN</span>
                <span>Rp 0</span>
              </div>
              <div style={{ borderTop: '1px dashed #475569', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 900, color: '#34D399' }}>
                <span>Total Pembayaran</span>
                <span>{formatRupiah(selectedReceiptTx.gross_amount)}</span>
              </div>
            </div>

            {/* Footer / Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: '0.82rem' }}
                onClick={() => window.print()}
              >
                🖨️ Cetak Struk
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, fontSize: '0.82rem' }}
                onClick={() => setSelectedReceiptTx(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
