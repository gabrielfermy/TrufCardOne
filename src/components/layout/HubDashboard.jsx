import React from 'react'
import { useTranslation } from '../../i18n/I18nContext'

export default function HubDashboard({ onSelectTool, recentSessions, onRematch, onShareSession }) {
  const { t } = useTranslation()

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

      {/* 4. Recent Game Night Diary Widget */}
      <div className="section-label" style={{ marginTop: '32px' }}>
        {t('hub.recent_games')}
      </div>
      {recentSessions && recentSessions.length > 0 ? (
        <div className="diary-list">
          {recentSessions.slice(0, 5).map(session => (
            <div key={session.id} className="diary-card">
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
                    🔄 Rematch
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <p>{t('hub.no_recent_games')}</p>
        </div>
      )}
    </div>
  )
}
