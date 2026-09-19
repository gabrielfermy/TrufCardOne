import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { calculateSpadesRound, SPADES_MODES } from './spadesLogic'
import { gameService } from '../../services/gameService'
import { deviceService } from '../../services/deviceService'
import RoomInviteModal from '../../components/common/RoomInviteModal'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

export default function SpadesPlay({
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
  const canEditPlayer = (idx) => isScorer || myPlayerIndex === idx || (isHost && !livePlayerUserIds?.[idx])

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
      {/* Spectator Live Banner */}
      {isSpectator && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.15), rgba(56, 189, 248, 0.15))',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#C084FC',
          fontSize: '0.85rem'
        }}>
          <span style={{ fontSize: '1.2rem' }}>👀</span>
          <span><strong>Mode Penonton (Live Spectator)</strong> • Memantau papan Spades secara realtime</span>
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
              {session?.title || 'Spades'}
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
                background: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.4)',
                color: '#C084FC',
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
              style={{ color: '#A855F7', borderColor: 'rgba(168, 85, 247, 0.4)', fontSize: '0.72rem', padding: '3px 7px' }}
              title="Aturan Permainan Spades"
            >
              <span>📖</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#A855F7', margin: 0 }}>
            {t('remi_jawa.round', { num: currentRoundNum }) || `Ronde ${currentRoundNum}`}
          </h2>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
            Target: {settings.targetScore || 500} Pts
          </span>
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
          const canEditThis = canEditPlayer(idx)

          return (
            <div
              key={p.id}
              className="glass-panel"
              style={{
                padding: '16px',
                opacity: canEditThis ? 1 : 0.75,
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
                      disabled={!canEditThis}
                      className={`btn btn-sm ${p.isNil ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => handleToggleNil(idx, 'nil')}
                      style={{ flex: 1, fontSize: '0.72rem', padding: '4px' }}
                    >
                      Nil (0)
                    </button>
                    <button
                      type="button"
                      disabled={!canEditThis}
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
                          disabled={!canEditThis}
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
                      disabled={!canEditThis}
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
                      disabled={!canEditThis}
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

      {/* Action CTA (Gated to Scorer for saving) */}
      {inputPhase === 'bid' ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setInputPhase('won')}
          style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800, marginBottom: '24px' }}
        >
          Lanjut ke Input Hasil Trik (Won) →
        </button>
      ) : isScorer ? (
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={totalWonSum !== 13}
          style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800, marginBottom: '24px' }}
        >
          {totalWonSum === 13 ? `💾 Simpan Ronde ${currentRoundNum}` : `⚠️ Total Won Harus 13 (Saat Ini: ${totalWonSum})`}
        </button>
      ) : (
        <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          ⏳ Hanya Pencatat Skor (📝 {players[effectiveScorerIndex] || 'Scorer'}) yang dapat menyimpan ronde ini.
        </div>
      )}

      {/* Round Ledger */}
      {rounds.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div className="section-label" style={{ margin: 0 }}>📜 Riwayat Ronde Spades</div>
            {isHost && onUndoRound && (
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
              Pencatat skor bertugas memasukkan bid & trik lalu menyimpannya ke papan skor.
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
        initialGame="spades" 
      />
    </div>
  )
}
