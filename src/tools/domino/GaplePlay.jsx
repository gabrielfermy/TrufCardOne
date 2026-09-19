import React, { useState, useMemo } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { calculateGapleRound, GAPLE_END_TYPES, GAPLE_TEAM_MODES } from './dominoLogic'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

export default function GaplePlay({
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
  const settings = session?.settings || {
    teamMode: GAPLE_TEAM_MODES.INDIVIDUAL,
    penaltyThreshold: 100,
    deadlockRule: 'lowest_wins',
    balakZeroPenalty: 10,
    balakSixPenalty: 12
  }
  const is2v2 = settings.teamMode === GAPLE_TEAM_MODES.TEAMS_2V2
  const rounds = session?.game_rounds || session?.rounds || []
  const currentRoundNum = rounds.length + 1

  const [endType, setEndType] = useState(GAPLE_END_TYPES.OUT) // 'out' | 'deadlock'
  const [winnerId, setWinnerId] = useState('p0')
  const [deadlockCauserPlayerId, setDeadlockCauserPlayerId] = useState('p0')

  const [playerHandInputs, setPlayerHandInputs] = useState(() =>
    players.map((name, idx) => ({
      id: `p${idx}`,
      name,
      teamId: idx % 2 === 0 ? 'team_a' : 'team_b',
      remainingPips: idx === 0 ? 0 : 5,
      balakZerosCount: 0,
      balakSixesCount: 0
    }))
  )

  const handleWinnerSelect = (pId) => {
    setWinnerId(pId)
    setPlayerHandInputs(prev =>
      prev.map(p => ({
        ...p,
        remainingPips: p.id === pId ? 0 : (p.remainingPips === 0 ? 5 : p.remainingPips)
      }))
    )
  }

  const handlePipsChange = (playerIdx, delta) => {
    setPlayerHandInputs(prev => {
      const next = [...prev]
      const currentVal = next[playerIdx].remainingPips || 0
      const nextVal = Math.max(0, currentVal + delta)
      next[playerIdx] = { ...next[playerIdx], remainingPips: nextVal }
      return next
    })
  }

  const handleToggleBalakZero = (playerIdx) => {
    setPlayerHandInputs(prev => {
      const next = [...prev]
      next[playerIdx] = {
        ...next[playerIdx],
        balakZerosCount: next[playerIdx].balakZerosCount > 0 ? 0 : 1
      }
      return next
    })
  }

  const handleToggleBalakSix = (playerIdx) => {
    setPlayerHandInputs(prev => {
      const next = [...prev]
      next[playerIdx] = {
        ...next[playerIdx],
        balakSixesCount: next[playerIdx].balakSixesCount > 0 ? 0 : 1
      }
      return next
    })
  }

  // Live round penalty calculation
  const liveCalculation = useMemo(() => {
    return calculateGapleRound({
      endType,
      winnerId,
      deadlockCauserPlayerId,
      players: playerHandInputs
    }, settings)
  }, [endType, winnerId, deadlockCauserPlayerId, playerHandInputs, settings])

  // Total cumulative penalties across all rounds
  const totalPenalties = useMemo(() => {
    const totals = {}
    players.forEach((_, idx) => { totals[`p${idx}`] = 0 })
    rounds.forEach(r => {
      if (r.penalties) {
        Object.entries(r.penalties).forEach(([pId, val]) => {
          totals[pId] = (totals[pId] || 0) + val
        })
      }
    })
    return totals
  }, [players, rounds])

  // 2v2 Team Total Penalties
  const teamScores = useMemo(() => {
    if (!is2v2) return null
    let teamA = 0
    let teamB = 0
    players.forEach((_, idx) => {
      const pId = `p${idx}`
      const pTotal = totalPenalties[pId] || 0
      if (idx % 2 === 0) teamA += pTotal
      else teamB += pTotal
    })
    return { teamA, teamB }
  }, [is2v2, players, totalPenalties])

  // Check if any player or team exceeded the penalty threshold
  const isGameOver = useMemo(() => {
    const limit = settings.penaltyThreshold || 100
    if (is2v2 && teamScores) {
      return teamScores.teamA >= limit || teamScores.teamB >= limit
    }
    return Object.values(totalPenalties).some(val => val >= limit)
  }, [settings.penaltyThreshold, is2v2, teamScores, totalPenalties])

  const handleSave = () => {
    const roundData = {
      round_number: currentRoundNum,
      end_type: endType,
      winner_id: liveCalculation.winnerId,
      penalties: liveCalculation.roundPenalties,
      is_causer_penalized: liveCalculation.isCauserPenalized,
      timestamp: new Date().toISOString()
    }

    onSaveRound(roundData)

    // Reset for next round
    setPlayerHandInputs(players.map((name, idx) => ({
      id: `p${idx}`,
      name,
      teamId: idx % 2 === 0 ? 'team_a' : 'team_b',
      remainingPips: idx === 0 ? 0 : 5,
      balakZerosCount: 0,
      balakSixesCount: 0
    })))
  }

  return (
    <div className="main-content" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#38BDF8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            🀄 DOMINO GAPLE {is2v2 ? '• PASANGAN (2 VS 2)' : '• INDIVIDU'}
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
            style={{ color: '#38BDF8', borderColor: 'rgba(56, 189, 248, 0.4)' }}
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

      {/* Game Over Alert Banner */}
      {isGameOver && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '12px',
          background: 'rgba(239, 68, 68, 0.18)',
          border: '1px solid rgba(239, 68, 68, 0.5)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          color: '#FCA5A5',
          fontWeight: 800
        }}>
          <span style={{ fontSize: '1.4rem' }}>🚨</span>
          <div>
            <div>BATAS DENDA TELAH TERCAPAI ({settings.penaltyThreshold} Poin)!</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Pemain dengan denda akumulasi terendah adalah pemenang pertandingan.
            </div>
          </div>
        </div>
      )}

      {/* Round End Type Selector (Out vs Gaple Macet) */}
      <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
        <div className="section-label" style={{ marginTop: 0 }}>🏁 Status Akhir Ronde</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          <button
            type="button"
            className={`btn ${endType === GAPLE_END_TYPES.OUT ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setEndType(GAPLE_END_TYPES.OUT)}
            style={{ fontWeight: 800, padding: '10px' }}
          >
            ✨ Keluar / Habis Kartu (Out)
          </button>
          <button
            type="button"
            className={`btn ${endType === GAPLE_END_TYPES.DEADLOCK ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setEndType(GAPLE_END_TYPES.DEADLOCK)}
            style={{ fontWeight: 800, padding: '10px', background: endType === GAPLE_END_TYPES.DEADLOCK ? 'linear-gradient(90deg, #F59E0B, #D97706)' : undefined }}
          >
            🔒 Gaple / Macet (Buntu)
          </button>
        </div>

        {/* Winner Selector (If Out) */}
        {endType === GAPLE_END_TYPES.OUT ? (
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
              Siapa yang Menang Keluar (0 Titik)?
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${players.length}, 1fr)`, gap: '6px' }}>
              {players.map((name, idx) => {
                const pId = `p${idx}`
                const isSelected = winnerId === pId
                return (
                  <button
                    key={pId}
                    type="button"
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleWinnerSelect(pId)}
                    style={{ fontSize: '0.8rem', fontWeight: 800, padding: '8px 4px' }}
                  >
                    {isSelected ? '👑 ' : ''}{name}
                  </button>
                )
              })}
            </div>
          </div>
        ) : (
          <div>
            <span style={{ fontSize: '0.8rem', color: '#FCD34D', display: 'block', marginBottom: '6px' }}>
              🔒 Siapa yang Mengeluarkan Balak Terakhir (Pembuat Buntu)?
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${players.length}, 1fr)`, gap: '6px' }}>
              {players.map((name, idx) => {
                const pId = `p${idx}`
                const isSelected = deadlockCauserPlayerId === pId
                return (
                  <button
                    key={pId}
                    type="button"
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setDeadlockCauserPlayerId(pId)}
                    style={{ fontSize: '0.8rem', fontWeight: 800, padding: '8px 4px' }}
                  >
                    {isSelected ? '🎯 ' : ''}{name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Players Remaining Pips Keypad */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {playerHandInputs.map((p, idx) => {
          const isWinner = endType === GAPLE_END_TYPES.OUT && p.id === winnerId
          const penalty = liveCalculation.roundPenalties[p.id] || 0
          const teamLabel = is2v2 ? (idx % 2 === 0 ? '🔵 Tim A' : '🔴 Tim B') : null

          return (
            <div
              key={p.id}
              className="glass-panel"
              style={{
                padding: '16px',
                border: isWinner 
                  ? '2px solid rgba(52, 211, 153, 0.6)' 
                  : penalty > 0 
                  ? '1px solid rgba(239, 68, 68, 0.3)' 
                  : '1px solid var(--border-glass)',
                background: isWinner ? 'rgba(52, 211, 153, 0.08)' : 'var(--bg-glass)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  {teamLabel && (
                    <span style={{ fontSize: '0.68rem', color: idx % 2 === 0 ? '#38BDF8' : '#F472B6', fontWeight: 800, display: 'block' }}>
                      {teamLabel}
                    </span>
                  )}
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: isWinner ? '#34D399' : 'var(--text-main)' }}>
                    {isWinner ? '👑 ' : ''}{p.name}
                  </div>
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 900, color: penalty === 0 ? '#34D399' : '#F87171' }}>
                  +{penalty} Denda
                </div>
              </div>

              {isWinner ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: '#34D399', fontWeight: 800, fontSize: '0.85rem' }}>
                  🎉 Menang (0 Denda)
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Pips Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Jumlah Titik Sisa:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handlePipsChange(idx, -5)}
                        style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                      >
                        -5
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handlePipsChange(idx, -1)}
                        style={{ width: '28px', height: '28px', padding: 0 }}
                      >
                        -
                      </button>
                      <span style={{ minWidth: '36px', textAlign: 'center', fontWeight: 900, fontSize: '1.1rem' }}>
                        {p.remainingPips}
                      </span>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handlePipsChange(idx, 1)}
                        style={{ width: '28px', height: '28px', padding: 0 }}
                      >
                        +
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-sm btn-secondary" 
                        onClick={() => handlePipsChange(idx, 5)}
                        style={{ fontSize: '0.72rem', padding: '2px 6px' }}
                      >
                        +5
                      </button>
                    </div>
                  </div>

                  {/* Balak Mati Badges */}
                  <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${p.balakZerosCount > 0 ? 'btn-danger' : 'btn-secondary'}`}
                      onClick={() => handleToggleBalakZero(idx)}
                      style={{ fontSize: '0.72rem', flex: 1, padding: '4px' }}
                    >
                      {p.balakZerosCount > 0 ? '⚠️ Balak 0-0 (+10)' : '+ Balak 0-0'}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${p.balakSixesCount > 0 ? 'btn-danger' : 'btn-secondary'}`}
                      onClick={() => handleToggleBalakSix(idx)}
                      style={{ fontSize: '0.72rem', flex: 1, padding: '4px' }}
                    >
                      {p.balakSixesCount > 0 ? '⚠️ Balak 6-6 (+12)' : '+ Balak 6-6'}
                    </button>
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
        💾 Simpan Ronde {currentRoundNum} & Tambah Denda
      </button>

      {/* 2v2 Team Standings if active */}
      {is2v2 && teamScores && (
        <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
          <div className="section-label" style={{ marginTop: 0 }}>👥 Skor Pasangan Tim (2 vs 2)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', textAlign: 'center' }}>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38BDF8' }}>🔵 Tim A ({players[0]}, {players[2]})</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFF', margin: '4px 0' }}>{teamScores.teamA} Pts</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Batas: {settings.penaltyThreshold} Pts</div>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', background: 'rgba(244, 114, 182, 0.1)', border: '1px solid rgba(244, 114, 182, 0.3)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#F472B6' }}>🔴 Tim B ({players[1]}, {players[3]})</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#FFF', margin: '4px 0' }}>{teamScores.teamB} Pts</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Batas: {settings.penaltyThreshold} Pts</div>
            </div>
          </div>
        </div>
      )}

      {/* Total Cumulative Penalty Standings */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div className="section-label" style={{ marginTop: 0 }}>📊 Akumulasi Denda Pemain</div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${players.length}, 1fr)`, gap: '10px', textAlign: 'center' }}>
          {players.map((name, idx) => {
            const pId = `p${idx}`
            const total = totalPenalties[pId] || 0
            const isEliminated = total >= (settings.penaltyThreshold || 100)

            return (
              <div 
                key={pId} 
                style={{ 
                  padding: '10px', 
                  background: isEliminated ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)', 
                  borderRadius: '12px',
                  border: isEliminated ? '1px solid rgba(239,68,68,0.4)' : undefined
                }}
              >
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  {name}
                </div>
                <div style={{ fontSize: '1.3rem', fontWeight: 900, color: isEliminated ? '#F87171' : '#FCD34D' }}>
                  {total}
                </div>
                <div style={{ fontSize: '0.7rem', color: isEliminated ? '#F87171' : 'var(--text-muted)' }}>
                  {isEliminated ? '⚠️ Tereliminasi' : 'Total Titik'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Round Ledger */}
      {rounds.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div className="section-label" style={{ margin: 0 }}>📜 Riwayat Ronde Gaple</div>
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
                  <th style={{ padding: '8px', textAlign: 'center' }}>Tipe</th>
                  {players.map((name, idx) => (
                    <th key={idx} style={{ padding: '8px', textAlign: 'center' }}>{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rounds.map((r, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 800 }}>R{r.round_number || rIdx + 1}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {r.end_type === GAPLE_END_TYPES.DEADLOCK ? '🔒 Buntu' : '✨ Out'}
                    </td>
                    {players.map((_, pIdx) => {
                      const pen = r.penalties?.[`p${pIdx}`] || 0
                      return (
                        <td key={pIdx} style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: pen === 0 ? '#34D399' : '#F87171' }}>
                          +{pen}
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
        initialGame="domino" 
      />
    </div>
  )
}
