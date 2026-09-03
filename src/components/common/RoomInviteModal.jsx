import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { deviceService } from '../../services/deviceService'

export default function RoomInviteModal({ isOpen, onClose, session, user, onClaimSeat }) {
  const { t } = useTranslation()
  const [copiedType, setCopiedType] = useState(null) // 'code' | 'link' | null

  if (!isOpen || !session) return null

  const roomCode = session.room_code || 'ROOM'
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

    const gameName = (session.game_type || 'Game').toUpperCase()
    const msg = `🎮 Yuk gabung ke room game KancaSela!\nPermainan: ${gameName}\nKode Room: ${roomCode}\n\nKlik tautan ini untuk langsung check-in ke meja:\n${inviteUrl}`
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(waUrl, '_blank')
  }

  const handleNativeShare = async () => {
    try {
      hapticsService.medium()
      soundService.playClick()
    } catch {}

    const gameName = (session.game_type || 'Game').toUpperCase()
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

  const playerNames = session.player_names || []
  const playerUserIds = session.player_user_ids || []
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', width: '92%' }}>
        <div className="modal-header">
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#A78BFA', letterSpacing: '1px', textTransform: 'uppercase' }}>
              {t('room.lobby_tag')}
            </span>
            <h3 className="modal-title" style={{ fontSize: '1.35rem', fontWeight: 900, marginTop: '2px' }}>
              🔗 {t('room.share_table_title')}
            </h3>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
          {t('room.share_table_desc')}
        </p>

        {/* Room Code Display */}
        <div style={{
          background: 'rgba(0,0,0,0.45)',
          border: '1px dashed var(--primary)',
          borderRadius: '16px',
          padding: '16px',
          textAlign: 'center',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            {t('app.room_code')}
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '4px', color: 'var(--primary)', margin: '4px 0' }}>
            {roomCode}
          </div>

          {/* Action Buttons: Copy Code, Copy Link, WhatsApp, Share */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
            <button 
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => copyTextToClipboard(roomCode, 'code')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <span>{copiedType === 'code' ? '✓' : '🔢'}</span>
              <span>{copiedType === 'code' ? t('room.copy_code_success') : t('app.copy_code')}</span>
            </button>

            <button 
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => copyTextToClipboard(inviteUrl, 'link')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <span>{copiedType === 'link' ? '✓' : '🔗'}</span>
              <span>{copiedType === 'link' ? t('room.copy_link_success') : t('room.copy_link')}</span>
            </button>

            <button 
              type="button"
              className="btn btn-sm"
              onClick={handleShareWhatsApp}
              style={{
                background: '#25D366',
                color: '#000',
                fontWeight: 800,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </button>

            <button 
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={handleNativeShare}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <span>{canNativeShare ? '📤' : '🌐'}</span>
              <span>{t('room.share_native')}</span>
            </button>
          </div>
        </div>

        {/* Player Seats & Realtime Check-in Status */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-muted)' }}>
            👥 Status Kursi Pemain ({playerUserIds.filter(Boolean).length} / {playerNames.length} Check-in):
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {playerNames.map((name, idx) => {
              const seatUserId = playerUserIds[idx]
              const isClaimedByMe = seatUserId === currentClientId || (user && seatUserId === user.id)
              const isClaimed = !!seatUserId

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
                        Anda
                      </span>
                    ) : isClaimed ? (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(52, 211, 153, 0.2)', color: '#34D399', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                        ✓ Terisi
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-dim)', padding: '1px 6px', borderRadius: '4px' }}>
                        Kosong
                      </span>
                    )}
                  </div>

                  {!isClaimed && onClaimSeat && (
                    <button 
                      type="button"
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                      onClick={() => onClaimSeat(idx)}
                    >
                      Pilih Kursi Ini
                    </button>
                  )}
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
