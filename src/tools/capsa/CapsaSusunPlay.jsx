import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { 
  calculateCapsaSusunRound, 
  CAPSA_HAND_RANKS, 
  CAPSA_SPECIAL_COMBOS,
  isLegalSusunArrangement 
} from './capsaLogic'
import { gameService } from '../../services/gameService'
import { deviceService } from '../../services/deviceService'
import RoomInviteModal from '../../components/common/RoomInviteModal'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

export default function CapsaSusunPlay({ 
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
  const settings = session?.settings || { pointMultiplier: 1, sweepMultiplier: 2, paoPenalty: 9 }
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

  // Player hand inputs for current round
  const [playerHands, setPlayerHands] = useState(() => 
    players.map((name, idx) => ({
      id: `p${idx}`,
      name,
      isPao: false,
      specialComboId: 'none',
      tiers: { top: 0, mid: 0, bot: 0 },
      bonusPoints: 0
    }))
  )

  const handleTierChange = (playerIdx, tierKey, value) => {
    setPlayerHands(prev => {
      const next = [...prev]
      const currentTiers = { ...next[playerIdx].tiers, [tierKey]: Number(value) }
      const isIllegal = !isLegalSusunArrangement(currentTiers.top, currentTiers.mid, currentTiers.bot)
      next[playerIdx] = {
        ...next[playerIdx],
        tiers: currentTiers,
        isPao: next[playerIdx].isPao || isIllegal
      }
      return next
    })
  }

  const handlePaoToggle = (playerIdx) => {
    setPlayerHands(prev => {
      const next = [...prev]
      next[playerIdx] = {
        ...next[playerIdx],
        isPao: !next[playerIdx].isPao
      }
      return next
    })
  }

  const handleSpecialComboChange = (playerIdx, comboId) => {
    const combo = CAPSA_SPECIAL_COMBOS.find(c => c.id === comboId)
    setPlayerHands(prev => {
      const next = [...prev]
      next[playerIdx] = {
        ...next[playerIdx],
        specialComboId: comboId,
        bonusPoints: combo ? combo.bonus : 0
      }
      return next
    })
  }

  // Live round deltas calculation
  const liveCalculation = useMemo(() => {
    return calculateCapsaSusunRound(playerHands, settings)
  }, [playerHands, settings])

  // Total scores calculation across all rounds
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
      hands: playerHands,
      deltas: liveCalculation.roundDeltas,
      sweeps: liveCalculation.sweeps,
      timestamp: new Date().toISOString()
    }

    onSaveRound(roundData)

    // Reset input for next round
    setPlayerHands(players.map((name, idx) => ({
      id: `p${idx}`,
      name,
      isPao: false,
      specialComboId: 'none',
      tiers: { top: 0, mid: 0, bot: 0 },
      bonusPoints: 0
    })))
  }

  return (
    <div className="main-content" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Spectator Live Banner */}
      {isSpectator && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.15), rgba(168, 85, 247, 0.15))',
          border: '1px solid rgba(6, 182, 212, 0.35)',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#67E8F9',
          fontSize: '0.85rem'
        }}>
          <span style={{ fontSize: '1.2rem' }}>👀</span>
          <span><strong>Mode Penonton (Live Spectator)</strong> • Memantau susunan Capsa Susun secara realtime</span>
        </div>
      )}

      {/* Header Bar */}
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
              {session?.title || 'Capsa Susun'}
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
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                color: '#06B6D4',
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
              style={{ color: '#06B6D4', borderColor: 'rgba(6, 182, 212, 0.4)', fontSize: '0.72rem', padding: '3px 7px' }}
              title="Aturan Permainan Capsa Susun"
            >
              <span>📖</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#06B6D4', margin: 0 }}>
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

      {/* Sweep Notifications / Badges */}
      {liveCalculation.sweeps && liveCalculation.sweeps.length > 0 && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '12px',
          background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.2), rgba(236, 72, 153, 0.2))',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.85rem',
          fontWeight: 800,
          color: '#FCD34D'
        }}>
          <span>🔥</span>
          <span>
            {liveCalculation.sweeps.some(s => s.type === 'sweep_all') 
              ? 'TEMBUS KELILING! (Super Sweep 4x Multiplier)' 
              : liveCalculation.sweeps.some(s => s.type === 'dragon')
              ? 'DRAGON KOMBINASI SUPER! (+13 Poin dari semua pemain)'
              : 'TEMBUS (SWEEP)! Poin perbandingan 2x lipat'}
          </span>
        </div>
      )}

      {/* Player Input Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        {playerHands.map((p, idx) => {
          const delta = liveCalculation.roundDeltas[p.id] || 0
          const isIllegal = !isLegalSusunArrangement(p.tiers.top, p.tiers.mid, p.tiers.bot)
          const canEditThis = canEditPlayer(idx)

          return (
            <div 
              key={p.id}
              className="glass-panel"
              style={{
                padding: '16px',
                opacity: canEditThis ? 1 : 0.75,
                border: p.isPao 
                  ? '1px solid rgba(239, 68, 68, 0.6)' 
                  : delta > 0 
                  ? '1px solid rgba(52, 211, 153, 0.4)' 
                  : '1px solid var(--border-glass)',
                background: p.isPao 
                  ? 'rgba(239, 68, 68, 0.08)' 
                  : 'var(--bg-glass)'
              }}
            >
              {/* Player Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-main)' }}>
                  {p.name}
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: 900,
                  color: delta > 0 ? '#34D399' : delta < 0 ? '#F87171' : 'var(--text-muted)'
                }}>
                  {delta > 0 ? `+${delta}` : delta} Pts
                </div>
              </div>

              {/* Pao Toggle */}
              <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <button
                  type="button"
                  disabled={!canEditThis}
                  className={`btn btn-sm ${p.isPao ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => handlePaoToggle(idx)}
                  style={{ fontSize: '0.72rem', padding: '3px 8px', fontWeight: 800 }}
                >
                  {p.isPao ? '⚠️ PAO (Salah Susun)' : '✓ Susunan Sah'}
                </button>
                {isIllegal && !p.isPao && (
                  <span style={{ fontSize: '0.7rem', color: '#F87171' }}>Urutan terbalik!</span>
                )}
              </div>

              {/* 3 Tier Selectors */}
              {!p.isPao && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Top Tier (3 cards) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '75px' }}>Atas (3k):</span>
                    <select
                      className="form-input"
                      disabled={!canEditThis}
                      style={{ fontSize: '0.75rem', padding: '4px 6px', flex: 1 }}
                      value={p.tiers.top}
                      onChange={(e) => handleTierChange(idx, 'top', e.target.value)}
                    >
                      {CAPSA_HAND_RANKS.slice(0, 4).map(r => (
                        <option key={r.id} value={r.value}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Mid Tier (5 cards) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '75px' }}>Tengah (5k):</span>
                    <select
                      className="form-input"
                      disabled={!canEditThis}
                      style={{ fontSize: '0.75rem', padding: '4px 6px', flex: 1 }}
                      value={p.tiers.mid}
                      onChange={(e) => handleTierChange(idx, 'mid', e.target.value)}
                    >
                      {CAPSA_HAND_RANKS.map(r => (
                        <option key={r.id} value={r.value}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Bot Tier (5 cards) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', width: '75px' }}>Bawah (5k):</span>
                    <select
                      className="form-input"
                      disabled={!canEditThis}
                      style={{ fontSize: '0.75rem', padding: '4px 6px', flex: 1 }}
                      value={p.tiers.bot}
                      onChange={(e) => handleTierChange(idx, 'bot', e.target.value)}
                    >
                      {CAPSA_HAND_RANKS.map(r => (
                        <option key={r.id} value={r.value}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Special Bonus Combo Dropdown */}
                  <div style={{ marginTop: '4px' }}>
                    <select
                      className="form-input"
                      disabled={!canEditThis}
                      style={{ fontSize: '0.72rem', padding: '3px 6px', borderColor: 'rgba(234, 179, 8, 0.4)', color: '#FCD34D' }}
                      value={p.specialComboId}
                      onChange={(e) => handleSpecialComboChange(idx, e.target.value)}
                    >
                      {CAPSA_SPECIAL_COMBOS.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.bonus > 0 ? `(+${c.bonus} Pts)` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Save Round CTA (Gated to Scorer) */}
      {isScorer ? (
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleSave}
          style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800, marginBottom: '24px' }}
        >
          💾 Simpan Ronde {currentRoundNum} & Tambah Skor
        </button>
      ) : (
        <div style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          ⏳ Hanya Pencatat Skor (📝 {players[effectiveScorerIndex] || 'Scorer'}) yang dapat menyimpan ronde ini.
        </div>
      )}

      {/* Leaderboard Podium & Total Standings */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div className="section-label" style={{ marginTop: 0 }}>🏆 Klasemen Poin Capsa Susun</div>
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

      {/* Round Ledger & Controls */}
      {rounds.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div className="section-label" style={{ margin: 0 }}>📜 Riwayat Ronde</div>
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
                  {players.map((name, idx) => (
                    <th key={idx} style={{ padding: '8px', textAlign: 'center' }}>{name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rounds.map((r, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 800 }}>R{r.round_number || rIdx + 1}</td>
                    {players.map((_, pIdx) => {
                      const d = r.deltas?.[`p${pIdx}`] || 0
                      return (
                        <td key={pIdx} style={{ padding: '8px', textAlign: 'center', fontWeight: 700, color: d > 0 ? '#34D399' : d < 0 ? '#F87171' : 'inherit' }}>
                          {d > 0 ? `+${d}` : d}
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
              Pencatat skor bertugas memasukkan susunan kombinasi dan menyimpannya ke papan skor.
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
