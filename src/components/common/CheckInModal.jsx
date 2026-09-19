import React, { useState, useEffect } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { deviceService } from '../../services/deviceService'
import { gameService } from '../../services/gameService'

export default function CheckInModal({
  isOpen,
  session,
  onSelectSeat,
  onEnterAsSpectator,
  user
}) {
  const { t } = useTranslation()
  const [liveSession, setLiveSession] = useState(session)

  useEffect(() => {
    setLiveSession(session)
  }, [session])

  // Live real-time room listener and active polling while modal is open
  useEffect(() => {
    if (!isOpen || !session?.id) return

    // 1. WebSocket Realtime listener for instant seat claims & releases from other devices
    const channel = gameService.subscribeToLiveRoom(session.id, {
      onSeatClaim: (seatPayload) => {
        if (seatPayload?.playerIndex !== undefined) {
          setLiveSession(prev => {
            if (!prev) return prev
            const userIds = [...(prev.player_user_ids || Array(prev.player_names?.length || 4).fill(null))]
            userIds[seatPayload.playerIndex] = seatPayload.isRelease ? null : (seatPayload.clientId || null)
            return {
              ...prev,
              player_user_ids: userIds
            }
          })
        }
      }
    })

    // 2. Polling every 1.5s to ensure synchronized fresh state
    const pollInterval = setInterval(async () => {
      try {
        const fresh = await gameService.getSession(session.id)
        if (fresh && fresh.player_user_ids) {
          setLiveSession(prev => ({
            ...prev,
            ...fresh,
            player_user_ids: fresh.player_user_ids
          }))
        }
      } catch (e) {}
    }, 1500)

    return () => {
      clearInterval(pollInterval)
      if (channel) gameService.unsubscribeLiveRoom(channel)
    }
  }, [isOpen, session?.id])

  if (!isOpen || !liveSession) return null

  const currentClientId = deviceService.getClientIdentifier(user)
  const playerNames = liveSession.player_names || []
  const playerUserIds = liveSession.player_user_ids || []
  const allSeatsFilled = playerNames.length > 0 && playerUserIds.filter(Boolean).length >= playerNames.length
  const gameType = (liveSession.game_type || 'Truf').toUpperCase()

  const handleClaim = (index) => {
    // Prevent claiming if already occupied by another device
    const occupantId = playerUserIds[index]
    if (occupantId && occupantId !== currentClientId && !(user?.id && occupantId === user.id)) {
      alert(t('room.seat_already_taken') || 'Kursi ini telah dipilih oleh pemain lain. Silakan pilih kursi lain yang masih kosong.')
      return
    }

    try {
      hapticsService.medium()
      soundService.playClick()
    } catch {}
    onSelectSeat(index)
  }

  const handleReleaseSeat = async (index) => {
    try {
      hapticsService.medium()
      soundService.playClick()
    } catch {}
    await gameService.releaseSeat(liveSession.id, index, currentClientId)
    deviceService.clearSessionSeat(liveSession.id)
    setLiveSession(prev => {
      if (!prev) return prev
      const userIds = [...(prev.player_user_ids || Array(playerNames.length).fill(null))]
      userIds[index] = null
      return {
        ...prev,
        player_user_ids: userIds
      }
    })
  }

  const handleSpectator = () => {
    try {
      hapticsService.light()
      soundService.playClick()
    } catch {}
    onEnterAsSpectator()
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }}>
      <div className="modal-content" style={{ maxWidth: '440px', width: '92%', textAlign: 'center' }}>
        <div style={{ marginBottom: '16px' }}>
          <span style={{ 
            fontSize: '0.75rem', 
            fontWeight: 800, 
            color: '#8B5CF6', 
            letterSpacing: '1px', 
            textTransform: 'uppercase',
            background: 'rgba(139, 92, 246, 0.15)',
            padding: '3px 10px',
            borderRadius: '20px'
          }}>
            {gameType} ROOM • {liveSession.room_code || 'ROOM'}
          </span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '10px', marginBottom: '6px' }}>
            {allSeatsFilled ? `👀 ${t('room.spectator_title')}` : `🪑 ${t('room.choose_seat_title')}`}
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            {allSeatsFilled 
              ? t('room.all_seats_filled_desc')
              : t('room.claim_seat_desc')}
          </p>
        </div>

        {!allSeatsFilled ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {playerNames.map((name, idx) => {
              const occupantId = playerUserIds[idx]
              const isOccupiedByMe = Boolean(occupantId && (occupantId === currentClientId || (user?.id && occupantId === user.id)))
              const isOccupiedByOther = Boolean(occupantId && !isOccupiedByMe)

              return (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: isOccupiedByMe 
                      ? 'rgba(16, 185, 129, 0.1)' 
                      : (isOccupiedByOther ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.06)'),
                    border: isOccupiedByMe
                      ? '1px solid rgba(16, 185, 129, 0.4)'
                      : (isOccupiedByOther ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(139, 92, 246, 0.35)'),
                    opacity: isOccupiedByOther ? 0.6 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '50%', 
                      background: isOccupiedByMe 
                        ? '#10B981' 
                        : (isOccupiedByOther ? 'rgba(255, 255, 255, 0.1)' : 'var(--primary)'),
                      color: '#FFF',
                      fontSize: '0.82rem',
                      fontWeight: 800,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {idx + 1}
                    </span>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{name}</div>
                      <div style={{ 
                        fontSize: '0.72rem', 
                        color: isOccupiedByMe ? '#10B981' : (isOccupiedByOther ? '#F87171' : 'var(--text-dim)'),
                        fontWeight: 600
                      }}>
                        {isOccupiedByMe 
                          ? '✓ Kursi Anda' 
                          : (isOccupiedByOther ? `🔒 ${t('room.occupied_other') || 'Terisi Pemain Lain'}` : t('room.empty_seat'))}
                      </div>
                    </div>
                  </div>

                  {isOccupiedByMe ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button 
                        type="button"
                        className="btn btn-sm btn-success"
                        style={{ fontWeight: 800, padding: '6px 12px', fontSize: '0.8rem' }}
                        onClick={() => handleClaim(idx)}
                      >
                        Masuk Meja
                      </button>
                      <button 
                        type="button"
                        className="btn btn-sm btn-secondary"
                        style={{ fontWeight: 700, padding: '6px 10px', fontSize: '0.78rem', color: '#F87171', borderColor: 'rgba(248, 113, 113, 0.4)' }}
                        onClick={() => handleReleaseSeat(idx)}
                        title="Lepas kursi ini (Stand Up)"
                      >
                        Stand Up
                      </button>
                    </div>
                  ) : !isOccupiedByOther ? (
                    <button 
                      type="button"
                      className="btn btn-sm btn-primary"
                      style={{ fontWeight: 800, padding: '6px 14px', fontSize: '0.82rem' }}
                      onClick={() => handleClaim(idx)}
                    >
                      {t('room.claim_this_seat')}
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: '#F87171', fontStyle: 'italic', fontWeight: 600 }}>
                      🔒 Terisi
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div style={{ 
            background: 'rgba(59, 130, 246, 0.1)', 
            border: '1px solid rgba(59, 130, 246, 0.3)', 
            borderRadius: '12px', 
            padding: '16px', 
            marginBottom: '20px' 
          }}>
            <span style={{ fontSize: '2rem' }}>📺</span>
            <div style={{ fontWeight: 800, color: '#60A5FA', marginTop: '6px' }}>Live Match Broadcast</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              {t('room.all_seats_filled_desc')}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            type="button" 
            className={`btn ${allSeatsFilled ? 'btn-primary' : 'btn-secondary'} btn-block`}
            onClick={handleSpectator}
          >
            👀 {t('room.enter_as_spectator')}
          </button>
        </div>
      </div>
    </div>
  )
}
