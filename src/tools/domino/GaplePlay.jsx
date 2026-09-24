import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { calculateGapleRound, GAPLE_END_TYPES, GAPLE_TEAM_MODES } from './dominoLogic'
import { gameService } from '../../services/gameService'
import { deviceService } from '../../services/deviceService'
import RoomInviteModal from '../../components/common/RoomInviteModal'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

export default function GaplePlay({
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
                 (session?.id?.startsWith('guest-session') && deviceService.getSessionSeat(session.id) === 0)

  let effectiveSeat = propMyPlayerIndex !== undefined ? propMyPlayerIndex : null
  if (effectiveSeat === null) {
    const localSeat = deviceService.getSessionSeat(session?.id)
    if (localSeat !== null && localSeat !== undefined) {
      effectiveSeat = localSeat
    } else {
      const seatInSession = livePlayerUserIds?.findIndex(id => id && (id === currentClientId || (user?.id && id === user.id)))
      if (seatInSession !== -1 && seatInSession !== undefined) {
        effectiveSeat = seatInSession
      }
    }
  }

  const myPlayerIndex = effectiveSeat
  const isSpectator = myPlayerIndex === null

  // Scorer role state (defaults to Player 0 / Host)
  const [scorerIndex, setScorerIndex] = useState(session?.settings?.scorerIndex ?? 0)

  const isScorer = isLocalOrOffline ? true : myPlayerIndex === scorerIndex
  const canChangeScorer = isLocalOrOffline || isHost || isScorer

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
            for (let i = 0; i < updated.length; i++) {
              if (i !== seatPayload.playerIndex && updated[i] === seatPayload.clientId) {
                updated[i] = null
              }
            }
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
      {/* Spectator Live Banner */}
      {isSpectator && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.15), rgba(16, 185, 129, 0.15))',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#7DD3FC',
          fontSize: '0.85rem'
        }}>
          <span style={{ fontSize: '1.2rem' }}>👀</span>
          <span><strong>Mode Penonton (Live Spectator)</strong> • Memantau papan Domino Gaple secara realtime</span>
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
              {session?.title || 'Domino Gaple'}
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
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38BDF8',
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
              style={{ color: '#38BDF8', borderColor: 'rgba(56, 189, 248, 0.4)', fontSize: '0.72rem', padding: '3px 7px' }}
              title="Aturan Permainan Domino Gaple"
            >
              <span>📖</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#38BDF8', margin: 0 }}>
            {t('remi_jawa.round', { num: currentRoundNum }) || `Ronde ${currentRoundNum}`}
          </h2>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)' }}>
            Batas Denda: {settings.penaltyThreshold || 100} Pts
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

      {/* Inputs (Gated to Scorer) */}
      {!isScorer ? (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          ⏳ Ronde {currentRoundNum} sedang dimainkan. Papan skor akan ter-update otomatis saat Pencatat Skor (📝 {players[effectiveScorerIndex] || 'Scorer'}) menyimpan ronde.
        </div>
      ) : (
        <>
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
        </>
      )}

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
              Pencatat skor bertugas memasukkan hasil ronde dan denda ke papan skor.
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
