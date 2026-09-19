import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'
import { DEFAULT_DEALER_WORD } from './trufLogic'

export default function TrufSetup({ onStartGame, onBack }) {
  const { t } = useTranslation()
  const [playerCount, setPlayerCount] = useState(4)
  const [playerNames, setPlayerNames] = useState(['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4'])
  const [firstDealer, setFirstDealer] = useState(0)
  const [multiplier, setMultiplier] = useState(1)
  const [bid0Bonus, setBid0Bonus] = useState(0)
  const [bid13Decision, setBid13Decision] = useState(true)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [useInitialScores, setUseInitialScores] = useState(false)
  const [initialScores, setInitialScores] = useState([0, 0, 0, 0])
  const [streakLimit, setStreakLimit] = useState(10)
  const [streakWord, setStreakWord] = useState(DEFAULT_DEALER_WORD)
  const [streakDisplayMode, setStreakDisplayMode] = useState('word') // 'word' | 'numbers'
  const [roomMode, setRoomMode] = useState('multiplayer') // 'multiplayer' | 'offline'
  const [isRulesOpen, setIsRulesOpen] = useState(false)

  const handlePlayerCountChange = (count) => {
    setPlayerCount(count)
    const nextNames = [...playerNames]
    const nextScores = [...initialScores]
    if (count > nextNames.length) {
      for (let i = nextNames.length; i < count; i++) {
        nextNames.push(`Pemain ${i + 1}`)
        nextScores.push(0)
      }
    } else {
      nextNames.splice(count)
      nextScores.splice(count)
    }
    setPlayerNames(nextNames)
    setInitialScores(nextScores)
    if (firstDealer >= count) {
      setFirstDealer(0)
    }
  }

  const handleNameChange = (index, value) => {
    const updated = [...playerNames]
    updated[index] = value
    setPlayerNames(updated)
  }

  const handleInitialScoreChange = (index, value) => {
    const updated = [...initialScores]
    const parsed = parseInt(value, 10)
    updated[index] = isNaN(parsed) ? 0 : parsed
    setInitialScores(updated)
  }

  const handleInitialScoreStep = (index, delta) => {
    const updated = [...initialScores]
    updated[index] = (updated[index] || 0) + delta
    setInitialScores(updated)
  }

  const totalTricks = playerCount === 3 ? 17 : playerCount === 5 ? 10 : 13

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
        totalTricks,
        streakLimit: Number(streakLimit),
        streakWord: (streakWord || DEFAULT_DEALER_WORD).trim().toUpperCase(),
        streakDisplayMode,
        initialScores: useInitialScores ? initialScores.map(Number) : Array(playerCount).fill(0),
        atasLackMult: -2,
        atasExcessMult: -1,
        bawahLackMult: -1,
        bawahExcessMult: -2
      }
    })
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', maxWidth: '540px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>🃏 {t('truf.setup_title')}</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-sm btn-secondary" 
            onClick={() => setIsRulesOpen(true)}
            style={{ color: '#C084FC', borderColor: 'rgba(139, 92, 246, 0.4)' }}
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

        {/* Player Count Selection (3, 4, 5 Players) */}
        <div className="form-group" style={{ marginBottom: '18px' }}>
          <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>👥 {t('truf.player_count_label') || 'Jumlah Pemain'}</span>
            <span style={{ fontSize: '0.74rem', color: 'var(--badge-purple-text)', fontWeight: 800 }}>
              {playerCount === 3 ? '17 Trik / Ronde (51 Kartu)' : playerCount === 5 ? '10 Trik / Ronde (50 Kartu)' : '13 Trik / Ronde (52 Kartu)'}
            </span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[3, 4, 5].map(num => (
              <button
                key={num}
                type="button"
                className={`btn ${playerCount === num ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  padding: '10px 4px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  borderRadius: '10px',
                  fontWeight: playerCount === num ? 800 : 600
                }}
                onClick={() => handlePlayerCountChange(num)}
              >
                <span style={{ fontSize: '1.05rem', fontWeight: 900 }}>{num} Pemain</span>
                <span style={{ fontSize: '0.68rem', opacity: 0.85 }}>
                  {num === 3 ? '17 Kartu' : num === 5 ? '10 Kartu' : '13 Kartu (Std)'}
                </span>
              </button>
            ))}
          </div>
          {playerCount !== 4 && (
            <div style={{
              marginTop: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'var(--badge-purple-bg)',
              border: '1px solid var(--badge-purple-border)',
              fontSize: '0.74rem',
              color: 'var(--badge-purple-text)',
              lineHeight: 1.4
            }}>
              💡 <strong>Aturan Distribusi Kartu:</strong> {playerCount === 3
                ? 'Truf 3 Pemain: 1 kartu (2♣) disisihkan dari dek. Setiap pemain memegang 17 kartu (total 17 trik per ronde).'
                : 'Truf 5 Pemain: 2 kartu (2♣ & 2♦) disisihkan dari dek. Setiap pemain memegang 10 kartu (total 10 trik per ronde).'}
            </div>
          )}
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

        {/* Initial Scores (Handicap / Resume Lost Game) */}
        <div style={{
          background: useInitialScores ? 'var(--badge-purple-bg)' : 'var(--bg-glass)',
          border: `1px solid ${useInitialScores ? 'var(--badge-purple-border)' : 'var(--border-glass)'}`,
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '18px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setUseInitialScores(!useInitialScores)}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input 
                type="checkbox" 
                id="initialScoresCheck"
                checked={useInitialScores} 
                onChange={e => setUseInitialScores(e.target.checked)}
                onClick={e => e.stopPropagation()}
                style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }}
              />
              <label htmlFor="initialScoresCheck" style={{ fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', margin: 0 }}>
                ➕ {t('truf.initial_scores_toggle')}
              </label>
            </div>
            <span style={{ fontSize: '0.75rem', color: useInitialScores ? 'var(--badge-purple-text)' : 'var(--text-muted)' }}>
              {useInitialScores ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>

          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '6px 0 0 28px', lineHeight: 1.3 }}>
            {t('truf.initial_scores_desc')}
          </p>

          {useInitialScores && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '12px' }}>
              {playerNames.map((name, idx) => (
                <div key={idx} style={{ background: 'var(--bg-card)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  <div style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => handleInitialScoreStep(idx, -5)}
                      style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                      title="-5"
                    >
                      -5
                    </button>
                    <input 
                      type="number" 
                      className="form-input"
                      value={initialScores[idx]}
                      onChange={e => handleInitialScoreChange(idx, e.target.value)}
                      style={{ padding: '4px 6px', textAlign: 'center', fontWeight: 800, fontSize: '0.95rem' }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm" 
                      onClick={() => handleInitialScoreStep(idx, 5)}
                      style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                      title="+5"
                    >
                      +5
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dealer Streak Limit & CHOLOKOPOK Word */}
        <div style={{
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-glass)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '18px'
        }}>
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>👑</span>
            <span>Batas Streak Dealer Berturut-turut</span>
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '10px' }}>
            {[
              { label: '10x (CHOLOKOPOK)', val: 10 },
              { label: '7x Streak', val: 7 },
              { label: '5x Streak', val: 5 },
              { label: 'Nonaktif', val: 0 }
            ].map(opt => (
              <button
                key={opt.val}
                type="button"
                className={`btn btn-sm ${streakLimit === opt.val ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStreakLimit(opt.val)}
                style={{ fontSize: '0.72rem', fontWeight: 700, padding: '8px 2px' }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {streakLimit > 0 && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', flexShrink: 0 }}>Teks Pelacak:</label>
                <input
                  type="text"
                  className="form-input form-input-sm"
                  value={streakWord}
                  onChange={e => setStreakWord(e.target.value.toUpperCase())}
                  placeholder="CHOLOKOPOK"
                  maxLength={15}
                  style={{ textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800 }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setStreakDisplayMode('word')}
                  className={`btn btn-xs ${streakDisplayMode === 'word' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  🔤 Tampilkan Huruf
                </button>
                <button
                  type="button"
                  onClick={() => setStreakDisplayMode('numbers')}
                  className={`btn btn-xs ${streakDisplayMode === 'numbers' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  🔢 Tampilkan Angka (1/10)
                </button>
              </div>
            </div>
          )}
        </div>

        <div style={{ margin: '16px 0' }}>
          <button 
            type="button" 
            className="btn btn-sm btn-secondary"
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{ width: '100%' }}
          >
            ⚙️ {showAdvanced ? 'Sembunyikan Pengaturan Lanjutan' : 'Pengaturan Aturan & Multiplier'}
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
                <option value={0}>Sesuai Bid Tertinggi Ronde (Standar Truf)</option>
                <option value={10}>+10 Poin Tetap</option>
                <option value={50}>+50 Poin Tetap</option>
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

      <CardGameRulesModal 
        isOpen={isRulesOpen} 
        onClose={() => setIsRulesOpen(false)} 
        initialGame="truf" 
      />
    </div>
  )
}
