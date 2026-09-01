import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'

export default function OmbenSetup({ onStartGame, onBack }) {
  const { t } = useTranslation()
  const [playerCount, setPlayerCount] = useState(4)
  const [playerNames, setPlayerNames] = useState(['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4'])
  const [targetLoss, setTargetLoss] = useState(5)

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
      settings: {
        targetLoss
      }
    })
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', maxWidth: '540px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>🍺 {t('omben.setup_title')}</h2>
        {onBack && <button className="btn btn-sm btn-secondary" onClick={onBack}>← {t('app.back')}</button>}
      </div>

      <form onSubmit={handleStart}>
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
    </div>
  )
}
