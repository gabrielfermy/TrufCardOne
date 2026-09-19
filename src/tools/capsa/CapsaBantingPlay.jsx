import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { calculateCapsaBantingRound } from './capsaLogic'
import { gameService } from '../../services/gameService'
import { deviceService } from '../../services/deviceService'
import RoomInviteModal from '../../components/common/RoomInviteModal'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

export default function CapsaBantingPlay({
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
  const settings = session?.settings || { doubleAt10: true, tripleAt13: true, twoCardPenalty: 2, bomPenalty: 5 }
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
          setLivePlayerUserIds(prev => {
            const next = [...(prev || Array(players.length).fill(null))]
            if (isRelease) {
              next[seatPayload.playerIndex] = null
            } else if (seatPayload.clientId) {
              next[seatPayload.playerIndex] = seatPayload.clientId
            }
            if (session) session.player_user_ids = next
            return next
          })

          if (isHost && session.id) {
            const currentArr = session?.player_user_ids || Array(players.length).fill(null)
            const updated = [...currentArr]
            if (isRelease) {
              updated[seatPayload.playerIndex] = null
            } else if (seatPayload.clientId) {
              updated[seatPayload.playerIndex] = seatPayload.clientId
            }
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
          setLivePlayerUserIds(refreshed.player_user_ids)
          if (session) session.player_user_ids = refreshed.player_user_ids
        }
      } catch (err) {
        // silent catch
      }
    }, 4000)

    return () => {
      clearInterval(pollInterval)
      gameService.unsubscribeFromLiveRoom(channel, session.id)
    }
  }, [session?.id, isHost, players.length])

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
      {/* Spectator Live Banner */}
      {isSpectator && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(249, 115, 22, 0.15), rgba(234, 179, 8, 0.15))',
          border: '1px solid rgba(249, 115, 22, 0.35)',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#FDBA74',
          fontSize: '0.85rem'
        }}>
          <span style={{ fontSize: '1.2rem' }}>👀</span>
          <span><strong>Mode Penonton (Live Spectator)</strong> • Memantau papan Capsa Banting secara realtime</span>
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
              {session?.title || 'Capsa Banting'}
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
                background: 'rgba(249, 115, 22, 0.15)',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                color: '#FB923C',
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
              style={{ color: '#F97316', borderColor: 'rgba(249, 115, 22, 0.4)', fontSize: '0.72rem', padding: '3px 7px' }}
              title="Aturan Permainan Capsa"
            >
              <span>📖</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#F97316', margin: 0 }}>
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

      {/* Winner & Hand Inputs (Gated to Scorer) */}
      {!isScorer ? (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          ⏳ Ronde {currentRoundNum} sedang dimainkan. Papan skor akan ter-update otomatis saat Pencatat Skor (📝 {players[effectiveScorerIndex] || 'Scorer'}) menyimpan ronde.
        </div>
      ) : (
        <>
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
        </>
      )}

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
              Pencatat skor bertugas memasukkan kartu sisa pemain dan menyimpannya ke papan skor.
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
        initialGame="capsa" 
      />
    </div>
  )
}
