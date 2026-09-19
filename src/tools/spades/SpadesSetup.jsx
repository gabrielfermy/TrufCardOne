import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'
import { SPADES_MODES } from './spadesLogic'

export default function SpadesSetup({ onStartGame, onBack }) {
  const { t } = useTranslation()
  const [spadesMode, setSpadesMode] = useState(SPADES_MODES.PARTNERSHIP_2V2)
  const [playerNames, setPlayerNames] = useState(['North (U)', 'East (T)', 'South (S)', 'West (B)'])
  const [targetScore, setTargetScore] = useState(500)
  const [nilBonus, setNilBonus] = useState(100)
  const [blindNilBonus, setBlindNilBonus] = useState(200)
  const [bagPenalty, setBagPenalty] = useState(100)
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
        spadesMode,
        targetScore,
        nilBonus,
        nilPenalty: nilBonus,
        blindNilBonus,
        blindNilPenalty: blindNilBonus,
        bagPenalty
      }
    })
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>♠️</span>
          <span>{t('spades.setup_title') || 'Konfigurasi Permainan Spades'}</span>
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-sm btn-secondary" 
            onClick={() => setIsRulesOpen(true)}
            style={{ color: '#A855F7', borderColor: 'rgba(168, 85, 247, 0.4)' }}
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

        {/* Spades Format Selector */}
        <div style={{ marginBottom: '20px' }}>
          <label className="form-label">Format Pertandingan Spades</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className={`btn ${spadesMode === SPADES_MODES.PARTNERSHIP_2V2 ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSpadesMode(SPADES_MODES.PARTNERSHIP_2V2)}
              style={{ fontWeight: 800, fontSize: '0.85rem' }}
            >
              👥 Pasangan (2 vs 2 Tim)
            </button>
            <button
              type="button"
              className={`btn ${spadesMode === SPADES_MODES.SOLO_CUTTHROAT ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSpadesMode(SPADES_MODES.SOLO_CUTTHROAT)}
              style={{ fontWeight: 800, fontSize: '0.85rem' }}
            >
              👤 Cutthroat (Solo 4 Pemain)
            </button>
          </div>
        </div>

        {/* Target Win Score */}
        <div style={{ marginBottom: '20px' }}>
          <label className="form-label">Target Poin Kemenangan</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[300, 500, 1000].map(target => (
              <button
                key={target}
                type="button"
                className={`btn flex-1 ${targetScore === target ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTargetScore(target)}
                style={{ fontWeight: 800 }}
              >
                {target} Pts {target === 500 ? '(Standar)' : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Player Names */}
        <div style={{ marginBottom: '20px' }}>
          <label className="form-label">Nama Pemain</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {playerNames.map((name, idx) => (
              <div key={idx}>
                {spadesMode === SPADES_MODES.PARTNERSHIP_2V2 && (
                  <span style={{ fontSize: '0.72rem', color: idx % 2 === 0 ? '#38BDF8' : '#F472B6', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                    {idx % 2 === 0 ? '🔵 Tim A (North/South)' : '🔴 Tim B (East/West)'}
                  </span>
                )}
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => handleNameChange(idx, e.target.value)}
                  placeholder={`Pemain ${idx + 1}`}
                  maxLength={20}
                  required
                />
              </div>
            ))}
          </div>
        </div>

        {/* Rule Settings */}
        <div className="glass-panel" style={{ padding: '16px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)' }}>
          <div className="section-label" style={{ marginTop: 0 }}>⚙️ Pengaturan Nilai Khusus Spades</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Nil Bonus / Penalti</label>
              <select className="form-input" value={nilBonus} onChange={e => setNilBonus(Number(e.target.value))}>
                <option value={100}>±100 Poin (Standar)</option>
                <option value={50}>±50 Poin</option>
              </select>
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Blind Nil Bonus / Penalti</label>
              <select className="form-input" value={blindNilBonus} onChange={e => setBlindNilBonus(Number(e.target.value))}>
                <option value={200}>±200 Poin (Standar)</option>
                <option value={100}>±100 Poin</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Penalti Sandbagging (Tiap 10 Bag)</label>
            <select className="form-input" value={bagPenalty} onChange={e => setBagPenalty(Number(e.target.value))}>
              <option value={100}>-100 Poin per 10 Bags (Standar)</option>
              <option value={50}>-50 Poin per 10 Bags</option>
              <option value={0}>Nonaktif (0 Penalti)</option>
            </select>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 800 }}>
          {t('spades.start_game') || 'Mulai Score Card Spades'} →
        </button>
      </form>

      <CardGameRulesModal 
        isOpen={isRulesOpen} 
        onClose={() => setIsRulesOpen(false)} 
        initialGame="spades" 
      />
    </div>
  )
}
