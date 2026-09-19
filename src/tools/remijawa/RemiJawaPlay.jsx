import React, { useState, useEffect, useRef } from 'react'
import {
  REMI_JAWA_POINTS,
  DEFAULT_DEALER_WORD,
  calculatePlayerScoreBreakdown,
  calculateRemiJawaRoundScores,
  determineRemiJawaNextDealer,
  getRemiJawaDealerStreak,
  formatDealerStreakStatus,
  checkRemiJawaGameOver
} from './remiJawaLogic'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { gameService } from '../../services/gameService'
import { deviceService } from '../../services/deviceService'
import { useTranslation } from '../../i18n/I18nContext'
import RoomInviteModal from '../../components/common/RoomInviteModal'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

const createInitialPlayerData = () => ({
  jadiAngka: 0,
  jadiGambar: 0,
  jadiAs: 0,
  matiAngka: 0,
  matiGambar: 0,
  matiAs: 0,
  matiJoker: 0
})

export default function RemiJawaPlay({
  session,
  rounds = [],
  onSaveRound,
  onUndoRound,
  onFinalizeGame,
  onOpenShareModal,
  onBackToLobby,
  user,
  onClaimSeat,
  onReleaseSeat,
  myPlayerIndex: propMyPlayerIndex
}) {
  const { t } = useTranslation()
  const playerNames = session?.player_names || ['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4']
  const firstDealer = session?.settings?.firstDealer ?? session?.settings?.first_dealer ?? 0
  const targetWin = session?.settings?.targetWin || 0
  const streakLimit = session?.settings?.streakLimit !== undefined ? session?.settings?.streakLimit : 10
  const streakWord = session?.settings?.streakWord || DEFAULT_DEALER_WORD
  const streakDisplayMode = session?.settings?.streakDisplayMode || 'word'

  const clientId = useRef(`peer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`).current
  const realtimeChannelRef = useRef(null)

  // Reactive live seat claims state to guarantee immediate re-rendering across screens
  const [livePlayerUserIds, setLivePlayerUserIds] = useState(() => session?.player_user_ids || Array(playerNames.length).fill(null))

  useEffect(() => {
    if (session?.player_user_ids) {
      setLivePlayerUserIds(session.player_user_ids)
    }
  }, [session?.player_user_ids])

  // Seat & Role determination
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
  const [showTransferScorerModal, setShowTransferScorerModal] = useState(false)
  const isScorer = isLocalOrOffline || myPlayerIndex === scorerIndex
  const canChangeScorer = isLocalOrOffline || isHost || myPlayerIndex === scorerIndex
  const canEditPlayer = (idx) => isScorer || myPlayerIndex === idx || (isHost && !livePlayerUserIds?.[idx])

  const computeFallbackScorer = (playerUserIds = [], currentScorer = 0) => {
    if (playerUserIds && playerUserIds[currentScorer]) return currentScorer
    if (playerUserIds && playerUserIds[0]) return 0
    const firstOnline = playerUserIds ? playerUserIds.findIndex(id => Boolean(id)) : -1
    if (firstOnline !== -1) return firstOnline
    return 0
  }

  const [localRounds, setLocalRounds] = useState(rounds || [])

  useEffect(() => {
    if (rounds && rounds.length >= localRounds.length) {
      setLocalRounds(rounds)
    }
  }, [rounds])

  const currentRoundNumber = localRounds.length + 1

  // Compute Current Dealer & Streak
  const currentDealer = determineRemiJawaNextDealer(localRounds, firstDealer, playerNames.length)
  const dealerStreak = getRemiJawaDealerStreak(localRounds, currentDealer, firstDealer) + 1
  const streakStatus = formatDealerStreakStatus(dealerStreak, streakWord, streakDisplayMode)

  // Round Input State
  const [closerIndex, setCloserIndex] = useState(0)
  const [isDeckEmpty, setIsDeckEmpty] = useState(false)
  const [closeType, setCloseType] = useState('atas') // 'atas' | 'bawah'
  const [closeSpecialCard, setCloseSpecialCard] = useState('biasa') // 'biasa' | 'as' | 'joker'
  const [playersInput, setPlayersInput] = useState(() => Array.from({ length: playerNames.length }, createInitialPlayerData))
  const [expandedPlayerCard, setExpandedPlayerCard] = useState(0)

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false)

  // Compute latest cumulative scores
  const cumulativeScores = Array(playerNames.length).fill(0)
  localRounds.forEach(r => {
    r.player_scores?.forEach(ps => {
      const pIdx = ps.player_index ?? ps.playerIndex ?? 0
      if (pIdx < cumulativeScores.length) {
        cumulativeScores[pIdx] += (ps.score_change ?? ps.scoreChange ?? 0)
      }
    })
  })

  // Live Round Scores Preview
  const liveRoundScores = calculateRemiJawaRoundScores({
    playersData: playersInput,
    closerIndex,
    closeType,
    closeSpecialCard,
    isDeckEmpty
  })

  // Broadcast Helper for Realtime Room Sync
  const broadcastState = (overrides = {}) => {
    if (!realtimeChannelRef.current) return
    gameService.broadcastLiveState(realtimeChannelRef.current, {
      senderId: clientId,
      closerIndex,
      isDeckEmpty,
      closeType,
      closeSpecialCard,
      playersInput,
      scorerIndex,
      ...overrides
    })
  }

  // Scorer transfer & takeover handlers
  const handleTransferScorer = (newIdx) => {
    if (!canChangeScorer) {
      alert('Hanya Pembuat Game (Host) atau Pencatat Skor aktif yang berwenang mengganti Scorer.')
      return
    }
    if (newIdx < 0 || newIdx >= playerNames.length) return
    try { hapticsService.medium() } catch {}
    setScorerIndex(newIdx)
    broadcastState({ scorerIndex: newIdx })
    setShowTransferScorerModal(false)
    if (isHost && session?.id) {
      gameService.updateSessionSettings(session.id, { ...(session.settings || {}), scorerIndex: newIdx })
    }
  }

  const handleTakeOverScorer = () => {
    if (!isHost) return
    handleTransferScorer(myPlayerIndex ?? 0)
  }

  const handleStandUpSelf = async () => {
    if (myPlayerIndex === null) return
    const conf = window.confirm(`Apakah Anda yakin ingin berdiri dan mengosongkan Kursi ${myPlayerIndex + 1}?`)
    if (!conf) return
    try {
      if (onReleaseSeat) {
        await onReleaseSeat(session?.id, myPlayerIndex)
      } else {
        await gameService.releaseSeat(session?.id, myPlayerIndex, currentClientId)
      }
      deviceService.clearSessionSeat(session?.id)
      hapticsService.medium()
    } catch (err) {
      console.error('Failed to stand up:', err)
    }
  }

  const handleClaimSeatDirect = async (seatIdx) => {
    if (seatIdx < 0 || seatIdx >= playerNames.length) return
    try {
      if (onClaimSeat) {
        await onClaimSeat(session?.id, seatIdx, playerNames[seatIdx])
      } else {
        await gameService.claimSeat(session?.id, seatIdx, currentClientId, playerNames[seatIdx])
      }
      hapticsService.success()
    } catch (err) {
      console.error('Failed to claim seat:', err)
    }
  }

  // Subscribe to Live Room
  useEffect(() => {
    if (!session?.id || session.id.startsWith('guest-session')) return

    const channel = gameService.subscribeToLiveRoom(session.id, {
      onLiveState: (payload) => {
        if (payload?.senderId && payload.senderId !== clientId) {
          if (payload.closerIndex !== undefined) setCloserIndex(payload.closerIndex)
          if (payload.isDeckEmpty !== undefined) setIsDeckEmpty(payload.isDeckEmpty)
          if (payload.closeType !== undefined) setCloseType(payload.closeType)
          if (payload.closeSpecialCard !== undefined) setCloseSpecialCard(payload.closeSpecialCard)
          if (Array.isArray(payload.playersInput)) setPlayersInput(payload.playersInput)
          if (payload.scorerIndex !== undefined) setScorerIndex(payload.scorerIndex)
        }
      },
      onSeatClaim: (seatPayload) => {
        if (seatPayload?.playerIndex !== undefined) {
          const isRelease = !!seatPayload.isRelease
          const currentArr = [...(session?.player_user_ids || livePlayerUserIds || Array(playerNames.length).fill(null))]
          const updatedIds = [...currentArr]
          if (isRelease) {
            updatedIds[seatPayload.playerIndex] = null
          } else if (seatPayload.clientId) {
            updatedIds[seatPayload.playerIndex] = seatPayload.clientId
          }

          setLivePlayerUserIds(updatedIds)
          if (session) session.player_user_ids = updatedIds

          if (isRelease && seatPayload.playerIndex === scorerIndex) {
            const fallbackIdx = computeFallbackScorer(updatedIds, scorerIndex)
            setScorerIndex(fallbackIdx)
            if (isHost && session.id) {
              broadcastState({ scorerIndex: fallbackIdx })
              gameService.updateSessionSettings(session.id, { ...(session.settings || {}), scorerIndex: fallbackIdx })
            }
          }

          if (isHost && session.id) {
            gameService.updateSessionPlayerUserIds(session.id, updatedIds)
          }
        }
      },
      onRoundAdvance: (payload) => {
        if (payload?.round) {
          setLocalRounds(prev => {
            const exists = prev.some(r => r.id === payload.round.id || r.round_number === payload.round.round_number)
            if (exists) return prev
            const nextList = [...prev, payload.round]
            return nextList
          })
          setPlayersInput(Array.from({ length: playerNames.length }, createInitialPlayerData))
          setIsDeckEmpty(false)
          setCloseType('atas')
          setCloseSpecialCard('biasa')
        }
      },
      onRoundSaved: (payload) => {
        if (payload?.round) {
          setLocalRounds(prev => {
            const exists = prev.some(r => r.id === payload.round.id || r.round_number === payload.round.round_number)
            if (exists) return prev
            const nextList = [...prev, payload.round]
            return nextList
          })
          setPlayersInput(Array.from({ length: playerNames.length }, createInitialPlayerData))
        }
      },
      onDbUpdate: async () => {
        const refreshed = await gameService.getSession(session.id)
        if (refreshed?.player_user_ids) {
          session.player_user_ids = refreshed.player_user_ids
          setLivePlayerUserIds(refreshed.player_user_ids)
          if (!refreshed.player_user_ids[scorerIndex] && !isLocalOrOffline) {
            const fallbackIdx = computeFallbackScorer(refreshed.player_user_ids, scorerIndex)
            if (fallbackIdx !== scorerIndex) {
              setScorerIndex(fallbackIdx)
              if (isHost && session.id) {
                broadcastState({ scorerIndex: fallbackIdx })
                gameService.updateSessionSettings(session.id, { ...(session.settings || {}), scorerIndex: fallbackIdx })
              }
            }
          }
        }
        if (refreshed?.settings?.scorerIndex !== undefined && refreshed.settings.scorerIndex !== scorerIndex) {
          setScorerIndex(refreshed.settings.scorerIndex)
        }
        if (refreshed?.game_rounds && refreshed.game_rounds.length >= localRounds.length) {
          setLocalRounds(refreshed.game_rounds)
        }
      }
    })

    realtimeChannelRef.current = channel

    // Polling fallback
    const pollInterval = setInterval(async () => {
      try {
        const refreshed = await gameService.getSession(session.id)
        if (refreshed?.player_user_ids) {
          setLivePlayerUserIds(prev => {
            const merged = [...(prev || Array(playerNames.length).fill(null))]
            refreshed.player_user_ids.forEach((id, idx) => {
              if (id) merged[idx] = id
            })
            if (session) session.player_user_ids = merged
            return merged
          })
          if (!refreshed.player_user_ids[scorerIndex] && !isLocalOrOffline) {
            const fallbackIdx = computeFallbackScorer(refreshed.player_user_ids, scorerIndex)
            if (fallbackIdx !== scorerIndex) {
              setScorerIndex(fallbackIdx)
              if (isHost && session.id) {
                broadcastState({ scorerIndex: fallbackIdx })
                gameService.updateSessionSettings(session.id, { ...(session.settings || {}), scorerIndex: fallbackIdx })
              }
            }
          }
        }
        if (refreshed?.settings?.scorerIndex !== undefined && refreshed.settings.scorerIndex !== scorerIndex) {
          setScorerIndex(refreshed.settings.scorerIndex)
        }
        if (refreshed?.game_rounds && refreshed.game_rounds.length > localRounds.length) {
          setLocalRounds(refreshed.game_rounds)
        }
      } catch (e) {}
    }, 2500)

    return () => {
      clearInterval(pollInterval)
      if (channel) gameService.unsubscribeLiveRoom(channel, session.id)
    }
  }, [session?.id])

  // Announce seat presence on mount / seat claim to ensure immediate tabletop sync
  useEffect(() => {
    if (myPlayerIndex !== null && session?.id && !isLocalOrOffline) {
      gameService.claimSeat(session.id, myPlayerIndex, currentClientId, playerNames[myPlayerIndex])
    }
  }, [session?.id, myPlayerIndex, isLocalOrOffline])

  // Stepper Modifier Helper
  const handleCounterChange = (pIdx, field, delta) => {
    try {
      hapticsService.light()
      soundService.playTick()
    } catch {}

    const updated = [...playersInput]
    const currentVal = Number(updated[pIdx][field] || 0)
    const nextVal = Math.max(0, currentVal + delta)
    updated[pIdx] = { ...updated[pIdx], [field]: nextVal }
    setPlayersInput(updated)
    broadcastState({ playersInput: updated })
  }

  // Save Round Action
  const handleSave = () => {
    try {
      hapticsService.success()
      soundService.playTada()
    } catch {}

    const roundData = {
      dealerIndex: currentDealer,
      dealerStreak,
      closerIndex: isDeckEmpty ? null : closerIndex,
      isDeckEmpty,
      closeType,
      closeSpecialCard,
      playersInput
    }

    const playerScoresPayload = liveRoundScores.map((calc, idx) => ({
      player_index: idx,
      score_change: calc.totalScoreChange,
      score_cumulative: cumulativeScores[idx] + calc.totalScoreChange,
      score_details: calc.details
    }))

    const updatedCumulative = cumulativeScores.map((curr, idx) => curr + liveRoundScores[idx].totalScoreChange)
    const gameOverCheck = checkRemiJawaGameOver(updatedCumulative, dealerStreak, {
      targetWin,
      streakLimit
    })

    onSaveRound({
      session_id: session.id,
      round_number: currentRoundNumber,
      round_data: roundData,
      player_scores: playerScoresPayload,
      isGameOver: gameOverCheck.isGameOver,
      gameOverReason: gameOverCheck.reason
    })

    // Reset local inputs for next round
    setPlayersInput(Array.from({ length: playerNames.length }, createInitialPlayerData))
    setIsDeckEmpty(false)
    setCloseType('atas')
    setCloseSpecialCard('biasa')
  }

  // Check Game Over Condition
  const currentGameOverStatus = checkRemiJawaGameOver(cumulativeScores, dealerStreak - 1, {
    targetWin,
    streakLimit
  })

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Spectator Live Banner */}
      {isSpectator && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(139, 92, 246, 0.15))',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#FDE68A',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>👀</span>
            <span><strong>Mode Penonton (Live Spectator)</strong> • Memantau skor Remi Jawa secara realtime</span>
          </div>
          {isHost && !isScorer && (
            <button
              type="button"
              className="btn btn-warning btn-sm"
              onClick={handleTakeOverScorer}
              style={{ fontSize: '0.74rem', padding: '4px 10px', fontWeight: 800 }}
            >
              👑 Ambil Alih Scorer (Host)
            </button>
          )}
        </div>
      )}

      {/* Non-Scorer Player Notice */}
      {!isSpectator && !isScorer && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.12)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '10px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.82rem',
          color: '#93C5FD'
        }}>
          <span>✏️ Pencatatan skor dilakukan oleh <strong>{playerNames[scorerIndex] || `Pemain ${scorerIndex + 1}`}</strong></span>
          {isHost && (
            <button
              type="button"
              className="btn btn-warning btn-xs"
              onClick={handleTakeOverScorer}
              style={{ fontSize: '0.72rem', padding: '2px 8px', fontWeight: 800 }}
            >
              👑 Ambil Alih (Host)
            </button>
          )}
        </div>
      )}

      {/* Top Header Card */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {onBackToLobby && (
              <button 
                type="button" 
                className="btn btn-sm btn-secondary" 
                onClick={onBackToLobby}
                title="Kembali ke Lobby"
              >
                ← Lobby
              </button>
            )}
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>🎴</span>
              <span>{session?.title || 'Remi Jawa'}</span>
            </h2>

            {/* Role Badge (Clickable to open Room / Seats) */}
            <span 
              onClick={() => setIsInviteModalOpen(true)}
              style={{
                fontSize: '0.68rem',
                padding: '2px 6px',
                borderRadius: '5px',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                background: isHost ? 'var(--badge-gold-bg)' : isSpectator ? 'var(--badge-blue-bg)' : 'var(--badge-purple-bg)',
                color: isHost ? 'var(--badge-gold-text)' : isSpectator ? 'var(--badge-blue-text)' : 'var(--badge-purple-text)',
                border: `1px solid ${isHost ? 'var(--badge-gold-border)' : isSpectator ? 'var(--badge-blue-border)' : 'var(--badge-purple-border)'}`
              }}
              title="Klik untuk Kelola Kursi Meja & Kode Room"
            >
              {isHost ? '👑 Host' : isSpectator ? '👀 Penonton' : `🪑 P${(myPlayerIndex ?? 0) + 1}`}
            </span>

            {/* Scorer Role Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span 
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  borderRadius: '5px',
                  fontWeight: 700,
                  background: isScorer ? '#FEF3C7' : '#F3F4F6',
                  color: isScorer ? '#D97706' : '#4B5563',
                  border: isScorer ? '1px solid #F59E0B' : '1px solid #E5E7EB',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <span>✏️ Scorer:</span>
                <strong>{playerNames[scorerIndex] || `P1`}</strong>
              </span>
              {canChangeScorer && (
                <button
                  type="button"
                  className="btn btn-xs"
                  onClick={() => setShowTransferScorerModal(true)}
                  style={{
                    padding: '1px 5px',
                    fontSize: '0.68rem',
                    background: 'rgba(255,255,255,0.85)',
                    border: '1px solid #D1D5DB',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                  title="Ganti atau Serahkan Peran Scorer"
                >
                  ⇄
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {session?.room_code && !session.settings?.isOfflineLocal && (
              <button 
                type="button" 
                className="btn btn-sm btn-secondary"
                onClick={() => setIsInviteModalOpen(true)}
                style={{ fontWeight: 800, color: 'var(--primary)' }}
              >
                🌐 {session.room_code}
              </button>
            )}
            <button 
              type="button" 
              className="btn btn-sm btn-secondary"
              onClick={() => setIsRulesModalOpen(true)}
              style={{ color: '#F59E0B' }}
            >
              📖 Aturan
            </button>
            {onOpenShareModal && (
              <button 
                type="button" 
                className="btn btn-sm btn-secondary"
                onClick={() => onOpenShareModal(session)}
              >
                📤 Share
              </button>
            )}
          </div>
        </div>

        {/* Round & Target Info Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <div style={{ fontWeight: 700, color: 'var(--text-main)' }}>
            Ronde #{currentRoundNumber}
          </div>
          <div>
            {targetWin > 0 ? `Target Menang: ${targetWin} Poin` : 'Target: Bebas (∞)'}
          </div>
        </div>
      </div>

      {/* Dealer & CHOLOKOPOK Streak Banner */}
      <div className="glass-panel" style={{ 
        padding: '14px 16px',
        border: streakStatus.activeCount >= 7 ? '1.5px solid rgba(239, 68, 68, 0.5)' : '1px solid var(--border-glass)',
        background: streakStatus.activeCount >= 7 ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-glass)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>👑</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700 }}>
              Dealer Ronde Ini: <strong style={{ color: 'var(--accent-gold)' }}>{playerNames[currentDealer]}</strong>
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: streakStatus.activeCount >= 7 ? 'var(--accent-red)' : 'var(--accent-gold)' }}>
            Streak: {streakStatus.progressText}
          </div>
        </div>

        {/* CHOLOKOPOK Letter Badges */}
        {streakStatus.displayMode === 'word' ? (
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap', margin: '6px 0' }}>
            {streakStatus.letters.map((char, idx) => {
              const isLit = idx < streakStatus.activeCount
              return (
                <div
                  key={idx}
                  style={{
                    width: '28px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '6px',
                    fontWeight: 900,
                    fontSize: '0.88rem',
                    border: isLit 
                      ? '1.5px solid rgba(245, 158, 11, 0.9)' 
                      : '1px dashed var(--border-glass)',
                    background: isLit 
                      ? 'linear-gradient(135deg, #F59E0B, #D97706)' 
                      : 'rgba(255, 255, 255, 0.03)',
                    color: isLit ? '#000' : 'var(--text-dim)',
                    boxShadow: isLit ? '0 0 10px rgba(245, 158, 11, 0.4)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {char}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ 
            height: '8px', 
            background: 'var(--bg-card)', 
            borderRadius: '4px', 
            overflow: 'hidden', 
            margin: '8px 0',
            border: '1px solid var(--border-glass)'
          }}>
            <div style={{ 
              width: `${(streakStatus.activeCount / streakStatus.maxLimit) * 100}%`,
              height: '100%',
              background: streakStatus.activeCount >= 7 ? 'var(--accent-red)' : 'var(--accent-gold)',
              transition: 'width 0.3s ease'
            }} />
          </div>
        )}

        {streakStatus.activeCount >= 7 && (
          <div style={{ fontSize: '0.72rem', color: '#FCA5A5', textAlign: 'center', marginTop: '4px', fontWeight: 600 }}>
            ⚠️ Peringatan: {playerNames[currentDealer]} sudah bertahan {streakStatus.activeCount}x berturut-turut!
          </div>
        )}
      </div>

      {/* Game Over Banner if Triggered */}
      {currentGameOverStatus.isGameOver && (
        <div className="glass-panel" style={{ 
          padding: '16px', 
          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.3))',
          border: '2px solid var(--accent-red)',
          textAlign: 'center'
        }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.2rem', fontWeight: 900, color: '#FCA5A5' }}>
            🏁 Permainan Selesai!
          </h3>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-main)' }}>
            {currentGameOverStatus.reason === 'dealer_streak' 
              ? `Batas Streak Dealer 10x (${streakWord}) telah terpenuhi!` 
              : `Target skor kemenangan (${targetWin} Poin) telah tercapai!`
            }
          </p>
          {onFinalizeGame && (
            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={() => onFinalizeGame(session.id)}
              style={{ fontWeight: 800, padding: '8px 24px' }}
            >
              🏆 Lihat Rekap Final
            </button>
          )}
        </div>
      )}

      {/* Round Closing Selector */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <div className="section-label" style={{ marginTop: 0 }}>🚪 Status Penutup Meja (Closing)</div>
        
        {/* Who Closed Selector */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${playerNames.length + 1}, 1fr)`, gap: '6px', marginBottom: '14px' }}>
          {playerNames.map((name, idx) => {
            const isSelected = !isDeckEmpty && closerIndex === idx
            return (
              <button
                key={idx}
                type="button"
                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  if (!canEditPlayer(idx)) return
                  setCloserIndex(idx)
                  setIsDeckEmpty(false)
                  broadcastState({ closerIndex: idx, isDeckEmpty: false })
                }}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '8px 2px',
                  background: isSelected ? 'var(--badge-purple-bg)' : undefined,
                  borderColor: isSelected ? 'var(--primary)' : undefined,
                  color: isSelected ? 'var(--badge-purple-text)' : undefined
                }}
              >
                {name}
              </button>
            )
          })}
          <button
            type="button"
            className={`btn btn-sm ${isDeckEmpty ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              if (!isScorer && !isHost) return
              setIsDeckEmpty(true)
              broadcastState({ isDeckEmpty: true })
            }}
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              padding: '8px 2px',
              background: isDeckEmpty ? 'rgba(239, 68, 68, 0.2)' : undefined,
              borderColor: isDeckEmpty ? 'var(--accent-red)' : undefined,
              color: isDeckEmpty ? '#FCA5A5' : undefined
            }}
          >
            🚫 Deck Habis
          </button>
        </div>

        {/* If closed by a player, show Close Type & Special Card */}
        {!isDeckEmpty && (
          <div style={{ background: 'var(--bg-glass)', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Close Type */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Jenis Tutup:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${closeType === 'atas' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    if (!isScorer && !isHost) return
                    setCloseType('atas')
                    broadcastState({ closeType: 'atas' })
                  }}
                  style={{ fontSize: '0.78rem', fontWeight: 700 }}
                >
                  🎴 Tutup Atas / Deck (+10)
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${closeType === 'bawah' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    if (!isScorer && !isHost) return
                    setCloseType('bawah')
                    broadcastState({ closeType: 'bawah' })
                  }}
                  style={{ fontSize: '0.78rem', fontWeight: 700 }}
                >
                  🗑️ Tutup Bawah / Sampah (+25)
                </button>
              </div>
            </div>

            {/* Special Closing Card */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                Kartu Penutup Spesial:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {[
                  { key: 'biasa', label: 'Biasa (+0)', bonus: 0 },
                  { key: 'as', label: '🅰️ Kartu As (+5)', bonus: 5 },
                  { key: 'joker', label: '🃏 Kartu Joker (+15)', bonus: 15 }
                ].map(opt => (
                  <button
                    key={opt.key}
                    type="button"
                    className={`btn btn-xs ${closeSpecialCard === opt.key ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => {
                      if (!isScorer && !isHost) return
                      setCloseSpecialCard(opt.key)
                      broadcastState({ closeSpecialCard: opt.key })
                    }}
                    style={{ fontSize: '0.72rem', fontWeight: 700, padding: '6px 2px' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Players Scoring Cards */}
      <div className="section-label" style={{ margin: '4px 0 0 0' }}>📝 Input Kartu per Pemain</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {playerNames.map((name, pIdx) => {
          const isCloser = !isDeckEmpty && closerIndex === pIdx
          const isDealer = pIdx === currentDealer
          const pCalc = liveRoundScores[pIdx]
          const isExpanded = expandedPlayerCard === pIdx
          const pData = playersInput[pIdx]
          const isOccupied = Boolean(livePlayerUserIds?.[pIdx])
          const isMySeat = myPlayerIndex === pIdx

          return (
            <div 
              key={pIdx} 
              className="glass-panel" 
              style={{ 
                padding: '14px',
                border: isCloser 
                  ? '1.5px solid var(--primary)' 
                  : isDealer 
                  ? '1.5px solid var(--accent-gold)' 
                  : '1px solid var(--border-glass)'
              }}
            >
              {/* Player Card Header */}
              <div 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div 
                  onClick={() => setExpandedPlayerCard(isExpanded ? null : pIdx)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}
                >
                  <span 
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: isOccupied ? '#10B981' : '#9CA3AF'
                    }}
                    title={isOccupied ? 'Online di room' : 'Offline / Belum check-in'}
                  />
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{name}</span>
                  {pIdx === scorerIndex && <span style={{ fontSize: '0.68rem', padding: '2px 5px', borderRadius: '4px', background: '#FEF3C7', color: '#D97706', fontWeight: 800 }}>✏️ Scorer</span>}
                  {isCloser && <span className="badge badge-purple" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>🏆 Penutup</span>}
                  {isDealer && <span className="badge badge-gold" style={{ fontSize: '0.68rem', padding: '2px 6px' }}>👑 Dealer</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isMySeat && (
                    <button
                      type="button"
                      className="btn btn-danger btn-xs"
                      onClick={handleStandUpSelf}
                      style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                      title="Berdiri dan kosongkan kursi Anda"
                    >
                      Berdiri
                    </button>
                  )}
                  {!isMySeat && isSpectator && !isOccupied && (
                    <button
                      type="button"
                      className="btn btn-primary btn-xs"
                      onClick={() => handleClaimSeatDirect(pIdx)}
                      style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                      title="Duduki kursi ini"
                    >
                      🪑 Duduki
                    </button>
                  )}

                  {/* Net Round Score Badge */}
                  <div 
                    onClick={() => setExpandedPlayerCard(isExpanded ? null : pIdx)}
                    style={{ 
                      fontWeight: 900, 
                      fontSize: '0.95rem',
                      color: pCalc.totalScoreChange >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
                      cursor: 'pointer'
                    }}
                  >
                    {pCalc.totalScoreChange >= 0 ? `+${pCalc.totalScoreChange}` : pCalc.totalScoreChange} pts
                  </div>
                  <span 
                    onClick={() => setExpandedPlayerCard(isExpanded ? null : pIdx)}
                    style={{ fontSize: '0.8rem', color: 'var(--text-dim)', cursor: 'pointer' }}
                  >
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Score Breakdown Summary Row */}
              <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>Total Sekarang: <strong>{cumulativeScores[pIdx]}</strong></span>
                <span>Proyeksi: <strong style={{ color: 'var(--text-main)' }}>{cumulativeScores[pIdx] + pCalc.totalScoreChange}</strong></span>
              </div>

              {/* Expanded Card Keypad */}
              {isExpanded && (
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Kartu Jadi (+) Section */}
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-green)', marginBottom: '6px' }}>
                      ✅ Kartu Jadi / Melds (+):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                      {/* Angka (+1) */}
                      <div style={{ background: 'var(--bg-glass)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Angka 2-10 (+1)</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
                          <button 
                            type="button" 
                            className="btn btn-xs btn-secondary" 
                            onClick={() => handleCounterChange(pIdx, 'jadiAngka', -1)}
                          >-</button>
                          <span style={{ fontWeight: 800, minWidth: '18px' }}>{pData.jadiAngka}</span>
                          <button 
                            type="button" 
                            className="btn btn-xs btn-secondary" 
                            onClick={() => handleCounterChange(pIdx, 'jadiAngka', 1)}
                          >+</button>
                        </div>
                      </div>

                      {/* Gambar (+2) */}
                      <div style={{ background: 'var(--bg-glass)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>J, Q, K (+2)</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
                          <button 
                            type="button" 
                            className="btn btn-xs btn-secondary" 
                            onClick={() => handleCounterChange(pIdx, 'jadiGambar', -1)}
                          >-</button>
                          <span style={{ fontWeight: 800, minWidth: '18px' }}>{pData.jadiGambar}</span>
                          <button 
                            type="button" 
                            className="btn btn-xs btn-secondary" 
                            onClick={() => handleCounterChange(pIdx, 'jadiGambar', 1)}
                          >+</button>
                        </div>
                      </div>

                      {/* As (+3) */}
                      <div style={{ background: 'var(--bg-glass)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Kartu As (+3)</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px' }}>
                          <button 
                            type="button" 
                            className="btn btn-xs btn-secondary" 
                            onClick={() => handleCounterChange(pIdx, 'jadiAs', -1)}
                          >-</button>
                          <span style={{ fontWeight: 800, minWidth: '18px' }}>{pData.jadiAs}</span>
                          <button 
                            type="button" 
                            className="btn btn-xs btn-secondary" 
                            onClick={() => handleCounterChange(pIdx, 'jadiAs', 1)}
                          >+</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Kartu Sisa/Mati (-) Section */}
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-red)', marginBottom: '6px' }}>
                      ❌ Kartu Mati / Sisa di Tangan (-):
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {/* Angka (-1) */}
                      <div style={{ background: 'var(--bg-glass)', padding: '6px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Angka (-1)</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                          <button 
                            type="button" 
                            className="btn btn-xs btn-secondary" 
                            onClick={() => handleCounterChange(pIdx, 'matiAngka', -1)}
                          >-</button>
                          <span style={{ fontWeight: 800, minWidth: '14px', fontSize: '0.8rem' }}>{pData.matiAngka}</span>
                          <button 
                            type="button" 
                            className="btn btn-xs btn-secondary" 
                            onClick={() => handleCounterChange(pIdx, 'matiAngka', 1)}
                          >+</button>
                        </div>
                      </div>

                      {/* Gambar (-2) */}
                      <div style={{ background: 'var(--bg-glass)', padding: '6px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>JQK (-2)</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                          <button 
                            type="button" 
                            className="btn btn-xs btn-secondary" 
                            onClick={() => handleCounterChange(pIdx, 'matiGambar', -1)}
                          >-</button>
                          <span style={{ fontWeight: 800, minWidth: '14px', fontSize: '0.8rem' }}>{pData.matiGambar}</span>
                          <button 
                            type="button" 
                            className="btn btn-xs btn-secondary" 
                            onClick={() => handleCounterChange(pIdx, 'matiGambar', 1)}
                          >+</button>
                        </div>
                      </div>

                      {/* As (-3) */}
                      <div style={{ background: 'var(--bg-glass)', padding: '6px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>As (-3)</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                          <button 
                            type="button" 
                            className="btn btn-xs btn-secondary" 
                            onClick={() => handleCounterChange(pIdx, 'matiAs', -1)}
                          >-</button>
                          <span style={{ fontWeight: 800, minWidth: '14px', fontSize: '0.8rem' }}>{pData.matiAs}</span>
                          <button 
                            type="button" 
                            className="btn btn-xs btn-secondary" 
                            onClick={() => handleCounterChange(pIdx, 'matiAs', 1)}
                          >+</button>
                        </div>
                      </div>

                      {/* Joker (-10) */}
                      <div style={{ background: 'var(--bg-glass)', padding: '6px', borderRadius: '8px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.68rem', color: '#FCA5A5' }}>Joker (-10)</div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginTop: '4px' }}>
                          <button 
                            type="button" 
                            className="btn btn-xs btn-secondary" 
                            onClick={() => handleCounterChange(pIdx, 'matiJoker', -1)}
                          >-</button>
                          <span style={{ fontWeight: 800, minWidth: '14px', fontSize: '0.8rem' }}>{pData.matiJoker}</span>
                          <button 
                            type="button" 
                            className="btn btn-xs btn-secondary" 
                            onClick={() => handleCounterChange(pIdx, 'matiJoker', 1)}
                          >+</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Save Round Button */}
      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={handleSave}
        disabled={!isScorer && !isHost}
        style={{ padding: '14px', fontSize: '1rem', fontWeight: 800, marginTop: '8px', opacity: (!isScorer && !isHost) ? 0.6 : 1 }}
      >
        💾 Simpan Ronde #{currentRoundNumber}
      </button>

      {/* Cumulative Leaderboard & History */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 12px 0' }}>
          📊 Klasemen Sementara Remi Jawa
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {playerNames
            .map((name, idx) => ({ name, idx, score: cumulativeScores[idx] }))
            .sort((a, b) => b.score - a.score)
            .map((item, rank) => {
              const isOccupied = Boolean(livePlayerUserIds?.[item.idx])
              const isMySeat = myPlayerIndex === item.idx

              return (
                <div 
                  key={item.idx}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: rank === 0 ? 'rgba(245, 158, 11, 0.12)' : 'var(--bg-glass)',
                    border: rank === 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-glass)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 900, color: rank === 0 ? 'var(--accent-gold)' : 'var(--text-muted)' }}>
                      #{rank + 1}
                    </span>
                    <span style={{ fontWeight: 700 }}>{item.name}</span>
                    <span 
                      style={{
                        fontSize: '0.68rem',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        background: isOccupied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                        color: isOccupied ? '#10B981' : '#9CA3AF',
                        fontWeight: 700
                      }}
                    >
                      {isOccupied ? '🟢 Online' : '⚪ Offline'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isMySeat && (
                      <button
                        type="button"
                        className="btn btn-danger btn-xs"
                        onClick={handleStandUpSelf}
                        style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                      >
                        Berdiri
                      </button>
                    )}
                    <div style={{ fontWeight: 900, fontSize: '1rem', color: item.score >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {item.score >= 0 ? `+${item.score}` : item.score} pts
                    </div>
                  </div>
                </div>
              )
            })}
        </div>

        {/* Round History Table */}
        {localRounds.length > 0 && (
          <div style={{ marginTop: '20px', paddingTop: '14px', borderTop: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800 }}>Riwayat Ronde ({localRounds.length})</h4>
              {onUndoRound && (
                <button
                  type="button"
                  className="btn btn-xs btn-secondary"
                  onClick={onUndoRound}
                  style={{ color: 'var(--accent-red)' }}
                >
                  ↩️ Undo Ronde
                </button>
              )}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Ronde</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Dealer</th>
                    {playerNames.map((name, i) => (
                      <th key={i} style={{ padding: '6px', textAlign: 'right' }}>{name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {localRounds.map((r, rIdx) => (
                    <tr key={rIdx} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                      <td style={{ padding: '6px', fontWeight: 700 }}>#{r.round_number || rIdx + 1}</td>
                      <td style={{ padding: '6px', color: 'var(--accent-gold)' }}>
                        👑 {playerNames[r.round_data?.dealerIndex ?? r.dealer_index ?? 0]}
                      </td>
                      {playerNames.map((_, pIdx) => {
                        const ps = r.player_scores?.find(p => (p.player_index ?? p.playerIndex) === pIdx)
                        const change = ps?.score_change ?? ps?.scoreChange ?? 0
                        return (
                          <td 
                            key={pIdx} 
                            style={{ 
                              padding: '6px', 
                              textAlign: 'right', 
                              fontWeight: 700,
                              color: change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                            }}
                          >
                            {change >= 0 ? `+${change}` : change}
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

        {/* Finalize Game Button */}
        {onFinalizeGame && (
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={() => {
              if (window.confirm('Selesaikan dan kunci permainan Remi Jawa ini?')) {
                onFinalizeGame(session.id)
              }
            }}
            style={{ marginTop: '16px', fontWeight: 700, fontSize: '0.85rem' }}
          >
            🏁 Selesaikan Permainan
          </button>
        )}
      </div>

      {/* Transfer Scorer Role Modal */}
      {showTransferScorerModal && (
        <div className="modal-overlay" onClick={() => setShowTransferScorerModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">⇄ Alihkan Peran Pencatat Skor (Scorer)</h3>
              <button className="btn-close" onClick={() => setShowTransferScorerModal(false)}>✕</button>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Pilih pemain yang akan mencatat skor ronde pada game ini:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {playerNames.map((name, idx) => {
                const isCurrent = idx === scorerIndex
                const isOnline = Boolean(livePlayerUserIds?.[idx])
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`btn ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => handleTransferScorer(idx)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px'
                    }}
                  >
                    <span style={{ fontWeight: 700 }}>
                      {isCurrent ? '✏️ ' : ''}{name} {idx === 0 ? '(Host)' : ''}
                    </span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>
                      {isOnline ? '🟢 Online' : '⚪ Offline'}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <RoomInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        session={session}
        myPlayerIndex={myPlayerIndex}
        user={user}
        onClaimSeat={onClaimSeat}
        onReleaseSeat={onReleaseSeat}
      />

      <CardGameRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        initialGame="remi_jawa"
      />
    </div>
  )
}
