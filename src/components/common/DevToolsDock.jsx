import React, { useState } from 'react'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { wakeLockService } from '../../services/wakeLockService'
import { networkService } from '../../services/networkService'
import { authService } from '../../services/authService'
import { midtransService } from '../../services/midtransService'
import { supabase } from '../../services/supabaseClient'

export default function DevToolsDock({ user, onUserRefresh, onOpenPricing, onOpenAuth }) {
  const [isOpen, setIsOpen] = useState(false)
  const [wakeLockActive, setWakeLockActive] = useState(false)
  const [onlineStatus, setOnlineStatus] = useState(() => networkService.isOnline())

  const isPro = authService.isUserPro(user)

  const handleTogglePro = async () => {
    if (!user) {
      if (onOpenAuth) onOpenAuth()
      return
    }
    const newPro = !isPro
    try {
      await supabase
        .from('profiles')
        .update({
          is_pro: newPro,
          subscription_tier: newPro ? 'pro' : 'free',
          pro_expires_at: newPro ? new Date(Date.now() + 30 * 86400000).toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      soundService.playVictory()
      hapticsService.success()
      if (onUserRefresh) onUserRefresh()
    } catch (err) {
      console.error('Toggle Pro error:', err)
    }
  }

  const handleTriggerInterstitial = () => {
    window.dispatchEvent(new CustomEvent('kancasela:show-simulated-ad', {
      detail: { type: 'interstitial' }
    }))
  }

  const handleTriggerRewarded = () => {
    window.dispatchEvent(new CustomEvent('kancasela:show-simulated-ad', {
      detail: {
        type: 'rewarded',
        onRewarded: () => {
          soundService.playVictory()
          hapticsService.success()
          alert('🎉 Hadiah berhasil di-claim! (Simulasi Rewarded Ad)')
        }
      }
    }))
  }

  const handleTestMidtrans = () => {
    midtransService.checkout({
      planTier: 'pro',
      billingCycle: 'yearly',
      user,
      onSuccess: () => {
        if (onUserRefresh) onUserRefresh()
      }
    }).catch(err => {
      if (err.message === 'AUTH_REQUIRED' && onOpenAuth) {
        onOpenAuth()
      }
    })
  }

  const handleToggleWakeLock = async () => {
    if (wakeLockActive) {
      await wakeLockService.disable()
      setWakeLockActive(false)
    } else {
      await wakeLockService.enable()
      setWakeLockActive(true)
    }
    hapticsService.light()
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(var(--bottom-nav-height, 70px) + 12px)',
        right: '14px',
        zIndex: 9999,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Floating Toggle Pill */}
      <button
        onClick={() => { hapticsService.light(); setIsOpen(!isOpen) }}
        style={{
          background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
          color: '#FFF',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          borderRadius: '999px',
          padding: '6px 12px',
          fontSize: '0.74rem',
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: '0 8px 24px rgba(79, 70, 229, 0.45)',
          backdropFilter: 'blur(8px)',
        }}
        title="Toggle Local DevTools"
      >
        <span>🛠️ DevTools</span>
        <span style={{
          background: isPro ? '#F59E0B' : '#10B981',
          color: '#000',
          fontSize: '0.62rem',
          fontWeight: 900,
          padding: '1px 5px',
          borderRadius: '999px',
        }}>
          {isPro ? 'PRO 👑' : 'FREE'}
        </span>
      </button>

      {/* Expanded Control Dock */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            bottom: '44px',
            right: '0',
            width: 'min(320px, calc(100vw - 28px))',
            maxHeight: '75vh',
            overflowY: 'auto',
            background: 'linear-gradient(145deg, #131728 0%, #0D0F1B 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(79, 70, 229, 0.25)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            color: '#FFF',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px' }}>
            <strong style={{ fontSize: '0.85rem', color: '#A78BFA' }}>🛠️ Local Testing Center</strong>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-dim, #64748B)', cursor: 'pointer', fontSize: '0.9rem' }}
            >
              ✕
            </button>
          </div>

          {/* User Status / Pro Switcher */}
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim, #94A3B8)', textTransform: 'uppercase', marginBottom: '6px' }}>
              1. Status Pengguna & Iklan:
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={handleTogglePro}
                className="btn btn-sm btn-block"
                style={{
                  background: isPro ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  borderColor: isPro ? '#F59E0B' : '#10B981',
                  color: isPro ? '#FCD34D' : '#34D399',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '6px 8px',
                }}
              >
                {isPro ? '👑 Switch ke Free (Muncul Iklan)' : '⚡ Switch ke Pro (Bebas Iklan)'}
              </button>
            </div>
          </div>

          {/* Ad Simulators */}
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim, #94A3B8)', textTransform: 'uppercase', marginBottom: '6px' }}>
              2. Test Google AdSense / AdMob:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <button
                type="button"
                onClick={handleTriggerInterstitial}
                className="btn btn-sm btn-secondary"
                style={{ fontSize: '0.72rem', padding: '6px' }}
              >
                🎬 Interstitial Ad
              </button>
              <button
                type="button"
                onClick={handleTriggerRewarded}
                className="btn btn-sm btn-secondary"
                style={{ fontSize: '0.72rem', padding: '6px' }}
              >
                🎁 Rewarded Video
              </button>
            </div>
          </div>

          {/* Midtrans Sandbox */}
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim, #94A3B8)', textTransform: 'uppercase', marginBottom: '6px' }}>
              3. Test Midtrans Payment:
            </div>
            <button
              type="button"
              onClick={handleTestMidtrans}
              className="btn btn-sm btn-primary btn-block"
              style={{
                fontSize: '0.74rem',
                background: 'linear-gradient(90deg, #3B82F6, #1D4ED8)',
                padding: '6px 10px',
              }}
            >
              💳 Test Midtrans Snap Checkout
            </button>
          </div>

          {/* Audio Synthesizer */}
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim, #94A3B8)', textTransform: 'uppercase', marginBottom: '6px' }}>
              4. Test Web Audio Synthesizer:
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
              <button type="button" onClick={() => soundService.playClick()} className="btn btn-sm btn-secondary" style={{ fontSize: '0.68rem', padding: '4px' }}>
                🔊 Click
              </button>
              <button type="button" onClick={() => soundService.playTick()} className="btn btn-sm btn-secondary" style={{ fontSize: '0.68rem', padding: '4px' }}>
                ⏱️ Tick
              </button>
              <button type="button" onClick={() => soundService.playWarning()} className="btn btn-sm btn-secondary" style={{ fontSize: '0.68rem', padding: '4px' }}>
                ⚠️ Beep
              </button>
              <button type="button" onClick={() => soundService.playVictory()} className="btn btn-sm btn-secondary" style={{ fontSize: '0.68rem', padding: '4px' }}>
                🏆 Victory
              </button>
              <button type="button" onClick={() => soundService.playDice()} className="btn btn-sm btn-secondary" style={{ fontSize: '0.68rem', padding: '4px' }}>
                🎲 Dice
              </button>
              <button type="button" onClick={() => soundService.playCardFlip()} className="btn btn-sm btn-secondary" style={{ fontSize: '0.68rem', padding: '4px' }}>
                🃏 Card
              </button>
            </div>
          </div>

          {/* Hardware Utilities */}
          <div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim, #94A3B8)', textTransform: 'uppercase', marginBottom: '6px' }}>
              5. Haptics & WakeLock:
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => { hapticsService.medium() }}
                className="btn btn-sm btn-secondary"
                style={{ flex: 1, fontSize: '0.72rem', padding: '6px' }}
              >
                📳 Getar (Haptic)
              </button>
              <button
                type="button"
                onClick={handleToggleWakeLock}
                className="btn btn-sm btn-secondary"
                style={{ flex: 1, fontSize: '0.72rem', padding: '6px', color: wakeLockActive ? '#34D399' : 'inherit' }}
              >
                {wakeLockActive ? '🔒 WakeLock ON' : '🔓 WakeLock OFF'}
              </button>
            </div>
          </div>

          {/* External Links */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
            <a
              href="http://127.0.0.1:54343"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#38BDF8', textDecoration: 'underline' }}
            >
              📊 Supabase Studio
            </a>
            <a
              href="http://127.0.0.1:54344"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#A78BFA', textDecoration: 'underline' }}
            >
              ✉️ Mailpit (Local Email)
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
