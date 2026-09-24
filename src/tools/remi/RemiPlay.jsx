import React, { useState, useEffect, useRef } from 'react'
import { CARD_VALUES, calculateRemiRoundScores } from './remiLogic'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { gameService } from '../../services/gameService'
import { deviceService } from '../../services/deviceService'
import { useTranslation } from '../../i18n/I18nContext'
import RoomInviteModal from '../../components/common/RoomInviteModal'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

export default function RemiPlay({ 
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
  const targetPenalty = session?.settings?.targetPenalty || 500

  const clientId = useRef(`peer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`).current
  const realtimeChannelRef = useRef(null)

  // Reactive live seat claims state to guarantee immediate re-rendering across screens
  const [livePlayerUserIds, setLivePlayerUserIds] = useState(() => session?.player_user_ids || Array(playerNames.length).fill(null))

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
  const [showTransferScorerModal, setShowTransferScorerModal] = useState(false)
  const isScorer = isLocalOrOffline ? true : myPlayerIndex === scorerIndex
  // Only the active Scorer can edit all players. Other players can ONLY edit their own input (myPlayerIndex === idx). Spectators cannot edit anyone.
  const canEditPlayer = (idx) => {
    if (isLocalOrOffline) return true
    if (isScorer) return true
    if (myPlayerIndex !== null && myPlayerIndex === idx) return true
    return false
  }

  const computeFallbackScorer = (playerUserIds = [], currentScorer = 0) => {
    if (currentScorer >= 0 && playerUserIds && playerUserIds[currentScorer]) return currentScorer
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

  const [closerIndex, setCloserIndex] = useState(0)
  const [isTutupMurni, setIsTutupMurni] = useState(false)
  const [penalties, setPenalties] = useState(() => Array(playerNames.length).fill(0))
  const [activeKeypadPlayer, setActiveKeypadPlayer] = useState(null)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false)

  // Compute latest cumulative scores
  const cumulativeScores = Array(playerNames.length).fill(0)
  localRounds.forEach(r => {
    r.player_scores?.forEach(ps => {
      cumulativeScores[ps.player_index] += ps.score_change
    })
  })

  // Broadcast helper
  const broadcastState = (overrides = {}) => {
    if (!realtimeChannelRef.current) return
    gameService.broadcastLiveState(realtimeChannelRef.current, {
      senderId: clientId,
      closerIndex,
      isTutupMurni,
      penalties,
      activeKeypadPlayer,
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
    if (session?.id) {
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

  // Subscribe to Realtime Live Room (Instant Broadcast + DB Changes + Smart Polling Fallback)
  useEffect(() => {
    if (!session?.id || session.id.startsWith('guest-session')) return

    const channel = gameService.subscribeToLiveRoom(session.id, {
      onLiveState: (payload) => {
        if (payload?.senderId && payload.senderId !== clientId) {
          if (payload.closerIndex !== undefined) setCloserIndex(payload.closerIndex)
          if (payload.isTutupMurni !== undefined) setIsTutupMurni(payload.isTutupMurni)
          if (Array.isArray(payload.penalties)) setPenalties(payload.penalties)
          if (payload.activeKeypadPlayer !== undefined) setActiveKeypadPlayer(payload.activeKeypadPlayer)
          if (payload.scorerIndex !== undefined) setScorerIndex(payload.scorerIndex)
        }
      },
      onRoundAdvance: (payload) => {
        if (payload?.round) {
          setLocalRounds(prev => {
            const exists = prev.some(r => r.round_number === payload.round.round_number)
            if (exists) return prev
            return [...prev, payload.round]
          })
          setPenalties(Array(playerNames.length).fill(0))
          setIsTutupMurni(false)
          setActiveKeypadPlayer(null)
          soundService.playVictory()
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
            for (let i = 0; i < updatedIds.length; i++) {
              if (i !== seatPayload.playerIndex && updatedIds[i] === seatPayload.clientId) {
                updatedIds[i] = null
              }
            }
            updatedIds[seatPayload.playerIndex] = seatPayload.clientId
          }

          setLivePlayerUserIds(updatedIds)
          if (session) session.player_user_ids = updatedIds

          if (session?.id) {
            gameService.updateSessionPlayerUserIds(session.id, updatedIds)
          }

          if (isRelease && seatPayload.playerIndex === scorerIndex && !isLocalOrOffline) {
            const fallbackIdx = computeFallbackScorer(updatedIds, -1)
            setScorerIndex(fallbackIdx)
            if (session?.id) {
              gameService.updateSessionSettings(session.id, { ...(session.settings || {}), scorerIndex: fallbackIdx })
              gameService.broadcastLiveState(channel, {
                senderId: clientId,
                penalties,
                isTutupMurni,
                activeKeypadPlayer,
                scorerIndex: fallbackIdx
              })
            }
          }
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
              if (session?.id) {
                broadcastState({ scorerIndex: fallbackIdx })
                gameService.updateSessionSettings(session.id, { ...(session.settings || {}), scorerIndex: fallbackIdx })
              }
            }
          }
        }
        if (refreshed?.settings?.scorerIndex !== undefined && refreshed.settings.scorerIndex !== scorerIndex) {
          setScorerIndex(refreshed.settings.scorerIndex)
        }
        if (refreshed?.is_completed && onFinalizeGame) {
          onFinalizeGame(refreshed.game_rounds || localRounds)
          return
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
              if (session?.id) {
                broadcastState({ scorerIndex: fallbackIdx })
                gameService.updateSessionSettings(session.id, { ...(session.settings || {}), scorerIndex: fallbackIdx })
              }
            }
          }
        }
        if (refreshed?.settings?.scorerIndex !== undefined && refreshed.settings.scorerIndex !== scorerIndex) {
          setScorerIndex(refreshed.settings.scorerIndex)
        }
        if (refreshed?.is_completed && onFinalizeGame) {
          onFinalizeGame(refreshed.game_rounds || localRounds)
          return
        }
        if (refreshed?.game_rounds && refreshed.game_rounds.length > 0) {
          setLocalRounds(prev => {
            if (refreshed.game_rounds.length > prev.length) {
              return refreshed.game_rounds
            }
            return prev
          })
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

  // Add Card Value in Keypad
  const handleAddCard = (pts) => {
    hapticsService.light()
    soundService.playTick()
    if (activeKeypadPlayer === null) return
    setPenalties(prev => {
      const next = [...prev]
      next[activeKeypadPlayer] = (next[activeKeypadPlayer] || 0) + pts
      broadcastState({ penalties: next })
      return next
    })
  }

  // Clear Keypad for active player
  const handleClearKeypad = () => {
    hapticsService.light()
    if (activeKeypadPlayer === null) return
    setPenalties(prev => {
      const next = [...prev]
      next[activeKeypadPlayer] = 0
      broadcastState({ penalties: next })
      return next
    })
  }

  const handleSaveRound = () => {
    const calculated = calculateRemiRoundScores(closerIndex, isTutupMurni, penalties)
    
    const scoreRecords = calculated.map((change, idx) => ({
      player_index: idx,
      stats: {
        card_penalty: penalties[idx],
        is_closer: idx === closerIndex,
        is_tutup_murni: isTutupMurni
      },
      score_change: change,
      score_cumulative: cumulativeScores[idx] + change
    }))

    const newRoundPayload = {
      id: `local-round-${Date.now()}`,
      round_number: currentRoundNumber,
      roundNumber: currentRoundNumber,
      round_data: {
        closerIndex,
        isTutupMurni
      },
      player_scores: scoreRecords,
      playerScores: scoreRecords
    }

    setLocalRounds(prev => [...prev, newRoundPayload])
    setPenalties(Array(playerNames.length).fill(0))
    setIsTutupMurni(false)
    setActiveKeypadPlayer(null)

    hapticsService.success()
    soundService.playVictory()

    if (realtimeChannelRef.current) {
      gameService.broadcastRoundAdvance(realtimeChannelRef.current, { round: newRoundPayload })
    }

    if (onSaveRound) {
      onSaveRound(newRoundPayload)
    }
  }

  // Check for players eliminated
  const eliminatedPlayers = playerNames
    .map((name, idx) => ({ name, score: cumulativeScores[idx], idx }))
    .filter(p => Math.abs(p.score) >= targetPenalty)

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Spectator Live Banner */}
      {isSpectator && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.15), rgba(139, 92, 246, 0.15))',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#FDE68A',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>👀</span>
            <span><strong>Mode Penonton (Live Spectator)</strong> • Memantau denda dan skor secara realtime</span>
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
          marginBottom: '12px',
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

      {/* Header */}
      <div className="glass-panel" style={{ padding: '10px 12px', marginBottom: '12px' }}>
        {/* Top Meta Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
            {onBackToLobby && (
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onBackToLobby}
                style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}
                title="Kembali ke Lobby Remi"
              >
                ← Lobby
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
              {session?.title || 'Remi Session'}
            </span>

            {/* Role Badge (Clickable to open Room / Seats) */}
            <span 
              onClick={() => setIsInviteModalOpen(true)}
              style={{
                fontSize: '0.68rem',
                padding: '2px 6px',
                borderRadius: '5px',
                fontWeight: 800,
                whiteSpace: 'nowrap',
                flexShrink: 0,
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
                  background: (myPlayerIndex === scorerIndex && !isLocalOrOffline) ? '#FEF3C7' : '#F3F4F6',
                  color: (myPlayerIndex === scorerIndex && !isLocalOrOffline) ? '#D97706' : '#4B5563',
                  border: (myPlayerIndex === scorerIndex && !isLocalOrOffline) ? '1px solid #F59E0B' : '1px solid #E5E7EB',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
              >
                <span>✏️ Scorer:</span>
                <strong>{playerNames[scorerIndex] || `P1`} {myPlayerIndex === scorerIndex && !isLocalOrOffline ? '(Anda)' : ''}</strong>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <button 
              type="button"
              className="btn btn-sm"
              onClick={() => setIsInviteModalOpen(true)}
              style={{
                fontSize: '0.72rem',
                padding: '3px 7px',
                background: 'var(--badge-gold-bg)',
                border: '1px solid var(--badge-gold-border)',
                color: 'var(--badge-gold-text)',
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

            {/* Game Rules Reference */}
            <button 
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setIsRulesModalOpen(true)}
              style={{
                fontSize: '0.72rem',
                padding: '3px 7px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                color: 'var(--badge-purple-text)',
                borderColor: 'var(--badge-purple-border)'
              }}
              title="Aturan Permainan & Denda Remi"
            >
              <span>📖</span>
            </button>
          </div>
        </div>

        {/* Bottom Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--accent-gold)', margin: 0, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
            {t('remi.round', { num: currentRoundNumber })}
          </h2>
          <div style={{
            fontSize: '0.74rem',
            padding: '2px 8px',
            borderRadius: '6px',
            background: 'var(--badge-red-bg)',
            border: '1px solid var(--badge-red-border)',
            color: 'var(--badge-red-text)',
            fontWeight: 700
          }}>
            Batas Kalah: <strong>-{targetPenalty} pts</strong>
          </div>
        </div>
      </div>

      {eliminatedPlayers.length > 0 && (
        <div style={{ background: 'var(--badge-red-bg)', border: '1px solid var(--badge-red-border)', padding: '14px', borderRadius: '12px', marginBottom: '16px', textAlign: 'center', color: 'var(--badge-red-text)', fontWeight: 700 }}>
          🚨 {t('remi.game_over', { name: eliminatedPlayers.map(p => p.name).join(', ') })}
        </div>
      )}

      {/* Round Form Panel (Active Scorer or Host only) */}
      {!isScorer ? (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          ⏳ Ronde {currentRoundNumber} sedang dicatat oleh <strong>{playerNames[scorerIndex] || `Pemain ${scorerIndex + 1}`}</strong>.
        </div>
      ) : (
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
        {/* 1. Select Who Closed */}
        <div className="form-group">
          <label className="form-label">{t('remi.who_closed')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${playerNames.length}, 1fr)`, gap: '8px' }}>
            {playerNames.map((name, idx) => (
              <button
                key={idx}
                type="button"
                className={`btn btn-sm ${closerIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  background: closerIndex === idx ? '#F59E0B' : 'var(--bg-glass-strong)',
                  borderColor: closerIndex === idx ? '#F59E0B' : 'var(--border-glass)'
                }}
                onClick={() => {
                  hapticsService.light()
                  setCloserIndex(idx)
                  broadcastState({ closerIndex: idx })
                }}
              >
                🏆 {name}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Select Close Type */}
        <div className="form-group">
          <label className="form-label">{t('remi.close_type')}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              className={`btn btn-sm ${!isTutupMurni ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { 
                hapticsService.light()
                setIsTutupMurni(false)
                broadcastState({ isTutupMurni: false })
              }}
            >
              {t('remi.tutup_biasa')}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${isTutupMurni ? 'btn-primary' : 'btn-secondary'}`}
              style={{ background: isTutupMurni ? '#EC4899' : undefined }}
              onClick={() => { 
                hapticsService.medium()
                setIsTutupMurni(true)
                broadcastState({ isTutupMurni: true })
              }}
            >
              🔥 {t('remi.tutup_murni')}
            </button>
          </div>
        </div>

        {/* 3. Input Penalty Cards for Non-Closing Players */}
        <div className="section-label" style={{ marginTop: '16px' }}>Denda Kartu Pemain Lain</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {playerNames.map((name, idx) => {
            const isCloser = idx === closerIndex
            const penalty = penalties[idx] || 0
            const isOccupied = Boolean(livePlayerUserIds?.[idx])

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isCloser ? 'var(--badge-gold-bg)' : 'var(--bg-card-nested)',
                  border: isCloser ? '1.5px solid var(--badge-gold-border)' : '1px solid var(--border-glass)',
                  padding: '12px 16px',
                  borderRadius: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{name}</strong>
                  {isCloser && <span style={{ marginLeft: '4px', color: 'var(--badge-gold-text)', fontSize: '0.75rem', fontWeight: 800 }}>MENUTUP (0 Pts)</span>}
                </div>

                {!isCloser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setActiveKeypadPlayer(idx)
                        broadcastState({ activeKeypadPlayer: idx })
                      }}
                    >
                      ⌨️ Hitung ({penalty} pts)
                    </button>
                    <input
                      type="number"
                      value={penalty}
                      onChange={e => {
                        const val = Math.max(0, Number(e.target.value))
                        setPenalties(prev => {
                          const n = [...prev]
                          n[idx] = val
                          broadcastState({ penalties: n })
                          return n
                        })
                      }}
                      style={{
                        width: '70px',
                        padding: '6px 8px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '8px',
                        color: 'var(--badge-red-text)',
                        fontWeight: 700,
                        textAlign: 'center'
                      }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <button className="btn btn-success btn-block" style={{ padding: '14px' }} onClick={handleSaveRound}>
          💾 {t('remi.save_round')}
        </button>
      </div>
      )}

      {/* Card Penalty Keypad Modal */}
      {activeKeypadPlayer !== null && (
        <div className="modal-overlay" onClick={() => { setActiveKeypadPlayer(null); broadcastState({ activeKeypadPlayer: null }) }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                🎴 {t('remi.keypad_title', { player: playerNames[activeKeypadPlayer] })}
              </h3>
              <button className="btn-close" onClick={() => { setActiveKeypadPlayer(null); broadcastState({ activeKeypadPlayer: null }) }}>✕</button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '12px', textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total Denda Kartu</div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#F87171' }}>
                -{penalties[activeKeypadPlayer] || 0} pts
              </div>
            </div>

            <div className="remi-keypad">
              {CARD_VALUES.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  className="keypad-btn"
                  onClick={() => handleAddCard(c.pts)}
                >
                  <div>{c.label}</div>
                  <span>+{c.pts}</span>
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button className="btn btn-secondary" onClick={handleClearKeypad}>
                Reset 0
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { setActiveKeypadPlayer(null); broadcastState({ activeKeypadPlayer: null }) }}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remi Cumulative Leaderboard & Player Presence */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>📊 Klasemen Denda Remi</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isHost && rounds.length > 0 && onUndoRound && (
              <button className="btn btn-danger btn-sm" onClick={onUndoRound}>
                ↩️ Undo
              </button>
            )}
            {rounds.length > 0 && onOpenShareModal && (
              <button className="btn btn-secondary btn-sm" onClick={onOpenShareModal}>
                📸 9:16 Share
              </button>
            )}
            {isHost && rounds.length > 0 && onFinalizeGame && (
              <button className="btn btn-primary btn-sm" onClick={onFinalizeGame}>
                🏁 Selesai
              </button>
            )}
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Pemain</th>
                <th style={{ padding: '8px' }}>Status / Aksi</th>
                <th style={{ padding: '8px' }}>Total Denda</th>
                {rounds.map((r, i) => (
                  <th key={i} style={{ padding: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    R{r.round_number}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {playerNames.map((name, idx) => {
                const total = cumulativeScores[idx] || 0
                const isOccupied = Boolean(livePlayerUserIds?.[idx])
                const isMySeat = myPlayerIndex === idx

                return (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{name}</span>
                        {idx === scorerIndex && (
                          <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px', background: '#FEF3C7', color: '#D97706', fontWeight: 800 }}>
                            ✏️ Scorer
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <span 
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: isOccupied ? 'rgba(16, 185, 129, 0.15)' : 'rgba(156, 163, 175, 0.15)',
                            color: isOccupied ? '#10B981' : '#9CA3AF',
                            fontWeight: 700
                          }}
                        >
                          {isOccupied ? '🟢 Online' : '⚪ Offline'}
                        </span>
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
                            onClick={() => handleClaimSeatDirect(idx)}
                            style={{ fontSize: '0.68rem', padding: '2px 6px' }}
                            title="Duduki kursi ini"
                          >
                            🪑 Duduki
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px 8px', fontWeight: 800, color: total === 0 ? '#34D399' : '#F87171' }}>
                      {total} pts
                    </td>
                    {rounds.map((r, rIdx) => {
                      const ps = r.player_scores?.find(p => p.player_index === idx)
                      const change = ps?.score_change || 0
                      return (
                        <td key={rIdx} style={{ padding: '8px', fontSize: '0.82rem', color: change === 0 ? '#34D399' : '#F87171' }}>
                          {change}
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

      {/* Transfer Scorer Role Modal */}
      {showTransferScorerModal && (
        <div className="modal-overlay" onClick={() => setShowTransferScorerModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">⇄ Alihkan Peran Pencatat Skor (Scorer)</h3>
              <button className="btn-close" onClick={() => setShowTransferScorerModal(false)}>✕</button>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Pilih pemain yang akan mencatat denda kartu ronde pada game ini:
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

      {/* Room Invite Modal */}
      <RoomInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        session={session}
        myPlayerIndex={myPlayerIndex}
        user={user}
        onClaimSeat={onClaimSeat}
        onReleaseSeat={onReleaseSeat}
      />

      {/* Card Game Rules Modal */}
      <CardGameRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        initialGame="remi"
      />
    </div>
  )
}
