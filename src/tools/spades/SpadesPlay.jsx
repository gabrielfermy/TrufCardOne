import React, { useState, useMemo } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { calculateSpadesRound, SPADES_MODES } from './spadesLogic'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

export default function SpadesPlay({
  session,
  onSaveRound,
  onUndoRound,
  onFinishGame,
  onShareStory,
  onBackToHub
}) {
  const { t } = useTranslation()
  const [isRulesOpen, setIsRulesOpen] = useState(false)
  const [inputPhase, setInputPhase] = useState('bid') // 'bid' | 'won'

  const players = session?.player_names || ['North', 'East', 'South', 'West']
  const settings = session?.settings || {
    spadesMode: SPADES_MODES.PARTNERSHIP_2V2,
    targetScore: 500,
    nilBonus: 100,
    nilPenalty: 100,
    blindNilBonus: 200,
    blindNilPenalty: 200,
    bagPenalty: 100
  }
  const is2v2 = settings.spadesMode === SPADES_MODES.PARTNERSHIP_2V2
  const rounds = session?.game_rounds || session?.rounds || []
  const currentRoundNum = rounds.length + 1

  // Player bids and won inputs
  const [playerInputs, setPlayerInputs] = useState(() =>
    players.map((name, idx) => ({
      id: `p${idx}`,
      name,
      teamId: idx % 2 === 0 ? 'team_a' : 'team_b',
      bid: 3,
      isNil: false,
      isBlindNil: false,
      won: 3
    }))
  )

  const handleBidChange = (idx, val) => {
    setPlayerInputs(prev => {
      const next = [...prev]
      next[idx] = {
        ...next[idx],
        bid: Number(val),
        isNil: Number(val) === 0 && !next[idx].isBlindNil,
        isBlindNil: false
      }
      return next
    })
  }

  const handleToggleNil = (idx, type) => {
    setPlayerInputs(prev => {
      const next = [...prev]
      const current = next[idx]
      if (type === 'blind_nil') {
        next[idx] = {
          ...current,
          bid: 0,
          isNil: false,
          isBlindNil: !current.isBlindNil
        }
      } else {
        next[idx] = {
          ...current,
          bid: 0,
          isNil: !current.isNil,
          isBlindNil: false
        }
      }
      return next
    })
  }

  const handleWonChange = (idx, delta) => {
    setPlayerInputs(prev => {
      const next = [...prev]
      const currentVal = next[idx].won || 0
      next[idx] = {
        ...next[idx],
        won: Math.max(0, Math.min(13, currentVal + delta))
      }
      return next
    })
  }

  // Current accumulated bags from previous rounds
  const currentBags = useMemo(() => {
    let team_a = 0
    let team_b = 0
    rounds.forEach(r => {
      if (r.new_bags) {
        team_a = r.new_bags.team_a ?? team_a
        team_b = r.new_bags.team_b ?? team_b
      }
    })
    return { team_a, team_b }
  }, [rounds])

  // Total scores
  const totalScores = useMemo(() => {
    let team_a = 0
    let team_b = 0
    rounds.forEach(r => {
      if (r.round_deltas) {
        team_a += (r.round_deltas.team_a || 0)
        team_b += (r.round_deltas.team_b || 0)
      }
    })
    return { team_a, team_b }
  }, [rounds])

  // Total tricks won input
  const totalWonSum = useMemo(() => {
    return playerInputs.reduce((sum, p) => sum + (Number(p.won) || 0), 0)
  }, [playerInputs])

  // Live round calculation
  const liveCalculation = useMemo(() => {
    return calculateSpadesRound({ players: playerInputs }, settings, currentBags)
  }, [playerInputs, settings, currentBags])

  const handleSave = () => {
    if (totalWonSum !== 13) {
      alert(`Total trik yang dimenangkan harus berjumlah 13! (Saat ini: ${totalWonSum})`)
      return
    }

    const roundData = {
      round_number: currentRoundNum,
      players: playerInputs,
      round_deltas: liveCalculation.roundDeltas,
      new_bags: liveCalculation.newBags,
      bag_penalties: liveCalculation.bagPenaltiesTriggered,
      details: liveCalculation.details,
      timestamp: new Date().toISOString()
    }

    onSaveRound(roundData)

    // Reset for next round
    setInputPhase('bid')
    setPlayerInputs(players.map((name, idx) => ({
      id: `p${idx}`,
      name,
      teamId: idx % 2 === 0 ? 'team_a' : 'team_b',
      bid: 3,
      isNil: false,
      isBlindNil: false,
      won: 3
    })))
  }

  return (
    <div className="main-content" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#A855F7', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            ♠️ SPADES {is2v2 ? '• 2V2 PARTNERSHIP' : '• CUTTHROAT SOLO'}
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
            style={{ color: '#A855F7', borderColor: 'rgba(168, 85, 247, 0.4)' }}
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

      {/* Main Scoreboard & Bag Meters */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'center' }}>
          {/* Team A */}
          <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38BDF8' }}>
              🔵 TIM A ({players[0]}, {players[2]})
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFF', margin: '4px 0' }}>
              {totalScores.team_a} Pts
            </div>
            {/* Sandbags Meter */}
            <div style={{ fontSize: '0.78rem', color: '#FCD34D', fontWeight: 700 }}>
              🎒 Bags: {currentBags.team_a} / 10
            </div>
          </div>

          {/* Team B */}
          <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(244, 114, 182, 0.1)', border: '1px solid rgba(244, 114, 182, 0.3)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F472B6' }}>
              🔴 TIM B ({players[1]}, {players[3]})
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFF', margin: '4px 0' }}>
              {totalScores.team_b} Pts
            </div>
            {/* Sandbags Meter */}
            <div style={{ fontSize: '0.78rem', color: '#FCD34D', fontWeight: 700 }}>
              🎒 Bags: {currentBags.team_b} / 10
            </div>
          </div>
        </div>
      </div>

      {/* Phase Switcher (Bid vs Won) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
        <button
          type="button"
          className={`btn ${inputPhase === 'bid' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setInputPhase('bid')}
          style={{ fontWeight: 800, padding: '10px' }}
        >
          1. Fase Penawaran (Bid)
        </button>
        <button
          type="button"
          className={`btn ${inputPhase === 'won' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setInputPhase('won')}
          style={{ fontWeight: 800, padding: '10px' }}
        >
          2. Fase Hasil Trik (Won: {totalWonSum}/13)
        </button>
      </div>

      {/* Player Input Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {playerInputs.map((p, idx) => {
          const teamLabel = is2v2 ? (idx % 2 === 0 ? '🔵 Tim A' : '🔴 Tim B') : null

          return (
            <div
              key={p.id}
              className="glass-panel"
              style={{
                padding: '16px',
                border: p.isBlindNil 
                  ? '1px solid #F59E0B' 
                  : p.isNil 
                  ? '1px solid #A855F7' 
                  : '1px solid var(--border-glass)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div>
                  {teamLabel && (
                    <span style={{ fontSize: '0.68rem', color: idx % 2 === 0 ? '#38BDF8' : '#F472B6', fontWeight: 800, display: 'block' }}>
                      {teamLabel}
                    </span>
                  )}
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                    {p.name}
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--primary)' }}>
                  Bid: {p.isBlindNil ? 'Blind Nil' : p.isNil ? 'Nil (0)' : p.bid} • Won: {p.won}
                </div>
              </div>

              {inputPhase === 'bid' ? (
                <div>
                  {/* Bidding Selectors */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    <button
                      type="button"
                      className={`btn btn-sm ${p.isNil ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleToggleNil(idx, 'nil')}
                      style={{ flex: 1, fontSize: '0.72rem', padding: '4px' }}
                    >
                      Nil (0)
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${p.isBlindNil ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleToggleNil(idx, 'blind_nil')}
                      style={{ flex: 1, fontSize: '0.72rem', padding: '4px', color: '#FCD34D' }}
                    >
                      Blind Nil
                    </button>
                  </div>

                  {!p.isNil && !p.isBlindNil && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(b => (
                        <button
                          key={b}
                          type="button"
                          className={`btn btn-sm ${p.bid === b ? 'btn-primary' : 'btn-secondary'}`}
                          onClick={() => handleBidChange(idx, b)}
                          style={{ flex: 1, minWidth: '24px', padding: '4px 0', fontSize: '0.75rem', fontWeight: 800 }}
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Won Tricks Stepper */
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Trik Dimenangkan:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleWonChange(idx, -1)}
                      style={{ width: '32px', height: '32px', padding: 0 }}
                    >
                      -
                    </button>
                    <span style={{ minWidth: '36px', textAlign: 'center', fontWeight: 900, fontSize: '1.2rem' }}>
                      {p.won}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => handleWonChange(idx, 1)}
                      style={{ width: '32px', height: '32px', padding: 0 }}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Live Result Preview */}
      {inputPhase === 'won' && (
        <div className="glass-panel" style={{ padding: '16px', marginBottom: '20px' }}>
          <div className="section-label" style={{ marginTop: 0 }}>📊 Proyeksi Skor Ronde Ini</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '10px', background: 'rgba(56,189,248,0.08)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#38BDF8' }}>🔵 Tim A</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: liveCalculation.roundDeltas.team_a >= 0 ? '#34D399' : '#F87171' }}>
                {liveCalculation.roundDeltas.team_a >= 0 ? `+${liveCalculation.roundDeltas.team_a}` : liveCalculation.roundDeltas.team_a} Pts
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Bags Baru: {liveCalculation.newBags.team_a}/10
                {liveCalculation.bagPenaltiesTriggered.team_a && ' ⚠️ Penalti -100!'}
              </div>
            </div>

            <div style={{ padding: '10px', background: 'rgba(244,114,182,0.08)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#F472B6' }}>🔴 Tim B</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 900, color: liveCalculation.roundDeltas.team_b >= 0 ? '#34D399' : '#F87171' }}>
                {liveCalculation.roundDeltas.team_b >= 0 ? `+${liveCalculation.roundDeltas.team_b}` : liveCalculation.roundDeltas.team_b} Pts
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Bags Baru: {liveCalculation.newBags.team_b}/10
                {liveCalculation.bagPenaltiesTriggered.team_b && ' ⚠️ Penalti -100!'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action CTA */}
      {inputPhase === 'bid' ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setInputPhase('won')}
          style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800, marginBottom: '24px' }}
        >
          Lanjut ke Input Hasil Trik (Won) →
        </button>
      ) : (
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={totalWonSum !== 13}
          style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800, marginBottom: '24px' }}
        >
          {totalWonSum === 13 ? `💾 Simpan Ronde ${currentRoundNum}` : `⚠️ Total Won Harus 13 (Saat Ini: ${totalWonSum})`}
        </button>
      )}

      {/* Round Ledger */}
      {rounds.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div className="section-label" style={{ margin: 0 }}>📜 Riwayat Ronde Spades</div>
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
                  <th style={{ padding: '8px', textAlign: 'center' }}>Tim A Pts</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Tim A Bags</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Tim B Pts</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Tim B Bags</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((r, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 800 }}>R{r.round_number || rIdx + 1}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: (r.round_deltas?.team_a || 0) >= 0 ? '#34D399' : '#F87171' }}>
                      {(r.round_deltas?.team_a || 0) >= 0 ? `+${r.round_deltas?.team_a}` : r.round_deltas?.team_a}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#FCD34D' }}>
                      {r.new_bags?.team_a}/10
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: (r.round_deltas?.team_b || 0) >= 0 ? '#34D399' : '#F87171' }}>
                      {(r.round_deltas?.team_b || 0) >= 0 ? `+${r.round_deltas?.team_b}` : r.round_deltas?.team_b}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#FCD34D' }}>
                      {r.new_bags?.team_b}/10
                    </td>
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
        initialGame="spades" 
      />
    </div>
  )
}
