import { KeepAwake } from '@capacitor-community/keep-awake'

let wakeLockSentinel = null

export const wakeLockService = {
  enable: async () => {
    try {
      await KeepAwake.keepAwake()
    } catch {
      // Web Wake Lock API fallback
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        try {
          if (!wakeLockSentinel) {
            wakeLockSentinel = await navigator.wakeLock.request('screen')
            wakeLockSentinel.addEventListener('release', () => {
              wakeLockSentinel = null
            })
          }
        } catch (err) {
          console.debug('Web WakeLock request error', err)
        }
      }
    }
  },

  disable: async () => {
    try {
      await KeepAwake.allowSleep()
    } catch {
      // Fallback
    }
    if (wakeLockSentinel) {
      try {
        await wakeLockSentinel.release()
        wakeLockSentinel = null
      } catch (err) {
        console.debug('Web WakeLock release error', err)
      }
    }
  }
}
