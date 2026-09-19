import React, { useState, useMemo } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { calculateQiuQiuRound, QIUQIU_SPECIAL_HANDS } from './dominoLogic'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

export default function QiuQiuPlay({
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
  const rounds = session?.game_rounds || session?.rounds || []
  const currentRoundNum = rounds.length + 1

  const [dealerIdx, setDealerIdx] = useState(0)
  const [playerInputs, setPlayerInputs] = useState(() =>
    players.map((name, idx) => ({
      id: `p${idx}`,
      name,
      isDealer: idx === 0,
      betAmount: 10,
      specialHandId: 'none',
      leftPairVal: 9,
      rightPairVal: 8,
      rankValue: 98 // 9-8
    }))
  )

  const handleDealerSelect = (idx) => {
    setDealerIdx(idx)
    setPlayerInputs(prev =>
      prev.map((p, i) => ({
        ...p,
        isDealer: i === idx
      }))
    )
  }

  const handlePairChange = (idx, isLeft, val) => {
    setPlayerInputs(prev => {
      const next = [...prev]
      const current = next[idx]
      const newLeft = isLeft ? Number(val) : current.leftPairVal
      const newRight = !isLeft ? Number(val) : current.rightPairVal
      const isQiuQiu = newLeft === 9 && newRight === 9

      next[idx] = {
        ...current,
        leftPairVal: newLeft,
        rightPairVal: newRight,
        specialHandId: isQiuQiu ? 'qiu_qiu' : 'none',
        rankValue: isQiuQiu ? 100 : newLeft * 10 + newRight
      }
      return next
    })
  }

  const handleSpecialHandChange = (idx, specialId) => {
    const special = QIUQIU_SPECIAL_HANDS.find(s => s.id === specialId)
    setPlayerInputs(prev => {
      const next = [...prev]
      next[idx] = {
        ...next[idx],
        specialHandId: specialId,
        rankValue: special ? special.rank * 100 : 0
      }
      return next
    })
  }

  const handleBetChange = (idx, delta) => {
    setPlayerInputs(prev => {
      const next = [...prev]
      const currentVal = next[idx].betAmount || 10
      next[idx] = {
        ...next[idx],
        betAmount: Math.max(1, currentVal + delta)
      }
      return next
    })
  }

  // Live round deltas
  const liveCalculation = useMemo(() => {
    return calculateQiuQiuRound(playerInputs)
  }, [playerInputs])

  // Total points / chips
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

  const handleSave = () => {
    const roundData = {
      round_number: currentRoundNum,
      dealer_id: `p${dealerIdx}`,
      winner_id: liveCalculation.winnerId,
      deltas: liveCalculation.roundDeltas,
      hands: playerInputs,
      timestamp: new Date().toISOString()
    }

    onSaveRound(roundData)

    // Rotate dealer clockwise for next round
    const nextDealer = (dealerIdx + 1) % players.length
    setDealerIdx(nextDealer)
    setPlayerInputs(players.map((name, idx) => ({
      id: `p${idx}`,
      name,
      isDealer: idx === nextDealer,
      betAmount: 10,
      specialHandId: 'none',
      leftPairVal: 9,
      rightPairVal: 8,
      rankValue: 98
    })))
  }

  return (
    <div className="main-content" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#10B981', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            🎲 DOMINO QIUQIU (9-9) / CEME
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
            style={{ color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.4)' }}
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

      {/* Dealer Selector */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <div className="section-label" style={{ marginTop: 0 }}>🏦 Bandar / Dealer Ronde Ini</div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {players.map((name, idx) => {
            const isDealer = dealerIdx === idx
            return (
              <button
                key={idx}
                type="button"
                className={`btn ${isDealer ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleDealerSelect(idx)}
                style={{ fontSize: '0.82rem', fontWeight: 800, padding: '8px 12px' }}
              >
                {isDealer ? '🏦 Bandar: ' : ''}{name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Player Input Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {playerInputs.map((p, idx) => {
          const isDealer = p.isDealer
          const delta = liveCalculation.roundDeltas[p.id] || 0

          return (
            <div
              key={p.id}
              className="glass-panel"
              style={{
                padding: '16px',
                border: isDealer 
                  ? '2px solid rgba(245, 158, 11, 0.6)' 
                  : delta > 0 
                  ? '1px solid rgba(52, 211, 153, 0.4)' 
                  : '1px solid var(--border-glass)',
                background: isDealer ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-glass)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: isDealer ? '#FCD34D' : 'var(--text-main)' }}>
                  {isDealer ? '🏦 [Bandar] ' : ''}{p.name}
                </div>
                <div style={{
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  color: delta > 0 ? '#34D399' : delta < 0 ? '#F87171' : 'var(--text-muted)'
                }}>
                  {delta > 0 ? `+${delta}` : delta} Chip
                </div>
              </div>

              {/* Hand Value Selectors (Left Pair & Right Pair) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', width: '60px' }}>Nilai:</span>
                  <div style={{ display: 'flex', gap: '6px', flex: 1 }}>
                    <select
                      className="form-input"
                      value={p.leftPairVal}
                      onChange={(e) => handlePairChange(idx, true, e.target.value)}
                      style={{ fontSize: '0.9rem', fontWeight: 800, textAlign: 'center', padding: '6px' }}
                    >
                      {[9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                    <span style={{ alignSelf: 'center', fontWeight: 900 }}>-</span>
                    <select
                      className="form-input"
                      value={p.rightPairVal}
                      onChange={(e) => handlePairChange(idx, false, e.target.value)}
                      style={{ fontSize: '0.9rem', fontWeight: 800, textAlign: 'center', padding: '6px' }}
                    >
                      {[9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Special Combo Selector */}
                <select
                  className="form-input"
                  value={p.specialHandId}
                  onChange={(e) => handleSpecialHandChange(idx, e.target.value)}
                  style={{ fontSize: '0.75rem', borderColor: 'rgba(245, 158, 11, 0.3)', color: '#FCD34D' }}
                >
                  {QIUQIU_SPECIAL_HANDS.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>

                {/* Bet Stepper (for Non-Dealer) */}
                {!isDealer && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Taruhan:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handleBetChange(idx, -5)}
                        style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                      >
                        -5
                      </button>
                      <span style={{ fontWeight: 800, fontSize: '0.9rem', minWidth: '28px', textAlign: 'center' }}>
                        {p.betAmount}
                      </span>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handleBetChange(idx, 5)}
                        style={{ padding: '2px 6px', fontSize: '0.72rem' }}
                      >
                        +5
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Save Button */}
      <button 
        type="button" 
        className="btn btn-primary"
        onClick={handleSave}
        style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800, marginBottom: '24px' }}
      >
        💾 Simpan Ronde {currentRoundNum} & Update Saldo Chip
      </button>

      {/* Leaderboard */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div className="section-label" style={{ marginTop: 0 }}>🏆 Klasemen Saldo Chip / Poin QiuQiu</div>
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
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Saldo Total</div>
              </div>
            )
          })}
        </div>
      </div>

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
        initialGame="domino" 
      />
    </div>
  )
}
