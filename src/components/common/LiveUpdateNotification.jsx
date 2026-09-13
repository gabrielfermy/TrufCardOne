import React, { useState, useEffect } from 'react'
import { versionService } from '../../services/versionService'
import { hapticsService } from '../../services/hapticsService'

export default function LiveUpdateNotification() {
  const [updateData, setUpdateData] = useState(null)
  const [countdown, setCountdown] = useState(15)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    versionService.init({
      onUpdateAvailable: (data) => {
        setUpdateData(data)
        setIsDismissed(false)
        try { hapticsService.medium() } catch (e) {}
      }
    })
  }, [])

  useEffect(() => {
    if (!updateData || isDismissed) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          versionService.applyUpdate()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [updateData, isDismissed])

  if (!updateData || isDismissed) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99999,
        width: '92%',
        maxWidth: '460px',
        background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(15, 23, 42, 0.95))',
        border: '1px solid rgba(139, 92, 246, 0.5)',
        borderRadius: '16px',
        boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6), 0 0 20px rgba(139, 92, 246, 0.3)',
        backdropFilter: 'blur(12px)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            flexShrink: 0,
            boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)',
          }}
        >
          🚀
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#FFF' }}>
            Update Sistem KancaSela
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted, #94A3B8)' }}>
            Pembaruan baru tersedia ({countdown}s)
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          type="button"
          className="btn btn-sm btn-primary"
          style={{
            background: 'linear-gradient(90deg, #10B981, #059669)',
            border: 'none',
            fontSize: '0.78rem',
            fontWeight: 800,
            padding: '6px 12px',
            borderRadius: '8px',
            whiteSpace: 'nowrap',
          }}
          onClick={() => {
            try { hapticsService.success() } catch (e) {}
            versionService.applyUpdate()
          }}
        >
          Perbarui ⚡
        </button>
        <button
          type="button"
          className="btn btn-sm btn-secondary"
          style={{
            fontSize: '0.75rem',
            padding: '6px 8px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.08)',
          }}
          onClick={() => setIsDismissed(true)}
          title="Nanti saja"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
