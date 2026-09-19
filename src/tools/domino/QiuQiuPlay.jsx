import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { calculateQiuQiuRound, QIUQIU_SPECIAL_HANDS } from './dominoLogic'
import { gameService } from '../../services/gameService'
import { deviceService } from '../../services/deviceService'
import RoomInviteModal from '../../components/common/RoomInviteModal'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

export default function QiuQiuPlay({
  session,
  onSaveRound,
  onUndoRound,
  onFinishGame,
  onShareStory,
  onBackToHub,
  user,
  onClaimSeat,
  onReleaseSeat,
  myPlayerIndex: propMyPlayerIndex
}) {
  const { t } = useTranslation()
  const [isRulesOpen, setIsRulesOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [showTransferScorerModal, setShowTransferScorerModal] = useState(false)

  const players = session?.player_names || ['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4']
  const rounds = session?.game_rounds || session?.rounds || []
  const currentRoundNum = rounds.length + 1

  // Reactive live seat claims state to guarantee immediate re-rendering across screens
  const [livePlayerUserIds, setLivePlayerUserIds] = useState(() => session?.player_user_ids || Array(players.length).fill(null))

  useEffect(() => {
    if (session?.player_user_ids) {
      setLivePlayerUserIds(session.player_user_ids)
    }
  }, [session?.player_user_ids])

  // Determine user role and claimed seat index
  const currentClientId = deviceService.getClientIdentifier(user)
  const isLocalOrOffline = !session?.room_code || session?.settings?.isOfflineLocal || !session?.id || session.id.startsWith('guest-session') || session.id.startsWith('local-session')
  const isHost = isLocalOrOffline ||
                 session?.user_id === user?.id || 
                 livePlayerUserIds?.[0] === currentClientId || 
                 propMyPlayerIndex === 0 ||
                 (session?.id?.startsWith('guest-session') && deviceService.getSessionSeat(session.id) === 0)

  let effectiveSeat = propMyPlayerIndex !== undefined ? propMyPlayerIndex : null
  if (effectiveSeat === null) {
    const seatInSession = livePlayerUserIds?.findIndex(id => id && (id === currentClientId || (user?.id && id === user.id)))
    if (seatInSession !== -1 && seatInSession !== undefined) {
      effectiveSeat = seatInSession
    } else {
      const localSeat = deviceService.getSessionSeat(session?.id)
      if (localSeat !== null) effectiveSeat = localSeat
      else if (isHost) effectiveSeat = 0
    }
  }

  const myPlayerIndex = effectiveSeat
  const isSpectator = myPlayerIndex === null && !isHost

  // Scorer role state (defaults to Player 0 / Host)
  const [scorerIndex, setScorerIndex] = useState(session?.settings?.scorerIndex ?? 0)

  // Helper to determine automatic Scorer fallback if current scorer goes offline / stands up
  const computeFallbackScorer = (currentScorer, liveIds) => {
    if (liveIds && liveIds[currentScorer]) return currentScorer
    if (liveIds && liveIds[0]) return 0
    const firstOnline = liveIds ? liveIds.findIndex(id => Boolean(id)) : -1
    if (firstOnline !== -1) return firstOnline
    return 0
  }

  const effectiveScorerIndex = isLocalOrOffline ? scorerIndex : computeFallbackScorer(scorerIndex, livePlayerUserIds)
  const isScorer = isLocalOrOffline || myPlayerIndex === effectiveScorerIndex || (isHost && effectiveScorerIndex === null)
  const canChangeScorer = isLocalOrOffline || isHost || myPlayerIndex === effectiveScorerIndex

  // Realtime Live Room listener
  useEffect(() => {
    if (!session?.id || session.id.startsWith('guest-session') || session.id.startsWith('local-session')) return

    const channel = gameService.subscribeToLiveRoom(session.id, {
      onSeatClaim: (seatPayload) => {
        if (seatPayload?.playerIndex !== undefined) {
          const isRelease = !!seatPayload.isRelease
          const currentArr = [...(session?.player_user_ids || livePlayerUserIds || Array(players.length).fill(null))]
          const updated = [...currentArr]
          if (isRelease) {
            updated[seatPayload.playerIndex] = null
          } else if (seatPayload.clientId) {
            updated[seatPayload.playerIndex] = seatPayload.clientId
          }

          setLivePlayerUserIds(updated)
          if (session) session.player_user_ids = updated

          if (isHost && session?.id) {
            gameService.updateSessionPlayerUserIds(session.id, updated)
          }
        }
      },
      onDbUpdate: async () => {
        const refreshed = await gameService.getSession(session.id)
        if (refreshed?.player_user_ids) {
          setLivePlayerUserIds(refreshed.player_user_ids)
          if (session) session.player_user_ids = refreshed.player_user_ids
        }
      }
    })

    const pollInterval = setInterval(async () => {
      try {
        const refreshed = await gameService.getSession(session.id)
        if (refreshed?.player_user_ids) {
          setLivePlayerUserIds(prev => {
            const merged = [...(prev || Array(players.length).fill(null))]
            refreshed.player_user_ids.forEach((id, idx) => {
              if (id) merged[idx] = id
            })
            if (session) session.player_user_ids = merged
            return merged
          })
        }
      } catch (err) {
        // silent catch
      }
    }, 2500)

    return () => {
      clearInterval(pollInterval)
      gameService.unsubscribeFromLiveRoom(channel, session.id)
    }
  }, [session?.id, isHost, players.length])

  // Announce seat presence on mount / seat claim to ensure immediate tabletop sync
  useEffect(() => {
    if (myPlayerIndex !== null && session?.id && !isLocalOrOffline) {
      gameService.claimSeat(session.id, myPlayerIndex, currentClientId, players[myPlayerIndex])
    }
  }, [session?.id, myPlayerIndex, isLocalOrOffline])

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
      {/* Spectator Live Banner */}
      {isSpectator && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.15), rgba(245, 158, 11, 0.15))',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#6EE7B7',
          fontSize: '0.85rem'
        }}>
          <span style={{ fontSize: '1.2rem' }}>👀</span>
          <span><strong>Mode Penonton (Live Spectator)</strong> • Memantau ronde QiuQiu secara realtime</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel" style={{ padding: '10px 12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
            {onBackToHub && (
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={onBackToHub}
                style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}
                title="Kembali ke Hub"
              >
                ← Hub
              </button>
            )}
            <span style={{
              fontSize: '0.76rem',
              color: 'var(--text-dim)',
              fontWeight: 700,
              textTransform: 'uppercase',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {session?.title || 'Domino QiuQiu'}
            </span>

            {/* Role Badge */}
            <span style={{
              fontSize: '0.68rem',
              padding: '2px 6px',
              borderRadius: '5px',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              background: isHost ? 'var(--badge-gold-bg)' : isSpectator ? 'var(--badge-blue-bg)' : 'var(--badge-purple-bg)',
              color: isHost ? 'var(--badge-gold-text)' : isSpectator ? 'var(--badge-blue-text)' : 'var(--badge-purple-text)',
              border: `1px solid ${isHost ? 'var(--badge-gold-border)' : isSpectator ? 'var(--badge-blue-border)' : 'var(--badge-purple-border)'}`
            }}>
              {isHost ? '👑 Host' : isSpectator ? '👀 Penonton' : `🪑 P${(myPlayerIndex ?? 0) + 1}`}
            </span>

            {/* Scorer Badge */}
            <span style={{
              fontSize: '0.68rem',
              padding: '2px 6px',
              borderRadius: '5px',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38BDF8',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>📝 Pencatat: {players[effectiveScorerIndex] || `P${effectiveScorerIndex + 1}`}</span>
              {canChangeScorer && (
                <button
                  type="button"
                  onClick={() => setShowTransferScorerModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38BDF8',
                    cursor: 'pointer',
                    padding: '0 2px',
                    fontSize: '0.75rem',
                    fontWeight: 900
                  }}
                  title="Ganti Pencatat Skor"
                >
                  ⇄
                </button>
              )}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {myPlayerIndex !== null && onReleaseSeat && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => {
                  if (window.confirm('Apakah Anda yakin ingin berdiri dan melepaskan kursi?')) {
                    onReleaseSeat(myPlayerIndex)
                    setLivePlayerUserIds(prev => {
                      const next = [...(prev || [])]
                      next[myPlayerIndex] = null
                      return next
                    })
                  }
                }}
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  color: '#F87171',
                  borderColor: 'rgba(239, 68, 68, 0.4)'
                }}
                title="Berdiri dari Kursi"
              >
                🚶 Berdiri
              </button>
            )}

            <button 
              type="button"
              className="btn btn-sm"
              onClick={() => setIsInviteModalOpen(true)}
              style={{
                fontSize: '0.72rem',
                padding: '3px 7px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10B981',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title="Undang Teman & Kode Room"
            >
              <span>🔗</span>
              <span>{session?.room_code || 'Undang'}</span>
            </button>

            <button 
              type="button" 
              className="btn btn-sm btn-secondary"
              onClick={() => setIsRulesOpen(true)}
              style={{ color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.4)', fontSize: '0.72rem', padding: '3px 7px' }}
              title="Aturan Permainan Domino QiuQiu"
            >
              <span>📖</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#10B981', margin: 0 }}>
            {t('remi_jawa.round', { num: currentRoundNum }) || `Ronde ${currentRoundNum}`}
          </h2>
        </div>
      </div>

      {/* Online / Offline Presence Roster Bar */}
      <div className="glass-panel" style={{ padding: '8px 12px', marginBottom: '14px', display: 'flex', gap: '8px', overflowX: 'auto', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Meja:
        </span>
        {players.map((name, idx) => {
          const isOccupied = Boolean(livePlayerUserIds && livePlayerUserIds[idx])
          const isMySeat = myPlayerIndex === idx
          const isSeatScorer = effectiveScorerIndex === idx

          return (
            <div
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                background: isMySeat 
                  ? 'rgba(168, 85, 247, 0.2)' 
                  : isOccupied 
                  ? 'rgba(52, 211, 153, 0.15)' 
                  : 'rgba(255, 255, 255, 0.05)',
                border: isMySeat 
                  ? '1px solid rgba(168, 85, 247, 0.5)' 
                  : isOccupied 
                  ? '1px solid rgba(52, 211, 153, 0.4)' 
                  : '1px dashed var(--border-glass)',
                color: isOccupied ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              <span>{isOccupied ? '🟢' : '⚪'}</span>
              <span>{name}</span>
              {isSeatScorer && <span title="Pencatat Skor">📝</span>}
              {isMySeat && <span style={{ fontSize: '0.65rem', color: '#C084FC' }}>(Anda)</span>}
              {!isOccupied && isSpectator && onClaimSeat && (
                <button
                  type="button"
                  onClick={() => {
                    onClaimSeat(idx)
                    setLivePlayerUserIds(prev => {
                      const next = [...(prev || [])]
                      next[idx] = currentClientId
                      return next
                    })
                  }}
                  style={{
                    background: 'var(--primary)',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    padding: '1px 5px',
                    marginLeft: '2px',
                    cursor: 'pointer',
                    fontWeight: 800
                  }}
                >
                  Duduki
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Dealer Selector & Inputs (Gated to Scorer) */}
      {!isScorer ? (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          ⏳ Ronde {currentRoundNum} sedang dimainkan. Papan skor akan ter-update otomatis saat Pencatat Skor (📝 {players[effectiveScorerIndex] || 'Scorer'}) menyimpan ronde.
        </div>
      ) : (
        <>
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
        </>
      )}

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
        {isHost && onFinishGame && (
          <button className="btn btn-danger" onClick={onFinishGame}>
            🏁 Selesaikan Permainan
          </button>
        )}
      </div>

      {/* Transfer Scorer Modal */}
      {showTransferScorerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '360px', width: '100%', padding: '20px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800 }}>
              📝 Pilih Pencatat Skor (Scorer)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Pencatat skor bertugas memasukkan taruhan & nilai kartu lalu menyimpannya ke papan skor.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {players.map((name, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`btn ${effectiveScorerIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setScorerIndex(idx)
                    setShowTransferScorerModal(false)
                  }}
                  style={{ justifyContent: 'space-between', padding: '10px 14px', fontSize: '0.9rem' }}
                >
                  <span>{name} {livePlayerUserIds?.[idx] ? '🟢' : '⚪'}</span>
                  {effectiveScorerIndex === idx && <span>✓ Aktif</span>}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={() => setShowTransferScorerModal(false)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Room Invite Modal */}
      <RoomInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        session={session}
        user={user}
        onClaimSeat={onClaimSeat}
        onReleaseSeat={onReleaseSeat}
        myPlayerIndex={myPlayerIndex}
      />

      <CardGameRulesModal 
        isOpen={isRulesOpen} 
        onClose={() => setIsRulesOpen(false)} 
        initialGame="domino" 
      />
    </div>
  )
}
