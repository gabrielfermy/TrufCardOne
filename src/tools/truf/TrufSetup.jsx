import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'

export default function TrufSetup({ onStartGame, onBack }) {
  const { t } = useTranslation()
  const [playerNames, setPlayerNames] = useState(['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4'])
  const [firstDealer, setFirstDealer] = useState(0)
  const [multiplier, setMultiplier] = useState(1)
  const [bid0Bonus, setBid0Bonus] = useState(0)
  const [bid13Decision, setBid13Decision] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [roomMode, setRoomMode] = useState('multiplayer') // 'multiplayer' | 'offline'

  const handleNameChange = (index, value) => {
    const updated = [...playerNames]
    updated[index] = value
    setPlayerNames(updated)
  }

  const handleStart = (e) => {
    e.preventDefault()
    onStartGame({
      playerNames,
      firstDealer,
      isOfflineLocal: roomMode === 'offline',
      settings: {
        multiplier,
        bid0Bonus,
        bid13Decision,
        atasLackMult: -2,
        atasExcessMult: -1,
        bawahLackMult: -1,
        bawahExcessMult: -2
      }
    })
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', maxWidth: '540px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>🃏 {t('truf.setup_title')}</h2>
        {onBack && <button className="btn btn-sm btn-secondary" onClick={onBack}>← {t('app.back')}</button>}
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
              border: `2px solid ${roomMode === 'multiplayer' ? '#8B5CF6' : 'var(--border-glass)'}`,
              background: roomMode === 'multiplayer' ? 'rgba(139, 92, 246, 0.15)' : 'var(--bg-glass)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: roomMode === 'multiplayer' ? '#C084FC' : '#FFF' }}>
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
              border: `2px solid ${roomMode === 'offline' ? '#10B981' : 'var(--border-glass)'}`,
              background: roomMode === 'offline' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-glass)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: roomMode === 'offline' ? '#34D399' : '#FFF' }}>
              📱 {t('room_mode.offline')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {t('room_mode.offline_desc')}
            </div>
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

        <div className="form-group">
          <label className="form-label">{t('truf.first_dealer')}</label>
          <select 
            className="form-select"
            value={firstDealer}
            onChange={e => setFirstDealer(Number(e.target.value))}
          >
            {playerNames.map((name, idx) => (
              <option key={idx} value={idx}>
                {name} (Pemain {idx + 1})
              </option>
            ))}
          </select>
        </div>

        <div style={{ margin: '16px 0' }}>
          <button 
            type="button" 
            className="btn btn-sm btn-secondary"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ width: '100%' }}
          >
            ⚙️ {showAdvanced ? 'Sembunyikan Pengaturan Aturan' : 'Pengaturan Aturan & Multiplier'}
          </button>
        </div>

        {showAdvanced && (
          <div style={{ background: 'rgba(0,0,0,0.25)', padding: '16px', borderRadius: '12px', marginBottom: '20px', border: '1px solid var(--border-glass)' }}>
            <div className="form-group">
              <label className="form-label">{t('truf.multiplier')}</label>
              <select className="form-select" value={multiplier} onChange={e => setMultiplier(Number(e.target.value))}>
                <option value={1}>Format Satuan (x1) - Standar</option>
                <option value={10}>Format Puluhan (x10)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{t('truf.bid0_bonus')}</label>
              <select className="form-select" value={bid0Bonus} onChange={e => setBid0Bonus(Number(e.target.value))}>
                <option value={0}>0 Poin (Standar)</option>
                <option value={10}>+10 Poin</option>
                <option value={50}>+50 Poin</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="checkbox" 
                id="bid13Check"
                checked={bid13Decision} 
                onChange={e => setBid13Decision(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              <label htmlFor="bid13Check" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                {t('truf.bid13_rule')}
              </label>
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-block" style={{ padding: '14px' }}>
          🚀 {t('truf.start_game')}
        </button>
      </form>
    </div>
  )
}
