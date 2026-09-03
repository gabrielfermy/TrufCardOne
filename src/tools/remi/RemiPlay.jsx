import React, { useState, useEffect, useRef } from 'react'
import { CARD_VALUES, calculateRemiRoundScores } from './remiLogic'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { gameService } from '../../services/gameService'
import { deviceService } from '../../services/deviceService'
import { useTranslation } from '../../i18n/I18nContext'
import RoomInviteModal from '../../components/common/RoomInviteModal'

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
  myPlayerIndex: propMyPlayerIndex
}) {
  const { t } = useTranslation()
  const playerNames = session?.player_names || ['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4']
  const targetPenalty = session?.settings?.targetPenalty || 500

  const clientId = useRef(`peer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`).current
  const realtimeChannelRef = useRef(null)

  // Determine user role and claimed seat index
  const currentClientId = deviceService.getClientIdentifier(user)
  const isHost = session?.user_id === user?.id || 
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
      ...overrides
    })
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
      onDbUpdate: async () => {
        const refreshed = await gameService.getSession(session.id)
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
      if (channel) gameService.unsubscribeLiveRoom(channel)
    }
  }, [session?.id])

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
          gap: '8px',
          color: '#FDE68A',
          fontSize: '0.85rem'
        }}>
          <span style={{ fontSize: '1.2rem' }}>👀</span>
          <span><strong>Mode Penonton (Live Spectator)</strong> • Memantau denda dan skor secara realtime</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            {onBackToLobby && (
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onBackToLobby}
                style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px' }}
                title="Kembali ke Lobby Remi"
              >
                ← Lobby
              </button>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
              {session?.title || 'Remi Session'}
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

            <button 
              type="button"
              className="btn btn-sm"
              onClick={() => setIsInviteModalOpen(true)}
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: '#FBBF24',
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
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F59E0B' }}>
            {t('remi.round', { num: currentRoundNumber })}
          </h2>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Batas Kalah: <strong style={{ color: '#F87171' }}>-{targetPenalty} pts</strong>
        </div>
      </div>

      {eliminatedPlayers.length > 0 && (
        <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '14px', borderRadius: '12px', marginBottom: '16px', textAlign: 'center', color: '#FCA5A5', fontWeight: 700 }}>
          🚨 {t('remi.game_over', { name: eliminatedPlayers.map(p => p.name).join(', ') })}
        </div>
      )}

      {/* Round Form Panel (Hidden for Spectators) */}
      {isSpectator ? (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          ⏳ Ronde {currentRoundNumber} sedang dimainkan. Skor akan diperbarui otomatis saat Host menyimpan ronde.
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
              onClick={() => { hapticsService.light(); setIsTutupMurni(false) }}
            >
              {t('remi.tutup_biasa')}
            </button>
            <button
              type="button"
              className={`btn btn-sm ${isTutupMurni ? 'btn-primary' : 'btn-secondary'}`}
              style={{ background: isTutupMurni ? '#EC4899' : undefined }}
              onClick={() => { hapticsService.medium(); setIsTutupMurni(true) }}
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

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isCloser ? 'rgba(245, 158, 11, 0.1)' : 'rgba(0,0,0,0.25)',
                  border: isCloser ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-glass)',
                  padding: '12px 16px',
                  borderRadius: '12px'
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.95rem' }}>{name}</strong>
                  {isCloser && <span style={{ marginLeft: '8px', color: '#F59E0B', fontSize: '0.75rem', fontWeight: 800 }}>MENUTUP (0 Pts)</span>}
                </div>

                {!isCloser && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setActiveKeypadPlayer(idx)}
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
                          return n
                        })
                      }}
                      style={{
                        width: '70px',
                        padding: '6px 8px',
                        background: 'rgba(0,0,0,0.4)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '8px',
                        color: '#F87171',
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
        <div className="modal-overlay" onClick={() => setActiveKeypadPlayer(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                🎴 {t('remi.keypad_title', { player: playerNames[activeKeypadPlayer] })}
              </h3>
              <button className="btn-close" onClick={() => setActiveKeypadPlayer(null)}>✕</button>
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
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => setActiveKeypadPlayer(null)}>
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remi Cumulative Leaderboard */}
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
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700 }}>{name}</td>
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

      {/* Room Invite Modal */}
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
