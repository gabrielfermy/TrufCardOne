import React, { useState, useEffect } from 'react'
import { calculateOmbenRoundScores } from './ombenLogic'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { deviceService } from '../../services/deviceService'
import { gameService } from '../../services/gameService'
import { useTranslation } from '../../i18n/I18nContext'
import RoomInviteModal from '../../components/common/RoomInviteModal'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

export default function OmbenPlay({ 
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
  const targetLoss = session?.settings?.targetLoss || 5
  const currentRoundNumber = rounds.length + 1

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

  // Finishing rank selection for current round (1 = Winner, N = Omben Loser)
  const [ranks, setRanks] = useState(() => playerNames.map((_, i) => i + 1))
  const [cardsLeft, setCardsLeft] = useState(() => Array(playerNames.length).fill(0))
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false)

  // Realtime Live Room listener
  useEffect(() => {
    if (!session?.id || session.id.startsWith('guest-session') || session.id.startsWith('local-session')) return

    const channel = gameService.subscribeToLiveRoom(session.id, {
      onSeatClaim: (seatPayload) => {
        if (seatPayload?.playerIndex !== undefined) {
          const isRelease = !!seatPayload.isRelease
          const currentArr = [...(session?.player_user_ids || livePlayerUserIds || Array(playerNames.length).fill(null))]
          const updated = [...currentArr]
          if (isRelease) {
            updated[seatPayload.playerIndex] = null
          } else if (seatPayload.clientId) {
            updated[seatPayload.playerIndex] = seatPayload.clientId
          }

          setLivePlayerUserIds(updated)
          if (session) session.player_user_ids = updated

          if (isHost && session.id) {
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
        // silent polling catch
      }
    }, 4000)

    return () => {
      clearInterval(pollInterval)
      gameService.unsubscribeFromLiveRoom(channel, session.id)
    }
  }, [session?.id, isHost, playerNames.length])

  // Cumulative Omben Losses & Wins
  const ombenLosses = Array(playerNames.length).fill(0)
  const winCounts = Array(playerNames.length).fill(0)

  rounds.forEach(r => {
    r.player_scores?.forEach(ps => {
      if (ps.stats?.is_omben) {
        ombenLosses[ps.player_index] += 1
      }
      if (ps.stats?.rank === 1) {
        winCounts[ps.player_index] += 1
      }
    })
  })

  const handleRankChange = (playerIdx, newRank) => {
    hapticsService.light()
    setRanks(prev => {
      const next = [...prev]
      next[playerIdx] = Number(newRank)
      return next
    })
  }

  const handleSaveRound = () => {
    const calculated = calculateOmbenRoundScores(ranks, cardsLeft)
    
    const scoreRecords = calculated.map((res, idx) => ({
      player_index: idx,
      stats: {
        rank: res.rank,
        is_omben: res.isOmben,
        cards_left: res.cardsLeft
      },
      score_change: res.isOmben ? -1 : (res.rank === 1 ? 1 : 0),
      score_cumulative: ombenLosses[idx] + res.ombenDelta
    }))

    hapticsService.success()
    soundService.playVictory()

    onSaveRound({
      roundNumber: currentRoundNumber,
      roundData: {
        ranks,
        cardsLeft
      },
      playerScores: scoreRecords
    })

    // Reset ranks for next round
    setRanks(playerNames.map((_, i) => i + 1))
    setCardsLeft(Array(playerNames.length).fill(0))
  }

  // Check players who reached Omben threshold
  const targetReachedPlayers = playerNames
    .map((name, idx) => ({ name, losses: ombenLosses[idx], idx }))
    .filter(p => p.losses >= targetLoss)

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      {/* Spectator Live Banner */}
      {isSpectator && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(249, 115, 22, 0.15), rgba(139, 92, 246, 0.15))',
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
          <span><strong>Mode Penonton (Live Spectator)</strong> • Memantau papan omben secara realtime</span>
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
                title="Kembali ke Lobby Omben"
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
              {session?.title || 'Omben Session'}
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
              <span>📝 Pencatat: {playerNames[effectiveScorerIndex] || `P${effectiveScorerIndex + 1}`}</span>
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
                background: 'var(--badge-orange-bg)',
                border: '1px solid var(--badge-orange-border)',
                color: 'var(--badge-orange-text)',
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
                color: 'var(--badge-gold-text)',
                borderColor: 'var(--badge-gold-border)'
              }}
              title="Aturan Permainan & Cara Main Omben"
            >
              <span>📖</span>
            </button>
          </div>
        </div>

        {/* Bottom Row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--accent-orange)', margin: 0, letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
            {t('omben.round', { num: currentRoundNumber })}
          </h2>
          <div style={{
            fontSize: '0.74rem',
            padding: '2px 8px',
            borderRadius: '6px',
            background: 'var(--badge-orange-bg)',
            border: '1px solid var(--badge-orange-border)',
            color: 'var(--badge-orange-text)',
            fontWeight: 700
          }}>
            Batas Kalah: <strong>{targetLoss}x Omben 🍺</strong>
          </div>
        </div>
      </div>

      {/* Online / Offline Presence Roster Bar */}
      <div className="glass-panel" style={{ padding: '8px 12px', marginBottom: '12px', display: 'flex', gap: '8px', overflowX: 'auto', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Meja:
        </span>
        {playerNames.map((name, idx) => {
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

      {/* Dare Alert Banner */}
      {targetReachedPlayers.length > 0 && (
        <div style={{ background: 'var(--badge-orange-bg)', border: '1px solid var(--badge-orange-border)', padding: '14px', borderRadius: '12px', marginBottom: '16px', textAlign: 'center', color: 'var(--badge-orange-text)', fontWeight: 700 }}>
          {t('omben.dare_alert', { name: targetReachedPlayers.map(p => p.name).join(', '), count: targetLoss })}
        </div>
      )}

      {/* Round Form Panel (Only Active Scorer can submit) */}
      {!isScorer ? (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          ⏳ Ronde {currentRoundNumber} sedang dimainkan. Papan omben akan ter-update otomatis saat Pencatat Skor (📝 {playerNames[effectiveScorerIndex] || 'Scorer'}) menyimpan ronde.
        </div>
      ) : (
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px' }}>
          🎴 {t('omben.finishing_order')}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          {playerNames.map((name, idx) => {
            const rank = ranks[idx]
            const isWinner = rank === 1
            const isOmben = rank === playerNames.length

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isWinner ? 'var(--badge-green-bg)' : isOmben ? 'var(--badge-orange-bg)' : 'var(--bg-card-nested)',
                  border: isWinner ? '1.5px solid var(--badge-green-border)' : isOmben ? '1.5px solid var(--badge-orange-border)' : '1px solid var(--border-glass)',
                  padding: '12px 16px',
                  borderRadius: '12px'
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>{name}</strong>
                  {isWinner && <span style={{ marginLeft: '8px', color: 'var(--badge-green-text)', fontSize: '0.75rem', fontWeight: 800 }}>👑 JUARA 1 (OUT)</span>}
                  {isOmben && <span style={{ marginLeft: '8px', color: 'var(--badge-orange-text)', fontSize: '0.75rem', fontWeight: 800 }}>🍺 KENA OMBEN</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <select
                    className="form-select"
                    value={rank}
                    onChange={e => handleRankChange(idx, e.target.value)}
                    style={{ width: '130px', padding: '6px 10px', fontSize: '0.85rem' }}
                  >
                    {playerNames.map((_, rIdx) => (
                      <option key={rIdx} value={rIdx + 1}>
                        {rIdx === 0 ? '👑 Juara 1' : rIdx === playerNames.length - 1 ? '🍺 Kena Omben' : `Urutan ke-${rIdx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )
          })}
        </div>

        <button className="btn btn-success btn-block" style={{ padding: '14px' }} onClick={handleSaveRound}>
          💾 {t('omben.save_round')}
        </button>
      </div>
      )}

      {/* Omben Cumulative Loss Leaderboard */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>🍺 Papan Akumulasi Omben</h3>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {playerNames.map((name, idx) => {
            const count = ombenLosses[idx] || 0
            const wins = winCounts[idx] || 0

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: count > 0 ? 'var(--badge-orange-bg)' : 'var(--bg-card-nested)',
                  borderRadius: '12px',
                  border: count > 0 ? '1px solid var(--badge-orange-border)' : '1px solid var(--border-glass)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Menang: {wins}x ronde
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, color: count > 0 ? 'var(--badge-orange-text)' : 'var(--text-muted)', fontSize: '1.1rem' }}>
                    {count}x Omben
                  </span>
                  <span style={{ fontSize: '1.2rem' }}>
                    {'🍺'.repeat(Math.min(5, count))}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
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
              Pencatat skor bertugas memasukkan hasil ronde dan menyimpannya ke papan skor.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {playerNames.map((name, idx) => (
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

      {/* Card Game Rules Modal */}
      <CardGameRulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        initialGame="omben"
      />
    </div>
  )
}
