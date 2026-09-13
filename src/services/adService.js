import { Capacitor } from '@capacitor/core'

/**
 * Official Google AdMob Test IDs (for safe local development without risk of account suspension)
 */
const GOOGLE_TEST_IDS = {
  androidBanner: 'ca-app-pub-3940256099942544/6300978111',
  androidInterstitial: 'ca-app-pub-3940256099942544/1033173712',
  androidRewarded: 'ca-app-pub-3940256099942544/5224354917',
}

// Minimum duration between interstitial popups to respect player experience
const INTERSTITIAL_COOLDOWN_MS = 8 * 60 * 1000 // 8 minutes

class AdService {
  constructor() {
    this.isPro = false
    this.isNative = Capacitor.isNativePlatform()
    this.isTestMode = import.meta.env.VITE_ADS_TEST_MODE !== 'false'
    this.lastInterstitialTime = 0
    this.isAdMobInitialized = false
    this.isAdSenseInitialized = false
    this.adMobPlugin = null
  }

  /**
   * Update whether current user has an active Pro subscription.
   * If user becomes Pro, immediately dismiss any active native banners.
   */
  setProStatus(isPro) {
    this.isPro = Boolean(isPro)
    if (this.isPro && this.isNative) {
      this.hideBanner()
    }
  }

  /**
   * Initialize ads based on platform (AdMob for native APK, AdSense for Web)
   */
  async initAds(isPro = false) {
    this.setProStatus(isPro)
    if (this.isPro) return

    if (this.isNative) {
      await this.initAdMob()
    } else {
      this.initAdSense()
    }
  }

  /**
   * Initialize Google AdMob on Capacitor Android/iOS
   */
  async initAdMob() {
    if (this.isAdMobInitialized) return
    try {
      const { AdMob } = await import('@capacitor-community/admob')
      this.adMobPlugin = AdMob

      await AdMob.initialize({
        requestTrackingAuthorization: true,
        initializeForTesting: this.isTestMode,
      })

      this.isAdMobInitialized = true
      console.log('[AdService] Google AdMob initialized. Test mode:', this.isTestMode)
    } catch (err) {
      console.warn('[AdService] AdMob initialization skipped or failed:', err?.message || err)
    }
  }

  /**
   * Initialize Google AdSense for Web Browser
   */
  initAdSense() {
    if (this.isAdSenseInitialized || typeof window === 'undefined') return
    const clientId = import.meta.env.VITE_ADSENSE_CLIENT_ID

    if (!clientId) {
      // In dev or until AdSense account is approved, mock / placeholder mode is used
      return
    }

    try {
      const existingScript = document.querySelector(`script[src*="adsbygoogle.js"]`)
      if (!existingScript) {
        const script = document.createElement('script')
        script.async = true
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`
        script.crossOrigin = 'anonymous'
        document.head.appendChild(script)
      }
      this.isAdSenseInitialized = true
      console.log('[AdService] Google AdSense web script registered')
    } catch (err) {
      console.warn('[AdService] AdSense web injection error:', err)
    }
  }

  /**
   * Show bottom banner ad on native device
   */
  async showBanner() {
    if (this.isPro || !this.isNative || !this.adMobPlugin) return

    const adId = (!this.isTestMode && import.meta.env.VITE_ADMOB_BANNER_ID)
      ? import.meta.env.VITE_ADMOB_BANNER_ID
      : GOOGLE_TEST_IDS.androidBanner

    try {
      const { BannerAdPosition, BannerAdSize } = await import('@capacitor-community/admob')
      await this.adMobPlugin.showBanner({
        adId,
        adSize: BannerAdSize.ADAPTIVE_BANNER,
        position: BannerAdPosition.BOTTOM_CENTER,
        margin: 0,
        isTesting: this.isTestMode,
      })
    } catch (err) {
      console.warn('[AdService] showBanner failed:', err?.message || err)
    }
  }

  /**
   * Hide native banner ad
   */
  async hideBanner() {
    if (!this.isNative || !this.adMobPlugin) return
    try {
      await this.adMobPlugin.hideBanner()
    } catch (err) {
      console.warn('[AdService] hideBanner error:', err?.message || err)
    }
  }

  /**
   * Show full-screen interstitial ad after a match is finalized,
   * provided frequency capping cooldown has passed and user is not Pro.
   */
  async showInterstitialIfEligible() {
    if (this.isPro) return { shown: false, reason: 'pro_user' }

    const now = Date.now()
    if (now - this.lastInterstitialTime < INTERSTITIAL_COOLDOWN_MS) {
      return { shown: false, reason: 'frequency_capped' }
    }

    if (this.isNative && this.adMobPlugin) {
      const adId = (!this.isTestMode && import.meta.env.VITE_ADMOB_INTERSTITIAL_ID)
        ? import.meta.env.VITE_ADMOB_INTERSTITIAL_ID
        : GOOGLE_TEST_IDS.androidInterstitial

      try {
        await this.adMobPlugin.prepareInterstitial({
          adId,
          isTesting: this.isTestMode,
        })
        await this.adMobPlugin.showInterstitial()
        this.lastInterstitialTime = Date.now()
        return { shown: true }
      } catch (err) {
        console.warn('[AdService] Native showInterstitial failed:', err?.message || err)
        return { shown: false, error: err }
      }
    }

    // Web / Localhost / Dev Simulation
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kancasela:show-simulated-ad', {
        detail: { type: 'interstitial' }
      }))
      this.lastInterstitialTime = Date.now()
      return { shown: true, simulated: true }
    }

    return { shown: false, reason: 'unsupported_platform' }
  }

  /**
   * Show rewarded video ad (e.g., to unlock VIP story template 1x for free users)
   */
  async showRewardedAd({ onRewarded, onDismissed }) {
    if (this.isPro) {
      // Pro users immediately get the reward without watching ads
      if (onRewarded) onRewarded()
      return
    }

    if (this.isNative && this.adMobPlugin) {
      const adId = (!this.isTestMode && import.meta.env.VITE_ADMOB_REWARDED_ID)
        ? import.meta.env.VITE_ADMOB_REWARDED_ID
        : GOOGLE_TEST_IDS.androidRewarded

      try {
        await this.adMobPlugin.prepareRewardVideoAd({
          adId,
          isTesting: this.isTestMode,
        })
        const rewardItem = await this.adMobPlugin.showRewardVideoAd()
        if (onRewarded) onRewarded(rewardItem)
        return
      } catch (err) {
        console.warn('[AdService] showRewardedAd failed:', err?.message || err)
        if (onDismissed) onDismissed(err)
        return
      }
    }

    // Web / Localhost / Dev Simulation
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('kancasela:show-simulated-ad', {
        detail: {
          type: 'rewarded',
          onRewarded,
          onDismissed,
        }
      }))
      return
    }

    if (onRewarded) onRewarded()
  }
}

export const adService = new AdService()
export default adService
