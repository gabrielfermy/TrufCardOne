import React, { useState, useMemo } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { 
  calculateCapsaSusunRound, 
  CAPSA_HAND_RANKS, 
  CAPSA_SPECIAL_COMBOS,
  isLegalSusunArrangement 
} from './capsaLogic'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

export default function CapsaSusunPlay({ 
  session, 
  onSaveRound, 
  onUndoRound, 
  onFinishGame, 
  onShareStory,
  onBackToHub 
}) {
  const { t } = useTranslation()
  const [isRulesOpen, setIsRulesOpen] = useState(false)

  const players = session?.player_names || ['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4']
  const settings = session?.settings || { pointMultiplier: 1, sweepMultiplier: 2, paoPenalty: 9 }
  const rounds = session?.game_rounds || session?.rounds || []
  const currentRoundNum = rounds.length + 1

  // Player hand inputs for current round
  const [playerHands, setPlayerHands] = useState(() => 
    players.map((name, idx) => ({
      id: `p${idx}`,
      name,
      isPao: false,
      specialComboId: 'none',
      tiers: { top: 0, mid: 0, bot: 0 },
      bonusPoints: 0
    }))
  )

  const handleTierChange = (playerIdx, tierKey, value) => {
    setPlayerHands(prev => {
      const next = [...prev]
      const currentTiers = { ...next[playerIdx].tiers, [tierKey]: Number(value) }
      const isIllegal = !isLegalSusunArrangement(currentTiers.top, currentTiers.mid, currentTiers.bot)
      next[playerIdx] = {
        ...next[playerIdx],
        tiers: currentTiers,
        // Auto mark as pao warning if arrangement is illegal
        isPao: next[playerIdx].isPao || isIllegal
      }
      return next
    })
  }

  const handlePaoToggle = (playerIdx) => {
    setPlayerHands(prev => {
      const next = [...prev]
      next[playerIdx] = {
        ...next[playerIdx],
        isPao: !next[playerIdx].isPao
      }
      return next
    })
  }

  const handleSpecialComboChange = (playerIdx, comboId) => {
    const combo = CAPSA_SPECIAL_COMBOS.find(c => c.id === comboId)
    setPlayerHands(prev => {
      const next = [...prev]
      next[playerIdx] = {
        ...next[playerIdx],
        specialComboId: comboId,
        bonusPoints: combo ? combo.bonus : 0
      }
      return next
    })
  }

  // Live round deltas calculation
  const liveCalculation = useMemo(() => {
    return calculateCapsaSusunRound(playerHands, settings)
  }, [playerHands, settings])

  // Total scores calculation across all rounds
  const totalScores = useMemo(() => {
    const totals = {}
    players.forEach((_, idx) => { totals[`p${idx}`] = 0 })
    rounds.forEach(r => {
      if (r.deltas) {
        Object.entries(r.deltas).forEach(([pId, val]) => {
          totals[pId] = (totals[pId] || 0) + val
        })
      }
    })
    return totals
  }, [players, rounds])

  // Projected totals including current round
  const projectedTotals = useMemo(() => {
    const projected = { ...totalScores }
    Object.entries(liveCalculation.roundDeltas).forEach(([pId, val]) => {
      projected[pId] = (projected[pId] || 0) + val
    })
    return projected
  }, [totalScores, liveCalculation])

  const handleSave = () => {
    const roundData = {
      round_number: currentRoundNum,
      hands: playerHands,
      deltas: liveCalculation.roundDeltas,
      sweeps: liveCalculation.sweeps,
      timestamp: new Date().toISOString()
    }

    onSaveRound(roundData)

    // Reset input for next round
    setPlayerHands(players.map((name, idx) => ({
      id: `p${idx}`,
      name,
      isPao: false,
      specialComboId: 'none',
      tiers: { top: 0, mid: 0, bot: 0 },
      bonusPoints: 0
    })))
  }

  return (
    <div className="main-content" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            🃏 CAPSA SUSUN SCORECARD
          </span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '2px 0 0 0' }}>
            {t('remi_jawa.round', { num: currentRoundNum }) || `Ronde ${currentRoundNum}`}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            type="button" 
            className="btn btn-sm btn-secondary"
            onClick={() => setIsRulesOpen(true)}
            style={{ color: '#06B6D4', borderColor: 'rgba(6, 182, 212, 0.4)' }}
          >
            📖 {t('rules_modal.quick_btn') || 'Aturan'}
          </button>
          {onBackToHub && (
            <button className="btn btn-sm btn-secondary" onClick={onBackToHub}>
              🏠 Hub
            </button>
          )}
        </div>
      </div>

      {/* Sweep Notifications / Badges */}
      {liveCalculation.sweeps && liveCalculation.sweeps.length > 0 && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '12px',
          background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.2), rgba(236, 72, 153, 0.2))',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          fontWeight: 800,
          color: '#FCD34D'
        }}>
          <span>🔥</span>
          <span>
            {liveCalculation.sweeps.some(s => s.type === 'sweep_all') 
              ? 'TEMBUS KELILING! (Super Sweep 4x Multiplier)' 
              : liveCalculation.sweeps.some(s => s.type === 'dragon')
              ? 'DRAGON KOMBINASI SUPER! (+13 Poin dari semua pemain)'
              : 'TEMBUS (SWEEP)! Poin perbandingan 2x lipat'}
          </span>
        </div>
      )}

      {/* Player Input Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {playerHands.map((p, idx) => {
          const delta = liveCalculation.roundDeltas[p.id] || 0
          const isIllegal = !isLegalSusunArrangement(p.tiers.top, p.tiers.mid, p.tiers.bot)

          return (
            <div 
              key={p.id}
              className="glass-panel"
              style={{
                padding: '16px',
                border: p.isPao 
                  ? '1px solid rgba(239, 68, 68, 0.6)' 
                  : delta > 0 
                  ? '1px solid rgba(52, 211, 153, 0.4)' 
                  : '1px solid var(--border-glass)',
                background: p.isPao 
                  ? 'rgba(239, 68, 68, 0.08)' 
                  : 'var(--bg-glass)'
              }}
            >
              {/* Player Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                  {p.name}
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  color: delta > 0 ? '#34D399' : delta < 0 ? '#F87171' : 'var(--text-muted)'
                }}>
                  {delta > 0 ? `+${delta}` : delta} Pts
                </div>
              </div>

              {/* Pao Toggle */}
              <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${p.isPao ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => handlePaoToggle(idx)}
                  style={{ fontSize: '0.72rem', padding: '3px 8px', fontWeight: 800 }}
                >
                  {p.isPao ? '⚠️ PAO (Salah Susun)' : '✓ Susunan Sah'}
                </button>
                {isIllegal && !p.isPao && (
                  <span style={{ fontSize: '0.7rem', color: '#F87171' }}>Urutan terbalik!</span>
                )}
              </div>

              {/* 3 Tier Selectors */}
              {!p.isPao && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Top Tier (3 cards) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '75px' }}>Atas (3k):</span>
                    <select
                      className="form-input"
                      style={{ fontSize: '0.75rem', padding: '4px 6px', flex: 1 }}
                      value={p.tiers.top}
                      onChange={(e) => handleTierChange(idx, 'top', e.target.value)}
                    >
                      {CAPSA_HAND_RANKS.slice(0, 4).map(r => (
                        <option key={r.id} value={r.value}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Mid Tier (5 cards) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '75px' }}>Tengah (5k):</span>
                    <select
                      className="form-input"
                      style={{ fontSize: '0.75rem', padding: '4px 6px', flex: 1 }}
                      value={p.tiers.mid}
                      onChange={(e) => handleTierChange(idx, 'mid', e.target.value)}
                    >
                      {CAPSA_HAND_RANKS.map(r => (
                        <option key={r.id} value={r.value}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bot Tier (5 cards) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '75px' }}>Bawah (5k):</span>
                    <select
                      className="form-input"
                      style={{ fontSize: '0.75rem', padding: '4px 6px', flex: 1 }}
                      value={p.tiers.bot}
                      onChange={(e) => handleTierChange(idx, 'bot', e.target.value)}
                    >
                      {CAPSA_HAND_RANKS.map(r => (
                        <option key={r.id} value={r.value}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Special Bonus Combo Dropdown */}
                  <div style={{ marginTop: '4px' }}>
                    <select
                      className="form-input"
                      style={{ fontSize: '0.72rem', padding: '3px 6px', borderColor: 'rgba(234, 179, 8, 0.4)', color: '#FCD34D' }}
                      value={p.specialComboId}
                      onChange={(e) => handleSpecialComboChange(idx, e.target.value)}
                    >
                      {CAPSA_SPECIAL_COMBOS.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.bonus > 0 ? `(+${c.bonus} Pts)` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Save Round CTA */}
      <button 
        type="button" 
        className="btn btn-primary"
        onClick={handleSave}
        style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800, marginBottom: '24px' }}
      >
        💾 Simpan Ronde {currentRoundNum} & Tambah Skor
      </button>

      {/* Leaderboard Podium & Total Standings */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div className="section-label" style={{ marginTop: 0 }}>🏆 Klasemen Poin Capsa Susun</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${players.length}, 1fr)`, gap: '10px', textAlign: 'center' }}>
          {players.map((name, idx) => {
            const pId = `p${idx}`
            const score = totalScores[pId] || 0
            return (
              <div key={pId} style={{ padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  {name}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: score >= 0 ? '#34D399' : '#F87171' }}>
                  {score >= 0 ? `+${score}` : score}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Poin Total</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Round Ledger & Controls */}
      {rounds.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div className="section-label" style={{ margin: 0 }}>📜 Riwayat Ronde</div>
            {onUndoRound && (
              <button className="btn btn-sm btn-secondary" onClick={onUndoRound} style={{ fontSize: '0.75rem' }}>
                ↩️ Undo Ronde Terakhir
              </button>
            )}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Ronde</th>
                  {players.map((name, idx) => (
                    <th key={idx} style={{ padding: '8px', textAlign: 'center' }}>{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rounds.map((r, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 800 }}>R{r.round_number || rIdx + 1}</td>
                    {players.map((_, pIdx) => {
                      const d = r.deltas?.[`p${pIdx}`] || 0
                      return (
                        <td key={pIdx} style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: d > 0 ? '#34D399' : d < 0 ? '#F87171' : 'inherit' }}>
                          {d > 0 ? `+${d}` : d}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {onShareStory && (
          <button className="btn btn-secondary" onClick={onShareStory}>
            📸 Bagikan Cerita 9:16
          </button>
        )}
        {onFinishGame && (
          <button className="btn btn-danger" onClick={onFinishGame}>
            🏁 Selesaikan Permainan
          </button>
        )}
      </div>

      <CardGameRulesModal 
        isOpen={isRulesOpen} 
        onClose={() => setIsRulesOpen(false)} 
        initialGame="capsa" 
      />
    </div>
  )
}
