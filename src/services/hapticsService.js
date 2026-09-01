import { Haptics, ImpactStyle } from '@capacitor/haptics'

export const hapticsService = {
  light: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(15)
      }
    }
  },
  medium: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium })
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(35)
      }
    }
  },
  heavy: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy })
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(70)
      }
    }
  },
  success: async () => {
    try {
      await Haptics.notification({ type: 'SUCCESS' })
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([30, 50, 60])
      }
    }
  },
  warning: async () => {
    try {
      await Haptics.notification({ type: 'WARNING' })
    } catch {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100])
      }
    }
  }
}
