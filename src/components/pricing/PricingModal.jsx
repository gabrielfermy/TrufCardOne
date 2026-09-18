import React, { useState, useEffect } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { midtransService } from '../../services/midtransService'
import { authService } from '../../services/authService'

export default function PricingModal({ isOpen, onClose, user, onOpenAuth, onPaymentSuccess, onOpenProfile }) {
  const { t } = useTranslation()
  const [billingCycle, setBillingCycle] = useState('yearly') // 'monthly' | 'yearly'
  const [activeMobileTab, setActiveMobileTab] = useState('pro') // 'free' | 'pro' | 'venue'
  const [isCheckingOut, setIsCheckingOut] = useState(false)

  // Listen to Escape key to dismiss modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        try { soundService.playClick() } catch (err) {}
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isGuest = !user || user.is_guest || !user.email || user.id === 'guest' || (typeof user.id === 'string' && user.id.startsWith('guest'))
  const isPro = authService.isUserPro(user)
  const isVenue = user?.profile?.subscription_tier === 'venue'
  const isFree = !isGuest && !isPro && !isVenue
  const proExpiresAt = user?.profile?.pro_expires_at
  const formattedExpiry = proExpiresAt ? new Date(proExpiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null

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

  const handleModalClose = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    try { soundService.playClick() } catch (err) {}
    onClose()
  }

  return (
    <div 
      className="modal-overlay" 
      onClick={handleModalClose}
      style={{ zIndex: 9999, cursor: 'pointer', padding: '12px' }}
    >
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '920px', 
          width: '96%', 
          maxHeight: '94vh', 
          height: 'min(94vh, 760px)', 
          overflow: 'hidden', 
          display: 'flex',
          flexDirection: 'column',
          cursor: 'default', 
          position: 'relative',
          padding: '20px 24px 14px 24px'
        }}
      >
        {/* Modal Top Header (Fixed) */}
        <div style={{ flexShrink: 0 }}>
          <div className="modal-header" style={{ marginBottom: '4px' }}>
            <div>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
                KANCASELA TIERS & CLOUD PLANS
              </span>
              <h3 className="modal-title" style={{ fontSize: '1.45rem', fontWeight: 900, marginTop: '2px' }}>
                💎 {t('pricing.title')}
              </h3>
            </div>
            <button 
              type="button" 
              className="btn-close" 
              onClick={handleModalClose}
              aria-label="Tutup"
              style={{ cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: '0 0 10px 0' }}>
            {t('pricing.subtitle')}
          </p>

          {/* Guest vs Kanca Free Notice Banner */}
          {isGuest && (
            <div style={{
              background: 'var(--badge-gold-bg)',
              border: '1px solid var(--badge-gold-border)',
              borderRadius: '12px',
              padding: '8px 14px',
              marginBottom: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              fontSize: '0.8rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>👤</span>
                <div>
                  <strong style={{ color: 'var(--badge-gold-text)' }}>Mode Tamu (Guest):</strong>{' '}
                  <span style={{ color: 'var(--text-muted)' }}>
                    Bisa gabung & main di HP langsung tanpa login (tetapi riwayat tidak disimpan). Daftar <strong>Kanca Free</strong> gratis untuk simpan catatan game di Cloud.
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{
                  fontSize: '0.76rem',
                  padding: '5px 12px',
                  whiteSpace: 'nowrap',
                  background: 'linear-gradient(90deg, #F59E0B, #D97706)',
                  border: 'none',
                  fontWeight: 800
                }}
                onClick={() => {
                  onClose()
                  if (onOpenAuth) onOpenAuth()
                }}
              >
                Daftar Gratis
              </button>
            </div>
          )}

          {/* Billing Cycle Toggle */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--stepper-bg)',
              padding: '3px',
              borderRadius: '999px',
              border: '1px solid var(--border-glass)'
            }}>
              <button
                type="button"
                className={`btn btn-sm ${billingCycle === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: '999px', padding: '4px 16px', fontSize: '0.82rem' }}
                onClick={() => { hapticsService.light(); setBillingCycle('monthly') }}
              >
                {t('pricing.monthly')}
              </button>
              <button
                type="button"
                className={`btn btn-sm ${billingCycle === 'yearly' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ borderRadius: '999px', padding: '4px 16px', fontSize: '0.82rem', position: 'relative' }}
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

          {/* Mobile Plan Selector Tabs */}
          <div className="pricing-mobile-tabs">
            <button
              type="button"
              className={`btn btn-sm ${activeMobileTab === 'free' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '999px', fontSize: '0.76rem', padding: '4px 12px', fontWeight: 700 }}
              onClick={() => { hapticsService.light(); setActiveMobileTab('free') }}
            >
              🎮 Free
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeMobileTab === 'pro' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '999px', fontSize: '0.76rem', padding: '4px 12px', fontWeight: 700 }}
              onClick={() => { hapticsService.light(); setActiveMobileTab('pro') }}
            >
              👑 Pro
            </button>
            <button
              type="button"
              className={`btn btn-sm ${activeMobileTab === 'venue' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '999px', fontSize: '0.76rem', padding: '4px 12px', fontWeight: 700 }}
              onClick={() => { hapticsService.light(); setActiveMobileTab('venue') }}
            >
              ☕ Warkop
            </button>
          </div>
        </div>

        {/* 3 Pricing Cards Grid (Fills remaining height, each card features scrollable) */}
        <div className="pricing-modal-grid">
          {/* ======================================================== */}
          {/* 1. FREE PLAN (KANCA FREE - REGISTERED ACCOUNT)            */}
          {/* ======================================================== */}
          <div 
            className={`pricing-modal-card ${activeMobileTab === 'free' ? 'active-mobile' : ''}`}
            style={{
              background: 'var(--bg-glass-strong)',
              border: '1px solid var(--border-glass)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden'
            }}
          >
            {/* Card Header */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#38BDF8' }}>
                  🎮 Kanca Free
                </div>
                <span style={{ fontSize: '0.7rem', color: '#38BDF8', background: 'rgba(56, 189, 248, 0.12)', padding: '2px 8px', borderRadius: '999px', fontWeight: 700 }}>
                  Wajib Akun
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Akun terdaftar gratis untuk simpan riwayat game di Cloud
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, marginBottom: '2px', color: '#FFF' }}>
                Rp 0 <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{t('pricing.per_forever')}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#38BDF8', fontWeight: 700, marginBottom: '6px' }}>
                Gratis selamanya
              </div>
            </div>

            {/* Scrollable Features Section */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              minHeight: 0,
              margin: '4px 0 10px 0',
              paddingRight: '4px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent'
            }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: 1.35 }}>
                <li>☁️ <strong>Simpan 10 riwayat game di Cloud</strong></li>
                <li>✅ Akses semua game (Truf, Remi, Omben, Catur)</li>
                <li>✅ Bikin room meja multiplayer resmi</li>
                <li>✅ Papan Skor 2-8 & Jam Catur 180°</li>
                <li>✅ Dadu 3D, koin, & finger chooser</li>
                <li>✅ Ekspor Kartu Story 9:16 Standar</li>
                <li style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginTop: '4px', borderTop: '1px dashed var(--border-glass)', paddingTop: '4px' }}>
                  ℹ️ <em>Guest / Tamu: Bebas gabung room di HP tanpa login, namun riwayat game tidak tersimpan.</em>
                </li>
              </ul>
            </div>

            {/* Card Footer Button */}
            <div style={{ flexShrink: 0, marginTop: 'auto' }}>
              {isGuest ? (
                <button 
                  type="button"
                  className="btn btn-secondary btn-block btn-sm"
                  style={{ borderColor: '#38BDF8', color: '#38BDF8', fontWeight: 700 }}
                  onClick={() => {
                    onClose()
                    if (onOpenAuth) onOpenAuth()
                  }}
                >
                  🔑 Daftar Kanca Free (Gratis)
                </button>
              ) : (
                <button 
                  type="button"
                  className="btn btn-secondary btn-block btn-sm"
                  disabled
                  style={{ opacity: isFree ? 1 : 0.6, borderColor: isFree ? '#38BDF8' : undefined }}
                >
                  {isFree ? `✓ ${t('pricing.current_plan')}` : t('pricing.base_plan')}
                </button>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 2. KANCA PRO (HIGHLIGHTED)                               */}
          {/* ======================================================== */}
          <div 
            className={`pricing-modal-card ${activeMobileTab === 'pro' ? 'active-mobile' : ''}`}
            style={{
              background: (isPro && !isVenue)
                ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.15), rgba(15, 23, 42, 0.85))'
                : 'linear-gradient(145deg, rgba(139, 92, 246, 0.15), rgba(15, 23, 42, 0.8))',
              border: (isPro && !isVenue) ? '2px solid #10B981' : '2px solid #8B5CF6',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
              position: 'relative',
              boxShadow: (isPro && !isVenue) 
                ? '0 10px 30px -5px rgba(16, 185, 129, 0.3)' 
                : '0 10px 30px -5px rgba(139, 92, 246, 0.3)'
            }}
          >
            {/* Top Pill Badge */}
            <div style={{
              position: 'absolute',
              top: '-1px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: (isPro && !isVenue)
                ? 'linear-gradient(90deg, #10B981, #059669)'
                : 'linear-gradient(90deg, #8B5CF6, #EC4899)',
              color: '#FFF',
              fontSize: '0.68rem',
              fontWeight: 900,
              letterSpacing: '0.8px',
              padding: '2px 10px',
              borderRadius: '0 0 8px 8px',
              textTransform: 'uppercase'
            }}>
              {(isPro && !isVenue) ? `👑 ${t('pricing.active_badge')}` : `⭐ ${t('pricing.popular_badge')}`}
            </div>

            {/* Card Header */}
            <div style={{ flexShrink: 0, marginTop: '8px' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '2px', color: (isPro && !isVenue) ? '#34D399' : '#C084FC' }}>
                👑 {t('pricing.pro_name')}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                {t('pricing.pro_desc')}
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, marginBottom: '2px', color: '#FFF' }}>
                {billingCycle === 'yearly' ? 'Rp 129.000' : 'Rp 19.000'}
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  {billingCycle === 'yearly' ? ` ${t('pricing.per_year')}` : ` ${t('pricing.per_month')}`}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#10B981', marginBottom: '6px', fontWeight: 700 }}>
                {billingCycle === 'yearly' ? t('pricing.pro_sub_yearly') : t('pricing.pro_sub_monthly')}
              </div>

              {(isPro && !isVenue && formattedExpiry) && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  fontSize: '0.74rem',
                  color: '#34D399',
                  fontWeight: 700,
                  marginBottom: '6px',
                  textAlign: 'center'
                }}>
                  👑 Aktif sampai: <strong>{formattedExpiry}</strong>
                </div>
              )}
            </div>

            {/* Scrollable Features Section */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              minHeight: 0,
              margin: '4px 0 10px 0',
              paddingRight: '4px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(139, 92, 246, 0.5) transparent'
            }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: 1.35 }}>
                <li style={{ color: '#FCD34D' }}>🚫 <strong>100% Bebas Iklan (Tanpa Banner & Interstitial)</strong></li>
                <li>✨ <strong>Riwayat game tanpa batas seumur hidup</strong></li>
                <li>📊 <strong>Analitik Head-to-Head (Winrate vs Teman)</strong></li>
                <li>📸 <strong>VIP 9:16 Story Templates (Gold, Cyberpunk)</strong></li>
                <li>👑 <strong>Gold Crown badge di profil & avatar</strong></li>
                <li>🎵 Paket suara mekanikal & selebrasi custom</li>
                <li>📑 Ekspor laporan turnamen ke Excel / PDF</li>
              </ul>
            </div>

            {/* Card Footer Button */}
            <div style={{ flexShrink: 0, marginTop: 'auto' }}>
              {isPro && !isVenue ? (
                <button 
                  type="button"
                  className="btn btn-block btn-sm"
                  style={{
                    background: 'rgba(16, 185, 129, 0.2)',
                    border: '2px solid #10B981',
                    color: '#34D399',
                    fontWeight: 800,
                    cursor: 'default',
                    padding: '8px'
                  }}
                  disabled
                >
                  👑 {t('pricing.active_plan_pro')}
                </button>
              ) : isVenue ? (
                <button 
                  type="button"
                  className="btn btn-secondary btn-block btn-sm"
                  disabled
                  style={{ opacity: 0.7 }}
                >
                  ✅ {t('pricing.included_in_venue')}
                </button>
              ) : (
                <button 
                  type="button"
                  className="btn btn-primary btn-block btn-sm"
                  style={{
                    background: isGuest ? 'linear-gradient(90deg, #F59E0B, #D97706)' : 'linear-gradient(90deg, #8B5CF6, #7C3AED)',
                    border: 'none',
                    fontWeight: 800,
                    boxShadow: isGuest ? '0 4px 14px rgba(245, 158, 11, 0.4)' : '0 4px 14px rgba(139, 92, 246, 0.4)'
                  }}
                  disabled={isCheckingOut}
                  onClick={() => handleSelectPlan('pro')}
                >
                  {isGuest
                    ? '🔑 Masuk & Upgrade Pro'
                    : (isCheckingOut ? 'Memproses Midtrans...' : `🚀 ${t('pricing.upgrade_pro')}`)}
                </button>
              )}
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3. KANCA WARKOP (B2B VENUE)                              */}
          {/* ======================================================== */}
          <div 
            className={`pricing-modal-card ${activeMobileTab === 'venue' ? 'active-mobile' : ''}`}
            style={{
              background: isVenue 
                ? 'linear-gradient(145deg, rgba(245, 158, 11, 0.15), rgba(15, 23, 42, 0.85))'
                : 'var(--bg-glass-strong)',
              border: isVenue ? '2px solid #F59E0B' : '1px solid var(--border-glass)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {isVenue && (
              <div style={{
                position: 'absolute',
                top: '-1px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'linear-gradient(90deg, #F59E0B, #D97706)',
                color: '#000',
                fontSize: '0.68rem',
                fontWeight: 900,
                letterSpacing: '0.8px',
                padding: '2px 10px',
                borderRadius: '0 0 8px 8px',
                textTransform: 'uppercase'
              }}>
                ☕ {t('pricing.active_badge')}
              </div>
            )}

            {/* Card Header */}
            <div style={{ flexShrink: 0, marginTop: isVenue ? '8px' : 0 }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '2px', color: '#F59E0B' }}>
                ☕ {t('pricing.venue_name')}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                {t('pricing.venue_desc')}
              </div>
              <div style={{ fontSize: '1.65rem', fontWeight: 900, marginBottom: '2px', color: '#FFF' }}>
                {billingCycle === 'yearly' ? 'Rp 1.199.000' : 'Rp 149.000'}
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  {billingCycle === 'yearly' ? ` ${t('pricing.per_year')}` : ` ${t('pricing.per_month')}`}
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#F59E0B', marginBottom: '6px', fontWeight: 700 }}>
                {billingCycle === 'yearly' ? t('pricing.venue_sub_yearly') : t('pricing.venue_sub_monthly')}
              </div>
            </div>

            {/* Scrollable Features Section */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              minHeight: 0,
              margin: '4px 0 10px 0',
              paddingRight: '4px',
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(245, 158, 11, 0.4) transparent'
            }}>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px', lineHeight: 1.35 }}>
                <li>📺 <strong>Mode TV Layar Lebar (Live Leaderboard Kafe)</strong></li>
                <li>🏆 <strong>Bagan Turnamen Otomatis (Gugur & Swiss)</strong></li>
                <li>🏷️ <strong>Custom Branding Kafe di story card pemain</strong></li>
                <li>👥 Kelola multi-meja & liga komunitas warkop</li>
                <li>👑 Termasuk semua fitur Kanca Pro</li>
                <li>📞 Priority VIP Support & Event Consultation</li>
              </ul>
            </div>

            {/* Card Footer Button */}
            <div style={{ flexShrink: 0, marginTop: 'auto' }}>
              {isVenue ? (
                <button 
                  type="button"
                  className="btn btn-block btn-sm"
                  style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    border: '2px solid #F59E0B',
                    color: '#FBBF24',
                    fontWeight: 800,
                    cursor: 'default',
                    padding: '8px'
                  }}
                  disabled
                >
                  ☕ {t('pricing.active_plan_venue')}
                </button>
              ) : (
                <button 
                  type="button"
                  className="btn btn-secondary btn-block btn-sm"
                  style={{ borderColor: '#F59E0B', color: '#FBBF24', fontWeight: 800 }}
                  disabled={isCheckingOut}
                  onClick={() => handleSelectPlan('venue')}
                >
                  {isGuest
                    ? '🔑 Masuk & Berlangganan'
                    : isPro
                      ? `☕ ${t('pricing.upgrade_to_venue')}`
                      : (isCheckingOut ? 'Memproses Midtrans...' : `☕ ${t('pricing.contact_sales')}`)}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Modal Bottom Controls & Security (Fixed) */}
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border-glass)', paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', fontSize: '0.74rem', color: 'var(--text-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🔒 <strong>Pembayaran Resmi Midtrans:</strong> QRIS, GoPay, ShopeePay, VA Bank BCA/Mandiri/BNI</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!isGuest && onOpenProfile && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  try { soundService.playClick() } catch (err) {}
                  onClose()
                  onOpenProfile()
                }}
                style={{
                  fontSize: '0.74rem',
                  color: '#A78BFA',
                  borderColor: 'rgba(167, 139, 250, 0.3)',
                  padding: '4px 10px'
                }}
              >
                📜 Riwayat Transaksi
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleModalClose}
              style={{
                padding: '4px 12px',
                fontSize: '0.74rem',
                color: 'var(--text-muted)'
              }}
            >
              ✕ Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
