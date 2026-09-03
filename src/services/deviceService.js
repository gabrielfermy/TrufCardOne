/**
 * Device Service
 * Provides persistent guest device identification and session seat management.
 * Works seamlessly whether the user is logged in or a guest.
 */

const DEVICE_ID_KEY = 'gns_device_id'
const SEAT_PREFIX = 'gns_session_seat_'

export const deviceService = {
  /**
   * Get or generate a persistent unique ID for this browser device.
   */
  getDeviceId: () => {
    try {
      let id = localStorage.getItem(DEVICE_ID_KEY)
      if (!id) {
        id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        localStorage.setItem(DEVICE_ID_KEY, id)
      }
      return id
    } catch {
      return `dev_fallback_${Date.now()}`
    }
  },

  /**
   * Get the client identifier (Authenticated User ID if logged in, otherwise Device ID).
   */
  getClientIdentifier: (user) => {
    if (user?.id && user.id !== 'guest-user') {
      return user.id
    }
    return deviceService.getDeviceId()
  },

  /**
   * Get the claimed seat index (0..n) stored locally for a specific session, or null.
   */
  getSessionSeat: (sessionId) => {
    if (!sessionId) return null
    try {
      const saved = localStorage.getItem(`${SEAT_PREFIX}${sessionId}`)
      if (saved !== null && saved !== undefined && saved !== '') {
        const parsed = parseInt(saved, 10)
        return isNaN(parsed) ? null : parsed
      }
    } catch {}
    return null
  },

  /**
   * Save the claimed seat index for a session.
   */
  setSessionSeat: (sessionId, seatIndex) => {
    if (!sessionId) return
    try {
      if (seatIndex === null || seatIndex === undefined) {
        localStorage.removeItem(`${SEAT_PREFIX}${sessionId}`)
      } else {
        localStorage.setItem(`${SEAT_PREFIX}${sessionId}`, seatIndex.toString())
      }
    } catch {}
  },

  /**
   * Clear the claimed seat for a session.
   */
  clearSessionSeat: (sessionId) => {
    if (!sessionId) return
    try {
      localStorage.removeItem(`${SEAT_PREFIX}${sessionId}`)
    } catch {}
  }
}
