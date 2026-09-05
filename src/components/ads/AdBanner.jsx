import React, { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { adService } from '../../services/adService'

/**
 * AdBanner Component
 * - Automatically hidden if user has active Pro subscription (`isPro === true`).
 * - On Native Capacitor: Displays native AdMob banner via adService.
 * - On Web: Renders Google AdSense responsive slot or test/sponsor placeholder.
 */
export default function AdBanner({ isPro = false, onOpenPricing, placement = 'dashboard' }) {
  const adRef = useRef(null)
  const isNative = Capacitor.isNativePlatform()

  const adsenseClientId = import.meta.env.VITE_ADSENSE_CLIENT_ID
  const adsenseSlotId = import.meta.env.VITE_ADSENSE_BANNER_SLOT_ID
  const isAdSenseConfigured = Boolean(adsenseClientId && adsenseSlotId)

  useEffect(() => {
    if (isPro) return

    if (isNative) {
      // Trigger native AdMob banner
      adService.showBanner()
      return () => {
        adService.hideBanner()
      }
    } else if (isAdSenseConfigured && typeof window !== 'undefined') {
      try {
        // Push ad slot to AdSense queue
        ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (err) {
        console.warn('[AdBanner] AdSense push error:', err)
      }
    }
  }, [isPro, isNative, isAdSenseConfigured])

  // If user is Pro, render nothing
  if (isPro) {
    return null
  }

  // On Native mobile apps, AdMob renders as an OS-level overlay at the bottom.
  // We provide a subtle spacer element so bottom content isn't obscured.
  if (isNative) {
    return <div className="ad-native-spacer" style={{ height: '56px', width: '100%' }} />
  }

  return (
    <div
      className="ad-banner-container"
      style={{
        width: '100%',
        maxWidth: '728px',
        margin: '16px auto',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px',
        background: 'rgba(18, 22, 36, 0.65)',
        border: '1px dashed rgba(255, 255, 255, 0.12)',
        overflow: 'hidden',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Ad Disclaimer Label */}
      <div
        style={{
          fontSize: '0.68rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-dim, #71717A)',
          marginBottom: '6px',
          display: 'flex',
          justifyContent: 'space-between',
          width: '100%',
          padding: '0 4px',
        }}
      >
        <span>IKLAN / SPONSOR</span>
        {onOpenPricing && (
          <button
            onClick={onOpenPricing}
            style={{
              background: 'none',
              border: 'none',
              color: '#F59E0B',
              fontSize: '0.68rem',
              cursor: 'pointer',
              textDecoration: 'underline',
              padding: 0,
            }}
          >
            Hilangkan Iklan (Kanca Pro 👑)
          </button>
        )}
      </div>

      {isAdSenseConfigured ? (
        /* Real AdSense Slot */
        <div style={{ width: '100%', minHeight: '90px', display: 'flex', justifyContent: 'center' }} ref={adRef}>
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', minHeight: '90px' }}
            data-ad-client={adsenseClientId}
            data-ad-slot={adsenseSlotId}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      ) : (
        /* Test Mode / Dev / Placeholder Banner */
        <div
          onClick={onOpenPricing}
          style={{
            width: '100%',
            padding: '14px 16px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(236, 72, 153, 0.08) 100%)',
            border: '1px solid rgba(165, 180, 252, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: onOpenPricing ? 'pointer' : 'default',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>👑</span>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main, #FFF)' }}>
                Nikmati KancaSela 100% Bebas Iklan
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim, #94A3B8)' }}>
                Upgrade ke Kanca Pro untuk buka riwayat tanpa batas & template VIP
              </div>
            </div>
          </div>
          {onOpenPricing && (
            <span
              style={{
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#818CF8',
                background: 'rgba(99, 102, 241, 0.2)',
                padding: '6px 12px',
                borderRadius: '6px',
                whiteSpace: 'nowrap',
              }}
            >
              Lihat Pro &rarr;
            </span>
          )}
        </div>
      )}
    </div>
  )
}
