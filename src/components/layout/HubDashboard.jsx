import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'

export default function HubDashboard({ 
  onSelectTool, 
  recentSessions = [], 
  onRematch, 
  onShareSession, 
  onOpenPricing, 
  onJoinRoom,
  onOpenSession,
  onViewRecap,
  onCompleteSession,
  onDeleteSession
}) {
  const { t } = useTranslation()
  const [roomInput, setRoomInput] = useState('')
  const [joining, setJoining] = useState(false)
  const [diaryTab, setDiaryTab] = useState('active') // 'active' | 'completed'

  const activeSessions = recentSessions.filter(s => !s.is_completed)
  const completedSessions = recentSessions.filter(s => s.is_completed)

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!roomInput.trim()) return
    setJoining(true)
    const success = await onJoinRoom(roomInput.trim().toUpperCase())
    if (!success) {
      alert('Room tidak ditemukan. Pastikan kode room sudah benar.')
    }
    setJoining(false)
  }

  const cardGames = [
    {
      id: 'truf',
      title: t('truf.name'),
      desc: t('hub.truf_desc'),
      icon: '🃏',
      badge: '4 Pemain',
      color: '#8B5CF6',
      glow: 'rgba(139, 92, 246, 0.4)'
    },
    {
      id: 'remi',
      title: t('remi.name'),
      desc: t('hub.remi_desc'),
      icon: '🎴',
      badge: '2–6 Pemain',
      color: '#F59E0B',
      glow: 'rgba(245, 158, 11, 0.4)'
    },
    {
      id: 'omben',
      title: t('omben.name'),
      desc: t('hub.omben_desc'),
      icon: '🍺',
      badge: '2–6 Pemain',
      color: '#F97316',
      glow: 'rgba(249, 115, 22, 0.4)'
    }
  ]

  const timerAndScores = [
    {
      id: 'chess',
      title: t('chess.name'),
      desc: t('hub.chess_desc'),
      icon: '⏱️',
      badge: 'Dual Touch',
      color: '#3B82F6',
      glow: 'rgba(59, 130, 246, 0.4)'
    },
    {
      id: 'scoreboard',
      title: t('scoreboard.name'),
      desc: t('hub.scoreboard_desc'),
      icon: '📊',
      badge: '2–8 Pemain',
      color: '#10B981',
      glow: 'rgba(16, 185, 129, 0.4)'
    }
  ]

  const quickTools = [
    {
      id: 'utilities',
      tab: 'dice',
      title: t('utilities.dice_title'),
      desc: t('hub.dice_desc'),
      icon: '🎲',
      color: '#EC4899'
    },
    {
      id: 'utilities',
      tab: 'finger',
      title: t('utilities.finger_title'),
      desc: t('hub.finger_desc'),
      icon: '👆',
      color: '#06B6D4'
    },
    {
      id: 'utilities',
      tab: 'coin',
      title: t('utilities.coin_title'),
      desc: t('hub.coin_desc'),
      icon: '🪙',
      color: '#EAB308'
    }
  ]

  return (
    <div className="main-content">
      {/* Hub Header */}
      <div className="hub-header">
        <h1 className="hub-title">{t('hub.title')}</h1>
        <p className="hub-subtitle">{t('hub.subtitle')}</p>
      </div>

      {/* Quick Join Room by Code */}
      {onJoinRoom && (
        <form onSubmit={handleJoin} style={{ display: 'flex', gap: '8px', marginBottom: '24px', maxWidth: '500px' }}>
          <input 
            type="text" 
            className="form-input"
            value={roomInput}
            onChange={e => setRoomInput(e.target.value.toUpperCase())}
            placeholder="Masukkan Kode Room (misal: TRU-8K2N)"
            style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={joining || !roomInput.trim()}
            style={{ whiteSpace: 'nowrap', padding: '0 20px' }}
          >
            {joining ? '...' : '🚪 Gabung'}
          </button>
        </form>
      )}

      {/* 1. Card Games Section */}
      <div className="section-label">{t('hub.card_games')}</div>
      <div className="game-grid">
        {cardGames.map(game => (
          <div 
            key={game.id} 
            className="game-card"
            style={{ '--card-glow': game.glow }}
            onClick={() => onSelectTool(game.id)}
          >
            <div>
              <div className="card-top">
                <span className="card-icon">{game.icon}</span>
                <span className="card-badge" style={{ borderColor: game.color, color: game.color }}>
                  {game.badge}
                </span>
              </div>
              <h3 style={{ color: game.color }}>{game.title}</h3>
              <p>{game.desc}</p>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-sm btn-primary">Mulai Main →</button>
            </div>
          </div>
        ))}
      </div>

      {/* 2. Timers & Scoreboard Section */}
      <div className="section-label">{t('hub.timers_scores')}</div>
      <div className="game-grid">
        {timerAndScores.map(item => (
          <div 
            key={item.id} 
            className="game-card"
            style={{ '--card-glow': item.glow }}
            onClick={() => onSelectTool(item.id)}
          >
            <div>
              <div className="card-top">
                <span className="card-icon">{item.icon}</span>
                <span className="card-badge" style={{ borderColor: item.color, color: item.color }}>
                  {item.badge}
                </span>
              </div>
              <h3 style={{ color: item.color }}>{item.title}</h3>
              <p>{item.desc}</p>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-sm btn-secondary">Buka Alat →</button>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Quick Tabletop Utilities */}
      <div className="section-label">{t('hub.quick_tools')}</div>
      <div className="game-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {quickTools.map((tool, idx) => (
          <div 
            key={idx} 
            className="game-card"
            style={{ minHeight: '120px' }}
            onClick={() => onSelectTool(tool.id, tool.tab)}
          >
            <div className="card-top">
              <span className="card-icon" style={{ fontSize: '1.8rem' }}>{tool.icon}</span>
            </div>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{tool.title}</h4>
            <p style={{ fontSize: '0.8rem' }}>{tool.desc}</p>
          </div>
        ))}
      </div>

      {/* Pricing / Pro Promotion Banner */}
      {onOpenPricing && (
        <div 
          onClick={onOpenPricing}
          className="glass-panel" 
          style={{
            padding: '16px 20px',
            marginTop: '28px',
            marginBottom: '12px',
            background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.15), rgba(245, 158, 11, 0.12))',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '2rem' }}>⭐</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#FFF' }}>
                Tingkatkan Pengalaman Game Night Anda
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Buka riwayat game tanpa batas, template story VIP, & mode TV Kafe.
              </div>
            </div>
          </div>
          <button className="btn btn-sm btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
            Lihat Paket 💎
          </button>
        </div>
      )}

      {/* 4. Match Management Diary Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '28px', marginBottom: '12px' }}>
        <div className="section-label" style={{ margin: 0 }}>
          {t('hub.recent_games')}
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className={`btn btn-sm ${diaryTab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.78rem', padding: '4px 10px', fontWeight: 800 }}
            onClick={() => setDiaryTab('active')}
          >
            🟢 Aktif ({activeSessions.length})
          </button>
          <button
            className={`btn btn-sm ${diaryTab === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '0.78rem', padding: '4px 10px', fontWeight: 800 }}
            onClick={() => setDiaryTab('completed')}
          >
            🏁 Selesai ({completedSessions.length})
          </button>
        </div>
      </div>

      {/* Tab: Active Ongoing Matches */}
      {diaryTab === 'active' && (
        <div className="diary-list">
          {activeSessions.length > 0 ? (
            activeSessions.slice(0, 8).map(session => {
              const roundsCount = session.game_rounds?.length || session.rounds?.length || 0
              return (
                <div key={session.id} className="diary-card" style={{ borderLeft: '4px solid #34D399' }}>
                  <div className="diary-left">
                    <span className="diary-icon">
                      {session.game_type === 'truf' ? '🃏' : session.game_type === 'remi' ? '🎴' : session.game_type === 'omben' ? '🍺' : '📊'}
                    </span>
                    <div>
                      <div className="diary-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{session.title || `${session.game_type?.toUpperCase()} Match`}</span>
                        {session.room_code && (
                          <span style={{ fontSize: '0.72rem', color: '#A855F7', background: 'rgba(168, 85, 247, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                            🔗 {session.room_code}
                          </span>
                        )}
                      </div>
                      <div className="diary-meta">
                        Ronde {roundsCount + 1} • {session.player_names?.join(', ')}
                      </div>
                    </div>
                  </div>
                  <div className="diary-right">
                    {onOpenSession && (
                      <button 
                        className="btn btn-sm btn-primary"
                        onClick={() => onOpenSession(session)}
                        style={{ fontWeight: 800 }}
                      >
                        ▶️ Lanjut
                      </button>
                    )}
                    {onCompleteSession && (
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => {
                          if (confirm('Selesaikan game ini dan simpan ke riwayat selesai?')) {
                            onCompleteSession(session.id)
                          }
                        }}
                        title="Selesaikan Game"
                      >
                        🏁
                      </button>
                    )}
                    {onDeleteSession && (
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          if (confirm('Hapus game ini?')) {
                            onDeleteSession(session.id)
                          }
                        }}
                        title="Hapus"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0 }}>Tidak ada game yang sedang aktif berjalan.</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>Pilih game di atas untuk membuat meja baru!</p>
            </div>
          )}
        </div>
      )}

      {/* Tab: Completed Finished Matches */}
      {diaryTab === 'completed' && (
        <div className="diary-list">
          {completedSessions.length > 0 ? (
            completedSessions.slice(0, 8).map(session => (
              <div key={session.id} className="diary-card" style={{ borderLeft: '4px solid #F59E0B' }}>
                <div className="diary-left">
                  <span className="diary-icon">
                    {session.game_type === 'truf' ? '🃏' : session.game_type === 'remi' ? '🎴' : session.game_type === 'omben' ? '🍺' : '📊'}
                  </span>
                  <div>
                    <div className="diary-title">
                      {session.title || `${session.game_type?.toUpperCase()} Match`}
                    </div>
                    <div className="diary-meta">
                      {new Date(session.created_at).toLocaleDateString()} • {session.player_names?.join(', ')}
                    </div>
                  </div>
                </div>
                <div className="diary-right">
                  {onViewRecap && (
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => onViewRecap(session)}
                      title="Lihat Rekap Hasil"
                    >
                      📊 Rekap
                    </button>
                  )}
                  {onShareSession && (
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => onShareSession(session)}
                      title="Bagikan Kartu Story 9:16"
                    >
                      📸 9:16
                    </button>
                  )}
                  {onRematch && (
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => onRematch(session)}
                    >
                      🔄
                    </button>
                  )}
                  {onDeleteSession && (
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => {
                        if (confirm('Hapus riwayat pertandingan ini?')) {
                          onDeleteSession(session.id)
                        }
                      }}
                      title="Hapus"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0 }}>Belum ada riwayat game yang diselesaikan.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
