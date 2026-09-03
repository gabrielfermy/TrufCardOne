import React, { useState, useEffect, useRef } from 'react'
import { SUITS, calculateTrufRoundScores } from './trufLogic'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { gameService } from '../../services/gameService'
import { deviceService } from '../../services/deviceService'
import { useTranslation } from '../../i18n/I18nContext'
import RoomInviteModal from '../../components/common/RoomInviteModal'
import ActivityLogDrawer from '../../components/common/ActivityLogDrawer'

export default function TrufPlay({ 
  session, 
  rounds = [], 
  onSaveRound, 
  onUndoRound, 
  onFinalizeGame,
  onOpenShareModal,
  onBackToLobby,
  user,
  onClaimSeat,
  myPlayerIndex: propMyPlayerIndex
}) {
  const { t } = useTranslation()
  const playerNames = session?.player_names || ['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4']
  const settings = session?.settings || { multiplier: 1, bid0Bonus: 0, bid13Decision: true }

  const clientId = useRef(`peer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`).current
  const realtimeChannelRef = useRef(null)

  // Determine user role and claimed seat index
  const currentClientId = deviceService.getClientIdentifier(user)
  const isLocalOrOffline = !session?.room_code || session?.settings?.isOfflineLocal || !session?.id || session.id.startsWith('guest-session') || session.id.startsWith('local-session')
  const isHost = isLocalOrOffline ||
                 session?.user_id === user?.id || 
                 session?.player_user_ids?.[0] === currentClientId || 
                 propMyPlayerIndex === 0 ||
                 (session?.id?.startsWith('guest-session') && deviceService.getSessionSeat(session.id) === 0)

  let effectiveSeat = propMyPlayerIndex !== undefined ? propMyPlayerIndex : null
  if (effectiveSeat === null) {
    const seatInSession = session?.player_user_ids?.findIndex(id => id && (id === currentClientId || (user?.id && id === user.id)))
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
  const canEditPlayer = (idx) => isHost || myPlayerIndex === idx

  // Optimistic local state for rounds to guarantee instant Round advancement
  const [localRounds, setLocalRounds] = useState(rounds || [])

  // Activity Logging state
  const [activityLogs, setActivityLogs] = useState([])
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false)

  const addLog = (text, actionType = 'bid') => {
    const actorName = isHost 
      ? (user?.profile?.display_name || playerNames[0] || 'Host')
      : (myPlayerIndex !== null ? playerNames[myPlayerIndex] : 'Penonton')
    const actorRole = isHost ? 'host' : (myPlayerIndex !== null ? 'player' : 'spectator')
    const entry = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      actorName,
      actorRole,
      actionType,
      text
    }
    setActivityLogs(prev => [...prev.slice(-49), entry])
    if (realtimeChannelRef.current) {
      gameService.broadcastActivityLog(realtimeChannelRef.current, entry)
    }
  }

  useEffect(() => {
    if (rounds && rounds.length >= localRounds.length) {
      setLocalRounds(rounds)
    }
  }, [rounds])

  const currentRoundNumber = localRounds.length + 1
  const firstDealer = session?.first_dealer || 0
  const dealerIndex = (firstDealer + (currentRoundNumber - 1)) % 4

  // Input states for current round
  const [bids, setBids] = useState([0, 0, 0, 0])
  const [wons, setWons] = useState([0, 0, 0, 0])
  const [trufSuit, setTrufSuit] = useState(0) // Default: 0 (Sekop / Spades)
  const [inputPhase, setInputPhase] = useState('bid') // 'bid' | 'won'
  const [forcedPlayMode, setForcedPlayMode] = useState(null)
  const [showBid13Modal, setShowBid13Modal] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const totalBid = bids.reduce((a, b) => a + b, 0)
  const totalWon = wons.reduce((a, b) => a + b, 0)

  // Broadcast helper to sync live tabletop state across phones
  const broadcastState = (overrides = {}) => {
    if (!realtimeChannelRef.current) return
    gameService.broadcastLiveState(realtimeChannelRef.current, {
      senderId: clientId,
      bids,
      wons,
      trufSuit,
      inputPhase,
      forcedPlayMode,
      ...overrides
    })
  }

  // Subscribe to Realtime Live Room (Instant Broadcast + DB Changes + Smart Polling Fallback)
  useEffect(() => {
    if (!session?.id || session.id.startsWith('guest-session')) return

    // 1. WebSocket Realtime Sync (Instant < 50ms)
    const channel = gameService.subscribeToLiveRoom(session.id, {
      onLiveState: (payload) => {
        if (payload?.senderId && payload.senderId !== clientId) {
          if (Array.isArray(payload.bids)) setBids(payload.bids)
          if (Array.isArray(payload.wons)) setWons(payload.wons)
          if (payload.trufSuit !== undefined) setTrufSuit(payload.trufSuit)
          if (payload.inputPhase) setInputPhase(payload.inputPhase)
          if (payload.forcedPlayMode !== undefined) setForcedPlayMode(payload.forcedPlayMode)
        }
      },
      onActivityLog: (logEntry) => {
        if (logEntry) {
          setActivityLogs(prev => {
            if (prev.some(l => l.id === logEntry.id)) return prev
            return [...prev.slice(-49), logEntry]
          })
        }
      },
      onSeatClaim: (seatPayload) => {
        if (seatPayload?.playerIndex !== undefined) {
          const pName = playerNames[seatPayload.playerIndex] || `Pemain ${seatPayload.playerIndex + 1}`
          setActivityLogs(prev => [...prev.slice(-49), {
            id: `claim-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actorName: seatPayload.playerName || pName,
            actorRole: 'player',
            actionType: 'check_in',
            text: `Check-in ke Kursi ${seatPayload.playerIndex + 1} (${pName})`
          }])
        }
      },
      onRoundAdvance: (payload) => {
        if (payload?.round) {
          setLocalRounds(prev => {
            const exists = prev.some(r => r.round_number === payload.round.round_number)
            if (exists) return prev
            return [...prev, payload.round]
          })
          setBids([0, 0, 0, 0])
          setWons([0, 0, 0, 0])
          setTrufSuit(4)
          setInputPhase('bid')
          setForcedPlayMode(null)
          setErrorMsg('')
          soundService.playVictory()
        }
      },
      onDbUpdate: async () => {
        const refreshed = await gameService.getSession(session.id)
        if (refreshed?.game_rounds && refreshed.game_rounds.length >= localRounds.length) {
          setLocalRounds(refreshed.game_rounds)
        }
      }
    })

    realtimeChannelRef.current = channel

    // 2. High-Reliability Liveness Polling Fallback (every 2.5s)
    const pollInterval = setInterval(async () => {
      try {
        const refreshed = await gameService.getSession(session.id)
        if (refreshed?.game_rounds && refreshed.game_rounds.length > 0) {
          setLocalRounds(prev => {
            if (refreshed.game_rounds.length > prev.length) {
              console.log('🔄 Polling synchronized new rounds from cloud:', refreshed.game_rounds.length)
              return refreshed.game_rounds
            }
            return prev
          })
        }
      } catch (e) {
        // Silent catch for background polling
      }
    }, 2500)

    return () => {
      clearInterval(pollInterval)
      if (channel) gameService.unsubscribeLiveRoom(channel)
    }
  }, [session?.id])

  // Stepper handlers with role checks & audit logging
  const handleBidStep = (playerIdx, delta) => {
    if (!canEditPlayer(playerIdx)) return
    setErrorMsg('')
    try {
      hapticsService.light()
      soundService.playTick()
    } catch {}

    setBids(prev => {
      const next = [...prev]
      const oldVal = next[playerIdx]
      const newVal = Math.max(0, Math.min(13, oldVal + delta))
      if (oldVal !== newVal) {
        next[playerIdx] = newVal
        broadcastState({ bids: next })
        const targetName = playerNames[playerIdx]
        const text = isHost && myPlayerIndex !== playerIdx
          ? `Mengubah Bid ${targetName} dari ${oldVal} menjadi ${newVal}`
          : `Memasang Bid: ${newVal}`
        addLog(text, 'bid')
      }
      return next
    })
  }

  const handleWonStep = (playerIdx, delta) => {
    if (!canEditPlayer(playerIdx)) return
    setErrorMsg('')
    try {
      hapticsService.light()
      soundService.playTick()
    } catch {}

    setWons(prev => {
      const next = [...prev]
      const oldVal = next[playerIdx]
      const newVal = Math.max(0, Math.min(13, oldVal + delta))
      if (oldVal !== newVal) {
        next[playerIdx] = newVal
        broadcastState({ wons: next })
        const targetName = playerNames[playerIdx]
        const text = isHost && myPlayerIndex !== playerIdx
          ? `Mengubah Trik ${targetName} dari ${oldVal} menjadi ${newVal}`
          : `Mengatur Trik Menang: ${newVal}`
        addLog(text, 'won')
      }
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
    try {
      hapticsService.medium()
      soundService.playCardFlip()
    } catch {}
    setInputPhase('won')
    broadcastState({ inputPhase: 'won' })
    addLog(`Fase Bid selesai (Total Bid: ${totalBid}). Memulai fase Hasil Trik.`, 'play_mode')
  }

  // Handle Save Round (Instant Optimistic UI & Broadcast)
  const handleSaveRoundSubmit = async () => {
    setErrorMsg('')
    if (totalWon !== 13) {
      try { hapticsService.warning() } catch {}
      setErrorMsg(t('truf.validation_won_13'))
      return
    }

    const calculatedScores = calculateTrufRoundScores(bids, wons, settings, totalBid, forcedPlayMode)
    
    // Compute cumulative scores from localRounds
    const lastCumulative = [0, 0, 0, 0]
    if (localRounds.length > 0) {
      const lastRound = localRounds[localRounds.length - 1]
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

    const roundData = {
      dealerIndex,
      trufSuit,
      forcedPlayMode,
      totalBid
    }

    const newRoundPayload = {
      id: `local-round-${Date.now()}`,
      round_number: currentRoundNumber,
      roundNumber: currentRoundNumber,
      round_data: roundData,
      roundData: roundData,
      player_scores: scoreRecords,
      playerScores: scoreRecords
    }

    // 1. Instantly advance UI locally
    setLocalRounds(prev => [...prev, newRoundPayload])
    setBids([0, 0, 0, 0])
    setWons([0, 0, 0, 0])
    setTrufSuit(0)
    setInputPhase('bid')
    setForcedPlayMode(null)
    setErrorMsg('')

    try {
      hapticsService.success()
      soundService.playVictory()
    } catch {}

    addLog(`Menyimpan Ronde ${currentRoundNumber} & melangkah ke ronde berikutnya`, 'save_round')

    // 2. Broadcast round advance to all other phones in 0ms!
    if (realtimeChannelRef.current) {
      gameService.broadcastRoundAdvance(realtimeChannelRef.current, { round: newRoundPayload })
    }

    // 3. Background async sync to server/storage
    try {
      if (onSaveRound) {
        await onSaveRound(newRoundPayload)
      }
    } catch (err) {
      console.warn('Background round sync note:', err)
    }
  }

  const handleUndo = () => {
    setLocalRounds(prev => prev.slice(0, -1))
    addLog(`Membatalkan (Undo) ronde terakhir`, 'undo')
    if (onUndoRound) onUndoRound()
  }

  // Cumulative Leaderboard
  const latestScores = [0, 0, 0, 0]
  if (localRounds.length > 0) {
    const lastRound = localRounds[localRounds.length - 1]
    lastRound.player_scores?.forEach(ps => {
      latestScores[ps.player_index] = ps.score_cumulative
    })
  }

  const isMainAtas = forcedPlayMode ? forcedPlayMode === 'atas' : totalBid > 13
  const activeSuitObj = SUITS.find(s => s.id === trufSuit)

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Spectator Live Banner */}
      {isSpectator && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15))',
          border: '1px solid rgba(59, 130, 246, 0.35)',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#93C5FD',
          fontSize: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.2rem' }}>👀</span>
            <span><strong>Mode Penonton (Live Spectator)</strong> • Memantau skor & trik secara realtime</span>
          </div>
          <button 
            type="button" 
            className="btn btn-sm btn-secondary" 
            onClick={() => setIsLogDrawerOpen(true)}
            style={{ fontSize: '0.75rem', padding: '2px 8px' }}
          >
            📜 Log ({activityLogs.length})
          </button>
        </div>
      )}

      {/* Round Header & Status */}
      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            {onBackToLobby && (
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onBackToLobby}
                style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px' }}
                title="Kembali ke Lobby Truf"
              >
                ← Lobby
              </button>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
              {session?.title || 'Truf Session'}
            </span>

            {/* Role Badge */}
            <span style={{
              fontSize: '0.72rem',
              padding: '2px 8px',
              borderRadius: '6px',
              fontWeight: 800,
              background: isHost ? 'rgba(245, 158, 11, 0.15)' : isSpectator ? 'rgba(59, 130, 246, 0.15)' : 'rgba(139, 92, 246, 0.15)',
              color: isHost ? '#FBBF24' : isSpectator ? '#60A5FA' : '#C084FC',
              border: `1px solid ${isHost ? 'rgba(245, 158, 11, 0.35)' : isSpectator ? 'rgba(59, 130, 246, 0.35)' : 'rgba(139, 92, 246, 0.35)'}`
            }}>
              {isHost ? '👑 Host' : isSpectator ? '👀 Penonton' : `🪑 Kursi P${(myPlayerIndex ?? 0) + 1}`}
            </span>

            {/* Room Invite Button */}
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

            {/* Audit Log Toggle */}
            <button 
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setIsLogDrawerOpen(true)}
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>📜</span>
              <span>Log ({activityLogs.length})</span>
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
                <span>{t('truf.truf_suit')}:</span>
                <span style={{ color: activeSuitObj.color, fontWeight: 800 }}>
                  {activeSuitObj.label} {t('truf.suit_' + activeSuitObj.key, activeSuitObj.name)}
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
            const canEdit = canEditPlayer(idx)
            const isMe = myPlayerIndex === idx

            return (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isMe
                    ? 'rgba(139, 92, 246, 0.12)'
                    : isDealer 
                    ? 'rgba(245, 158, 11, 0.08)' 
                    : 'rgba(0,0,0,0.25)',
                  border: isMe
                    ? '1.5px solid #8B5CF6'
                    : isDealer 
                    ? '1px solid rgba(245, 158, 11, 0.3)' 
                    : '1px solid var(--border-glass)',
                  padding: '12px 16px',
                  borderRadius: '12px'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{name}</span>
                    {isMe && (
                      <span style={{ fontSize: '0.7rem', background: '#8B5CF6', color: '#FFF', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        {t('truf.you_badge')}
                      </span>
                    )}
                    {isDealer && <span style={{ fontSize: '0.72rem', background: '#F59E0B', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>{t('truf.dealer_badge')}</span>}
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
                        {t('truf.target_bid')}: {bids[idx]}
                      </span>
                      {wons[idx] === bids[idx] ? (
                        <span style={{ color: '#34D399', fontWeight: 700 }}>{t('truf.exact_bid')}</span>
                      ) : wons[idx] < bids[idx] ? (
                        <span style={{ color: '#F87171', fontWeight: 600 }}>{t('truf.under_bid', { diff: bids[idx] - wons[idx] })}</span>
                      ) : (
                        <span style={{ color: '#FB923C', fontWeight: 600 }}>{t('truf.over_bid', { diff: wons[idx] - bids[idx] })}</span>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {canEdit ? (
                    <>
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
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '1.2rem', fontWeight: 800, minWidth: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        {val}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                        🔒 {name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Suit Selector (In Bid Phase) */}
        {inputPhase === 'bid' && (
          <div style={{ marginBottom: '20px' }}>
            <label className="form-label">{t('truf.truf_suit')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {SUITS.map(suit => (
                <button
                  key={suit.id}
                  type="button"
                  disabled={!isLocalOrOffline && !isHost && myPlayerIndex !== dealerIndex}
                  onClick={() => {
                    try { hapticsService.light() } catch {}
                    setTrufSuit(suit.id)
                    broadcastState({ trufSuit: suit.id })
                    addLog(`Memilih Truf: ${t('truf.suit_' + suit.key, suit.name)}`, 'suit')
                  }}
                  style={{
                    background: trufSuit === suit.id ? 'var(--primary)' : 'var(--bg-glass-strong)',
                    color: trufSuit === suit.id ? '#FFF' : suit.color,
                    border: trufSuit === suit.id ? '2px solid #C084FC' : '1px solid var(--border-glass)',
                    borderRadius: '10px',
                    padding: '10px 4px',
                    fontSize: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    boxShadow: trufSuit === suit.id ? '0 0 15px rgba(168, 85, 247, 0.45)' : 'none',
                    opacity: (!isLocalOrOffline && !isHost && myPlayerIndex !== dealerIndex && trufSuit !== suit.id) ? 0.6 : 1
                  }}
                >
                  <span>{suit.label}</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700 }}>{t('truf.suit_' + suit.key, suit.name)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phase Buttons */}
        {isSpectator ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '14px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.88rem'
          }}>
            {inputPhase === 'bid'
              ? '⏳ Pemain sedang memasang target bid masing-masing...'
              : `⏳ Pertandingan ronde sedang berlangsung (Trik: ${totalWon}/13).`}
          </div>
        ) : inputPhase === 'bid' ? (
          <button className="btn btn-primary btn-block" onClick={handleProceedToWon}>
            ➡️ {t('truf.save_bid')}
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setInputPhase('bid')
                broadcastState({ inputPhase: 'bid' })
                addLog('Mengembalikan ke fase Bid', 'bid')
              }}
            >
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>📊 {t('truf.leaderboard')}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Set putaran per 4 ronde • Detail skor (+/-) & bid tiap ronde
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isHost && localRounds.length > 0 && onUndoRound && (
              <button type="button" className="btn btn-danger btn-sm" onClick={handleUndo}>
                ↩️ {t('truf.undo_btn')}
              </button>
            )}
            {onOpenShareModal && localRounds.length > 0 && (
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => onOpenShareModal(localRounds)}
              >
                📸 {t('truf.share_916_btn')}
              </button>
            )}
            {isHost && onFinalizeGame && localRounds.length > 0 && (
              <button 
                type="button" 
                className="btn btn-primary btn-sm" 
                onClick={() => onFinalizeGame(localRounds)}
              >
                🏁 {t('truf.finish_btn')}
              </button>
            )}
          </div>
        </div>

        {/* Scoreboard Table with Set Rounding (Newest Round First on the Left) */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '2px', textAlign: 'center', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left', minWidth: '100px' }}>{t('truf.players_col')}</th>
                <th style={{ padding: '10px 8px', minWidth: '85px', background: 'rgba(255,255,255,0.03)' }}>{t('truf.total_score_col')}</th>
                {localRounds.slice().reverse().map((r, i) => {
                  const rNum = r.round_number
                  const setNum = Math.ceil(rNum / 4)
                  const isEndOfSetInReverse = (rNum % 4 === 1) && localRounds.some(rd => rd.round_number === setNum * 4)
                  const rSuitId = r.round_data?.trufSuit ?? r.round_data?.truf_suit ?? r.roundData?.trufSuit ?? r.truf_suit_index ?? 0
                  const rSuit = SUITS.find(s => s.id === rSuitId) || SUITS[0]
                  const rTotalBid = r.round_data?.totalBid ?? r.roundData?.totalBid ?? r.player_scores?.reduce((sum, p) => sum + (p.stats?.bid ?? 0), 0) ?? 0
                  const rForcedMode = r.round_data?.forcedPlayMode ?? r.roundData?.forcedPlayMode
                  const rIsMainAtas = rForcedMode ? rForcedMode === 'atas' : rTotalBid > 13

                  return (
                    <React.Fragment key={r.id || i}>
                      <th style={{ 
                        padding: '8px 6px', 
                        minWidth: '85px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '6px'
                      }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800 }}>{t('truf.table_round', { num: rNum })}</div>
                        <div style={{ fontSize: '0.7rem', color: rSuit?.color || 'var(--text-muted)' }}>
                          {rSuit?.label} {t('truf.suit_' + rSuit?.key, rSuit?.name)}
                        </div>
                        <div style={{
                          marginTop: '3px',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          background: rIsMainAtas ? 'rgba(59, 130, 246, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                          color: rIsMainAtas ? '#60A5FA' : '#FB923C',
                          border: `1px solid ${rIsMainAtas ? 'rgba(59, 130, 246, 0.35)' : 'rgba(249, 115, 22, 0.35)'}`,
                          whiteSpace: 'nowrap'
                        }}>
                          {rIsMainAtas ? '▲ ' + t('truf.mode_atas_short') : '▼ ' + t('truf.mode_bawah_short')} ({rTotalBid})
                        </div>
                      </th>
                      {/* Set Rounding Column at every 4th round (rendered after R1/R5/etc. in reverse order) */}
                      {isEndOfSetInReverse && (
                        <th style={{
                          padding: '8px 6px',
                          minWidth: '95px',
                          background: 'rgba(168, 85, 247, 0.18)',
                          border: '1.5px solid rgba(168, 85, 247, 0.45)',
                          borderRadius: '8px',
                          color: '#C084FC',
                          fontWeight: 800
                        }}>
                          <div style={{ fontSize: '0.82rem' }}>⭕ {t('truf.set_title', { num: setNum })}</div>
                          <div style={{ fontSize: '0.68rem', color: '#E9D5FF' }}>Akumulasi</div>
                        </th>
                      )}
                    </React.Fragment>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {playerNames.map((name, idx) => {
                const total = latestScores[idx] || 0
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700 }}>{name}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 800, fontSize: '1rem', color: total >= 0 ? '#34D399' : '#F87171', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
                      {total > 0 ? `+${total}` : total}
                    </td>
                    {localRounds.slice().reverse().map((r, rIdx) => {
                      const rNum = r.round_number
                      const setNum = Math.ceil(rNum / 4)
                      const isEndOfSetInReverse = (rNum % 4 === 1) && localRounds.some(rd => rd.round_number === setNum * 4)
                      const ps = r.player_scores?.find(p => p.player_index === idx)
                      const change = ps?.score_change ?? 0
                      const bid = ps?.stats?.bid ?? 0
                      const won = ps?.stats?.won ?? 0
                      const isPass = bid === won

                      // Cumulative score of the 4th round for the set total
                      const setEndRound = isEndOfSetInReverse ? localRounds.find(rd => rd.round_number === setNum * 4) : null
                      const setCumScore = setEndRound?.player_scores?.find(p => p.player_index === idx)?.score_cumulative ?? 0

                      return (
                        <React.Fragment key={r.id || rIdx}>
                          <td style={{ padding: '8px 4px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                              {/* Bulatan Skor Ronde: Dilingkari jika Pas/Dapat Bid */}
                              {isPass ? (
                                <div 
                                  title="Pas / Dapat Bid (Dibulatkan)"
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    border: '2.5px solid #34D399',
                                    background: 'rgba(52, 211, 153, 0.22)',
                                    color: '#34D399',
                                    fontWeight: 900,
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 0 10px rgba(52, 211, 153, 0.35)'
                                  }}
                                >
                                  {change > 0 ? `+${change}` : change}
                                </div>
                              ) : (
                                <div style={{
                                  height: '32px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#F87171',
                                  fontWeight: 800,
                                  fontSize: '0.88rem'
                                }}>
                                  {change}
                                </div>
                              )}
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                B:<strong style={{ color: '#FCD34D' }}>{bid}</strong> / T:<strong style={{ color: '#38BDF8' }}>{won}</strong>
                              </span>
                            </div>
                          </td>

                          {/* Set Rounding Total Cell */}
                          {isEndOfSetInReverse && (
                            <td style={{
                              padding: '6px 4px',
                              background: 'rgba(168, 85, 247, 0.12)',
                              border: '1.5px solid rgba(168, 85, 247, 0.35)',
                              borderRadius: '8px',
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              color: setCumScore >= 0 ? '#A7F3D0' : '#FECACA'
                            }}>
                              {setCumScore > 0 ? `+${setCumScore}` : setCumScore}
                            </td>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Round Breakdown Cards */}
      {localRounds.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', marginTop: '16px' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📋</span>
            <span>{t('truf.round_details_title')}</span>
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {localRounds.slice().reverse().map((round, rIndex) => {
              const rNum = round.round_number
              const setNum = Math.ceil(rNum / 4)
              const rDealerIdx = round.round_data?.dealerIndex ?? ((firstDealer + rNum - 1) % 4)
              const rSuitId = round.round_data?.trufSuit ?? round.round_data?.truf_suit ?? round.roundData?.trufSuit ?? round.truf_suit_index ?? 0
              const rSuitObj = SUITS.find(s => s.id === rSuitId) || SUITS[0]
              const rTotalBid = round.round_data?.totalBid ?? round.roundData?.totalBid ?? round.player_scores?.reduce((sum, p) => sum + (p.stats?.bid ?? 0), 0) ?? 0
              const rForcedMode = round.round_data?.forcedPlayMode ?? round.roundData?.forcedPlayMode
              const rIsMainAtas = rForcedMode ? rForcedMode === 'atas' : rTotalBid > 13
              const isSetEnd = rNum % 4 === 0

              return (
                <div 
                  key={rIndex}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: isSetEnd ? 'rgba(168, 85, 247, 0.08)' : 'rgba(0,0,0,0.25)',
                    border: isSetEnd ? '1.5px solid rgba(168, 85, 247, 0.4)' : '1px solid var(--border-glass)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ 
                        fontWeight: 800, 
                        color: '#A855F7', 
                        fontSize: '0.9rem',
                        background: 'rgba(168, 85, 247, 0.15)',
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}>
                        {t('truf.table_round_title', { num: rNum })}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: isSetEnd ? '#C084FC' : '#93C5FD', fontWeight: 700 }}>
                        ⭕ {t('truf.set_title', { num: setNum })} {isSetEnd ? t('truf.end_of_set') : ''}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: rIsMainAtas ? 'rgba(59, 130, 246, 0.2)' : 'rgba(249, 115, 22, 0.2)',
                        color: rIsMainAtas ? '#60A5FA' : '#FB923C',
                        border: `1px solid ${rIsMainAtas ? 'rgba(59, 130, 246, 0.4)' : 'rgba(249, 115, 22, 0.4)'}`
                      }}>
                        {rIsMainAtas ? '▲ ' + t('truf.mode_atas') : '▼ ' + t('truf.mode_bawah')} ({t('truf.total_bid', { count: rTotalBid })})
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                      <span>Dealer: <strong>{playerNames[rDealerIdx]}</strong> 🎲</span>
                      <span>Truf: <strong style={{ color: rSuitObj.color }}>{rSuitObj.label} {t('truf.suit_' + rSuitObj.key, rSuitObj.name)}</strong></span>
                    </div>
                  </div>

                  {/* 4 Players details grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                    {playerNames.map((name, pIdx) => {
                      const ps = round.player_scores?.find(p => p.player_index === pIdx)
                      const bid = ps?.stats?.bid ?? 0
                      const won = ps?.stats?.won ?? 0
                      const change = ps?.score_change ?? 0
                      const cumScore = ps?.score_cumulative ?? 0
                      const isPass = bid === won
                      const diff = won - bid

                      return (
                        <div
                          key={pIdx}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem' }}>{name}</span>
                            {/* Bulatan Skor di Kartu Rincian */}
                            {isPass ? (
                              <span 
                                title="Pas (Dibulatkan)"
                                style={{ 
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  border: '2px solid #34D399',
                                  background: 'rgba(52, 211, 153, 0.22)',
                                  color: '#34D399',
                                  fontWeight: 900, 
                                  fontSize: '0.82rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 0 8px rgba(52, 211, 153, 0.35)'
                                }}
                              >
                                {change > 0 ? `+${change}` : change}
                              </span>
                            ) : (
                              <span style={{ 
                                fontWeight: 800, 
                                fontSize: '0.88rem',
                                color: '#F87171'
                              }}>
                                {change}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Bid: <strong style={{ color: '#FCD34D' }}>{bid}</strong></span>
                            <span>Trik: <strong style={{ color: '#38BDF8' }}>{won}</strong></span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', marginTop: '2px' }}>
                            <span style={{ color: isPass ? '#34D399' : '#F87171', fontWeight: 600 }}>
                              {isPass ? t('truf.exact_bid') : diff > 0 ? t('truf.over_bid', { diff }) : t('truf.under_bid', { diff: Math.abs(diff) })}
                            </span>
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>
                              Total: <strong>{cumScore}</strong>
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
                  broadcastState({ forcedPlayMode: 'atas', inputPhase: 'won' })
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
                  broadcastState({ forcedPlayMode: 'bawah', inputPhase: 'won' })
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

      {/* Realtime Table Activity & Audit Log Drawer */}
      <ActivityLogDrawer
        isOpen={isLogDrawerOpen}
        onClose={() => setIsLogDrawerOpen(false)}
        logs={activityLogs}
      />
    </div>
  )
}
