import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

export default function OmbenSetup({ onStartGame, onBack }) {
  const { t } = useTranslation()
  const [playerCount, setPlayerCount] = useState(4)
  const [playerNames, setPlayerNames] = useState(['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4'])
  const [hostSeat, setHostSeat] = useState(0) // 0..n or -1
  const [targetLoss, setTargetLoss] = useState(5)
  const [roomMode, setRoomMode] = useState('multiplayer') // 'multiplayer' | 'offline'
  const [isRulesOpen, setIsRulesOpen] = useState(false)

  const handleCountChange = (count) => {
    setPlayerCount(count)
    const current = [...playerNames]
    if (count > current.length) {
      for (let i = current.length; i < count; i++) {
        current.push(`Pemain ${i + 1}`)
      }
    } else {
      current.splice(count)
    }
    setPlayerNames(current)
    if (hostSeat >= count) {
      setHostSeat(0)
    }
  }

  const handleNameChange = (idx, val) => {
    const next = [...playerNames]
    next[idx] = val
    setPlayerNames(next)
  }

  const handleStart = (e) => {
    e.preventDefault()
    onStartGame({
      playerNames,
      hostSeat,
      isOfflineLocal: roomMode === 'offline',
      settings: {
        targetLoss
      }
    })
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', maxWidth: '540px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>🍺 {t('omben.setup_title')}</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-sm btn-secondary" 
            onClick={() => setIsRulesOpen(true)}
            style={{ color: '#FBBF24', borderColor: 'rgba(245, 158, 11, 0.4)' }}
          >
            📖 {t('rules_modal.quick_btn')}
          </button>
          {onBack && <button className="btn btn-sm btn-secondary" onClick={onBack}>← {t('app.back')}</button>}
        </div>
      </div>

      <form onSubmit={handleStart}>
        {/* Table Type / Room Mode */}
        <div className="section-label" style={{ marginTop: 0 }}>{t('room_mode.title')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <div 
            onClick={() => setRoomMode('multiplayer')}
            style={{
              padding: '12px',
              borderRadius: '12px',
              border: `2px solid ${roomMode === 'multiplayer' ? 'var(--primary)' : 'var(--border-glass)'}`,
              background: roomMode === 'multiplayer' ? 'var(--badge-purple-bg)' : 'var(--bg-glass)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: roomMode === 'multiplayer' ? 'var(--badge-purple-text)' : 'var(--text-main)' }}>
              🌐 {t('room_mode.multiplayer')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {t('room_mode.multiplayer_desc')}
            </div>
          </div>

          <div 
            onClick={() => setRoomMode('offline')}
            style={{
              padding: '12px',
              borderRadius: '12px',
              border: `2px solid ${roomMode === 'offline' ? 'var(--accent-green)' : 'var(--border-glass)'}`,
              background: roomMode === 'offline' ? 'var(--badge-green-bg)' : 'var(--bg-glass)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: roomMode === 'offline' ? 'var(--badge-green-text)' : 'var(--text-main)' }}>
              📱 {t('room_mode.offline')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {t('room_mode.offline_desc')}
            </div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t('omben.player_count')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
            {[2, 3, 4, 5, 6].map(num => (
              <button
                key={num}
                type="button"
                className={`btn btn-sm ${playerCount === num ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleCountChange(num)}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        <div className="section-label">{t('truf.players')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {playerNames.map((name, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--bg-glass-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                {idx + 1}
              </span>
              <input 
                type="text" 
                className="form-input"
                value={name}
                onChange={e => handleNameChange(idx, e.target.value)}
                required
              />
            </div>
          ))}
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>🪑 {t('room.host_seat_label') || 'Kursi Anda di Meja'}</span>
            <span style={{ fontSize: '0.74rem', color: 'var(--badge-purple-text)', fontWeight: 800 }}>
              {hostSeat === -1 ? '👀 Penonton / Wasit' : `👑 ${playerNames[hostSeat] || `Pemain ${hostSeat + 1}`}`}
            </span>
          </label>
          <select 
            className="form-select"
            value={hostSeat}
            onChange={e => setHostSeat(Number(e.target.value))}
          >
            {playerNames.map((name, idx) => (
              <option key={idx} value={idx}>
                👑 {name} (Kursi {idx + 1}){idx === 0 ? ' - Default' : ''}
              </option>
            ))}
            <option value={-1}>👀 {t('room.host_seat_spectator') || 'Penonton / Wasit Saja (Tidak Duduk)'}</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">{t('omben.target_loss')}</label>
          <select 
            className="form-select" 
            value={targetLoss} 
            onChange={e => setTargetLoss(Number(e.target.value))}
          >
            <option value={3}>3x Omben (Cepat)</option>
            <option value={5}>5x Omben (Standar)</option>
            <option value={10}>10x Omben (Maraton)</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary btn-block" style={{ padding: '14px', marginTop: '10px' }}>
          🚀 {t('truf.start_game')}
        </button>
      </form>

      <CardGameRulesModal 
        isOpen={isRulesOpen} 
        onClose={() => setIsRulesOpen(false)} 
        initialGame="omben" 
      />
    </div>
  )
}
