import React from 'react'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'

export default function CheckInModal({
  isOpen,
  session,
  onSelectSeat,
  onEnterAsSpectator
}) {
  if (!isOpen || !session) return null

  const playerNames = session.player_names || []
  const playerUserIds = session.player_user_ids || []
  const allSeatsFilled = playerNames.length > 0 && playerUserIds.filter(Boolean).length >= playerNames.length
  const gameType = (session.game_type || 'Truf').toUpperCase()

  const handleClaim = (index) => {
    try {
      hapticsService.medium()
      soundService.playClick()
    } catch {}
    onSelectSeat(index)
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
            {gameType} ROOM • {session.room_code || 'MEJA'}
          </span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginTop: '10px', marginBottom: '6px' }}>
            {allSeatsFilled ? '👀 Masuk Sebagai Penonton' : '🪑 Pilih Kursi Pemain'}
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            {allSeatsFilled 
              ? 'Semua kursi pemain di meja ini telah terisi. Anda dapat bergabung untuk memantau papan skor dan jalannya ronde secara realtime!'
              : 'Pilih nama Anda di meja ini untuk dapat menginput skor secara mandiri. Perubahan akan disiarkan langsung ke semua pemain.'}
          </p>
        </div>

        {!allSeatsFilled ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
            {playerNames.map((name, idx) => {
              const isOccupied = !!playerUserIds[idx]

              return (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    background: isOccupied ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.06)',
                    border: isOccupied ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(139, 92, 246, 0.35)',
                    opacity: isOccupied ? 0.65 : 1
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ 
                      width: '28px', 
                      height: '28px', 
                      borderRadius: '50%', 
                      background: isOccupied ? 'rgba(255, 255, 255, 0.1)' : 'var(--primary)',
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
                      <div style={{ fontSize: '0.72rem', color: isOccupied ? '#34D399' : 'var(--text-dim)' }}>
                        {isOccupied ? '✓ Sudah Check-in' : 'Kursi Tersedia'}
                      </div>
                    </div>
                  </div>

                  {!isOccupied ? (
                    <button 
                      type="button"
                      className="btn btn-sm btn-primary"
                      style={{ fontWeight: 800, padding: '6px 14px', fontSize: '0.82rem' }}
                      onClick={() => handleClaim(idx)}
                    >
                      Saya {name}
                    </button>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                      Terisi
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
              Skor dan aksi pemain akan ter-update secara instan di layar HP Anda.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            type="button" 
            className={`btn ${allSeatsFilled ? 'btn-primary' : 'btn-secondary'} btn-block`}
            onClick={handleSpectator}
          >
            👀 {allSeatsFilled ? 'Masuk dan Nonton Sekarang' : 'Hanya Mau Menonton (Spectator)'}
          </button>
        </div>
      </div>
    </div>
  )
}
