import React, { useState } from 'react'
import { SUITS, calculateTrufRoundScores } from './trufLogic'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { useTranslation } from '../../i18n/I18nContext'
import RoomInviteModal from '../../components/common/RoomInviteModal'

export default function TrufPlay({ 
  session, 
  rounds = [], 
  onSaveRound, 
  onUndoRound, 
  onFinalizeGame,
  onOpenShareModal,
  user,
  onClaimSeat
}) {
  const { t } = useTranslation()
  const playerNames = session?.player_names || ['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4']
  const settings = session?.settings || { multiplier: 1, bid0Bonus: 0, bid13Decision: true }

  const currentRoundNumber = rounds.length + 1
  const firstDealer = session?.first_dealer || 0
  const dealerIndex = (firstDealer + (currentRoundNumber - 1)) % 4

  // Input states for current round
  const [bids, setBids] = useState([0, 0, 0, 0])
  const [wons, setWons] = useState([0, 0, 0, 0])
  const [trufSuit, setTrufSuit] = useState(4) // 4: No Truf
  const [inputPhase, setInputPhase] = useState('bid') // 'bid' | 'won'
  const [forcedPlayMode, setForcedPlayMode] = useState(null)
  const [showBid13Modal, setShowBid13Modal] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const totalBid = bids.reduce((a, b) => a + b, 0)
  const totalWon = wons.reduce((a, b) => a + b, 0)

  // Stepper handlers
  const handleBidStep = (playerIdx, delta) => {
    setErrorMsg('')
    hapticsService.light()
    soundService.playTick()
    setBids(prev => {
      const next = [...prev]
      next[playerIdx] = Math.max(0, Math.min(13, next[playerIdx] + delta))
      return next
    })
  }

  const handleWonStep = (playerIdx, delta) => {
    setErrorMsg('')
    hapticsService.light()
    soundService.playTick()
    setWons(prev => {
      const next = [...prev]
      next[playerIdx] = Math.max(0, Math.min(13, next[playerIdx] + delta))
      return next
    })
  }

  // Handle Proceed to Won Phase
  const handleProceedToWon = () => {
    setErrorMsg('')
    if (settings.bid13Decision && totalBid === 13 && !forcedPlayMode) {
      setShowBid13Modal(true)
      return
    }
    hapticsService.medium()
    soundService.playCardFlip()
    setInputPhase('won')
  }

  // Handle Save Round
  const handleSaveRoundSubmit = async () => {
    setErrorMsg('')
    if (totalWon !== 13) {
      hapticsService.warning()
      setErrorMsg(t('truf.validation_won_13'))
      return
    }

    const calculatedScores = calculateTrufRoundScores(bids, wons, settings, totalBid, forcedPlayMode)
    
    // Compute cumulative scores
    const lastCumulative = [0, 0, 0, 0]
    if (rounds.length > 0) {
      const lastRound = rounds[rounds.length - 1]
      lastRound.player_scores?.forEach(ps => {
        lastCumulative[ps.player_index] = ps.score_cumulative
      })
    }

    const scoreRecords = calculatedScores.map((change, idx) => ({
      player_index: idx,
      stats: { bid: bids[idx], won: wons[idx] },
      score_change: change,
      score_cumulative: lastCumulative[idx] + change
    }))

    hapticsService.success()
    soundService.playVictory()

    try {
      await onSaveRound({
        roundNumber: currentRoundNumber,
        roundData: {
          dealerIndex,
          trufSuit,
          forcedPlayMode,
          totalBid
        },
        playerScores: scoreRecords
      })

      // Reset for next round
      setBids([0, 0, 0, 0])
      setWons([0, 0, 0, 0])
      setTrufSuit(4)
      setInputPhase('bid')
      setForcedPlayMode(null)
      setErrorMsg('')
    } catch (err) {
      console.error('Save round error:', err)
      setErrorMsg('Gagal menyimpan ronde. Silakan coba lagi.')
    }
  }

  // Cumulative Leaderboard
  const latestScores = [0, 0, 0, 0]
  if (rounds.length > 0) {
    const lastRound = rounds[rounds.length - 1]
    lastRound.player_scores?.forEach(ps => {
      latestScores[ps.player_index] = ps.score_cumulative
    })
  }

  const isMainAtas = forcedPlayMode ? forcedPlayMode === 'atas' : totalBid > 13
  const activeSuitObj = SUITS.find(s => s.id === trufSuit)

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Round Header & Status */}
      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
              {session?.title || 'Truf Session'}
            </span>
            <button 
              type="button"
              className="btn btn-sm"
              onClick={() => setIsInviteModalOpen(true)}
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                background: 'rgba(139, 92, 246, 0.15)',
                border: '1px solid rgba(139, 92, 246, 0.35)',
                color: '#C084FC',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>🔗</span>
              <span>{session?.room_code || 'Undang'}</span>
            </button>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
            {t('truf.round', { num: currentRoundNumber })}
          </h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('truf.dealer')}</div>
          <div style={{ fontWeight: 700, color: '#F59E0B' }}>
            🎲 {playerNames[dealerIndex]}
          </div>
        </div>
      </div>

      {/* Input Form Panel */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
              {inputPhase === 'bid' ? t('truf.phase_bid') : t('truf.phase_won')}
            </h3>
            {inputPhase === 'won' && activeSuitObj && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Kembang:</span>
                <span style={{ color: activeSuitObj.color, fontWeight: 800 }}>
                  {activeSuitObj.label} {activeSuitObj.name}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {inputPhase === 'won' && (
              <span style={{
                fontSize: '0.8rem',
                fontWeight: 800,
                padding: '4px 10px',
                borderRadius: '999px',
                background: totalWon === 13 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                color: totalWon === 13 ? '#34D399' : '#F87171',
                border: `1px solid ${totalWon === 13 ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
              }}>
                Trik: {totalWon} / 13 {totalWon === 13 ? '✓' : ''}
              </span>
            )}
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: '999px',
              background: isMainAtas ? 'rgba(59, 130, 246, 0.2)' : 'rgba(249, 115, 22, 0.2)',
              color: isMainAtas ? '#60A5FA' : '#FB923C'
            }}>
              {isMainAtas ? t('truf.main_atas') : t('truf.main_bawah')} ({t('truf.total_bid', { count: totalBid })})
            </span>
          </div>
        </div>

        {errorMsg && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem' }}>
            {errorMsg}
          </div>
        )}

        {/* 4 Player Input Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {playerNames.map((name, idx) => {
            const isDealer = idx === dealerIndex
            const val = inputPhase === 'bid' ? bids[idx] : wons[idx]

            return (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isDealer ? 'rgba(245, 158, 11, 0.08)' : 'rgba(0,0,0,0.25)',
                  border: isDealer ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid var(--border-glass)',
                  padding: '12px 16px',
                  borderRadius: '12px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{name}</span>
                    {isDealer && <span style={{ fontSize: '0.72rem', background: '#F59E0B', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>DEALER</span>}
                  </div>

                  {/* Show Player Bid in Phase 2 */}
                  {inputPhase === 'won' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem' }}>
                      <span style={{ 
                        background: 'rgba(139, 92, 246, 0.2)', 
                        color: '#C084FC', 
                        padding: '1px 7px', 
                        borderRadius: '6px', 
                        fontWeight: 700 
                      }}>
                        Target Bid: {bids[idx]}
                      </span>
                      {wons[idx] === bids[idx] ? (
                        <span style={{ color: '#34D399', fontWeight: 700 }}>✓ Pas</span>
                      ) : wons[idx] < bids[idx] ? (
                        <span style={{ color: '#F87171', fontWeight: 600 }}>Kurang {bids[idx] - wons[idx]}</span>
                      ) : (
                        <span style={{ color: '#FB923C', fontWeight: 600 }}>Lebih +{wons[idx] - bids[idx]}</span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    style={{ width: '36px', height: '36px', padding: 0, fontSize: '1.2rem' }}
                    onClick={() => inputPhase === 'bid' ? handleBidStep(idx, -1) : handleWonStep(idx, -1)}
                  >
                    -
                  </button>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, width: '30px', textAlign: 'center' }}>
                    {val}
                  </span>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    style={{ width: '36px', height: '36px', padding: 0, fontSize: '1.2rem' }}
                    onClick={() => inputPhase === 'bid' ? handleBidStep(idx, 1) : handleWonStep(idx, 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Suit Selector (In Bid Phase) */}
        {inputPhase === 'bid' && (
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">{t('truf.truf_suit')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
              {SUITS.map(suit => (
                <button
                  key={suit.id}
                  type="button"
                  onClick={() => { hapticsService.light(); setTrufSuit(suit.id) }}
                  style={{
                    background: trufSuit === suit.id ? 'var(--primary)' : 'var(--bg-glass-strong)',
                    color: trufSuit === suit.id ? '#FFF' : suit.color,
                    border: '1px solid var(--border-glass)',
                    borderRadius: '10px',
                    padding: '10px 4px',
                    fontSize: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                >
                  <span>{suit.label}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{suit.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phase Buttons */}
        {inputPhase === 'bid' ? (
          <button className="btn btn-primary btn-block" onClick={handleProceedToWon}>
            ➡️ {t('truf.save_bid')}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={() => setInputPhase('bid')}>
              ← Ubah Bid
            </button>
            <button 
              className={`btn ${totalWon === 13 ? 'btn-success' : 'btn-secondary'}`} 
              style={{ flex: 1, fontWeight: 800 }} 
              onClick={handleSaveRoundSubmit}
            >
              {totalWon === 13 ? `💾 ${t('truf.save_round')} & Lanjut` : `⚠️ Trik: ${totalWon} / 13 (Harus 13)`}
            </button>
          </div>
        )}
      </div>

      {/* Leaderboard & Ledger Table */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>📊 {t('truf.leaderboard')}</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {rounds.length > 0 && onUndoRound && (
              <button className="btn btn-danger btn-sm" onClick={onUndoRound}>
                ↩️ Undo
              </button>
            )}
            {onOpenShareModal && rounds.length > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={onOpenShareModal}>
                📸 9:16 Share
              </button>
            )}
            {onFinalizeGame && rounds.length > 0 && (
              <button className="btn btn-primary btn-sm" onClick={onFinalizeGame}>
                🏁 Selesai
              </button>
            )}
          </div>
        </div>

        {/* Scoreboard Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Pemain</th>
                <th style={{ padding: '8px' }}>Skor Total</th>
                {rounds.map((r, i) => (
                  <th key={i} style={{ padding: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    R{r.round_number}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {playerNames.map((name, idx) => {
                const total = latestScores[idx] || 0
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700 }}>{name}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 800, color: total >= 0 ? '#34D399' : '#F87171' }}>
                      {total > 0 ? `+${total}` : total}
                    </td>
                    {rounds.map((r, rIdx) => {
                      const ps = r.player_scores?.find(p => p.player_index === idx)
                      const change = ps?.score_change || 0
                      return (
                        <td key={rIdx} style={{ padding: '8px', fontSize: '0.82rem', color: change >= 0 ? '#38BDF8' : '#F87171' }}>
                          {change > 0 ? `+${change}` : change}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bid 13 Modal */}
      {showBid13Modal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '10px', color: '#F59E0B' }}>
              ⚠️ {t('truf.bid13_modal_title')}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
              {t('truf.bid13_modal_desc', { name: playerNames[dealerIndex] })}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                className="btn btn-primary btn-block"
                onClick={() => {
                  setForcedPlayMode('atas')
                  setShowBid13Modal(false)
                  setInputPhase('won')
                }}
              >
                🔥 {t('truf.force_atas')}
              </button>
              <button 
                className="btn btn-secondary btn-block"
                onClick={() => {
                  setForcedPlayMode('bawah')
                  setShowBid13Modal(false)
                  setInputPhase('won')
                }}
              >
                🛡️ {t('truf.force_bawah')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Room Invite & Multiplayer Seat Claim Modal */}
      <RoomInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        session={session}
        user={user}
        onClaimSeat={onClaimSeat}
      />
    </div>
  )
}
