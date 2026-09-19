import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import AdBanner from '../ads/AdBanner'
import { authService } from '../../services/authService'
import CardGameRulesModal from '../common/CardGameRulesModal'

export default function HubDashboard({ 
  user,
  onOpenAuth,
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
  const isPro = authService.isUserPro(user)
  const [roomInput, setRoomInput] = useState('')
  const [joining, setJoining] = useState(false)
  const [diaryTab, setDiaryTab] = useState('active') // 'active' | 'completed'
  const [isRulesOpen, setIsRulesOpen] = useState(false)
  const [rulesInitialGame, setRulesInitialGame] = useState('truf')

  const activeSessions = recentSessions.filter(s => !s.is_completed)
  const completedSessions = recentSessions.filter(s => s.is_completed)

  const handleJoin = async (e) => {
    e.preventDefault()
    if (!roomInput.trim()) return
    setJoining(true)
    const success = await onJoinRoom(roomInput.trim().toUpperCase())
    if (!success) {
      alert(t('hub.room_not_found'))
    }
    setJoining(false)
  }

  const cardGames = [
    {
      id: 'truf',
      title: t('truf.name'),
      desc: t('hub.truf_desc'),
      icon: '🃏',
      badge: t('hub.badge_4_players'),
      color: '#8B5CF6',
      glow: 'rgba(139, 92, 246, 0.4)'
    },
    {
      id: 'bridge',
      title: t('bridge.name') || 'Contract Bridge',
      desc: t('hub.bridge_desc') || 'Contract Bridge resmi WBF (Duplicate / Chicago), kalkulator kontrak & slam',
      icon: '🃏',
      badge: t('hub.badge_4_players') || '4 Pemain',
      color: '#818CF8',
      glow: 'rgba(129, 140, 248, 0.4)'
    },
    {
      id: 'spades',
      title: t('spades.name') || 'Spades',
      desc: t('hub.spades_desc') || 'Scorecard Spades partnership 2v2 & Solo, Nil bonus, dan 10-bag penalty meter',
      icon: '♠️',
      badge: t('hub.badge_4_players') || '4 Pemain',
      color: '#A855F7',
      glow: 'rgba(168, 85, 247, 0.4)'
    },
    {
      id: 'remi',
      title: t('remi.name'),
      desc: t('hub.remi_desc'),
      icon: '🎴',
      badge: t('hub.badge_2_6_players'),
      color: '#F59E0B',
      glow: 'rgba(245, 158, 11, 0.4)'
    },
    {
      id: 'remijawa',
      title: t('remi_jawa.name') || 'Remi Jawa',
      desc: t('hub.remi_jawa_desc') || 'Kalkulator skor Remi Jawa, aturan seri/tris, bonus tutup & streak CHOLOKOPOK',
      icon: '🎴',
      badge: t('hub.badge_2_4_players') || '2 - 4 Pemain',
      color: '#EAB308',
      glow: 'rgba(234, 179, 8, 0.4)'
    },
    {
      id: 'capsa',
      title: t('capsa.name') || 'Capsa',
      desc: t('hub.capsa_desc') || 'Capsa Susun (Head-to-Head 3 baris & Tembus) & Capsa Banting (Big Two)',
      icon: '🎴',
      badge: t('hub.badge_2_4_players') || '2–4 Pemain',
      color: '#06B6D4',
      glow: 'rgba(6, 182, 212, 0.4)'
    },
    {
      id: 'domino',
      title: t('domino.name') || 'Domino Gaple',
      desc: t('hub.domino_desc') || 'Domino Gaple (Individu / Pasangan 2v2 & Denda Balak) & Domino QiuQiu',
      icon: '🀄',
      badge: t('hub.badge_2_4_players') || '2–4 Pemain',
      color: '#38BDF8',
      glow: 'rgba(56, 189, 248, 0.4)'
    },
    {
      id: 'omben',
      title: t('omben.name'),
      desc: t('hub.omben_desc'),
      icon: '🍺',
      badge: t('hub.badge_2_6_players'),
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
      badge: t('hub.badge_dual_touch'),
      color: '#3B82F6',
      glow: 'rgba(59, 130, 246, 0.4)'
    },
    {
      id: 'scoreboard',
      title: t('scoreboard.name'),
      desc: t('hub.scoreboard_desc'),
      icon: '📊',
      badge: t('hub.badge_2_8_players'),
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
            placeholder={t('hub.room_input_placeholder')}
            style={{ textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={joining || !roomInput.trim()}
            style={{ whiteSpace: 'nowrap', padding: '0 20px' }}
          >
            {joining ? '...' : `🚪 ${t('hub.join_room')}`}
          </button>
        </form>
      )}

      {/* 1. Card Games Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '16px', marginBottom: '8px' }}>
        <div className="section-label" style={{ margin: 0 }}>{t('hub.card_games')}</div>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => {
            setRulesInitialGame('truf')
            setIsRulesOpen(true)
          }}
          style={{
            fontSize: '0.76rem',
            padding: '4px 10px',
            borderRadius: '8px',
            color: '#C084FC',
            borderColor: 'rgba(139, 92, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <span>📖</span>
          <span>{t('rules_modal.quick_btn')}</span>
        </button>
      </div>
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
              <button className="btn btn-sm btn-primary">{t('hub.start_game_btn')}</button>
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
              <button className="btn btn-sm btn-secondary">{t('hub.open_tool_btn')}</button>
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

      {/* Pricing / Pro Promotion Banner or Active Pro Badge */}
      {isPro ? (
        <div 
          onClick={onOpenPricing}
          className="glass-panel" 
          style={{
            padding: '12px 18px',
            marginTop: '24px',
            marginBottom: '12px',
            background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(139, 92, 246, 0.12))',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.6rem' }}>👑</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#FCD34D' }}>
                Kanca Pro Aktif
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Pengalaman 100% Bebas Iklan & Riwayat Tanpa Batas Aktif
              </div>
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#F59E0B', fontWeight: 600 }}>
            Kelola &rarr;
          </span>
        </div>
      ) : (
        <>
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
                    {t('hub.pro_banner_title')}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {t('hub.pro_banner_desc')}
                  </div>
                </div>
              </div>
              <button className="btn btn-sm btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                {t('hub.view_plans')}
              </button>
            </div>
          )}

          {/* Ad Banner Slot (Web & Mobile Native) */}
          <AdBanner isPro={isPro} onOpenPricing={onOpenPricing} placement="dashboard" />
        </>
      )}

      {/* 4. Match Management Diary Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '28px', marginBottom: '12px' }}>
        <div className="section-label" style={{ margin: 0 }}>
          {t('hub.recent_games')}
        </div>
        {user && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`btn btn-sm ${diaryTab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '4px 10px', fontWeight: 800 }}
              onClick={() => setDiaryTab('active')}
            >
              🟢 {t('hub.tab_active')} ({activeSessions.length})
            </button>
            <button
              className={`btn btn-sm ${diaryTab === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.78rem', padding: '4px 10px', fontWeight: 800 }}
              onClick={() => setDiaryTab('completed')}
            >
              🏁 {t('hub.tab_completed')} ({completedSessions.length})
            </button>
          </div>
        )}
      </div>

      {/* Diary Content Area */}
      {!user ? (
        /* Spacious, Beautiful Frosted Glass Locked Card for Guests (No Clipping) */
        <div style={{
          position: 'relative',
          borderRadius: '20px',
          overflow: 'hidden',
          border: '1px dashed rgba(139, 92, 246, 0.45)',
          background: 'linear-gradient(180deg, rgba(20, 16, 45, 0.75) 0%, rgba(11, 14, 23, 0.9) 100%)',
          padding: '52px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.5)'
        }}>
          {/* Subtle Ambient Background Mock Cards */}
          <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            opacity: 0.18,
            filter: 'blur(6px)',
            pointerEvents: 'none',
            userSelect: 'none',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div className="diary-card" style={{ borderLeft: '4px solid #34D399' }}>
              <div className="diary-left">
                <span className="diary-icon">🃏</span>
                <div>
                  <div className="diary-title">TRUF Match • TRU-8K2N</div>
                  <div className="diary-meta">{t('hub.round_n', { num: 8 })} • Gabriel, Budi, Andi, Rizky</div>
                </div>
              </div>
            </div>
            <div className="diary-card" style={{ borderLeft: '4px solid #F59E0B' }}>
              <div className="diary-left">
                <span className="diary-icon">🎴</span>
                <div>
                  <div className="diary-title">REMI 7-Card Match</div>
                  <div className="diary-meta">12 Sep • Gabriel, Budi, Siti, Dani</div>
                </div>
              </div>
            </div>
          </div>

          {/* Foreground Call To Action */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(139, 92, 246, 0.18)',
              border: '1px solid rgba(139, 92, 246, 0.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem',
              marginBottom: '16px',
              boxShadow: '0 0 28px rgba(139, 92, 246, 0.35)'
            }}>
              🔒
            </div>

            <h4 style={{
              fontSize: '1.35rem',
              fontWeight: 900,
              color: '#FFF',
              margin: '0 0 10px 0',
              letterSpacing: '0.5px'
            }}>
              {t('hub.guest_history_title')}
            </h4>

            <p style={{
              fontSize: '0.92rem',
              color: 'var(--text-muted)',
              maxWidth: '480px',
              margin: '0 0 26px 0',
              lineHeight: 1.6
            }}>
              {t('hub.guest_history_desc')}
            </p>

            {onOpenAuth && (
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={onOpenAuth}
                style={{
                  background: 'linear-gradient(90deg, #8B5CF6, #EC4899)',
                  fontWeight: 800,
                  padding: '12px 34px',
                  borderRadius: '14px',
                  fontSize: '0.98rem',
                  boxShadow: '0 6px 24px rgba(139, 92, 246, 0.5)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span>✨</span>
                <span>{t('hub.guest_history_btn')}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Real User Matches */
        <div>
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
                                {t('hub.round_n', { num: roundsCount + 1 })} • {session.player_names?.join(', ')}
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
                                ▶️ {t('hub.resume_btn')}
                              </button>
                            )}
                            {onCompleteSession && (
                              <button 
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                  if (confirm(t('hub.confirm_finish'))) {
                                    onCompleteSession(session.id)
                                  }
                                }}
                                title={t('hub.finish_game_title')}
                              >
                                🏁
                              </button>
                            )}
                            {onDeleteSession && (
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={() => {
                                  if (confirm(t('hub.confirm_delete'))) {
                                    onDeleteSession(session.id)
                                  }
                                }}
                                title={t('hub.delete_game_title')}
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
                      <p style={{ margin: 0 }}>{t('hub.no_active_games')}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>{t('hub.no_active_games_hint')}</p>
                    </div>
                  )}
                </div>
              )}

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
                              title={t('hub.recap_btn')}
                            >
                              📊 {t('hub.recap_btn')}
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
                                if (confirm(t('hub.confirm_delete_history'))) {
                                  onDeleteSession(session.id)
                                }
                              }}
                              title={t('hub.delete_game_title')}
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <p style={{ margin: 0 }}>{t('hub.no_completed_games')}</p>
                    </div>
                  )}
                </div>
              )}
        </div>
      )}

      {/* Official Footer & Compliance */}
      <footer
        style={{
          marginTop: '40px',
          padding: '24px 16px',
          borderTop: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))',
          textAlign: 'center',
          fontSize: '0.78rem',
          color: 'var(--text-dim, #71717A)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-main, #FFF)', fontWeight: 700 }}>
          <span>🎮 KancaSela (Konco Selo)</span>
          <span>•</span>
          <span style={{ color: '#A78BFA' }}>Tabletop Companion</span>
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span style={{ cursor: 'pointer', color: '#818CF8' }} onClick={onOpenPricing}>
            💎 Paket Kanca Pro
          </span>
          <span>•</span>
          <span>🔒 Pembayaran Didukung Midtrans</span>
          <span>•</span>
          <a href="mailto:support@kancasela.my.id" style={{ color: 'inherit', textDecoration: 'none' }}>
            ✉️ Bantuan: support@kancasela.my.id
          </a>
        </div>

        <div style={{ fontSize: '0.72rem', color: 'var(--text-dim, #52525B)' }}>
          © 2026 KancaSela. Hak Cipta Dilindungi Undang-Undang.
        </div>
      </footer>

      {/* Card Game Rules Modal */}
      <CardGameRulesModal 
        isOpen={isRulesOpen} 
        onClose={() => setIsRulesOpen(false)} 
        initialGame={rulesInitialGame} 
      />
    </div>
  )
}
