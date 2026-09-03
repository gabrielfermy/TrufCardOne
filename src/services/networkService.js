// Network Service - Realtime Online/Offline Monitor & Late Sync Queue Manager
const PENDING_SYNC_KEY = 'kancasela_pending_sync_queue'

class NetworkService {
  constructor() {
    this.online = typeof navigator !== 'undefined' ? navigator.onLine : true
    this.listeners = new Set()

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this))
      window.addEventListener('offline', this.handleOffline.bind(this))
    }
  }

  isOnline() {
    return typeof navigator !== 'undefined' ? navigator.onLine : this.online
  }

  handleOnline() {
    this.online = true
    console.log('📶 [NetworkService] Device is now ONLINE. Notifying subscribers...')
    this.notify()
  }

  handleOffline() {
    this.online = false
    console.warn('⚠️ [NetworkService] Device is now OFFLINE. Operations will be queued locally.')
    this.notify()
  }

  subscribe(callback) {
    this.listeners.add(callback)
    callback(this.isOnline())
    return () => {
      this.listeners.delete(callback)
    }
  }

  notify() {
    const status = this.isOnline()
    this.listeners.forEach(cb => {
      try {
        cb(status)
      } catch (err) {
        console.error('[NetworkService] Subscriber error:', err)
      }
    })
  }

  // --- Late Sync Queue Operations (LocalStorage) ---

  getQueue() {
    if (typeof localStorage === 'undefined') return []
    try {
      return JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]')
    } catch {
      return []
    }
  }

  enqueue(action) {
    const queue = this.getQueue()
    const item = {
      id: `sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      ...action
    }
    queue.push(item)
    try {
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(queue))
      console.log('📥 [NetworkService] Enqueued pending sync item:', item.id, item.type)
    } catch (e) {
      console.error('[NetworkService] Failed to persist sync queue:', e)
    }
    return item
  }

  dequeue(id) {
    const queue = this.getQueue().filter(item => item.id !== id)
    try {
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(queue))
    } catch {}
  }

  getPendingForSession(sessionId) {
    return this.getQueue().filter(item => item.sessionId === sessionId)
  }

  clearQueueForSession(sessionId) {
    const remaining = this.getQueue().filter(item => item.sessionId !== sessionId)
    try {
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remaining))
    } catch {}
  }
}

export const networkService = new NetworkService()
