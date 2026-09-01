import React, { useState } from 'react'
import Podium from '../../components/common/Podium'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { useTranslation } from '../../i18n/I18nContext'

export default function GenericScoreboard({ onBack, onOpenShareModal }) {
  const { t } = useTranslation()
  const [players, setPlayers] = useState([
    { id: 1, name: 'Pemain 1', score: 0 },
    { id: 2, name: 'Pemain 2', score: 0 },
    { id: 3, name: 'Pemain 3', score: 0 },
    { id: 4, name: 'Pemain 4', score: 0 }
  ])

  const [history, setHistory] = useState([])
  const [customDelta, setCustomDelta] = useState('')
  const [selectedPlayerId, setSelectedPlayerId] = useState(1)

  // Step points
  const handleScoreChange = (playerId, delta) => {
    hapticsService.light()
    soundService.playTick()

    setPlayers(prev => prev.map(p => {
      if (p.id === playerId) {
        return { ...p, score: p.score + delta }
      }
      return p
    }))

    const player = players.find(p => p.id === playerId)
    setHistory(prev => [
      {
        id: Date.now(),
        playerName: player?.name || 'Player',
        delta,
        timestamp: new Date().toLocaleTimeString()
      },
      ...prev
    ])
  }

  const handleAddPlayer = () => {
    if (players.length >= 8) return
    const newId = players.length + 1
    setPlayers(prev => [...prev, { id: newId, name: `Pemain ${newId}`, score: 0 }])
  }

  const handleRemovePlayer = (id) => {
    if (players.length <= 2) return
    setPlayers(prev => prev.filter(p => p.id !== id))
  }

  const handleNameChange = (id, newName) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p))
  }

  const handleApplyCustomDelta = () => {
    const num = Number(customDelta)
    if (!isNaN(num) && num !== 0) {
      handleScoreChange(selectedPlayerId, num)
      setCustomDelta('')
    }
  }

  const handleResetAll = () => {
    if (window.confirm('Reset semua skor ke 0?')) {
      setPlayers(prev => prev.map(p => ({ ...p, score: 0 })))
      setHistory([])
    }
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#10B981' }}>
            📊 {t('scoreboard.name')}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            2–8 Pemain Multi-Tool
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onOpenShareModal && (
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const ranked = [...players].sort((a, b) => b.score - a.score)
                onOpenShareModal({
                  gameType: 'Papan Skor',
                  title: 'Scoreboard Match',
                  date: new Date().toLocaleDateString(),
                  players: ranked
                })
              }}
            >
              📸 9:16
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={handleResetAll}>
            🔄 Reset
          </button>
          {onBack && (
            <button className="btn btn-secondary btn-sm" onClick={onBack}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Live Podium */}
      <Podium players={players} />

      {/* Player Score Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
        {players.map(p => (
          <div
            key={p.id}
            className="glass-panel"
            style={{
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-card)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <input
                type="text"
                value={p.name}
                onChange={e => handleNameChange(p.id, e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px dashed var(--border-glass)',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: '1.05rem',
                  width: '130px',
                  padding: '2px 0',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: p.score >= 0 ? '#34D399' : '#F87171', minWidth: '60px', textAlign: 'center' }}>
                {p.score > 0 ? `+${p.score}` : p.score}
              </span>
            </div>

            {/* Quick Step Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button className="btn btn-secondary btn-sm" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={() => handleScoreChange(p.id, -5)}>-5</button>
              <button className="btn btn-secondary btn-sm" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={() => handleScoreChange(p.id, -1)}>-1</button>
              <button className="btn btn-primary btn-sm" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={() => handleScoreChange(p.id, 1)}>+1</button>
              <button className="btn btn-primary btn-sm" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={() => handleScoreChange(p.id, 5)}>+5</button>
              <button className="btn btn-primary btn-sm" style={{ padding: '6px 10px', fontSize: '0.8rem' }} onClick={() => handleScoreChange(p.id, 10)}>+10</button>
              {players.length > 2 && (
                <button className="btn btn-danger btn-sm" style={{ padding: '6px 8px', fontSize: '0.75rem' }} onClick={() => handleRemovePlayer(p.id)}>✕</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Player & Custom Input */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
          <select
            className="form-select"
            value={selectedPlayerId}
            onChange={e => setSelectedPlayerId(Number(e.target.value))}
            style={{ width: '130px' }}
          >
            {players.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Custom +/- poin"
            className="form-input"
            value={customDelta}
            onChange={e => setCustomDelta(e.target.value)}
            style={{ flex: 1 }}
          />

          <button className="btn btn-primary" onClick={handleApplyCustomDelta}>
            Tambah
          </button>
        </div>

        {players.length < 8 && (
          <button className="btn btn-secondary btn-block" onClick={handleAddPlayer}>
            + {t('scoreboard.add_player')} ({players.length}/8)
          </button>
        )}
      </div>

      {/* History Ledger */}
      {history.length > 0 && (
        <div className="glass-panel" style={{ padding: '16px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px' }}>
            📜 {t('scoreboard.round_history')}
          </h4>
          <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {history.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                <span><strong>{item.playerName}</strong>: {item.delta > 0 ? `+${item.delta}` : item.delta} poin</span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{item.timestamp}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
