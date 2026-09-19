import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'
import { CAPSA_MODES } from './capsaLogic'

export default function CapsaSetup({ onStartGame, onBack }) {
  const { t } = useTranslation()
  const [capsaMode, setCapsaMode] = useState(CAPSA_MODES.SUSUN) // 'susun' | 'banting'
  const [playerCount, setPlayerCount] = useState(4)
  const [playerNames, setPlayerNames] = useState(['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4'])
  const [pointMultiplier, setPointMultiplier] = useState(1)
  const [sweepMultiplier, setSweepMultiplier] = useState(2)
  const [paoPenalty, setPaoPenalty] = useState(9)
  const [doubleAt10, setDoubleAt10] = useState(true)
  const [tripleAt13, setTripleAt13] = useState(true)
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
      isOfflineLocal: roomMode === 'offline',
      settings: {
        capsaMode,
        pointMultiplier,
        sweepMultiplier,
        paoPenalty,
        doubleAt10,
        tripleAt13
      }
    })
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🎴</span>
          <span>{t('capsa.setup_title') || 'Konfigurasi Game Capsa'}</span>
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-sm btn-secondary" 
            onClick={() => setIsRulesOpen(true)}
            style={{ color: '#06B6D4', borderColor: 'rgba(6, 182, 212, 0.4)' }}
          >
            📖 {t('rules_modal.quick_btn') || 'Aturan'}
          </button>
          {onBack && <button className="btn btn-sm btn-secondary" onClick={onBack}>← {t('app.back') || 'Kembali'}</button>}
        </div>
      </div>

      <form onSubmit={handleStart}>
        {/* Capsa Mode Selector (Susun vs Banting) */}
        <div className="section-label" style={{ marginTop: 0 }}>{t('capsa.mode_label') || 'Pilihan Mode Capsa'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <div 
            onClick={() => setCapsaMode(CAPSA_MODES.SUSUN)}
            style={{
              padding: '12px',
              borderRadius: '12px',
              border: `2px solid ${capsaMode === CAPSA_MODES.SUSUN ? 'var(--primary)' : 'var(--border-glass)'}`,
              background: capsaMode === CAPSA_MODES.SUSUN ? 'var(--badge-purple-bg)' : 'var(--bg-glass)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: capsaMode === CAPSA_MODES.SUSUN ? 'var(--badge-purple-text)' : 'var(--text-main)' }}>
              🃏 {t('capsa.susun_name') || 'Capsa Susun'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {t('capsa.susun_desc') || '13 kartu split 3 baris (Atas, Tengah, Bawah). Head-to-Head per baris & bonus tembus'}
            </div>
          </div>

          <div 
            onClick={() => setCapsaMode(CAPSA_MODES.BANTING)}
            style={{
              padding: '12px',
              borderRadius: '12px',
              border: `2px solid ${capsaMode === CAPSA_MODES.BANTING ? 'var(--accent-orange, #F97316)' : 'var(--border-glass)'}`,
              background: capsaMode === CAPSA_MODES.BANTING ? 'rgba(249, 115, 22, 0.15)' : 'var(--bg-glass)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: capsaMode === CAPSA_MODES.BANTING ? '#FB923C' : 'var(--text-main)' }}>
              💥 {t('capsa.banting_name') || 'Capsa Banting'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {t('capsa.banting_desc') || 'Big Two / buang kartu. Denda sisa kartu lawan + kelipatan denda ≥10 kartu'}
            </div>
          </div>
        </div>

        {/* Room Mode */}
        <div className="section-label">{t('room_mode.title') || 'Tipe Meja / Mode Permainan'}</div>
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

        {/* Player Count */}
        <div style={{ marginBottom: '20px' }}>
          <label className="form-label">{t('capsa.player_count') || 'Jumlah Pemain'}</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[2, 3, 4].map(count => (
              <button
                key={count}
                type="button"
                className={`btn flex-1 ${playerCount === count ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleCountChange(count)}
                style={{ fontWeight: 800 }}
              >
                {count} {t('common.players') || 'Pemain'}
              </button>
            ))}
          </div>
        </div>

        {/* Player Names */}
        <div style={{ marginBottom: '20px' }}>
          <label className="form-label">{t('capsa.player_names') || 'Nama Pemain'}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {playerNames.map((name, idx) => (
              <input
                key={idx}
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => handleNameChange(idx, e.target.value)}
                placeholder={`Pemain ${idx + 1}`}
                maxLength={20}
                required
              />
            ))}
          </div>
        </div>

        {/* Mode-Specific Settings */}
        {capsaMode === CAPSA_MODES.SUSUN ? (
          <div className="glass-panel" style={{ padding: '16px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)' }}>
            <div className="section-label" style={{ marginTop: 0 }}>⚙️ {t('capsa.susun_rules_title') || 'Aturan Poin Capsa Susun'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Multiplier Skor Poin</label>
                <select className="form-input" value={pointMultiplier} onChange={e => setPointMultiplier(Number(e.target.value))}>
                  <option value={1}>1x (Standar)</option>
                  <option value={2}>2x Poin</option>
                  <option value={5}>5x Poin</option>
                  <option value={10}>10x Poin</option>
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Bonus Tembus (Sweep)</label>
                <select className="form-input" value={sweepMultiplier} onChange={e => setSweepMultiplier(Number(e.target.value))}>
                  <option value={2}>2x Lipat (6 Poin)</option>
                  <option value={3}>3x Lipat (9 Poin)</option>
                </select>
              </div>
            </div>
            <div style={{ marginTop: '10px' }}>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Penalti Salah Susun (Pao / Pajhe)</label>
              <select className="form-input" value={paoPenalty} onChange={e => setPaoPenalty(Number(e.target.value))}>
                <option value={9}>-9 Poin per Lawan (Standar)</option>
                <option value={6}>-6 Poin per Lawan</option>
                <option value={12}>-12 Poin per Lawan</option>
              </select>
            </div>
          </div>
        ) : (
          <div className="glass-panel" style={{ padding: '16px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)' }}>
            <div className="section-label" style={{ marginTop: 0 }}>⚙️ {t('capsa.banting_rules_title') || 'Aturan Denda Capsa Banting'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={doubleAt10} 
                  onChange={e => setDoubleAt10(e.target.checked)} 
                />
                <span>Denda 2x Lipat jika sisa kartu ≥ 10 lembar</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={tripleAt13} 
                  onChange={e => setTripleAt13(e.target.checked)} 
                />
                <span>Denda 3x Lipat jika sisa 13 kartu (Hang / Belum Jalan)</span>
              </label>
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 800 }}>
          {t('capsa.start_game') || 'Mulai Score Card Capsa'} →
        </button>
      </form>

      <CardGameRulesModal 
        isOpen={isRulesOpen} 
        onClose={() => setIsRulesOpen(false)} 
        initialGame="capsa" 
      />
    </div>
  )
}
