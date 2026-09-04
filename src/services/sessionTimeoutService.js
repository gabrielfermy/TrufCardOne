import { App } from '@capacitor/app'

// Session Inactivity Timeout Service
// Automatically invalidates sessions after 3 hours of user inactivity

export const INACTIVITY_TIMEOUT_MS = 3 * 60 * 60 * 1000 // 3 hours (10,800,000 ms)
export const STORAGE_KEY = 'trufcard_last_activity'
const THROTTLE_INTERVAL_MS = 15 * 1000 // 15 seconds throttle for local storage writes

let lastRecordedLocalTime = 0

export const sessionTimeoutService = {
  // Get last recorded activity timestamp
  getLastActivity() {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed = parseInt(raw, 10)
      return isNaN(parsed) ? null : parsed
    } catch {
      return null
    }
  },

  // Set last activity timestamp
  setLastActivity(timestamp = Date.now()) {
    if (typeof window === 'undefined') return
    try {
      localStorage.setItem(STORAGE_KEY, String(timestamp))
      lastRecordedLocalTime = timestamp
    } catch (e) {
      console.warn('Failed to save last activity timestamp:', e)
    }
  },

  // Clear activity timestamp on sign out
  clearLastActivity() {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(STORAGE_KEY)
      lastRecordedLocalTime = 0
    } catch (e) {
      console.warn('Failed to clear last activity timestamp:', e)
    }
  },

  // Check whether the session has expired due to inactivity
  isSessionExpired(timeoutMs = INACTIVITY_TIMEOUT_MS) {
    const last = sessionTimeoutService.getLastActivity()
    if (!last) return false // No previous recorded activity
    return (Date.now() - last) >= timeoutMs
  },

  // Record user activity with throttling to prevent high-frequency localStorage writes
  recordActivity() {
    const now = Date.now()
    if (now - lastRecordedLocalTime < THROTTLE_INTERVAL_MS) {
      return
    }
    sessionTimeoutService.setLastActivity(now)
  },

  // Initialize inactivity listeners, heartbeat check & cross-tab sync
  initSessionTimeout({ onTimeout, getIsAuthenticated }) {
    if (typeof window === 'undefined') return () => {}

    const checkAndHandleTimeout = () => {
      if (!getIsAuthenticated || !getIsAuthenticated()) return false
      if (sessionTimeoutService.isSessionExpired()) {
        if (onTimeout) onTimeout()
        return true
      }
      return false
    }

    const handleUserInteraction = () => {
      if (checkAndHandleTimeout()) return
      if (getIsAuthenticated && getIsAuthenticated()) {
        sessionTimeoutService.recordActivity()
      }
    }

    const handleVisibilityOrFocus = () => {
      if (checkAndHandleTimeout()) return
      if (getIsAuthenticated && getIsAuthenticated()) {
        sessionTimeoutService.recordActivity()
      }
    }

    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        const val = parseInt(e.newValue, 10)
        if (!isNaN(val)) {
          lastRecordedLocalTime = val
        }
      }
    }

    // Attach passive event listeners for user interactions
    const interactionEvents = ['mousedown', 'keydown', 'touchstart', 'scroll', 'pointerdown', 'click']
    interactionEvents.forEach(evt => {
      window.addEventListener(evt, handleUserInteraction, { passive: true })
    })

    document.addEventListener('visibilitychange', handleVisibilityOrFocus)
    window.addEventListener('focus', handleVisibilityOrFocus)
    window.addEventListener('storage', handleStorage)

    // Background interval check every 30 seconds
    const intervalId = setInterval(() => {
      checkAndHandleTimeout()
    }, 30000)

    // Capacitor app resume listener
    let capacitorRemoveHandle = null
    if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform()) {
      App.addListener('appStateChange', (state) => {
        if (state.isActive) {
          handleVisibilityOrFocus()
        }
      }).then(handle => {
        capacitorRemoveHandle = handle
      }).catch(() => {})
    }

    // Return cleanup function
    return () => {
      interactionEvents.forEach(evt => {
        window.removeEventListener(evt, handleUserInteraction)
      })
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus)
      window.removeEventListener('focus', handleVisibilityOrFocus)
      window.removeEventListener('storage', handleStorage)
      clearInterval(intervalId)
      if (capacitorRemoveHandle?.remove) {
        capacitorRemoveHandle.remove()
      }
    }
  }
}
