import React, { useState, useEffect } from 'react'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'

export default function MidtransSandboxModal() {
  const [dialogData, setDialogData] = useState(null)
  const [selectedMethod, setSelectedMethod] = useState('qris')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const handleOpen = (e) => {
      setDialogData(e.detail)
      setSelectedMethod('qris')
      setIsProcessing(false)
      try { soundService.playClick() } catch (err) {}
      try { hapticsService.light() } catch (err) {}
    }

    window.addEventListener('kancasela:show-midtrans-sandbox-dialog', handleOpen)
    return () => {
      window.removeEventListener('kancasela:show-midtrans-sandbox-dialog', handleOpen)
    }
  }, [])

  if (!dialogData) return null

  const { plan, transaction, onConfirm, onCancel } = dialogData

  const handlePaySuccess = async () => {
    setIsProcessing(true)
    try {
      soundService.playVictory()
      hapticsService.success()
      if (onConfirm) await onConfirm()
      setDialogData(null)
    } catch (e) {
      console.error('Midtrans sandbox pay error:', e)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    try { soundService.playClick() } catch (err) {}
    if (onCancel) onCancel()
    setDialogData(null)
  }

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 99998,
        background: 'rgba(5, 7, 15, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          width: '100%',
          background: 'linear-gradient(145deg, #15192C 0%, #0E101D 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(59, 130, 246, 0.2)',
          padding: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#38BDF8',
                background: 'rgba(56, 189, 248, 0.15)',
                padding: '3px 10px',
                borderRadius: '999px',
                border: '1px solid rgba(56, 189, 248, 0.3)',
              }}
            >
              MIDTRANS SNAP SANDBOX
            </span>
          </div>
          <button className="btn-close" onClick={handleClose}>✕</button>
        </div>

        {/* Order Details Header */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '20px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim, #94A3B8)', marginBottom: '4px' }}>
            Order ID: <code style={{ color: '#A78BFA' }}>{transaction?.orderId}</code>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFF', marginBottom: '4px' }}>
            {plan?.name}
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34D399' }}>
            Rp {plan?.price?.toLocaleString('id-ID')}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim, #94A3B8)', fontWeight: 400 }}>
              {' '}/ {plan?.cycle === 'yearly' ? 'Tahun' : 'Bulan'}
            </span>
          </div>
        </div>

        {/* Payment Methods Simulator */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted, #94A3B8)', marginBottom: '10px' }}>
            Pilih Metode Pembayaran (Sandbox):
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {[
              { id: 'qris', icon: '📱', name: 'QRIS / GoPay' },
              { id: 'bca_va', icon: '🏦', name: 'BCA Virtual Account' },
              { id: 'mandiri_va', icon: '🏧', name: 'Mandiri / BNI / BRI' },
              { id: 'cc', icon: '💳', name: 'Kartu Kredit (Test)' },
            ].map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => { hapticsService.light(); setSelectedMethod(m.id) }}
                style={{
                  padding: '10px',
                  borderRadius: '10px',
                  border: selectedMethod === m.id ? '2px solid #8B5CF6' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: selectedMethod === m.id ? 'rgba(139, 92, 246, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                  color: '#FFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  textAlign: 'left',
                }}
              >
                <span>{m.icon}</span>
                <span>{m.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Simulator Info */}
        <div
          style={{
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '10px',
            padding: '10px 12px',
            fontSize: '0.78rem',
            color: '#93C5FD',
            marginBottom: '20px',
            lineHeight: 1.4,
          }}
        >
          💡 <strong>Mode Sandbox Midtrans:</strong> Klik tombol konfirmasi di bawah untuk mensimulasikan pembayaran lunas <em>(Settlement)</em> dan langsung mengaktifkan status Kanca Pro di profil database Anda.
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={handlePaySuccess}
            disabled={isProcessing}
            style={{
              background: 'linear-gradient(90deg, #10B981, #059669)',
              border: 'none',
              padding: '12px',
              fontSize: '0.95rem',
              fontWeight: 800,
              boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)',
            }}
          >
            {isProcessing ? 'Memproses Pembayaran...' : '⚡ Bayar Sekarang (Simulasi Sukses)'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-block"
            onClick={handleClose}
            style={{ padding: '8px', fontSize: '0.85rem' }}
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  )
}
