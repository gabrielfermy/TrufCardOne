/**
 * KancaSela Production Live Auto-Update & Version Sync Service
 * 
 * Ensures that when a new build is deployed to Staging or Production (Vercel / Cloud),
 * all active connected users automatically receive the updates in real-time
 * without needing manual browser hard-refresh.
 */

class VersionService {
  constructor() {
    this.currentBuildTime = typeof __APP_BUILD_TIME__ !== 'undefined' ? __APP_BUILD_TIME__ : null
    this.checkIntervalMs = 45000 // Check every 45 seconds
    this.timer = null
    this.listeners = new Set()
    this.hasUpdate = false
    this.latestVersionData = null
  }

  /**
   * Initializes live version polling, tab focus checks, and error recovery
   */
  init({ onUpdateAvailable } = {}) {
    if (typeof window === 'undefined') return

    if (onUpdateAvailable) {
      this.subscribe(onUpdateAvailable)
    }

    // 1. Recover gracefully if a stale Vite dynamic import chunk 404s after new deploy
    window.addEventListener('vite:preloadError', (event) => {
      console.warn('[VersionService] Preload error detected (chunk hash mismatch). Auto-reloading fresh build...')
      event.preventDefault()
      this.applyUpdate()
    })

    // 2. Initial fetch & background polling
    this.checkForUpdates()
    this.startPolling()

    // 3. Check immediately whenever user switches back to this browser tab/app
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.checkForUpdates()
      }
    })

    window.addEventListener('focus', () => {
      this.checkForUpdates()
    })

    // 4. Listen for Service Worker updatefound events
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[VersionService] Service worker controller changed. Refreshing assets...')
      })
    }
  }

  startPolling() {
    if (this.timer) clearInterval(this.timer)
    this.timer = setInterval(() => {
      this.checkForUpdates()
    }, this.checkIntervalMs)
  }

  stopPolling() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }

  subscribe(callback) {
    this.listeners.add(callback)
    if (this.hasUpdate && this.latestVersionData) {
      callback(this.latestVersionData)
    }
    return () => this.listeners.delete(callback)
  }

  notify(data) {
    this.listeners.forEach((cb) => {
      try {
        cb(data)
      } catch (err) {
        console.warn('[VersionService] Listener error:', err)
      }
    })
  }

  /**
   * Fetches latest /version.json with cache-busting to detect new production deployments
   */
  async checkForUpdates() {
    // Only perform check in production/staging builds with known buildTime
    if (!this.currentBuildTime) return

    try {
      const response = await fetch(`/version.json?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      })

      if (!response.ok) return

      const remote = await response.json()

      if (remote?.buildTime && remote.buildTime !== this.currentBuildTime) {
        console.log(`[VersionService] New version detected! Remote: ${remote.buildTime} vs Local: ${this.currentBuildTime}`)
        this.hasUpdate = true
        this.latestVersionData = remote
        this.notify(remote)

        window.dispatchEvent(
          new CustomEvent('kancasela:new-version-available', { detail: remote })
        )
      }
    } catch (err) {
      console.debug('[VersionService] Update check skipped:', err?.message)
    }
  }

  /**
   * Reloads the page with cache-busting while preserving localStorage active game state
   */
  applyUpdate() {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((reg) => reg.update())
        })
      }
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key))
        })
      }
    } catch (e) {}

    // Clean reload to fetch fresh HTML & JS bundles
    window.location.reload()
  }
}

export const versionService = new VersionService()
export default versionService
