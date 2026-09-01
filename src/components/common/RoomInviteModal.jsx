import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'

export default function RoomInviteModal({ isOpen, onClose, session, user, onClaimSeat }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  if (!isOpen || !session) return null

  const roomCode = session.room_code || 'GNS-ROOM'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://gns.avl.my.id'
  const inviteUrl = `${origin}/?room=${roomCode}`

  const handleCopyLink = () => {
    hapticsService.light()
    soundService.playClick()
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleShareWhatsApp = () => {
    hapticsService.medium()
    soundService.playClick()
    const msg = `🎮 Yuk gabung ke Game Night Suite!\nPermainan: ${session.game_type?.toUpperCase()}\nKode Room: ${roomCode}\n\nKlik link ini untuk langsung gabung meja:\n${inviteUrl}`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const playerNames = session.player_names || []
  const playerUserIds = session.player_user_ids || []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', width: '92%' }}>
        <div className="modal-header">
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#A78BFA', letterSpacing: '1px', textTransform: 'uppercase' }}>
              MULTIPLAYER LOBBY
            </span>
            <h3 className="modal-title" style={{ fontSize: '1.35rem', fontWeight: 900, marginTop: '2px' }}>
              🔗 {t('app.share')} Meja Permainan
            </h3>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
          Bagikan kode atau tautan ini ke pemain lain agar mereka bisa membuka meja di HP masing-masing dan menginput giliran kocok kartu (Dealer)!
        </p>

        {/* Room Code Big Display */}
        <div style={{
          background: 'rgba(0,0,0,0.4)',
          border: '1px dashed var(--primary)',
          borderRadius: '16px',
          padding: '16px',
          textAlign: 'center',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
            {t('app.room_code')}
          </div>
          <div style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '4px', color: 'var(--primary)', margin: '4px 0' }}>
            {roomCode}
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px' }}>
            <button 
              className="btn btn-sm btn-primary"
              onClick={handleCopyLink}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>{copied ? '✓' : '📋'}</span>
              <span>{copied ? t('app.copied') : t('app.copy_code')}</span>
            </button>
            <button 
              className="btn btn-sm btn-secondary"
              onClick={handleShareWhatsApp}
              style={{ background: '#25D366', color: '#000', fontWeight: 800, border: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Player Seats & Seat Claiming */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-muted)' }}>
            👥 Kursi Pemain di Meja:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {playerNames.map((name, idx) => {
              const isClaimedByMe = user && playerUserIds[idx] === user.id
              const isClaimed = !!playerUserIds[idx]

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
                    {isClaimedByMe && (
                      <span style={{ fontSize: '0.72rem', background: '#8B5CF6', color: '#FFF', padding: '1px 6px', borderRadius: '4px', fontWeight: 800 }}>
                        Anda
                      </span>
                    )}
                  </div>

                  {user && !isClaimed && onClaimSeat && (
                    <button 
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                      onClick={() => onClaimSeat(idx)}
                    >
                      {t('app.claim_seat')}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <button className="btn btn-secondary btn-block" onClick={onClose}>
          {t('app.close')}
        </button>
      </div>
    </div>
  )
}
