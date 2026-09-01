import React, { useState, useEffect } from 'react'
import { adminService } from '../../services/adminService'
import { useTranslation } from '../../i18n/I18nContext'

export default function AdminDashboard({ onBack }) {
  const { t } = useTranslation()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGames: 0,
    activeToday: 0,
    distribution: { truf: 0, remi: 0, omben: 0, generic: 0, chess: 0 }
  })
  const [users, setUsers] = useState([])
  const [sessions, setSessions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'users' | 'sessions'
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const [statsData, usersData, sessionsData] = await Promise.all([
        adminService.getGlobalStats(),
        adminService.getUsersList(searchTerm),
        adminService.getGlobalSessions(20)
      ])
      setStats(statsData)
      setUsers(usersData)
      setSessions(sessionsData)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSearchUsers = async (e) => {
    e.preventDefault()
    const usersData = await adminService.getUsersList(searchTerm)
    setUsers(usersData)
  }

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    if (window.confirm(`Ubah peran pengguna ini menjadi "${newRole}"?`)) {
      await adminService.updateUserRole(userId, newRole)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      {/* Admin Header */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: '#8B5CF6', fontWeight: 800, letterSpacing: '1px' }}>
            SUPERADMIN PRIVILEGE
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>🛡️ {t('admin.title')}</h2>
        </div>
        {onBack && (
          <button className="btn btn-secondary btn-sm" onClick={onBack}>
            ← Kembali ke Hub
          </button>
        )}
      </div>

      {/* Admin Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        <button
          className={`btn btn-sm ${activeTab === 'overview' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('overview')}
        >
          📊 Ringkasan
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('users')}
        >
          👥 Manajemen Pengguna ({users.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'sessions' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('sessions')}
        >
          🎲 Sesi Game Global ({sessions.length})
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
          Memuat data analitik...
        </div>
      ) : activeTab === 'overview' ? (
        <div>
          {/* Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('admin.total_users')}</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#38BDF8', marginTop: '4px' }}>
                {stats.totalUsers}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('admin.total_games')}</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#F59E0B', marginTop: '4px' }}>
                {stats.totalGames}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('admin.active_sessions')}</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: '#34D399', marginTop: '4px' }}>
                {stats.activeToday}
              </div>
            </div>
          </div>

          {/* Game Distribution */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px' }}>
              {t('admin.game_distribution')}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Object.entries(stats.distribution).map(([game, count]) => {
                const percentage = stats.totalGames > 0 ? Math.round((count / stats.totalGames) * 100) : 0
                const color = game === 'truf' ? '#8B5CF6' : game === 'remi' ? '#F59E0B' : game === 'omben' ? '#F97316' : '#10B981'

                return (
                  <div key={game}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>{game}</span>
                      <span>{count} game ({percentage}%)</span>
                    </div>
                    <div style={{ width: '100%', height: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '999px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: '999px', transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : activeTab === 'users' ? (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <form onSubmit={handleSearchUsers} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input
              type="text"
              className="form-input"
              placeholder={t('admin.search_user')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-primary">
              Cari
            </button>
          </form>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {users.map(u => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-glass)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>{u.display_name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email || 'Tanpa Email'}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    Bergabung: {new Date(u.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: '999px',
                    background: u.role === 'admin' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255,255,255,0.05)',
                    color: u.role === 'admin' ? '#A78BFA' : 'var(--text-dim)'
                  }}>
                    {u.role?.toUpperCase()}
                  </span>

                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleToggleRole(u.id, u.role)}
                  >
                    {u.role === 'admin' ? t('admin.remove_admin') : t('admin.make_admin')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px' }}>
            🎲 {t('admin.session_explorer')}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sessions.map(s => (
              <div
                key={s.id}
                style={{
                  padding: '14px',
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--primary)' }}>[{s.game_type?.toUpperCase()}]</span>
                    <strong>{s.title}</strong>
                    {s.room_code && <span style={{ fontSize: '0.75rem', background: 'var(--bg-glass-strong)', padding: '2px 6px', borderRadius: '4px' }}>ROOM: {s.room_code}</span>}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Pemain: {s.player_names?.join(', ')} • {new Date(s.created_at).toLocaleString()}
                  </div>
                </div>

                <div>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: s.is_completed ? '#34D399' : '#F59E0B'
                  }}>
                    {s.is_completed ? 'Selesai' : 'Sedang Main'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
