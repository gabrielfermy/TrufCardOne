import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { midtransService } from '../../services/midtransService'

export default function PricingModal({ isOpen, onClose, user, onOpenAuth, onPaymentSuccess }) {
  const { t } = useTranslation()
  const [billingCycle, setBillingCycle] = useState('yearly') // 'monthly' | 'yearly'
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  const isGuest = !user || user.is_guest || !user.email || user.id === 'guest' || (typeof user.id === 'string' && user.id.startsWith('guest'))

  const handleSelectPlan = async (planTier) => {
    hapticsService.medium()

    // If user is guest, prompt them to login/register first
    if (isGuest) {
      soundService.playClick()
      onClose()
      if (onOpenAuth) {
        onOpenAuth()
      }
      return
    }

    setIsCheckingOut(true)
    onClose()

    try {
      await midtransService.checkout({
        planTier,
        billingCycle,
        user,
        onSuccess: (result) => {
          soundService.playVictory()
          hapticsService.success()
          if (onPaymentSuccess) onPaymentSuccess(result)
        },
        onError: (err) => {
          console.warn('[PricingModal] Payment error:', err)
        }
      })
    } catch (err) {
      console.error('Checkout error:', err)
      if (err.message === 'AUTH_REQUIRED' && onOpenAuth) {
        onOpenAuth()
      } else {
        alert(err.message || 'Terjadi kendala saat memproses checkout. Silakan coba kembali.')
      }
    } finally {
      setIsCheckingOut(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '840px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="modal-header">
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#A78BFA', letterSpacing: '1px', textTransform: 'uppercase' }}>
              KANCASELA TIERS
            </span>
            <h3 className="modal-title" style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '2px' }}>
              💎 {t('pricing.title')}
            </h3>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '20px' }}>
          {t('pricing.subtitle')}
        </p>

        {/* Guest 0-Login Warning Banner */}
        {isGuest && (
          <div style={{
            background: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.35)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            fontSize: '0.85rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>👤</span>
              <div>
                <strong style={{ color: '#FCD34D' }}>Mode Tamu (Guest):</strong>{' '}
                <span style={{ color: 'var(--text-muted)' }}>
                  Untuk berlangganan Kanca Pro, silakan <strong>Masuk atau Buat Akun</strong> terlebih dahulu agar status Pro tersimpan permanen di profil Anda.
                </span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{
                fontSize: '0.8rem',
                padding: '6px 14px',
                whiteSpace: 'nowrap',
                background: 'linear-gradient(90deg, #F59E0B, #D97706)',
                border: 'none',
                fontWeight: 700
              }}
              onClick={() => {
                onClose()
                if (onOpenAuth) onOpenAuth()
              }}
            >
              Masuk / Buat Akun
            </button>
          </div>
        )}

        {/* Billing Cycle Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.4)',
            padding: '4px',
            borderRadius: '999px',
            border: '1px solid var(--border-glass)'
          }}>
            <button
              className={`btn btn-sm ${billingCycle === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '999px', padding: '6px 18px', fontSize: '0.85rem' }}
              onClick={() => { hapticsService.light(); setBillingCycle('monthly') }}
            >
              {t('pricing.monthly')}
            </button>
            <button
              className={`btn btn-sm ${billingCycle === 'yearly' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '999px', padding: '6px 18px', fontSize: '0.85rem', position: 'relative' }}
              onClick={() => { hapticsService.light(); setBillingCycle('yearly') }}
            >
              {t('pricing.yearly')}
              <span style={{
                fontSize: '0.65rem',
                background: '#10B981',
                color: '#000',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '999px',
                marginLeft: '6px'
              }}>
                {t('pricing.save_discount')}
              </span>
            </button>
          </div>
        </div>

        {/* 3 Pricing Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '18px',
          marginBottom: '24px'
        }}>
          {/* 1. FREE PLAN (KANCA BEBAS) */}
          <div style={{
            background: 'var(--bg-glass-strong)',
            border: '1px solid var(--border-glass)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>
                🎮 {t('pricing.free_name')}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {t('pricing.free_desc')}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '18px' }}>
                Rp 0 <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>{t('pricing.per_forever')}</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>✅ {t('pricing.free_f1')}</li>
                <li>✅ {t('pricing.free_f2')}</li>
                <li>✅ {t('pricing.free_f3')}</li>
                <li>✅ {t('pricing.free_f4')}</li>
                <li>✅ {t('pricing.free_f5')}</li>
                <li>☁️ <strong>{t('pricing.free_f6')}</strong></li>
              </ul>
            </div>

            <button 
              className="btn btn-secondary btn-block"
              disabled
              style={{ opacity: 0.8 }}
            >
              {t('pricing.current_plan')}
            </button>
          </div>

          {/* 2. KANCA PRO (HIGHLIGHTED) */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.15), rgba(15, 23, 42, 0.8))',
            border: '2px solid #8B5CF6',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            boxShadow: '0 12px 35px -5px rgba(139, 92, 246, 0.3)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(90deg, #8B5CF6, #EC4899)',
              color: '#FFF',
              fontSize: '0.72rem',
              fontWeight: 900,
              letterSpacing: '1px',
              padding: '3px 12px',
              borderRadius: '999px',
              textTransform: 'uppercase'
            }}>
              ⭐ PALING POPULER
            </div>

            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', color: '#C084FC' }}>
                👑 {t('pricing.pro_name')}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {t('pricing.pro_desc')}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '4px', color: '#FFF' }}>
                {billingCycle === 'yearly' ? 'Rp 129.000' : 'Rp 19.000'}
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                  {billingCycle === 'yearly' ? ` ${t('pricing.per_year')}` : ` ${t('pricing.per_month')}`}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10B981', marginBottom: '18px', fontWeight: 700 }}>
                {billingCycle === 'yearly' ? t('pricing.pro_sub_yearly') : t('pricing.pro_sub_monthly')}
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li style={{ color: '#FCD34D' }}>🚫 <strong>{t('pricing.pro_f0')}</strong></li>
                <li>✨ <strong>{t('pricing.pro_f1')}</strong></li>
                <li>📊 <strong>{t('pricing.pro_f2')}</strong></li>
                <li>📸 <strong>{t('pricing.pro_f3')}</strong></li>
                <li>🎵 {t('pricing.pro_f4')}</li>
                <li>📑 {t('pricing.pro_f5')}</li>
                <li>👑 {t('pricing.pro_f6')}</li>
              </ul>
            </div>

            <button 
              className="btn btn-primary btn-block"
              style={{
                background: isGuest ? 'linear-gradient(90deg, #F59E0B, #D97706)' : 'linear-gradient(90deg, #8B5CF6, #7C3AED)',
                border: 'none',
                boxShadow: isGuest ? '0 8px 20px rgba(245, 158, 11, 0.4)' : '0 8px 20px rgba(139, 92, 246, 0.4)'
              }}
              disabled={isCheckingOut}
              onClick={() => handleSelectPlan('pro')}
            >
              {isGuest
                ? '🔑 Masuk & Upgrade Pro'
                : (isCheckingOut ? 'Memproses Midtrans...' : `🚀 ${t('pricing.upgrade_pro')}`)}
            </button>
          </div>

          {/* 3. KANCA WARKOP (B2B VENUE) */}
          <div style={{
            background: 'var(--bg-glass-strong)',
            border: '1px solid var(--border-glass)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', color: '#F59E0B' }}>
                ☕ {t('pricing.venue_name')}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {t('pricing.venue_desc')}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '4px', color: '#FFF' }}>
                {billingCycle === 'yearly' ? 'Rp 1.199.000' : 'Rp 149.000'}
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                  {billingCycle === 'yearly' ? ` ${t('pricing.per_year')}` : ` ${t('pricing.per_month')}`}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#F59E0B', marginBottom: '18px', fontWeight: 700 }}>
                {billingCycle === 'yearly' ? t('pricing.venue_sub_yearly') : t('pricing.venue_sub_monthly')}
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>📺 <strong>{t('pricing.venue_f1')}</strong></li>
                <li>🏆 <strong>{t('pricing.venue_f2')}</strong></li>
                <li>🏷️ <strong>{t('pricing.venue_f3')}</strong></li>
                <li>👥 {t('pricing.venue_f4')}</li>
                <li>📞 {t('pricing.venue_f5')}</li>
              </ul>
            </div>

            <button 
              className="btn btn-secondary btn-block"
              style={{ borderColor: '#F59E0B', color: '#FBBF24' }}
              disabled={isCheckingOut}
              onClick={() => handleSelectPlan('venue')}
            >
              {isGuest
                ? '🔑 Masuk & Berlangganan'
                : (isCheckingOut ? 'Memproses Midtrans...' : `☕ ${t('pricing.contact_sales')}`)}
            </button>
          </div>
        </div>

        {/* Midtrans Trust & Compliance Security Footer */}
        <div
          style={{
            borderTop: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
            paddingTop: '16px',
            marginTop: '8px',
            fontSize: '0.75rem',
            color: 'var(--text-dim, #94A3B8)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>🔒 <strong>Pembayaran Resmi & Aman Didukung oleh Midtrans</strong></span>
            <span>•</span>
            <span>Metode: QRIS, GoPay, ShopeePay, VA BCA / Mandiri / BNI / BRI, Kartu Kredit</span>
          </div>
          <div style={{ lineHeight: 1.4, maxWidth: '640px', margin: '0 auto', fontSize: '0.72rem' }}>
            <strong>Pengiriman Layanan:</strong> Akses fitur Kanca Pro aktif secara otomatis dan instan segera setelah pembayaran terkonfirmasi. <br />
            <strong>Kebijakan Pengembalian Dana:</strong> Jika terjadi kendala transaksi atau pemotongan ganda, hubungi <code>support@kancasela.my.id</code> untuk proses pengembalian dana 100% dalam 3x24 jam kerja.
          </div>
        </div>
      </div>
    </div>
  )
}
