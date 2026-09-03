import React, { useState } from 'react'
import { calculateOmbenRoundScores } from './ombenLogic'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { deviceService } from '../../services/deviceService'
import { useTranslation } from '../../i18n/I18nContext'
import RoomInviteModal from '../../components/common/RoomInviteModal'

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
  myPlayerIndex: propMyPlayerIndex
}) {
  const { t } = useTranslation()
  const playerNames = session?.player_names || ['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4']
  const targetLoss = session?.settings?.targetLoss || 5
  const currentRoundNumber = rounds.length + 1

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

  // Finishing rank selection for current round (1 = Winner, N = Omben Loser)
  const [ranks, setRanks] = useState(() => playerNames.map((_, i) => i + 1))
  const [cardsLeft, setCardsLeft] = useState(() => Array(playerNames.length).fill(0))
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

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
      <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            {onBackToLobby && (
              <button 
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onBackToLobby}
                style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px' }}
                title="Kembali ke Lobby Omben"
              >
                ← Lobby
              </button>
            )}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>
              {session?.title || 'Omben Session'}
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
                background: 'rgba(249, 115, 22, 0.15)',
                border: '1px solid rgba(249, 115, 22, 0.35)',
                color: '#FB923C',
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
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F97316' }}>
            {t('omben.round', { num: currentRoundNumber })}
          </h2>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Batas Kalah: <strong style={{ color: '#F97316' }}>{targetLoss}x Omben 🍺</strong>
        </div>
      </div>

      {/* Dare Alert Banner */}
      {targetReachedPlayers.length > 0 && (
        <div style={{ background: 'rgba(249, 115, 22, 0.2)', border: '1px solid rgba(249, 115, 22, 0.4)', padding: '14px', borderRadius: '12px', marginBottom: '16px', textAlign: 'center', color: '#FDBA74', fontWeight: 700 }}>
          {t('omben.dare_alert', { name: targetReachedPlayers.map(p => p.name).join(', '), count: targetLoss })}
        </div>
      )}

      {/* Round Form Panel (Hidden for Spectators) */}
      {isSpectator ? (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          ⏳ Ronde {currentRoundNumber} sedang dimainkan. Papan omben akan ter-update otomatis saat Host menyimpan ronde.
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
                  background: isWinner ? 'rgba(16, 185, 129, 0.1)' : isOmben ? 'rgba(249, 115, 22, 0.12)' : 'rgba(0,0,0,0.25)',
                  border: isWinner ? '1px solid rgba(16, 185, 129, 0.4)' : isOmben ? '1px solid rgba(249, 115, 22, 0.4)' : '1px solid var(--border-glass)',
                  padding: '12px 16px',
                  borderRadius: '12px'
                }}
              >
                <div>
                  <strong style={{ fontSize: '0.95rem' }}>{name}</strong>
                  {isWinner && <span style={{ marginLeft: '8px', color: '#34D399', fontSize: '0.75rem', fontWeight: 800 }}>👑 JUARA 1 (OUT)</span>}
                  {isOmben && <span style={{ marginLeft: '8px', color: '#F97316', fontSize: '0.75rem', fontWeight: 800 }}>🍺 KENA OMBEN</span>}
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
                  background: 'rgba(0,0,0,0.25)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-glass)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Menang: {wins}x ronde
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 800, color: count > 0 ? '#F97316' : 'var(--text-muted)', fontSize: '1.1rem' }}>
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
