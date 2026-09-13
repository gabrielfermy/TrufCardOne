import React, { useState, useEffect } from 'react'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'

export default function SimulatedAdModal() {
  const [adState, setAdState] = useState(null) // null | { type: 'interstitial' | 'rewarded', onRewarded, onDismissed }
  const [countdown, setCountdown] = useState(0)
  const [isSkippable, setIsSkippable] = useState(false)

  useEffect(() => {
    const handleShowAd = (e) => {
      const detail = e.detail || {}
      setAdState(detail)
      const duration = detail.type === 'rewarded' ? 5 : 3
      setCountdown(duration)
      setIsSkippable(false)
      try { soundService.playClick() } catch (err) {}
      try { hapticsService.medium() } catch (err) {}
    }

    window.addEventListener('kancasela:show-simulated-ad', handleShowAd)
    return () => {
      window.removeEventListener('kancasela:show-simulated-ad', handleShowAd)
    }
  }, [])

  useEffect(() => {
    if (!adState || countdown <= 0) {
      if (countdown === 0 && adState) {
        setIsSkippable(true)
        if (adState.type === 'rewarded' && adState.onRewarded) {
          adState.onRewarded()
        }
      }
      return
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [adState, countdown])

  if (!adState) return null

  const isRewarded = adState.type === 'rewarded'

  const handleClose = () => {
    try { soundService.playClick() } catch (err) {}
    try { hapticsService.light() } catch (err) {}
    if (adState.onDismissed && !isSkippable) {
      adState.onDismissed(new Error('USER_SKIPPED_EARLY'))
    }
    setAdState(null)
  }

  return (
    <div
      className="modal-overlay"
      style={{
        zIndex: 99999,
        background: 'rgba(5, 7, 15, 0.95)',
        backdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          background: 'linear-gradient(145deg, #131728 0%, #0B0D18 100%)',
          borderRadius: '24px',
          border: '1px solid rgba(139, 92, 246, 0.35)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(139, 92, 246, 0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            padding: '14px 20px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                color: '#10B981',
                background: 'rgba(16, 185, 129, 0.15)',
                padding: '2px 8px',
                borderRadius: '999px',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            >
              TEST MODE SIMULATOR
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim, #94A3B8)' }}>
              {isRewarded ? 'Google AdMob Rewarded Video' : 'Google AdSense/AdMob Interstitial'}
            </span>
          </div>

          <button
            onClick={handleClose}
            disabled={!isSkippable}
            style={{
              background: isSkippable ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.08)',
              border: isSkippable ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid transparent',
              color: isSkippable ? '#F87171' : 'var(--text-dim, #64748B)',
              fontSize: '0.78rem',
              fontWeight: 700,
              padding: '6px 14px',
              borderRadius: '999px',
              cursor: isSkippable ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease',
            }}
          >
            {isSkippable ? '✕ Lewati / Tutup' : `⏱️ Tunggu (${countdown}s)`}
          </button>
        </div>

        {/* Ad Video / Creative Simulation Box */}
        <div
          style={{
            padding: '32px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #6366F1 0%, #EC4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              boxShadow: '0 10px 25px rgba(99, 102, 241, 0.4)',
            }}
          >
            {isRewarded ? '🎁' : '🎮'}
          </div>

          <div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFF', margin: '0 0 6px 0' }}>
              {isRewarded ? 'Dapatkan Template Story Eksklusif VIP!' : 'Sponsor Pertandingan Anda'}
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted, #94A3B8)', margin: 0, maxWidth: '400px', lineHeight: 1.5 }}>
              {isRewarded
                ? 'Tonton simulasi video iklan 5 detik ini hingga selesai untuk membuka template Story Card VIP secara gratis.'
                : 'Iklan Interstitial ini muncul otomatis di akhir sesi pertandingan (Khusus akun Free, tidak muncul pada Kanca Pro).'}
            </p>
          </div>

          {/* Simulated Video Progress Bar */}
          <div style={{ width: '100%', maxWidth: '360px', marginTop: '12px' }}>
            <div
              style={{
                height: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: isRewarded
                    ? 'linear-gradient(90deg, #F59E0B, #10B981)'
                    : 'linear-gradient(90deg, #8B5CF6, #3B82F6)',
                  width: `${(( (isRewarded ? 5 : 3) - countdown ) / (isRewarded ? 5 : 3)) * 100}%`,
                  transition: 'width 1s linear',
                  borderRadius: '999px',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim, #71717A)', marginTop: '6px' }}>
              <span>{isSkippable ? 'Iklan Selesai ✅' : 'Memutar Iklan...'}</span>
              <span>{countdown}s tersisa</span>
            </div>
          </div>

          {/* Pro Promotion CTA */}
          <div
            style={{
              marginTop: '12px',
              padding: '12px 16px',
              borderRadius: '12px',
              background: 'rgba(139, 92, 246, 0.08)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              fontSize: '0.8rem',
              color: '#C084FC',
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            👑 <strong>Ingin 100% bebas dari semua iklan?</strong> Upgrade ke <strong>Kanca Pro</strong> di menu profil.
          </div>
        </div>
      </div>
    </div>
  )
}
