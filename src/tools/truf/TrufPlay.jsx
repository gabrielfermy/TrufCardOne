import React, { useState, useEffect, useRef } from 'react'
import { SUITS, calculateTrufRoundScores, determineNextDealer, getDealerConsecutiveStreak, formatDealerStreakStatus, DEFAULT_DEALER_WORD } from './trufLogic'
import { dedupeRounds } from '../../utils/roundUtils'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { gameService } from '../../services/gameService'
import { deviceService } from '../../services/deviceService'
import { useTranslation } from '../../i18n/I18nContext'
import RoomInviteModal from '../../components/common/RoomInviteModal'
import ActivityLogDrawer from '../../components/common/ActivityLogDrawer'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

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
  onReleaseSeat,
  myPlayerIndex: propMyPlayerIndex
}) {
  const { t } = useTranslation()
  const playerNames = session?.player_names || ['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4']
  const settings = session?.settings || { multiplier: 1, bid0Bonus: 0, bid13Decision: true }

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
  // Strict permission: Only the Host OR the current active Scorer can change the Scorer or Dealer
  const canChangeScorer = isLocalOrOffline || isHost || isScorer
  // Only the active Scorer can edit all players. Other players can ONLY edit their own input (myPlayerIndex === idx). Spectators cannot edit anyone.
  const canEditPlayer = (idx) => {
    if (isLocalOrOffline) return true
    if (isScorer) return true
    if (myPlayerIndex !== null && myPlayerIndex === idx) return true
    return false
  }

  // Helper to determine automatic Scorer fallback if current scorer goes offline / stands up:
  // 1. Host (seat 0 or host seat) if online
  // 2. First online player in roster
  // 3. Fallback to Player 0
  const computeFallbackScorer = (playerUserIds = [], currentScorer = 0) => {
    if (currentScorer >= 0 && playerUserIds && playerUserIds[currentScorer]) return currentScorer
    if (playerUserIds && playerUserIds[0]) return 0
    const firstOnline = playerUserIds ? playerUserIds.findIndex(id => Boolean(id)) : -1
    if (firstOnline !== -1) return firstOnline
    return 0
  }

  // Optimistic local state for rounds to guarantee instant Round advancement
  const [localRounds, setLocalRounds] = useState(() => dedupeRounds(rounds || []))

  // Activity Logging state
  const [activityLogs, setActivityLogs] = useState([])
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isLogDrawerOpen, setIsLogDrawerOpen] = useState(false)
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false)

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
    if (rounds) {
      const dedupedRounds = dedupeRounds(rounds)
      setLocalRounds(prev => {
        const dedupedPrev = dedupeRounds(prev)
        if (dedupedRounds.length >= dedupedPrev.length) {
          return dedupedRounds
        }
        return dedupedPrev
      })
    }
  }, [rounds])

  const playerCount = playerNames.length
  const totalTricks = session?.settings?.totalTricks || (playerCount === 3 ? 17 : playerCount === 5 ? 10 : 13)

  const initialScores = session?.settings?.initialScores || session?.initial_scores || Array(playerCount).fill(0)
  const hasInitialScores = initialScores.some(s => s !== 0)

  // Deduplicated authoritative rounds list for current render
  const activeRounds = dedupeRounds(localRounds)

  // Cumulative Leaderboard / Current Cumulative Scores
  const latestScores = Array(playerCount).fill(0).map((_, i) => initialScores[i] || 0)
  if (activeRounds.length > 0) {
    const lastRound = activeRounds[activeRounds.length - 1]
    const hasCumulative = lastRound.player_scores?.some(ps => ps.score_cumulative !== undefined && ps.score_cumulative !== null)
    if (hasCumulative) {
      lastRound.player_scores?.forEach(ps => {
        if (ps.player_index !== undefined && ps.player_index < playerCount) {
          latestScores[ps.player_index] = ps.score_cumulative ?? 0
        }
      })
    } else {
      activeRounds.forEach(r => {
        const pScores = r.player_scores || r.playerScores || []
        pScores.forEach(ps => {
          const pIdx = ps.player_index ?? 0
          if (pIdx < playerCount) {
            latestScores[pIdx] += (ps.score_change ?? 0)
          }
        })
      })
    }
  }

  const firstDealer = session?.first_dealer ?? session?.settings?.first_dealer ?? session?.settings?.firstDealer ?? 0
  const streakWord = session?.settings?.streakWord || DEFAULT_DEALER_WORD
  const streakDisplayMode = session?.settings?.streakDisplayMode || 'word'
  const defaultDealerIndex = determineNextDealer(activeRounds, firstDealer, initialScores, playerCount)
  const [manualDealerIndex, setManualDealerIndex] = useState(null)
  const [showTransferDealerModal, setShowTransferDealerModal] = useState(false)

  // Reset manual dealer override when active rounds advance
  useEffect(() => {
    setManualDealerIndex(null)
  }, [activeRounds.length])

  const dealerIndex = manualDealerIndex !== null ? manualDealerIndex : defaultDealerIndex
  const dealerConsecutiveStreak = getDealerConsecutiveStreak(activeRounds, dealerIndex, firstDealer) + 1
  const streakStatus = formatDealerStreakStatus(dealerConsecutiveStreak, streakWord, streakDisplayMode)
  const currentRoundNumber = activeRounds.length + 1

  // Input states for current round
  const [bids, setBids] = useState(Array(playerCount).fill(0))
  const [wons, setWons] = useState(Array(playerCount).fill(0))
  const [trufSuit, setTrufSuit] = useState(0) // Default: 0 (Sekop / Spades)
  const [inputPhase, setInputPhase] = useState('bid') // 'bid' | 'won'
  const [forcedPlayMode, setForcedPlayMode] = useState(null)
  const [showBid13Modal, setShowBid13Modal] = useState(false)
  const [showConfirmFinishModal, setShowConfirmFinishModal] = useState(false)
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
      scorerIndex,
      manualDealerIndex,
      ...overrides
    })
  }

  // Scorer transfer & takeover handlers
  const handleTransferScorer = (newIdx) => {
    if (!canChangeScorer) {
      alert('Hanya Pembuat Game (Host) atau Pencatat Skor aktif yang berwenang mengganti Scorer.')
      return
    }
    if (newIdx < 0 || newIdx >= playerCount) return
    try { hapticsService.medium() } catch {}
    setScorerIndex(newIdx)
    broadcastState({ scorerIndex: newIdx })
    setShowTransferScorerModal(false)
    const newName = playerNames[newIdx] || `Pemain ${newIdx + 1}`
    addLog(`Peran Pencatat Skor (Scorer) dialihkan ke ${newName}`, 'role')
    if (session?.id) {
      gameService.updateSessionSettings(session.id, { ...(session.settings || {}), scorerIndex: newIdx })
    }
  }

  const handleTransferDealer = (newIdx) => {
    if (!canChangeScorer) {
      alert('Hanya Pembuat Game (Host) atau Pencatat Skor aktif yang berwenang mengganti Dealer.')
      return
    }
    if (newIdx < 0 || newIdx >= playerCount) return
    try { hapticsService.medium() } catch {}
    setManualDealerIndex(newIdx)
    broadcastState({ manualDealerIndex: newIdx })
    setShowTransferDealerModal(false)
    const newName = playerNames[newIdx] || `Pemain ${newIdx + 1}`
    addLog(`Dealer dialihkan ke ${newName}`, 'role')
  }

  const handleTakeOverScorer = () => {
    if (!isHost) return
    handleTransferScorer(myPlayerIndex ?? 0)
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
          if (payload.scorerIndex !== undefined) setScorerIndex(payload.scorerIndex)
          if (payload.manualDealerIndex !== undefined) setManualDealerIndex(payload.manualDealerIndex)
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
          const isRelease = !!seatPayload.isRelease
          const pName = playerNames[seatPayload.playerIndex] || `Pemain ${seatPayload.playerIndex + 1}`
          setActivityLogs(prev => [...prev.slice(-49), {
            id: `claim-${Date.now()}`,
            timestamp: new Date().toISOString(),
            actorName: isRelease ? pName : (seatPayload.playerName || pName),
            actorRole: 'player',
            actionType: isRelease ? 'stand_up' : 'check_in',
            text: isRelease ? `Berdiri (Lepas Kursi ${seatPayload.playerIndex + 1})` : `Check-in ke Kursi ${seatPayload.playerIndex + 1} (${pName})`
          }])

          const currentArr = [...(livePlayerUserIds || session?.player_user_ids || Array(playerNames.length).fill(null))]
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

          // Persist seat occupancy to Supabase game_sessions
          if (session?.id) {
            gameService.updateSessionPlayerUserIds(session.id, updatedIds)
          }

          // If the player who stood up was the current Scorer, immediately failover Scorer to Host / online seat!
          if (isRelease && seatPayload.playerIndex === scorerIndex && !isLocalOrOffline) {
            const fallbackIdx = computeFallbackScorer(updatedIds, -1)
            setScorerIndex(fallbackIdx)
            const fallbackName = playerNames[fallbackIdx] || `Pemain ${fallbackIdx + 1}`
            addLog(`Peran Pencatat Skor (Scorer) otomatis dialihkan ke ${fallbackName} karena ${pName} berdiri / offline.`, 'role')
            if (session?.id) {
              gameService.updateSessionSettings(session.id, { ...(session.settings || {}), scorerIndex: fallbackIdx })
              gameService.broadcastLiveState(channel, {
                senderId: clientId,
                bids,
                wons,
                trufSuit,
                inputPhase,
                forcedPlayMode,
                scorerIndex: fallbackIdx,
                manualDealerIndex
              })
            }
          }
        }
      },
      onRoundAdvance: (payload) => {
        if (payload?.senderId && payload.senderId === clientId) return
        if (payload?.round) {
          let updated = []
          setLocalRounds(prev => {
            const deduped = dedupeRounds([...prev, payload.round])
            updated = deduped
            return deduped
          })
          setBids(Array(playerCount).fill(0))
          setWons(Array(playerCount).fill(0))
          setTrufSuit(0)
          setInputPhase('bid')
          setForcedPlayMode(null)
          setErrorMsg('')
          soundService.playVictory()

          // If this client is the host and NOT the scorer, ensure round is safely saved under host's session
          if (isHost && !isScorer && onSaveRound) {
            onSaveRound(payload.round).catch(err => console.warn('Host auto-sync round error:', err))
          }

          // Check if game ended due to 10 consecutive dealer rounds
          const dIdx = payload.round.round_data?.dealerIndex ?? payload.round.dealer_index
          const streak = getDealerConsecutiveStreak(updated.length > 0 ? updated : [payload.round], dIdx, firstDealer)
          if ((streak >= 10 || payload.isGameOver10x) && onFinalizeGame) {
            setTimeout(() => {
              onFinalizeGame(updated.length > 0 ? updated : undefined)
            }, 400)
          }
        }
      },
      onDbUpdate: async () => {
        const refreshed = await gameService.getSession(session.id)
        if (refreshed?.player_user_ids) {
          session.player_user_ids = refreshed.player_user_ids
          setLivePlayerUserIds(refreshed.player_user_ids)
          // If current scorer is offline in refreshed cloud state, automatically fail over
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
        if (refreshed?.game_rounds) {
          const dedupedCloud = dedupeRounds(refreshed.game_rounds)
          setLocalRounds(prev => {
            const dedupedPrev = dedupeRounds(prev)
            if (dedupedCloud.length >= dedupedPrev.length) {
              return dedupedCloud
            }
            return dedupedPrev
          })
        }
      }
    })

    realtimeChannelRef.current = channel

    // 2. High-Reliability Liveness Polling Fallback (every 2.5s)
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
          const dedupedCloud = dedupeRounds(refreshed.game_rounds)
          setLocalRounds(prev => {
            const dedupedPrev = dedupeRounds(prev)
            if (dedupedCloud.length >= dedupedPrev.length) {
              return dedupedCloud
            }
            return dedupedPrev
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
      const oldVal = next[playerIdx] || 0
      const newVal = Math.max(0, Math.min(totalTricks, oldVal + delta))
      if (oldVal !== newVal) {
        next[playerIdx] = newVal
        broadcastState({ bids: next })
        const targetName = playerNames[playerIdx]
        const text = isScorer && myPlayerIndex !== playerIdx
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
      const oldVal = next[playerIdx] || 0
      const newVal = Math.max(0, Math.min(totalTricks, oldVal + delta))
      if (oldVal !== newVal) {
        next[playerIdx] = newVal
        broadcastState({ wons: next })
        const targetName = playerNames[playerIdx]
        const text = isScorer && myPlayerIndex !== playerIdx
          ? `Mengubah Trik ${targetName} dari ${oldVal} menjadi ${newVal}`
          : `Mengatur Trik Menang: ${newVal}`
        addLog(text, 'won')
      }
      return next
    })
  }

  const handleWonDelta = (playerIdx, deltaFromBid) => {
    if (!canEditPlayer(playerIdx)) return
    setErrorMsg('')
    try {
      hapticsService.light()
      soundService.playTick()
    } catch {}

    setWons(prev => {
      const next = [...prev]
      const oldVal = next[playerIdx] || 0
      const playerBid = bids[playerIdx] || 0
      const newVal = Math.max(0, Math.min(totalTricks, playerBid + deltaFromBid))
      if (oldVal !== newVal) {
        next[playerIdx] = newVal
        broadcastState({ wons: next })
        const targetName = playerNames[playerIdx]
        const deltaLabel = deltaFromBid === 0 ? 'Pas' : deltaFromBid > 0 ? `Lebih +${deltaFromBid}` : `Kurang ${deltaFromBid}`
        const text = isScorer && myPlayerIndex !== playerIdx
          ? `Mengatur Hasil ${targetName}: ${deltaLabel} (Trik: ${newVal})`
          : `Hasil Trik: ${deltaLabel} (${newVal})`
        addLog(text, 'won')
      }
      return next
    })
  }

  // Handle Proceed to Won Phase (Pre-fills with exact bids so scorer only inputs deviations!)
  const handleProceedToWon = () => {
    if (!isScorer) return
    setErrorMsg('')
    if (settings.bid13Decision && totalBid === totalTricks && !forcedPlayMode) {
      setShowBid13Modal(true)
      return
    }
    try {
      hapticsService.medium()
      soundService.playCardFlip()
    } catch {}
    // Pre-populate wons with current bids if wons are all 0
    const nextWons = [...bids]
    setWons(nextWons)
    setInputPhase('won')
    broadcastState({ wons: nextWons, inputPhase: 'won' })
    addLog(`Fase Bid selesai (Total Bid: ${totalBid}). Memulai fase Hasil Trik.`, 'play_mode')
  }

  // Handle Save Round (Instant Optimistic UI & Broadcast)
  const handleSaveRoundSubmit = async () => {
    if (!isScorer) return
    setErrorMsg('')
    if (totalWon !== totalTricks) {
      try { hapticsService.warning() } catch {}
      setErrorMsg(t('truf.validation_won_total', { count: totalTricks, actual: totalWon }) || `Total Trik dari ke-${playerCount} pemain harus tepat ${totalTricks}! (Saat ini: ${totalWon})`)
      return
    }

    const calculatedScores = calculateTrufRoundScores(bids, wons, settings, totalBid, forcedPlayMode)
    
    // Compute cumulative scores from localRounds (starting with initialScores)
    const lastCumulative = Array(playerCount).fill(0).map((_, i) => initialScores[i] || 0)
    if (localRounds.length > 0) {
      const lastRound = localRounds[localRounds.length - 1]
      const lastScores = lastRound.player_scores || lastRound.playerScores || []
      lastScores.forEach(ps => {
        const pIdx = ps.player_index ?? ps.playerIndex
        if (pIdx !== undefined && pIdx >= 0 && pIdx < playerCount) {
          lastCumulative[pIdx] = ps.score_cumulative ?? ps.scoreCumulative ?? latestScores[pIdx] ?? 0
        }
      })
    }

    const scoreRecords = calculatedScores.map((change, idx) => ({
      player_index: idx,
      playerIndex: idx,
      stats: { bid: bids[idx], won: wons[idx] },
      bid: bids[idx],
      won: wons[idx],
      score_change: change,
      scoreChange: change,
      score_cumulative: (lastCumulative[idx] ?? latestScores[idx] ?? 0) + change,
      scoreCumulative: (lastCumulative[idx] ?? latestScores[idx] ?? 0) + change
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
      dealer_index: dealerIndex,
      dealerIndex: dealerIndex,
      player_scores: scoreRecords,
      playerScores: scoreRecords
    }

    // 1. Instantly advance UI locally
    const updatedRounds = dedupeRounds([...activeRounds, newRoundPayload])
    setLocalRounds(updatedRounds)
    setBids(Array(playerCount).fill(0))
    setWons(Array(playerCount).fill(0))
    setTrufSuit(0)
    setInputPhase('bid')
    setForcedPlayMode(null)
    setErrorMsg('')

    try {
      hapticsService.success()
      soundService.playVictory()
    } catch {}

    addLog(`Menyimpan Ronde ${currentRoundNumber} & melangkah ke ronde berikutnya`, 'save_round')

    // Check if this round concludes 10 consecutive rounds with the same dealer without replacement
    const completedStreak = getDealerConsecutiveStreak(updatedRounds, dealerIndex, firstDealer)
    const isGameOver10x = completedStreak >= 10

    if (isGameOver10x) {
      addLog(t('truf.game_over_10_dealer', { name: playerNames[dealerIndex] }), 'game_over')
    }

    // 2. Broadcast round advance to all other phones with senderId
    if (realtimeChannelRef.current) {
      gameService.broadcastRoundAdvance(realtimeChannelRef.current, { 
        senderId: clientId,
        round: newRoundPayload,
        isGameOver10x
      })
    }

    // 3. Background async sync to server/storage
    try {
      if (onSaveRound) {
        await onSaveRound(newRoundPayload)
      }
    } catch (err) {
      console.warn('Background round sync note:', err)
    }

    // 4. If 10 consecutive rounds reached, automatically end and finalize the game!
    if (isGameOver10x && onFinalizeGame) {
      setTimeout(() => {
        onFinalizeGame(updatedRounds)
      }, 400)
    }
  }

  const handleUndo = () => {
    setLocalRounds(prev => dedupeRounds(prev).slice(0, -1))
    addLog(`Membatalkan (Undo) ronde terakhir`, 'undo')
    if (onUndoRound) onUndoRound()
  }

  // Bid 13 Decider Handlers: Shifts all player bids by +1 (for Main Atas) or -1 (for Main Bawah)
  const handleBid13ChooseAtas = () => {
    if (!isScorer) return
    const adjustedBids = bids.map(b => b + 1)
    const newTotal = adjustedBids.reduce((a, b) => a + b, 0)
    setBids(adjustedBids)
    setForcedPlayMode('atas')
    setShowBid13Modal(false)
    setInputPhase('won')
    broadcastState({ 
      bids: adjustedBids, 
      forcedPlayMode: 'atas', 
      inputPhase: 'won' 
    })
    try {
      hapticsService.medium()
      soundService.playCardFlip()
    } catch {}
    addLog(`Aturan Bid ${totalTricks}: Memilih Main Atas. Seluruh bid ditambah 1 (Total Bid: ${newTotal}).`, 'play_mode')
  }

  const handleBid13ChooseBawah = () => {
    if (!isScorer) return
    const adjustedBids = bids.map(b => Math.max(0, b - 1))
    const newTotal = adjustedBids.reduce((a, b) => a + b, 0)
    setBids(adjustedBids)
    setForcedPlayMode('bawah')
    setShowBid13Modal(false)
    setInputPhase('won')
    broadcastState({ 
      bids: adjustedBids, 
      forcedPlayMode: 'bawah', 
      inputPhase: 'won' 
    })
    try {
      hapticsService.medium()
      soundService.playCardFlip()
    } catch {}
    addLog(`Aturan Bid ${totalTricks}: Memilih Main Bawah. Seluruh bid dikurangi 1 (Total Bid: ${newTotal}).`, 'play_mode')
  }

  const isMainAtas = forcedPlayMode ? forcedPlayMode === 'atas' : totalBid > totalTricks
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
      <div className="glass-panel" style={{ padding: '10px 12px', marginBottom: '12px' }}>
        {/* Top Meta Bar: Navigation & Action Chips */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px', minWidth: 0 }}>
          {/* Left: Lobby Back & Session Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
            {onBackToLobby && (
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onBackToLobby}
                style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}
                title="Kembali ke Lobby Truf"
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
              {session?.title || 'Truf Session'}
            </span>
            {/* Role Badge */}
            <span 
              onClick={() => setIsInviteModalOpen(true)}
              title="Klik untuk atur kursi / Stand Up / undang teman"
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
            >
              {isHost ? '👑 Host' : isSpectator ? '👀 Penonton' : `🪑 P${(myPlayerIndex ?? 0) + 1} (Atur)`}
            </span>
          </div>

          {/* Right Action Icons Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {/* Room Invite Button */}
            <button 
              type="button"
              className="btn btn-sm"
              onClick={() => setIsInviteModalOpen(true)}
              style={{
                fontSize: '0.72rem',
                padding: '3px 7px',
                background: 'var(--badge-purple-bg)',
                border: '1px solid var(--badge-purple-border)',
                color: 'var(--badge-purple-text)',
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

            {/* Audit Log Toggle */}
            <button 
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => setIsLogDrawerOpen(true)}
              style={{
                fontSize: '0.72rem',
                padding: '3px 7px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title="Log Aktivitas Ronde"
            >
              <span>📜</span>
              <span>{activityLogs.length}</span>
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
              title="Aturan Permainan & Rumus Skor"
            >
              <span>📖</span>
            </button>
          </div>
        </div>

        {/* Bottom Row: Large Round Number + Live Table Roles (Scorer & Dealer) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--primary)', margin: 0, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
            {t('truf.round', { num: currentRoundNumber })}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {/* Scorer Pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'var(--badge-purple-bg)',
              border: '1px solid var(--badge-purple-border)',
              padding: '2px 7px',
              borderRadius: '8px',
              fontSize: '0.74rem'
            }}>
              <span style={{ color: 'var(--text-muted)' }}>✍️</span>
              <span style={{ fontWeight: 800, color: 'var(--badge-purple-text)', whiteSpace: 'nowrap' }}>
                {playerNames[scorerIndex]} {myPlayerIndex === scorerIndex && !isLocalOrOffline ? `(${t('truf.you_badge')})` : ''}
              </span>
              {!isLocalOrOffline && canChangeScorer && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0 4px', fontSize: '0.65rem', height: '18px', minWidth: '18px', borderRadius: '4px', border: 'none', background: 'var(--bg-glass-strong)' }}
                  onClick={() => setShowTransferScorerModal(true)}
                  title={t('truf.transfer_scorer')}
                >
                  ⇄
                </button>
              )}
            </div>

            {/* Dealer Pill */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: dealerConsecutiveStreak >= 7 ? 'var(--badge-red-bg)' : 'var(--badge-gold-bg)',
              border: `1px solid ${dealerConsecutiveStreak >= 7 ? 'var(--badge-red-border)' : 'var(--badge-gold-border)'}`,
              padding: '2px 7px',
              borderRadius: '8px',
              fontSize: '0.74rem'
            }}>
              <span>🎲</span>
              <span style={{ fontWeight: 800, color: dealerConsecutiveStreak >= 7 ? 'var(--badge-red-text)' : 'var(--badge-gold-text)', whiteSpace: 'nowrap' }}>
                {playerNames[dealerIndex]} {myPlayerIndex === dealerIndex && !isLocalOrOffline ? `(${t('truf.you_badge')})` : ''}
              </span>
              {dealerConsecutiveStreak > 1 && (
                <span style={{
                  fontSize: '0.65rem',
                  padding: '0 4px',
                  borderRadius: '4px',
                  fontWeight: 900,
                  background: dealerConsecutiveStreak >= 7 ? 'var(--accent-red)' : 'var(--accent-gold)',
                  color: '#FFF'
                }}>
                  {streakStatus.progressText}
                </span>
              )}
              {canChangeScorer && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0 4px', fontSize: '0.65rem', height: '18px', minWidth: '18px', borderRadius: '4px', border: 'none', background: 'var(--bg-glass-strong)' }}
                  onClick={() => setShowTransferDealerModal(true)}
                  title={t('truf.transfer_dealer') || 'Ganti / Pilih Dealer untuk ronde ini'}
                >
                  ⇄
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CHOLOKOPOK Streak Badges in Truf */}
        {dealerConsecutiveStreak > 1 && streakStatus.displayMode === 'word' && (
          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '10px' }}>
            {streakStatus.letters.map((char, idx) => {
              const isLit = idx < streakStatus.activeCount
              return (
                <div
                  key={idx}
                  style={{
                    width: '24px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '5px',
                    fontWeight: 900,
                    fontSize: '0.8rem',
                    border: isLit 
                      ? '1.5px solid rgba(245, 158, 11, 0.9)' 
                      : '1px dashed var(--border-glass)',
                    background: isLit 
                      ? 'linear-gradient(135deg, #F59E0B, #D97706)' 
                      : 'rgba(255, 255, 255, 0.03)',
                    color: isLit ? '#000' : 'var(--text-dim)',
                    boxShadow: isLit ? '0 0 8px rgba(245, 158, 11, 0.35)' : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {char}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Dealer Streak Warning Banner */}
      {dealerConsecutiveStreak >= 7 && (
        <div style={{
          background: dealerConsecutiveStreak >= 10 ? 'rgba(239, 68, 68, 0.18)' : 'rgba(245, 158, 11, 0.12)',
          border: `1px solid ${dealerConsecutiveStreak >= 10 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(245, 158, 11, 0.4)'}`,
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>{dealerConsecutiveStreak >= 10 ? '🚨' : '⚠️'}</span>
            <div>
              <div style={{ fontWeight: 700, color: dealerConsecutiveStreak >= 10 ? '#FCA5A5' : '#FCD34D', fontSize: '0.88rem' }}>
                {t('truf.dealer_streak_warning', { name: playerNames[dealerIndex], count: dealerConsecutiveStreak })} ({streakStatus.progressText})
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {dealerConsecutiveStreak >= 10
                  ? `Pemain telah mencapai batas 10 ronde berturut-turut (${streakWord}). Permainan akan otomatis selesai setelah ronde ini disimpan.`
                  : `Game akan otomatis berakhir jika mencapai 10x berturut-turut (${streakWord}) tanpa pergantian dealer.`}
              </div>
            </div>
          </div>
          {isScorer && onFinalizeGame && localRounds.length > 0 && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setShowConfirmFinishModal(true)}
              style={{ fontSize: '0.8rem', padding: '6px 12px' }}
            >
              🏁 Selesaikan Sekarang
            </button>
          )}
        </div>
      )}

      {/* Input Form Panel */}
      <div className="glass-panel" style={{ padding: 'clamp(12px, 3vw, 18px)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0 }}>
              {inputPhase === 'bid' ? t('truf.phase_bid') : t('truf.phase_won')}
            </h3>
            {inputPhase === 'won' && activeSuitObj && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>{t('truf.truf_suit')}:</span>
                <span style={{ color: activeSuitObj.color, fontWeight: 800 }}>
                  {activeSuitObj.label} {t('truf.suit_' + activeSuitObj.key, activeSuitObj.name)}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {inputPhase === 'won' && (
              <span style={{
                fontSize: '0.74rem',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '999px',
                whiteSpace: 'nowrap',
                background: totalWon === totalTricks ? 'var(--badge-green-bg)' : 'var(--badge-red-bg)',
                color: totalWon === totalTricks ? 'var(--badge-green-text)' : 'var(--badge-red-text)',
                border: `1px solid ${totalWon === totalTricks ? 'var(--badge-green-border)' : 'var(--badge-red-border)'}`
              }}>
                Trik: {totalWon} / {totalTricks} {totalWon === totalTricks ? '✓' : ''}
              </span>
            )}
            <span style={{
              fontSize: '0.74rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
              background: isMainAtas ? 'var(--badge-blue-bg)' : 'var(--badge-orange-bg)',
              color: isMainAtas ? 'var(--badge-blue-text)' : 'var(--badge-orange-text)',
              border: `1px solid ${isMainAtas ? 'var(--badge-blue-border)' : 'var(--badge-orange-border)'}`
            }}>
              {isMainAtas ? t('truf.main_atas') : t('truf.main_bawah')} ({t('truf.total_bid', { count: totalBid })})
            </span>
          </div>
        </div>

        {errorMsg && (
          <div style={{ background: 'var(--badge-red-bg)', color: 'var(--badge-red-text)', border: '1px solid var(--badge-red-border)', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', fontSize: '0.85rem' }}>
            {errorMsg}
          </div>
        )}

        {/* Player Input Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          {playerNames.map((name, idx) => {
            const isDealer = idx === dealerIndex
            const val = inputPhase === 'bid' ? bids[idx] : wons[idx]
            const playerBid = bids[idx] || 0
            const wonVal = wons[idx] || 0
            const deltaFromBid = wonVal - playerBid
            const canEdit = canEditPlayer(idx)
            const isMe = myPlayerIndex === idx

            return (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: isMe
                    ? 'var(--card-active-bg)'
                    : isDealer 
                    ? 'var(--badge-gold-bg)' 
                    : 'var(--bg-card-nested)',
                  border: isMe
                    ? '1.5px solid var(--card-active-border)'
                    : isDealer 
                    ? '1.5px solid var(--badge-gold-border)' 
                    : '1px solid var(--border-glass)',
                  padding: '10px 12px',
                  borderRadius: '14px',
                  boxShadow: isMe ? '0 2px 10px var(--primary-glow)' : '0 1px 3px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Header line: Player Name + Badges + Target / Live Status */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                      {name}
                    </span>
                    {isMe && (
                      <span style={{ fontSize: '0.65rem', background: 'var(--primary)', color: '#FFF', padding: '1px 5px', borderRadius: '4px', fontWeight: 800, textTransform: 'uppercase' }}>
                        {t('truf.you_badge')}
                      </span>
                    )}
                    {isDealer && (
                      <span style={{ fontSize: '0.65rem', background: 'var(--accent-gold)', color: '#FFF', padding: '1px 5px', borderRadius: '4px', fontWeight: 900 }}>
                        {t('truf.dealer_badge')}
                      </span>
                    )}
                    {idx === scorerIndex && (
                      <span style={{ fontSize: '0.65rem', background: 'var(--badge-purple-bg)', color: 'var(--badge-purple-text)', border: '1px solid var(--badge-purple-border)', padding: '1px 5px', borderRadius: '4px', fontWeight: 800 }}>
                        ✍️ {t('truf.scorer_badge')}
                      </span>
                    )}

                    {/* Multiplayer Online / Offline Seat Presence Badge */}
                    {!isLocalOrOffline && (
                      <span 
                        style={{ 
                          fontSize: '0.62rem', 
                          padding: '1px 5px', 
                          borderRadius: '4px', 
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          background: livePlayerUserIds?.[idx] ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                          color: livePlayerUserIds?.[idx] ? '#10B981' : 'var(--text-dim)',
                          border: livePlayerUserIds?.[idx] ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-glass)'
                        }}
                        title={livePlayerUserIds?.[idx] ? 'Pemain terhubung online' : 'Pemain offline / kursi kosong'}
                      >
                        <span>{livePlayerUserIds?.[idx] ? '🟢 Online' : '⚪ Offline'}</span>
                      </span>
                    )}

                    {/* Quick Stand Up button for the current player */}
                    {isMe && onReleaseSeat && !isLocalOrOffline && (
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: '0.62rem', padding: '1px 6px', height: '19px', borderRadius: '4px', color: '#F87171', borderColor: 'rgba(248, 113, 113, 0.3)' }}
                        onClick={() => onReleaseSeat(idx)}
                        title="Stand Up / Lepas kursi ini dan kembali ke mode penonton"
                      >
                        Stand Up
                      </button>
                    )}

                    {/* Quick Claim Seat button for Spectators on offline seats */}
                    {isSpectator && !livePlayerUserIds?.[idx] && onClaimSeat && !isLocalOrOffline && (
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: '0.62rem', padding: '1px 6px', height: '19px', borderRadius: '4px', color: 'var(--primary-light)' }}
                        onClick={() => onClaimSeat(idx)}
                        title="Duduki kursi pemain ini"
                      >
                        🪑 Duduki Kursi
                      </button>
                    )}
                  </div>

                  {/* Status Indicator Badges */}
                  {inputPhase === 'won' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                      <span style={{ 
                        background: 'var(--badge-purple-bg)', 
                        color: 'var(--badge-purple-text)', 
                        border: '1px solid var(--badge-purple-border)',
                        padding: '2px 7px', 
                        borderRadius: '6px', 
                        fontWeight: 800,
                        fontSize: '0.72rem',
                        whiteSpace: 'nowrap'
                      }}>
                        Bid: {playerBid}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        fontSize: '0.74rem',
                        whiteSpace: 'nowrap',
                        background: deltaFromBid === 0 ? 'var(--badge-green-bg)' : deltaFromBid < 0 ? 'var(--badge-red-bg)' : 'var(--badge-orange-bg)',
                        color: deltaFromBid === 0 ? 'var(--badge-green-text)' : deltaFromBid < 0 ? 'var(--badge-red-text)' : 'var(--badge-orange-text)',
                        border: `1px solid ${deltaFromBid === 0 ? 'var(--badge-green-border)' : deltaFromBid < 0 ? 'var(--badge-red-border)' : 'var(--badge-orange-border)'}`
                      }}>
                        {deltaFromBid === 0 ? `🎯 Pas (${wonVal})` : deltaFromBid < 0 ? `🔻 ${deltaFromBid} (${wonVal})` : `🔺 +${deltaFromBid} (${wonVal})`}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Bid:</span>
                      <span style={{
                        fontSize: '1rem',
                        fontWeight: 900,
                        color: 'var(--badge-gold-text)',
                        background: 'var(--badge-gold-bg)',
                        border: '1px solid var(--badge-gold-border)',
                        padding: '1px 8px',
                        borderRadius: '6px'
                      }}>
                        {bids[idx]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Input Controls: Unified Single-Row on Mobile */}
                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '6px' }}>
                  {inputPhase === 'won' ? (
                    /* Won Phase: Compact Segmented Quick Delta Chips + Stepper */
                    canEdit ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '6px' }}>
                        {/* Quick Delta Chips Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', flex: 1 }}>
                          {[-2, -1, 0, 1, 2].map((delta) => {
                            const isSelected = deltaFromBid === delta
                            const isPas = delta === 0
                            const isKurang = delta < 0
                            const label = isPas ? '🎯 Pas' : isKurang ? `${delta}` : `+${delta}`
                            const titleTooltip = isPas ? 'Pas (Trik = Bid)' : isKurang ? `Kurang ${Math.abs(delta)} Trik` : `Lebih +${delta} Trik`

                            const activeBg = isPas ? 'var(--accent-green)' : isKurang ? 'var(--accent-red)' : 'var(--accent-orange)'
                            const unselectedBg = isPas ? 'var(--badge-green-bg)' : isKurang ? 'var(--badge-red-bg)' : 'var(--badge-orange-bg)'
                            const unselectedColor = isPas ? 'var(--badge-green-text)' : isKurang ? 'var(--badge-red-text)' : 'var(--badge-orange-text)'
                            const unselectedBorder = isPas ? 'var(--badge-green-border)' : isKurang ? 'var(--badge-red-border)' : 'var(--badge-orange-border)'

                            return (
                              <button
                                key={delta}
                                type="button"
                                onClick={() => handleWonDelta(idx, delta)}
                                title={titleTooltip}
                                style={{
                                  padding: '6px 2px',
                                  fontSize: '0.76rem',
                                  borderRadius: '8px',
                                  fontWeight: isSelected ? 900 : 700,
                                  cursor: 'pointer',
                                  border: isSelected
                                    ? `1.5px solid ${activeBg}`
                                    : `1px solid ${unselectedBorder}`,
                                  background: isSelected
                                    ? activeBg
                                    : unselectedBg,
                                  color: isSelected
                                    ? '#FFF'
                                    : unselectedColor,
                                  boxShadow: isSelected
                                    ? `0 2px 8px ${activeBg}66`
                                    : 'none',
                                  textAlign: 'center',
                                  whiteSpace: 'nowrap',
                                  transition: 'all 0.12s ease'
                                }}
                              >
                                {label}
                              </button>
                            )
                          })}
                        </div>

                        {/* Direct Trick Stepper */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          background: 'var(--stepper-bg)',
                          padding: '2px 4px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-glass)',
                          flexShrink: 0
                        }}>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            style={{ width: '28px', height: '28px', padding: 0, fontSize: '1rem', borderRadius: '6px' }}
                            onClick={() => handleWonStep(idx, -1)}
                            title="Kurang 1 Trik"
                          >
                            -
                          </button>
                          <span style={{ fontSize: '1.05rem', fontWeight: 900, minWidth: '24px', textAlign: 'center', color: 'var(--accent-blue)' }}>
                            {wonVal}
                          </span>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            style={{ width: '28px', height: '28px', padding: 0, fontSize: '1rem', borderRadius: '6px' }}
                            onClick={() => handleWonStep(idx, 1)}
                            title="Tambah 1 Trik"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '2px 4px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Hasil Trik: <strong style={{ color: 'var(--accent-blue)' }}>{wonVal}</strong></span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', background: 'var(--bg-glass)', padding: '2px 6px', borderRadius: '4px' }}>
                          🔒 {name}
                        </span>
                      </div>
                    )
                  ) : (
                    /* Bid Phase: Quick Number Row + Stepper */
                    canEdit ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '6px' }}>
                        <div style={{ display: 'flex', gap: '3px', flex: 1, overflowX: 'auto', paddingBottom: '1px' }}>
                          {[0, 1, 2, 3, 4, 5, 6].map(bNum => {
                            const isSelected = bids[idx] === bNum
                            return (
                              <button
                                key={bNum}
                                type="button"
                                onClick={() => {
                                  if (!canEditPlayer(idx)) return
                                  setErrorMsg('')
                                  try { hapticsService.light(); soundService.playTick() } catch {}
                                  setBids(prev => {
                                    const next = [...prev]
                                    next[idx] = bNum
                                    broadcastState({ bids: next })
                                    return next
                                  })
                                }}
                                style={{
                                  flex: 1,
                                  minWidth: '26px',
                                  height: '28px',
                                  padding: 0,
                                  borderRadius: '6px',
                                  fontSize: '0.78rem',
                                  fontWeight: isSelected ? 900 : 700,
                                  border: isSelected ? '1.5px solid var(--accent-gold)' : '1px solid var(--border-glass)',
                                  background: isSelected ? 'var(--accent-gold)' : 'var(--bg-glass-strong)',
                                  color: isSelected ? '#FFF' : 'var(--text-main)',
                                  cursor: 'pointer',
                                  transition: 'all 0.12s ease'
                                }}
                              >
                                {bNum}
                              </button>
                            )
                          })}
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px',
                          background: 'var(--stepper-bg)',
                          padding: '2px 4px',
                          borderRadius: '10px',
                          border: '1px solid var(--border-glass)',
                          flexShrink: 0
                        }}>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            style={{ width: '28px', height: '28px', padding: 0, fontSize: '1rem', borderRadius: '6px' }}
                            onClick={() => handleBidStep(idx, -1)}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '1.05rem', fontWeight: 900, minWidth: '24px', textAlign: 'center', color: 'var(--accent-gold)' }}>
                            {val}
                          </span>
                          <button 
                            type="button" 
                            className="btn btn-secondary btn-sm"
                            style={{ width: '28px', height: '28px', padding: 0, fontSize: '1rem', borderRadius: '6px' }}
                            onClick={() => handleBidStep(idx, 1)}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '2px 4px' }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Target Bid: <strong style={{ color: 'var(--accent-gold)' }}>{val}</strong></span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', background: 'var(--bg-glass)', padding: '2px 6px', borderRadius: '4px' }}>
                          🔒 {name}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Suit Selector (In Bid Phase - Only Scorer can set) */}
        {inputPhase === 'bid' && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label className="form-label" style={{ margin: 0 }}>{t('truf.truf_suit')}</label>
              {!isScorer && (
                <span style={{ fontSize: '0.72rem', color: 'var(--badge-purple-text)', fontWeight: 700 }}>
                  🔒 {t('truf.scorer_only_suit')}
                </span>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {SUITS.map(suit => (
                <button
                  key={suit.id}
                  type="button"
                  disabled={!isScorer}
                  onClick={() => {
                    try { hapticsService.light() } catch {}
                    setTrufSuit(suit.id)
                    broadcastState({ trufSuit: suit.id })
                    addLog(`Memilih Truf: ${t('truf.suit_' + suit.key, suit.name)}`, 'suit')
                  }}
                  style={{
                    background: trufSuit === suit.id ? 'var(--primary)' : 'var(--bg-glass-strong)',
                    color: trufSuit === suit.id ? '#FFF' : suit.color,
                    border: trufSuit === suit.id ? '2px solid var(--primary-hover)' : '1px solid var(--border-glass)',
                    borderRadius: '10px',
                    padding: '10px 4px',
                    fontSize: '1.2rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    boxShadow: trufSuit === suit.id ? '0 0 15px var(--primary-glow)' : 'none',
                    opacity: (!isScorer && trufSuit !== suit.id) ? 0.45 : 1,
                    cursor: isScorer ? 'pointer' : 'default'
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
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '14px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.88rem'
          }}>
            {inputPhase === 'bid'
              ? '⏳ Pemain sedang memasang target bid masing-masing...'
              : `⏳ Pertandingan ronde sedang berlangsung (Trik: ${totalWon}/${totalTricks}).`}
          </div>
        ) : isScorer ? (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                ✍️ {t('truf.you_are_scorer')}
              </span>
              {!isLocalOrOffline && (
                <button
                  type="button"
                  onClick={() => setShowTransferScorerModal(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  ⇄ {t('truf.transfer_scorer')}
                </button>
              )}
            </div>

            {inputPhase === 'bid' ? (
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
                  className={`btn ${totalWon === totalTricks ? 'btn-success' : 'btn-secondary'}`} 
                  style={{ 
                    flex: 1, 
                    fontWeight: 800,
                    background: totalWon === totalTricks ? undefined : 'var(--badge-gold-bg)',
                    color: totalWon === totalTricks ? undefined : 'var(--badge-gold-text)',
                    borderColor: totalWon === totalTricks ? undefined : 'var(--badge-gold-border)'
                  }} 
                  onClick={handleSaveRoundSubmit}
                >
                  {totalWon === totalTricks ? `💾 ${t('truf.save_round')} & Lanjut` : `⚠️ Trik: ${totalWon} / ${totalTricks} (Harus ${totalTricks})`}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{
            background: 'var(--badge-purple-bg)',
            border: '1px solid var(--badge-purple-border)',
            borderRadius: '12px',
            padding: '14px 16px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: 600 }}>
              ⏳ {inputPhase === 'bid'
                ? t('truf.waiting_for_scorer_bid', { name: playerNames[scorerIndex] })
                : t('truf.waiting_for_scorer_save', { name: playerNames[scorerIndex] })}
            </div>
            {isHost && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.78rem', borderColor: 'var(--badge-purple-border)', color: 'var(--badge-purple-text)', background: 'var(--badge-purple-bg)' }}
                onClick={handleTakeOverScorer}
              >
                👑 Ambil Alih Peran Scorer (Host)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Leaderboard & Ledger Table */}
      <div className="glass-panel" style={{ padding: 'clamp(12px, 3vw, 18px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>📊 {t('truf.leaderboard')}</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {t('truf.scoreboard_set_sub', { count: playerCount }) || `Set putaran per ${playerCount} ronde • Detail skor (+/-) & bid tiap ronde`}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(isHost || isScorer) && activeRounds.length > 0 && onUndoRound && (
              <button type="button" className="btn btn-danger btn-sm" onClick={handleUndo}>
                ↩️ {t('truf.undo_btn')}
              </button>
            )}
            {onOpenShareModal && activeRounds.length > 0 && (
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={() => onOpenShareModal(activeRounds)}
              >
                📸 {t('truf.share_916_btn')}
              </button>
            )}
            {isScorer && onFinalizeGame && activeRounds.length > 0 && (
              <button 
                type="button" 
                className="btn btn-primary btn-sm" 
                onClick={() => setShowConfirmFinishModal(true)}
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
                <th style={{ padding: '10px 8px', textAlign: 'left', minWidth: '100px', color: 'var(--text-main)' }}>{t('truf.players_col')}</th>
                <th style={{ padding: '10px 8px', minWidth: '85px', background: 'var(--bg-glass)', color: 'var(--text-main)' }}>{t('truf.total_score_col')}</th>
                {activeRounds.slice().reverse().map((r, i) => {
                  const rNum = r.round_number
                  const setNum = Math.ceil(rNum / playerCount)
                  const isEndOfSetInReverse = (rNum % playerCount === 1) && activeRounds.some(rd => rd.round_number === setNum * playerCount)
                  const rSuitId = r.round_data?.trufSuit ?? r.round_data?.truf_suit ?? r.roundData?.trufSuit ?? r.truf_suit_index ?? 0
                  const rSuit = SUITS.find(s => s.id === rSuitId) || SUITS[0]
                  const rTotalBid = r.round_data?.totalBid ?? r.roundData?.totalBid ?? r.player_scores?.reduce((sum, p) => sum + (p.stats?.bid ?? 0), 0) ?? 0
                  const rForcedMode = r.round_data?.forcedPlayMode ?? r.roundData?.forcedPlayMode
                  const rIsMainAtas = rForcedMode ? rForcedMode === 'atas' : rTotalBid > totalTricks

                  return (
                    <React.Fragment key={r.id || i}>
                      <th style={{ 
                        padding: '8px 6px', 
                        minWidth: '85px',
                        background: 'var(--table-header-bg)',
                        borderRadius: '6px'
                      }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>{t('truf.table_round', { num: rNum })}</div>
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
                          background: rIsMainAtas ? 'var(--badge-blue-bg)' : 'var(--badge-orange-bg)',
                          color: rIsMainAtas ? 'var(--badge-blue-text)' : 'var(--badge-orange-text)',
                          border: `1px solid ${rIsMainAtas ? 'var(--badge-blue-border)' : 'var(--badge-orange-border)'}`,
                          whiteSpace: 'nowrap'
                        }}>
                          {rIsMainAtas ? '▲ ' + t('truf.mode_atas_short') : '▼ ' + t('truf.mode_bawah_short')} ({rTotalBid})
                        </div>
                      </th>
                      {/* Set Rounding Column at every Nth round (rendered after R1/R(N+1)/etc. in reverse order) */}
                      {isEndOfSetInReverse && (
                        <th style={{
                          padding: '8px 6px',
                          minWidth: '95px',
                          background: 'var(--badge-purple-bg)',
                          border: '1.5px solid var(--badge-purple-border)',
                          borderRadius: '8px',
                          color: 'var(--badge-purple-text)',
                          fontWeight: 800
                        }}>
                          <div style={{ fontSize: '0.82rem' }}>⭕ {t('truf.set_title', { num: setNum })}</div>
                          <div style={{ fontSize: '0.68rem', opacity: 0.9 }}>Akumulasi</div>
                        </th>
                      )}
                    </React.Fragment>
                  )
                })}
                {hasInitialScores && (
                  <th style={{
                    padding: '8px 6px',
                    minWidth: '70px',
                    background: 'var(--bg-glass)',
                    borderRadius: '6px',
                    color: 'var(--text-muted)'
                  }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800 }}>{t('truf.initial_score_col')}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>Modal</div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {playerNames.map((name, idx) => {
                const total = latestScores[idx] || 0
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700, color: 'var(--text-main)' }}>{name}</td>
                    <td style={{ padding: '10px 8px', fontWeight: 800, fontSize: '1rem', color: total >= 0 ? 'var(--badge-green-text)' : 'var(--badge-red-text)', background: 'var(--bg-glass)', borderRadius: '6px' }}>
                      {total > 0 ? `+${total}` : total}
                    </td>
                    {activeRounds.slice().reverse().map((r, rIdx) => {
                      const rNum = r.round_number
                      const setNum = Math.ceil(rNum / playerCount)
                      const isEndOfSetInReverse = (rNum % playerCount === 1) && activeRounds.some(rd => rd.round_number === setNum * playerCount)
                      const pScores = r.player_scores || r.playerScores || []
                      const ps = pScores.find(p => (p.player_index ?? p.playerIndex) === idx)
                      const change = ps?.score_change ?? ps?.scoreChange ?? 0
                      const bid = ps?.stats?.bid ?? ps?.bid ?? 0
                      const won = ps?.stats?.won ?? ps?.won ?? 0
                      const isPass = bid === won

                      // Cumulative score of the last round of the set
                      const setEndRound = isEndOfSetInReverse ? activeRounds.find(rd => (rd.round_number ?? rd.roundNumber) === setNum * playerCount) : null
                      const setEndScores = setEndRound?.player_scores || setEndRound?.playerScores || []
                      const setCumScore = setEndScores.find(p => (p.player_index ?? p.playerIndex) === idx)?.score_cumulative ?? setEndScores.find(p => (p.player_index ?? p.playerIndex) === idx)?.scoreCumulative ?? 0

                      return (
                        <React.Fragment key={r.id || rIdx}>
                          <td style={{ padding: '8px 4px', background: 'var(--table-cell-bg)', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                              {/* Bulatan Skor Ronde: Dilingkari jika Pas/Dapat Bid */}
                              {isPass ? (
                                <div 
                                  title="Pas / Dapat Bid (Dibulatkan)"
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    border: '2px solid var(--accent-green)',
                                    background: 'var(--badge-green-bg)',
                                    color: 'var(--badge-green-text)',
                                    fontWeight: 900,
                                    fontSize: '0.85rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 0 8px var(--badge-green-border)'
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
                                  color: 'var(--badge-red-text)',
                                  fontWeight: 800,
                                  fontSize: '0.88rem'
                                }}>
                                  {change}
                                </div>
                              )}
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                B:<strong style={{ color: 'var(--accent-gold)' }}>{bid}</strong> / T:<strong style={{ color: 'var(--accent-blue)' }}>{won}</strong>
                              </span>
                            </div>
                          </td>

                          {/* Set Rounding Total Cell */}
                          {isEndOfSetInReverse && (
                            <td style={{
                              padding: '6px 4px',
                              background: 'var(--badge-purple-bg)',
                              border: '1.5px solid var(--badge-purple-border)',
                              borderRadius: '8px',
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              color: setCumScore >= 0 ? 'var(--badge-green-text)' : 'var(--badge-red-text)'
                            }}>
                              {setCumScore > 0 ? `+${setCumScore}` : setCumScore}
                            </td>
                          )}
                        </React.Fragment>
                      )
                    })}
                    {hasInitialScores && (
                      <td style={{
                        padding: '8px 4px',
                        background: 'var(--bg-glass)',
                        borderRadius: '6px',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: initialScores[idx] >= 0 ? 'var(--text-muted)' : 'var(--badge-red-text)'
                      }}>
                        {initialScores[idx] > 0 ? `+${initialScores[idx]}` : initialScores[idx]}
                      </td>
                    )}
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
          <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-main)' }}>
            <span>📋</span>
            <span>{t('truf.round_details_title')}</span>
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {localRounds.slice().reverse().map((round, rIndex) => {
              const rNum = round.round_number
              const setNum = Math.ceil(rNum / playerCount)
              const rDealerIdx = round.round_data?.dealerIndex ?? round.dealer_index ?? ((firstDealer + rNum - 1) % playerCount)
              const rSuitId = round.round_data?.trufSuit ?? round.round_data?.truf_suit ?? round.roundData?.trufSuit ?? round.truf_suit_index ?? 0
              const rSuitObj = SUITS.find(s => s.id === rSuitId) || SUITS[0]
              const rTotalBid = round.round_data?.totalBid ?? round.roundData?.totalBid ?? round.player_scores?.reduce((sum, p) => sum + (p.stats?.bid ?? 0), 0) ?? 0
              const rForcedMode = round.round_data?.forcedPlayMode ?? round.roundData?.forcedPlayMode
              const rIsMainAtas = rForcedMode ? rForcedMode === 'atas' : rTotalBid > totalTricks
              const isSetEnd = rNum % playerCount === 0

              return (
                <div 
                  key={rIndex}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: isSetEnd ? 'var(--badge-purple-bg)' : 'var(--bg-card)',
                    border: isSetEnd ? '1.5px solid var(--badge-purple-border)' : '1px solid var(--border-glass)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ 
                        fontWeight: 800, 
                        color: 'var(--badge-purple-text)', 
                        fontSize: '0.9rem',
                        background: 'var(--badge-purple-bg)',
                        border: '1px solid var(--badge-purple-border)',
                        padding: '2px 8px',
                        borderRadius: '6px'
                      }}>
                        {t('truf.table_round_title', { num: rNum })}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: isSetEnd ? 'var(--badge-purple-text)' : 'var(--badge-blue-text)', fontWeight: 700 }}>
                        ⭕ {t('truf.set_title', { num: setNum })} {isSetEnd ? t('truf.end_of_set') : ''}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: rIsMainAtas ? 'var(--badge-blue-bg)' : 'var(--badge-orange-bg)',
                        color: rIsMainAtas ? 'var(--badge-blue-text)' : 'var(--badge-orange-text)',
                        border: `1px solid ${rIsMainAtas ? 'var(--badge-blue-border)' : 'var(--badge-orange-border)'}`
                      }}>
                        {rIsMainAtas ? '▲ ' + t('truf.mode_atas') : '▼ ' + t('truf.mode_bawah')} ({t('truf.total_bid', { count: rTotalBid })})
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '10px' }}>
                      <span>Dealer: <strong>{playerNames[rDealerIdx]}</strong> 🎲</span>
                      <span>Truf: <strong style={{ color: rSuitObj.color }}>{rSuitObj.label} {t('truf.suit_' + rSuitObj.key, rSuitObj.name)}</strong></span>
                    </div>
                  </div>

                  {/* Players details grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                    {playerNames.map((name, pIdx) => {
                      const roundScores = round.player_scores || round.playerScores || []
                      const ps = roundScores.find(p => (p.player_index ?? p.playerIndex) === pIdx)
                      const bid = ps?.stats?.bid ?? ps?.bid ?? 0
                      const won = ps?.stats?.won ?? ps?.won ?? 0
                      const change = ps?.score_change ?? ps?.scoreChange ?? 0
                      const cumScore = ps?.score_cumulative ?? ps?.scoreCumulative ?? 0
                      const isPass = bid === won
                      const diff = won - bid

                      return (
                        <div
                          key={pIdx}
                          style={{
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: 'var(--bg-glass)',
                            border: '1px solid var(--border-glass)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-main)' }}>{name}</span>
                            {/* Bulatan Skor di Kartu Rincian */}
                            {isPass ? (
                              <span 
                                title="Pas (Dibulatkan)"
                                style={{ 
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  border: '2px solid var(--accent-green)',
                                  background: 'var(--badge-green-bg)',
                                  color: 'var(--badge-green-text)',
                                  fontWeight: 900, 
                                  fontSize: '0.82rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  boxShadow: '0 0 8px var(--badge-green-border)'
                                }}
                              >
                                {change > 0 ? `+${change}` : change}
                              </span>
                            ) : (
                              <span style={{ 
                                fontWeight: 800, 
                                fontSize: '0.88rem',
                                color: 'var(--badge-red-text)'
                              }}>
                                {change}
                              </span>
                            )}
                          </div>

                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Bid: <strong style={{ color: 'var(--accent-gold)' }}>{bid}</strong></span>
                            <span>Trik: <strong style={{ color: 'var(--accent-blue)' }}>{won}</strong></span>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', marginTop: '2px' }}>
                            <span style={{ color: isPass ? 'var(--badge-green-text)' : 'var(--badge-red-text)', fontWeight: 600 }}>
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
          <div className="modal-content" style={{ maxWidth: '460px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px', color: '#F59E0B' }}>
              ⚠️ {t('truf.bid13_modal_title', { total: totalTricks }) || `Total Bid Berjumlah ${totalTricks} (Pas ${totalTricks})!`}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginBottom: '16px', lineHeight: 1.4 }}>
              {t('truf.bid13_modal_desc', { name: playerNames[dealerIndex] })}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
              {/* Main Atas Option */}
              <button 
                type="button"
                className="btn btn-primary btn-block"
                style={{ padding: '12px 14px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px' }}
                onClick={handleBid13ChooseAtas}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🔥 {t('truf.force_atas')}</span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.22)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                    Semua Bid +1
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', opacity: 0.92, lineHeight: 1.3 }}>
                  {playerNames.map((n, i) => `${n}: ${bids[i]}➔${bids[i] + 1}`).join(' • ')} (Total: {bids.reduce((s, b) => s + (b + 1), 0)})
                </div>
              </button>

              {/* Main Bawah Option */}
              <button 
                type="button"
                className="btn btn-secondary btn-block"
                style={{ padding: '12px 14px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '4px', borderColor: 'rgba(249, 115, 22, 0.45)' }}
                onClick={handleBid13ChooseBawah}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#FB923C' }}>🛡️ {t('truf.force_bawah')}</span>
                  <span style={{ fontSize: '0.72rem', background: 'rgba(249, 115, 22, 0.2)', color: '#FB923C', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                    Semua Bid -1
                  </span>
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                  {playerNames.map((n, i) => `${n}: ${bids[i]}➔${Math.max(0, bids[i] - 1)}`).join(' • ')} (Total: {bids.reduce((s, b) => s + Math.max(0, b - 1), 0)})
                </div>
              </button>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowBid13Modal(false)}
              style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}
            >
              ✕ {t('common.cancel') || 'Kembali & Edit Bid'}
            </button>
          </div>
        </div>
      )}
      {/* Transfer Scorer Modal */}
      {showTransferScorerModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✍️</span>
              <span>{t('truf.transfer_scorer')}</span>
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              {t('truf.select_new_scorer')}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {playerNames.map((name, pIdx) => {
                const isCurrent = pIdx === scorerIndex
                const isThisPlayer = pIdx === myPlayerIndex
                const isOnline = Boolean(livePlayerUserIds?.[pIdx])
                return (
                  <button
                    key={pIdx}
                    type="button"
                    className={`btn ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      justifyContent: 'space-between',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      opacity: isCurrent ? 0.9 : 1
                    }}
                    onClick={() => handleTransferScorer(pIdx)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700 }}>
                        {name} {isThisPlayer ? `(${t('truf.you_badge')})` : ''}
                      </span>
                      {!isLocalOrOffline && (
                        <span style={{
                          fontSize: '0.65rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                          color: isOnline ? '#10B981' : 'var(--text-dim)',
                          fontWeight: 700
                        }}>
                          {isOnline ? '🟢 Online' : '⚪ Offline'}
                        </span>
                      )}
                    </div>
                    {isCurrent ? (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                        {t('truf.scorer_badge')}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#C084FC' }}>
                        Pilih ➔
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={() => setShowTransferScorerModal(false)}
            >
              {t('common.cancel') || 'Batal'}
            </button>
          </div>
        </div>
      )}

      {/* Transfer Dealer Modal */}
      {showTransferDealerModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎲</span>
              <span>{t('truf.transfer_dealer') || 'Ganti / Pilih Dealer'}</span>
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
              {t('truf.select_new_dealer') || 'Pilih Pemain Sebagai Dealer Ronde Ini:'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {playerNames.map((name, pIdx) => {
                const isCurrent = pIdx === dealerIndex
                const isThisPlayer = pIdx === myPlayerIndex
                const isOnline = Boolean(livePlayerUserIds?.[pIdx])
                return (
                  <button
                    key={pIdx}
                    type="button"
                    className={`btn ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                    style={{
                      justifyContent: 'space-between',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 16px',
                      opacity: isCurrent ? 0.9 : 1
                    }}
                    onClick={() => handleTransferDealer(pIdx)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 700 }}>
                        {name} {isThisPlayer ? `(${t('truf.you_badge')})` : ''}
                      </span>
                      {!isLocalOrOffline && (
                        <span style={{
                          fontSize: '0.65rem',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                          color: isOnline ? '#10B981' : 'var(--text-dim)',
                          fontWeight: 700
                        }}>
                          {isOnline ? '🟢 Online' : '⚪ Offline'}
                        </span>
                      )}
                    </div>
                    {isCurrent ? (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: '4px', fontWeight: 800 }}>
                        🎲 {t('truf.dealer_badge')}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#FBBF24' }}>
                        Pilih ➔
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={() => setShowTransferDealerModal(false)}
            >
              {t('common.cancel') || 'Batal'}
            </button>
          </div>
        </div>
      )}

      {/* Confirm Finish Game Modal (Scorer Only) */}
      {showConfirmFinishModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', padding: '24px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🏁</span>
              <span>{t('truf.confirm_finish_title')}</span>
            </h3>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              {t('truf.confirm_finish_desc')}
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setShowConfirmFinishModal(false)}
              >
                {t('common.cancel') || 'Batal'}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, fontWeight: 700 }}
                onClick={() => {
                  setShowConfirmFinishModal(false)
                  addLog('Pencatat Skor (Scorer) mengakhiri permainan', 'finalize')
                  if (onFinalizeGame) {
                    onFinalizeGame(localRounds)
                  }
                }}
              >
                🏁 {t('truf.finish_btn')}
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
        onReleaseSeat={onReleaseSeat}
      />

      {/* Realtime Table Activity & Audit Log Drawer */}
      <ActivityLogDrawer
        isOpen={isLogDrawerOpen}
        onClose={() => setIsLogDrawerOpen(false)}
        logs={activityLogs}
      />

      {/* Game Rules & Mathematical Scoring Reference Modal */}
      <CardGameRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        initialGame="truf"
      />
    </div>
  )
}
