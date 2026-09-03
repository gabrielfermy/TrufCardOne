import React from 'react'

export default function ActivityLogDrawer({
  isOpen,
  onClose,
  logs = []
}) {
  if (!isOpen) return null

  const getActionIcon = (type) => {
    switch (type) {
      case 'bid': return '🎯'
      case 'won': return '🃏'
      case 'suit': return '♠️'
      case 'play_mode': return '⚡'
      case 'check_in': return '👥'
      case 'save_round': return '💾'
      case 'undo': return '↩️'
      default: return '📝'
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1150 }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '480px', 
          width: '92%', 
          maxHeight: '80vh', 
          display: 'flex', 
          flexDirection: 'column', 
          textAlign: 'left' 
        }}
      >
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '1px' }}>
              AUDIT TRAIL
            </span>
            <h3 className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: '2px' }}>
              📜 Log Aktivitas Meja
            </h3>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '10px 0' }}>
          Semua perubahan bid, trik, dan kontrol meja disinkronkan dan dicatat secara realtime untuk transparansi.
        </p>

        {/* Logs Feed Container */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '8px', 
          padding: '8px 0',
          maxHeight: '400px'
        }}>
          {logs.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '36px 16px', 
              color: 'var(--text-dim)', 
              fontSize: '0.88rem' 
            }}>
              Belum ada aktivitas tercatat di sesi ini.
            </div>
          ) : (
            logs.slice().reverse().map((log, idx) => {
              const timeStr = log.timestamp 
                ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : ''

              const isHostAction = log.actorRole === 'host'

              return (
                <div 
                  key={log.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 12px',
                    background: isHostAction ? 'rgba(245, 158, 11, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                    border: isHostAction ? '1px solid rgba(245, 158, 11, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}
                >
                  <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>
                    {getActionIcon(log.actionType)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                      <span style={{ 
                        fontWeight: 700, 
                        color: isHostAction ? '#FBBF24' : '#E2E8F0',
                        fontSize: '0.8rem'
                      }}>
                        {log.actorName || 'Pemain'}
                        {isHostAction && ' (Host)'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        {timeStr}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-main)', marginTop: '2px', wordBreak: 'break-word' }}>
                      {log.text}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px', marginTop: '10px' }}>
          <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
            Tutup Log
          </button>
        </div>
      </div>
    </div>
  )
}
