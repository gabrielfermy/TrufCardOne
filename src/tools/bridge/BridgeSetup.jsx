import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

export default function BridgeSetup({ onStartGame, onBack }) {
  const { t } = useTranslation()
  const [playerNames, setPlayerNames] = useState(['North (U)', 'East (T)', 'South (S)', 'West (B)'])
  const [scoringFormat, setScoringFormat] = useState('duplicate') // 'duplicate' | 'chicago'
  const [roomMode, setRoomMode] = useState('multiplayer') // 'multiplayer' | 'offline'
  const [isRulesOpen, setIsRulesOpen] = useState(false)

  const handleNameChange = (idx, val) => {
    const next = [...playerNames]
    next[idx] = val
    setPlayerNames(next)
  }

  const handleStart = (e) => {
    e.preventDefault()
    onStartGame({
      playerNames,
      isOfflineLocal: roomMode === 'offline',
      settings: {
        scoringFormat
      }
    })
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🃏</span>
          <span>{t('bridge.setup_title') || 'Konfigurasi Contract Bridge'}</span>
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-sm btn-secondary" 
            onClick={() => setIsRulesOpen(true)}
            style={{ color: '#818CF8', borderColor: 'rgba(129, 140, 248, 0.4)' }}
          >
            📖 {t('rules_modal.quick_btn') || 'Aturan'}
          </button>
          {onBack && <button className="btn btn-sm btn-secondary" onClick={onBack}>← {t('app.back') || 'Kembali'}</button>}
        </div>
      </div>

      <form onSubmit={handleStart}>
        {/* Table Type / Room Mode */}
        <div className="section-label" style={{ marginTop: 0 }}>{t('room_mode.title') || 'Tipe Meja / Mode Permainan'}</div>
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
              🌐 {t('room_mode.multiplayer') || 'Bikin Room (Multiplayer)'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {t('room_mode.multiplayer_desc') || 'Bisa share link / kode ke teman. Live sync antar HP'}
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
              📱 {t('room_mode.offline') || 'Offline / 1 HP'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {t('room_mode.offline_desc') || 'Catat skor bersama dalam 1 layar smartphone'}
            </div>
          </div>
        </div>

        {/* Scoring Format */}
        <div style={{ marginBottom: '20px' }}>
          <label className="form-label">Format Penilaian Bridge</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className={`btn ${scoringFormat === 'duplicate' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setScoringFormat('duplicate')}
              style={{ fontWeight: 800, fontSize: '0.85rem' }}
            >
              🏛️ Duplicate / WBF Standard
            </button>
            <button
              type="button"
              className={`btn ${scoringFormat === 'chicago' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setScoringFormat('chicago')}
              style={{ fontWeight: 800, fontSize: '0.85rem' }}
            >
              🏙️ Chicago (4-Deal)
            </button>
          </div>
        </div>

        {/* Player Partnerships */}
        <div style={{ marginBottom: '20px' }}>
          <label className="form-label">Nama Pemain & Arah Mata Angin Meja</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#38BDF8', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                🔵 North (Utara) • Pasangan NS
              </span>
              <input
                type="text"
                className="form-input"
                value={playerNames[0]}
                onChange={(e) => handleNameChange(0, e.target.value)}
                required
              />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#F472B6', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                🔴 East (Timur) • Pasangan EW
              </span>
              <input
                type="text"
                className="form-input"
                value={playerNames[1]}
                onChange={(e) => handleNameChange(1, e.target.value)}
                required
              />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#38BDF8', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                🔵 South (Selatan) • Pasangan NS
              </span>
              <input
                type="text"
                className="form-input"
                value={playerNames[2]}
                onChange={(e) => handleNameChange(2, e.target.value)}
                required
              />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#F472B6', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                🔴 West (Barat) • Pasangan EW
              </span>
              <input
                type="text"
                className="form-input"
                value={playerNames[3]}
                onChange={(e) => handleNameChange(3, e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 800 }}>
          {t('bridge.start_game') || 'Mulai Score Card Bridge'} →
        </button>
      </form>

      <CardGameRulesModal 
        isOpen={isRulesOpen} 
        onClose={() => setIsRulesOpen(false)} 
        initialGame="bridge" 
      />
    </div>
  )
}
