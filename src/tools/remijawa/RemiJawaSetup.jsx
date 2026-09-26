import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'
import { DEFAULT_DEALER_WORD } from './remiJawaLogic'

export default function RemiJawaSetup({ onStartGame, onBack }) {
  const { t } = useTranslation()
  const [playerCount, setPlayerCount] = useState(4)
  const [playerNames, setPlayerNames] = useState(['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4'])
  const [firstDealer, setFirstDealer] = useState(0)
  const [hostSeat, setHostSeat] = useState(0) // 0..n or -1
  const [roomMode, setRoomMode] = useState('multiplayer') // 'multiplayer' | 'offline'

  // End Game Settings
  const [targetWin, setTargetWin] = useState(150) // 100, 150, 200, or 0 (unlimited)
  const [streakLimit, setStreakLimit] = useState(10) // 10x CHOLOKOPOK, 7x, 5x, or 0 (disabled)
  const [streakWord, setStreakWord] = useState(DEFAULT_DEALER_WORD)
  const [streakDisplayMode, setStreakDisplayMode] = useState('word') // 'word' | 'numbers'
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
    if (firstDealer >= count) {
      setFirstDealer(0)
    }
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
      firstDealer,
      hostSeat,
      isOfflineLocal: roomMode === 'offline',
      settings: {
        firstDealer,
        targetWin: Number(targetWin),
        streakLimit: Number(streakLimit),
        streakWord: (streakWord || DEFAULT_DEALER_WORD).trim().toUpperCase(),
        streakDisplayMode
      }
    })
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', maxWidth: '580px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🎴</span>
          <span>{t('remi_jawa.setup_title') || 'Konfigurasi Remi Jawa'}</span>
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-sm btn-secondary" 
            onClick={() => setIsRulesOpen(true)}
            style={{ color: '#F59E0B', borderColor: 'rgba(245, 158, 11, 0.4)' }}
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
              🌐 {t('room_mode.multiplayer') || 'Online Room'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {t('room_mode.multiplayer_desc') || 'Sinkronisasi real-time antar HP pemain di meja'}
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
          <label className="form-label">{t('remi_jawa.player_count') || 'Jumlah Pemain (2 - 4 Orang)'}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[2, 3, 4].map(count => (
              <button
                key={count}
                type="button"
                className={`btn ${playerCount === count ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleCountChange(count)}
                style={{ fontWeight: 800, padding: '10px 4px', fontSize: '0.9rem', minWidth: 0 }}
              >
                {count} {t('common.players') || 'Pemain'}
              </button>
            ))}
          </div>
        </div>

        {/* Player Names & First Dealer */}
        <div style={{ marginBottom: '20px' }}>
          <label className="form-label">{t('remi_jawa.player_names_and_dealer') || 'Nama Pemain & Dealer Pertama'}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {playerNames.map((name, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input flex-1"
                  value={name}
                  onChange={e => handleNameChange(idx, e.target.value)}
                  placeholder={`Pemain ${idx + 1}`}
                  maxLength={20}
                  required
                />
                <button
                  type="button"
                  onClick={() => setFirstDealer(idx)}
                  className={`btn btn-sm ${firstDealer === idx ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    minWidth: '95px',
                    flexShrink: 0,
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    background: firstDealer === idx ? 'var(--badge-gold-bg)' : undefined,
                    borderColor: firstDealer === idx ? 'var(--badge-gold-border)' : undefined,
                    color: firstDealer === idx ? 'var(--badge-gold-text)' : undefined
                  }}
                  title="Pilih pemain ini sebagai pengocok kartu ronde pertama"
                >
                  {firstDealer === idx ? '👑 Dealer R1' : 'Set Dealer'}
                </button>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
            💡 Dealer ronde berikutnya akan ditentukan otomatis bagi pemain dengan skor terendah.
          </div>
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

        {/* End Game Rules Section */}
        <div className="section-label" style={{ marginTop: '24px' }}>🎯 {t('remi_jawa.end_game_rules') || 'Aturan Akhir Permainan (End Game Rules)'}</div>
        
        {/* Target Win Score */}
        <div style={{ marginBottom: '16px' }}>
          <label className="form-label">{t('remi_jawa.target_win_score') || 'Target Poin Kemenangan'}</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {[
              { label: '100 Poin', val: 100 },
              { label: '150 Poin', val: 150 },
              { label: '200 Poin', val: 200 },
              { label: 'Bebas (∞)', val: 0 }
            ].map(opt => (
              <button
                key={opt.val}
                type="button"
                className={`btn btn-sm ${targetWin === opt.val ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setTargetWin(opt.val)}
                style={{ fontSize: '0.75rem', fontWeight: 700, padding: '8px 2px', minWidth: 0, whiteSpace: 'nowrap' }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dealer Streak Limit & CHOLOKOPOK Word */}
        <div style={{ marginBottom: '20px' }}>
          <label className="form-label">{t('remi_jawa.dealer_streak_rule') || 'Batas Streak Dealer Berturut-turut'}</label>
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
                style={{ fontSize: '0.72rem', fontWeight: 700, padding: '8px 2px', minWidth: 0, whiteSpace: 'nowrap' }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {streakLimit > 0 && (
            <div style={{ background: 'var(--bg-glass)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
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

        {/* Start Game Button */}
        <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: '24px', padding: '14px', fontSize: '1rem', fontWeight: 800 }}>
          🚀 {t('remi_jawa.start_game') || 'Mulai Score Card Remi Jawa'}
        </button>
      </form>

      {/* Rules Modal */}
      <CardGameRulesModal 
        isOpen={isRulesOpen} 
        onClose={() => setIsRulesOpen(false)} 
        initialGame="remi_jawa" 
      />
    </div>
  )
}
