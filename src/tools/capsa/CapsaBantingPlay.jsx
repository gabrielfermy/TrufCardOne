import React, { useState, useMemo } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { calculateCapsaBantingRound } from './capsaLogic'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

export default function CapsaBantingPlay({
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
  const settings = session?.settings || { doubleAt10: true, tripleAt13: true, twoCardPenalty: 2, bomPenalty: 5 }
  const rounds = session?.game_rounds || session?.rounds || []
  const currentRoundNum = rounds.length + 1

  const [winnerId, setWinnerId] = useState('p0')
  const [playerHandInputs, setPlayerHandInputs] = useState(() => 
    players.map((name, idx) => ({
      id: `p${idx}`,
      name,
      remainingCards: idx === 0 ? 0 : 5,
      cardsTwoCount: 0,
      bomsCount: 0
    }))
  )

  const handleWinnerSelect = (pId) => {
    setWinnerId(pId)
    setPlayerHandInputs(prev => 
      prev.map(p => ({
        ...p,
        remainingCards: p.id === pId ? 0 : (p.remainingCards === 0 ? 5 : p.remainingCards)
      }))
    )
  }

  const handleCardsChange = (playerIdx, delta) => {
    setPlayerHandInputs(prev => {
      const next = [...prev]
      const currentVal = next[playerIdx].remainingCards || 0
      const nextVal = Math.max(0, Math.min(13, currentVal + delta))
      next[playerIdx] = { ...next[playerIdx], remainingCards: nextVal }
      return next
    })
  }

  const handleTwoChange = (playerIdx, delta) => {
    setPlayerHandInputs(prev => {
      const next = [...prev]
      const currentVal = next[playerIdx].cardsTwoCount || 0
      const nextVal = Math.max(0, Math.min(4, currentVal + delta))
      next[playerIdx] = { ...next[playerIdx], cardsTwoCount: nextVal }
      return next
    })
  }

  const handleBomChange = (playerIdx, delta) => {
    setPlayerHandInputs(prev => {
      const next = [...prev]
      const currentVal = next[playerIdx].bomsCount || 0
      const nextVal = Math.max(0, Math.min(2, currentVal + delta))
      next[playerIdx] = { ...next[playerIdx], bomsCount: nextVal }
      return next
    })
  }

  // Live round deltas
  const liveCalculation = useMemo(() => {
    return calculateCapsaBantingRound(winnerId, playerHandInputs, settings)
  }, [winnerId, playerHandInputs, settings])

  // Total scores
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
      winner_id: winnerId,
      hands: playerHandInputs,
      deltas: liveCalculation.roundDeltas,
      total_pot: liveCalculation.totalPot,
      timestamp: new Date().toISOString()
    }

    onSaveRound(roundData)

    // Reset input for next round
    setPlayerHandInputs(players.map((name, idx) => ({
      id: `p${idx}`,
      name,
      remainingCards: idx === 0 ? 0 : 5,
      cardsTwoCount: 0,
      bomsCount: 0
    })))
  }

  return (
    <div className="main-content" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#F97316', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            💥 CAPSA BANTING (BIG TWO)
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
            style={{ color: '#F97316', borderColor: 'rgba(249, 115, 22, 0.4)' }}
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

      {/* Winner Selector */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <div className="section-label" style={{ marginTop: 0 }}>👑 Pemenang Ronde (Habis Kartu Duluan)</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${players.length}, 1fr)`, gap: '8px' }}>
          {players.map((name, idx) => {
            const pId = `p${idx}`
            const isWinner = winnerId === pId
            return (
              <button
                key={pId}
                type="button"
                className={`btn ${isWinner ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => handleWinnerSelect(pId)}
                style={{
                  padding: '10px 4px',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  borderColor: isWinner ? 'var(--primary)' : 'var(--border-glass)'
                }}
              >
                {isWinner ? '👑 ' : ''}{name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Opponents Unplayed Cards Keypad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {playerHandInputs.map((p, idx) => {
          const isWinner = p.id === winnerId
          const delta = liveCalculation.roundDeltas[p.id] || 0
          const isDouble = p.remainingCards >= 10 && p.remainingCards < 13
          const isHang = p.remainingCards === 13

          return (
            <div 
              key={p.id}
              className="glass-panel"
              style={{
                padding: '16px',
                border: isWinner 
                  ? '2px solid rgba(52, 211, 153, 0.6)' 
                  : isHang 
                  ? '2px solid rgba(239, 68, 68, 0.6)' 
                  : '1px solid var(--border-glass)',
                background: isWinner ? 'rgba(52, 211, 153, 0.08)' : 'var(--bg-glass)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: isWinner ? '#34D399' : 'var(--text-main)' }}>
                  {isWinner ? '👑 ' : ''}{p.name}
                </div>
                <div style={{
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  color: delta > 0 ? '#34D399' : delta < 0 ? '#F87171' : 'var(--text-muted)'
                }}>
                  {delta > 0 ? `+${delta}` : delta} Pts
                </div>
              </div>

              {isWinner ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#34D399', fontWeight: 800, fontSize: '0.9rem' }}>
                  🎉 Menang (0 Kartu Sisa)
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Remaining Cards Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sisa Kartu di Tangan:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handleCardsChange(idx, -1)}
                        style={{ width: '28px', height: '28px', padding: 0 }}
                      >
                        -
                      </button>
                      <span style={{ minWidth: '32px', textAlign: 'center', fontWeight: 900, fontSize: '1rem' }}>
                        {p.remainingCards}
                      </span>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handleCardsChange(idx, 1)}
                        style={{ width: '28px', height: '28px', padding: 0 }}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Multiplier Badges */}
                  {isHang && (
                    <div style={{ fontSize: '0.72rem', color: '#F87171', fontWeight: 800, background: 'rgba(239,68,68,0.15)', padding: '3px 8px', borderRadius: '6px', textAlign: 'center' }}>
                      ⚡ HANG / TELUR (3x Denda Lipat)
                    </div>
                  )}
                  {isDouble && (
                    <div style={{ fontSize: '0.72rem', color: '#FCD34D', fontWeight: 800, background: 'rgba(245,158,11,0.15)', padding: '3px 8px', borderRadius: '6px', textAlign: 'center' }}>
                      ⚠️ Sisa ≥10 Kartu (2x Denda Lipat)
                    </div>
                  )}

                  {/* Extra penalties for 2s and Boms */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sisa Kartu 2 (+2p):</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[0, 1, 2, 3, 4].map(num => (
                        <button
                          key={num}
                          type="button"
                          className={`btn btn-sm ${p.cardsTwoCount === num ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setPlayerHandInputs(prev => {
                            const next = [...prev]
                            next[idx] = { ...next[idx], cardsTwoCount: num }
                            return next
                          })}
                          style={{ padding: '2px 6px', fontSize: '0.72rem', minWidth: '22px' }}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sisa Bom (+5p):</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {[0, 1, 2].map(num => (
                        <button
                          key={num}
                          type="button"
                          className={`btn btn-sm ${p.bomsCount === num ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => setPlayerHandInputs(prev => {
                            const next = [...prev]
                            next[idx] = { ...next[idx], bomsCount: num }
                            return next
                          })}
                          style={{ padding: '2px 6px', fontSize: '0.72rem', minWidth: '22px' }}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
        💾 Simpan Ronde {currentRoundNum} & Tambah Skor
      </button>

      {/* Total Standings */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div className="section-label" style={{ marginTop: 0 }}>🏆 Klasemen Poin Capsa Banting</div>
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
