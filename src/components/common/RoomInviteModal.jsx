import React, { useState, useEffect } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { deviceService } from '../../services/deviceService'
import { gameService } from '../../services/gameService'

export default function RoomInviteModal({ isOpen, onClose, session, user, onClaimSeat, onReleaseSeat }) {
  const { t } = useTranslation()
  const [copiedType, setCopiedType] = useState(null) // 'code' | 'link' | null
  const [liveSession, setLiveSession] = useState(session)

  useEffect(() => {
    setLiveSession(session)
  }, [session])

  // Real-time synchronization while modal is open
  useEffect(() => {
    if (!isOpen || !session?.id) return

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

  const roomCode = liveSession.room_code || 'ROOM'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kancasela.my.id'
  const inviteUrl = `${origin}/?room=${roomCode}`
  const currentClientId = deviceService.getClientIdentifier(user)

  // Safe clipboard helper with legacy execCommand fallback
  const copyTextToClipboard = async (text, type) => {
    try {
      hapticsService.light()
      soundService.playClick()
    } catch {}

    let success = false
    if (navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text)
        success = true
      } catch (err) {
        console.warn('Clipboard writeText failed, trying execCommand fallback', err)
      }
    }

    if (!success) {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        textarea.style.top = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        success = document.execCommand('copy')
        document.body.removeChild(textarea)
      } catch (err) {
        console.error('Copy fallback also failed', err)
      }
    }

    if (success) {
      setCopiedType(type)
      setTimeout(() => setCopiedType(null), 2500)
    }
  }

  const handleShareWhatsApp = () => {
    try {
      hapticsService.medium()
      soundService.playClick()
    } catch {}

    const gameName = (liveSession.game_type || 'Game').toUpperCase()
    const msg = `🎮 Yuk gabung ke room game KancaSela!\nPermainan: ${gameName}\nKode Room: ${roomCode}\n\nKlik tautan ini untuk langsung check-in ke meja:\n${inviteUrl}`
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(waUrl, '_blank')
  }

  const handleNativeShare = async () => {
    try {
      hapticsService.medium()
      soundService.playClick()
    } catch {}

    const gameName = (liveSession.game_type || 'Game').toUpperCase()
    const shareData = {
      title: `Gabung Meja ${gameName} - KancaSela`,
      text: `🎮 Yuk gabung ke meja ${gameName} di KancaSela! Kode Room: ${roomCode}`,
      url: inviteUrl
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleShareWhatsApp()
        }
      }
    } else {
      handleShareWhatsApp()
    }
  }

  const playerNames = liveSession.player_names || []
  const playerUserIds = liveSession.player_user_ids || []
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share
  const isHost = liveSession.user_id === user?.id || playerUserIds[0] === currentClientId

  const handleRelease = async (idx) => {
    try {
      hapticsService.medium()
      soundService.playClick()
    } catch {}
    const isMe = playerUserIds[idx] === currentClientId || (user?.id && playerUserIds[idx] === user.id)
    await gameService.releaseSeat(liveSession.id, idx, isMe ? currentClientId : null)
    if (isMe) {
      deviceService.clearSessionSeat(liveSession.id)
    }
    setLiveSession(prev => {
      if (!prev) return prev
      const userIds = [...(prev.player_user_ids || Array(playerNames.length).fill(null))]
      userIds[idx] = null
      return {
        ...prev,
        player_user_ids: userIds
      }
    })
    if (onReleaseSeat) onReleaseSeat(idx)
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', width: '90%', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '6px' }}>
          📱 {t('room.invite_title')}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {t('room.invite_desc')}
        </p>

        {/* Room Code Big Display */}
        <div style={{
          background: 'rgba(139, 92, 246, 0.15)',
          border: '1.5px dashed #8B5CF6',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#A78BFA', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
            {t('room.room_code')}
          </div>
          <div style={{
            fontSize: '2.2rem',
            fontWeight: 900,
            letterSpacing: '4px',
            color: '#FFF',
            margin: '6px 0',
            fontFamily: 'monospace'
          }}>
            {roomCode}
          </div>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => copyTextToClipboard(roomCode, 'code')}
            style={{ fontSize: '0.8rem', padding: '4px 12px' }}
          >
            {copiedType === 'code' ? `✓ ${t('room.copied')}` : `📋 ${t('room.copy_code')}`}
          </button>
        </div>

        {/* Share Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={canNativeShare ? handleNativeShare : handleShareWhatsApp}
            style={{ fontSize: '0.88rem', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <span>💬</span> WhatsApp
          </button>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => copyTextToClipboard(inviteUrl, 'link')}
            style={{ fontSize: '0.88rem', padding: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <span>🔗</span> {copiedType === 'link' ? t('room.copied') : t('room.copy_link')}
          </button>
        </div>

        {/* Player Status List */}
        <div style={{ textAlign: 'left', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
            {t('room.table_seats')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {playerNames.map((name, idx) => {
              const occupantId = playerUserIds[idx]
              const isClaimedByMe = Boolean(occupantId && (occupantId === currentClientId || (user?.id && occupantId === user.id)))
              const isClaimed = Boolean(occupantId)

              return (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isClaimedByMe ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    border: isClaimedByMe ? '1px solid #8B5CF6' : '1px solid var(--border-glass)',
                    padding: '8px 14px',
                    borderRadius: '10px',
                    fontSize: '0.9rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 700 }}>
                      P{idx + 1}: {name}
                    </span>
                    {isClaimedByMe ? (
                      <span style={{ fontSize: '0.72rem', background: '#8B5CF6', color: '#FFF', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        {t('room.you')}
                      </span>
                    ) : isClaimed ? (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(52, 211, 153, 0.2)', color: '#34D399', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        ✓ {t('room.filled')}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-dim)', padding: '1px 6px', borderRadius: '4px' }}>
                        {t('room.empty')}
                      </span>
                    )}
                  </div>

                  {isClaimedByMe ? (
                    <button 
                      type="button"
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '3px 8px', color: '#F87171', borderColor: 'rgba(248, 113, 113, 0.4)' }}
                      onClick={() => handleRelease(idx)}
                      title="Lepas kursi ini (Stand Up)"
                    >
                      Stand Up
                    </button>
                  ) : isClaimed ? (
                    isHost && idx !== 0 ? (
                      <button 
                        type="button"
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: '0.7rem', padding: '2px 6px', color: '#F87171' }}
                        onClick={() => handleRelease(idx)}
                        title="Host: Kosongkan kursi pemain ini"
                      >
                        Kosongkan
                      </button>
                    ) : null
                  ) : onClaimSeat ? (
                    <button 
                      type="button"
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                      onClick={() => onClaimSeat(idx)}
                    >
                      Pilih Kursi Ini
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
          {t('app.close')}
        </button>
      </div>
    </div>
  )
}
