import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'
import { DOMINO_MODES, GAPLE_TEAM_MODES } from './dominoLogic'

export default function DominoSetup({ onStartGame, onBack }) {
  const { t } = useTranslation()
  const [dominoMode, setDominoMode] = useState(DOMINO_MODES.GAPLE) // 'gaple' | 'qiuqiu'
  const [teamMode, setTeamMode] = useState(GAPLE_TEAM_MODES.INDIVIDUAL) // 'individual' | 'teams_2v2'
  const [playerCount, setPlayerCount] = useState(4)
  const [playerNames, setPlayerNames] = useState(['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4'])
  const [hostSeat, setHostSeat] = useState(0) // 0..n or -1
  const [penaltyThreshold, setPenaltyThreshold] = useState(100)
  const [deadlockRule, setDeadlockRule] = useState('lowest_wins') // 'lowest_wins' | 'causer_punished'
  const [balakZeroPenalty, setBalakZeroPenalty] = useState(10)
  const [balakSixPenalty, setBalakSixPenalty] = useState(12)
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
        dominoMode,
        teamMode,
        penaltyThreshold,
        deadlockRule,
        balakZeroPenalty,
        balakSixPenalty
      }
    })
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', maxWidth: '560px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
        <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🀄</span>
          <span>{t('domino.setup_title') || 'Konfigurasi Permainan Domino'}</span>
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
        {/* Domino Mode Selector (Gaple vs QiuQiu) */}
        <div className="section-label" style={{ marginTop: 0 }}>{t('domino.mode_label') || 'Pilihan Permainan Domino'}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <div 
            onClick={() => setDominoMode(DOMINO_MODES.GAPLE)}
            style={{
              padding: '12px',
              borderRadius: '12px',
              border: `2px solid ${dominoMode === DOMINO_MODES.GAPLE ? 'var(--primary)' : 'var(--border-glass)'}`,
              background: dominoMode === DOMINO_MODES.GAPLE ? 'var(--badge-purple-bg)' : 'var(--bg-glass)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: dominoMode === DOMINO_MODES.GAPLE ? 'var(--badge-purple-text)' : 'var(--text-main)' }}>
              🀄 {t('domino.gaple_name') || 'Gaple Tradisional'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {t('domino.gaple_desc') || 'Kalkulator denda titik sisa kartu, kondisi gaple/buntu, balak mati & sistem eliminasi'}
            </div>
          </div>

          <div 
            onClick={() => setDominoMode(DOMINO_MODES.QIUQIU)}
            style={{
              padding: '12px',
              borderRadius: '12px',
              border: `2px solid ${dominoMode === DOMINO_MODES.QIUQIU ? 'var(--accent-green)' : 'var(--border-glass)'}`,
              background: dominoMode === DOMINO_MODES.QIUQIU ? 'var(--badge-green-bg)' : 'var(--bg-glass)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: dominoMode === DOMINO_MODES.QIUQIU ? 'var(--badge-green-text)' : 'var(--text-main)' }}>
              🎲 {t('domino.qiuqiu_name') || 'Domino QiuQiu / Ceme'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
              {t('domino.qiuqiu_desc') || 'Pencatat kombinasi 9-9 (Mod 10), deteksi 6 Dewa, 4 Balak, Murni & kalkulator taruhan'}
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

        {/* Gaple Team Mode Selector (Individu vs 2v2) */}
        {dominoMode === DOMINO_MODES.GAPLE && (
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">{t('domino.team_mode_label') || 'Format Pertandingan Gaple'}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${teamMode === GAPLE_TEAM_MODES.INDIVIDUAL ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setTeamMode(GAPLE_TEAM_MODES.INDIVIDUAL)
                  setPlayerCount(4)
                }}
                style={{ fontWeight: 800, fontSize: '0.85rem' }}
              >
                👤 Individu (4 Orang)
              </button>
              <button
                type="button"
                className={`btn ${teamMode === GAPLE_TEAM_MODES.TEAMS_2V2 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setTeamMode(GAPLE_TEAM_MODES.TEAMS_2V2)
                  setPlayerCount(4)
                }}
                style={{ fontWeight: 800, fontSize: '0.85rem' }}
              >
                👥 Pasangan (2 vs 2)
              </button>
            </div>
          </div>
        )}

        {/* Player Count for QiuQiu */}
        {dominoMode === DOMINO_MODES.QIUQIU && (
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">{t('capsa.player_count') || 'Jumlah Pemain'}</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[2, 3, 4, 5, 6, 7, 8].map(count => (
                <button
                  key={count}
                  type="button"
                  className={`btn ${playerCount === count ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => handleCountChange(count)}
                  style={{ minWidth: '36px', padding: '6px 10px', fontWeight: 800 }}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Player Names */}
        <div style={{ marginBottom: '20px' }}>
          <label className="form-label">
            {teamMode === GAPLE_TEAM_MODES.TEAMS_2V2 && dominoMode === DOMINO_MODES.GAPLE
              ? 'Nama Pemain (P1 & P3: Tim A, P2 & P4: Tim B)'
              : (t('capsa.player_names') || 'Nama Pemain')}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {playerNames.map((name, idx) => (
              <div key={idx}>
                {teamMode === GAPLE_TEAM_MODES.TEAMS_2V2 && dominoMode === DOMINO_MODES.GAPLE && (
                  <span style={{ fontSize: '0.7rem', color: idx % 2 === 0 ? '#38BDF8' : '#F472B6', fontWeight: 800, display: 'block', marginBottom: '2px' }}>
                    {idx % 2 === 0 ? '🔵 Tim A' : '🔴 Tim B'}
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

        {/* Gaple Settings */}
        {dominoMode === DOMINO_MODES.GAPLE && (
          <div className="glass-panel" style={{ padding: '16px', marginBottom: '24px', background: 'rgba(255,255,255,0.03)' }}>
            <div className="section-label" style={{ marginTop: 0 }}>⚙️ {t('domino.gaple_rules_title') || 'Aturan Denda & Batas Eliminasi'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Batas Denda Kalah</label>
                <select className="form-input" value={penaltyThreshold} onChange={e => setPenaltyThreshold(Number(e.target.value))}>
                  <option value={100}>100 Poin</option>
                  <option value={150}>150 Poin</option>
                  <option value={200}>200 Poin</option>
                  <option value={500}>500 Poin (Maraton)</option>
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Aturan Gaple Macet (Buntu)</label>
                <select className="form-input" value={deadlockRule} onChange={e => setDeadlockRule(e.target.value)}>
                  <option value="lowest_wins">Titik Terendah Menang</option>
                  <option value="causer_punished">Pembuat Buntu Dihukum</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Denda Balak 0-0 Mati</label>
                <select className="form-input" value={balakZeroPenalty} onChange={e => setBalakZeroPenalty(Number(e.target.value))}>
                  <option value={10}>+10 Titik</option>
                  <option value={0}>0 Titik</option>
                  <option value={20}>+20 Titik</option>
                </select>
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Denda Balak 6-6 Mati</label>
                <select className="form-input" value={balakSixPenalty} onChange={e => setBalakSixPenalty(Number(e.target.value))}>
                  <option value={12}>+12 Titik</option>
                  <option value={24}>+24 Titik (2x)</option>
                  <option value={0}>0 Titik</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 800 }}>
          {t('domino.start_game') || 'Mulai Score Card Domino'} →
        </button>
      </form>

      <CardGameRulesModal 
        isOpen={isRulesOpen} 
        onClose={() => setIsRulesOpen(false)} 
        initialGame="domino" 
      />
    </div>
  )
}
