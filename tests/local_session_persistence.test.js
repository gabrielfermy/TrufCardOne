import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Create an in-memory localStorage mock for testing Node.js environment
class LocalStorageMock {
  constructor() {
    this.store = {}
  }
  getItem(key) {
    return this.store[key] || null
  }
  setItem(key, value) {
    this.store[key] = String(value)
  }
  removeItem(key) {
    delete this.store[key]
  }
  clear() {
    this.store = {}
  }
}

globalThis.localStorage = new LocalStorageMock()

describe('Local Session Persistence & Recovery Suite', () => {
  beforeEach(() => {
    globalThis.localStorage.clear()
  })

  it('saves and retrieves local sessions accurately', async () => {
    const { gameService } = await import('../src/services/gameService.js')
    
    const mockSession = {
      id: 'local-test-123',
      game_type: 'truf',
      room_code: 'TRU-ABCD',
      title: 'Truf Malam Jumat',
      player_names: ['Alice', 'Bob', 'Charlie', 'Dave'],
      is_completed: false,
      game_rounds: []
    }

    gameService.saveLocalSession(mockSession)
    const sessions = gameService.getLocalSessions()

    assert.equal(sessions.length, 1)
    assert.equal(sessions[0].id, 'local-test-123')
    assert.equal(sessions[0].room_code, 'TRU-ABCD')
    assert.equal(sessions[0].is_completed, false)
  })

  it('updates existing session on round additions', async () => {
    const { gameService } = await import('../src/services/gameService.js')
    
    const initialSession = {
      id: 'local-test-456',
      game_type: 'truf',
      room_code: 'TRU-WXYZ',
      player_names: ['P1', 'P2', 'P3', 'P4'],
      is_completed: false,
      game_rounds: []
    }

    gameService.saveLocalSession(initialSession)

    const updatedSession = {
      ...initialSession,
      game_rounds: [
        { round_number: 1, round_mode: 'atas', bids: [3, 2, 4, 4], tricks: [3, 2, 4, 4] }
      ]
    }

    gameService.saveLocalSession(updatedSession)
    const sessions = gameService.getLocalSessions()

    assert.equal(sessions.length, 1)
    assert.equal(sessions[0].game_rounds.length, 1)
    assert.equal(sessions[0].game_rounds[0].round_number, 1)
  })

  it('deletes session from local storage upon completion or discard', async () => {
    const { gameService } = await import('../src/services/gameService.js')

    const session1 = { id: 's1', game_type: 'truf', is_completed: false }
    const session2 = { id: 's2', game_type: 'remi', is_completed: false }

    gameService.saveLocalSession(session1)
    gameService.saveLocalSession(session2)

    assert.equal(gameService.getLocalSessions().length, 2)

    gameService.deleteLocalSession('s1')
    const remaining = gameService.getLocalSessions()

    assert.equal(remaining.length, 1)
    assert.equal(remaining[0].id, 's2')
  })

  it('falls back to local session when cloud lookup is unavailable', async () => {
    const { gameService } = await import('../src/services/gameService.js')

    const offlineSession = {
      id: 'local-offline-789',
      game_type: 'truf',
      room_code: 'TRU-OFFL',
      is_completed: false,
      player_names: ['G1', 'G2', 'G3', 'G4']
    }

    gameService.saveLocalSession(offlineSession)

    const fetched = await gameService.getSession('local-offline-789')
    assert.ok(fetched)
    assert.equal(fetched.id, 'local-offline-789')
    assert.equal(fetched.room_code, 'TRU-OFFL')
  })

  it('creates local session with complete metadata and settings without error', async () => {
    const { gameService } = await import('../src/services/gameService.js')

    const session = await gameService.createSession({
      userId: 'test-user-id',
      gameType: 'truf',
      playerNames: ['P1', 'P2', 'P3', 'P4'],
      firstDealer: 2,
      settings: { multiplier: 1 },
      isOfflineLocal: true
    })

    assert.ok(session)
    assert.ok(session.id.startsWith('local-session-'))
    assert.equal(session.first_dealer, 2)
    assert.equal(session.settings.first_dealer, 2)
    assert.equal(session.player_names.length, 4)
  })

  it('correctly claims and releases (stand up) seats in session roster', async () => {
    const { gameService } = await import('../src/services/gameService.js')

    const session = {
      id: 'seat-test-session',
      game_type: 'truf',
      player_names: ['Alice', 'Bob', 'Charlie', 'Dave'],
      player_user_ids: ['host-123', null, null, null],
      settings: { scorerIndex: 0 }
    }
    gameService.saveLocalSession(session)

    // Player 4 claims seat 3
    await gameService.claimSeat('seat-test-session', 3, 'guest-phone-4', 'Dave')
    let current = (await gameService.getLocalSessions()).find(s => s.id === 'seat-test-session')
    assert.equal(current.player_user_ids[3], 'guest-phone-4')

    // Player 4 stands up (releases seat 3)
    await gameService.releaseSeat('seat-test-session', 3, 'guest-phone-4')
    current = (await gameService.getLocalSessions()).find(s => s.id === 'seat-test-session')
    assert.equal(current.player_user_ids[3], null)
  })

  it('computes correct Scorer failover when active scorer goes offline or stands up', async () => {
    const computeFallbackScorer = (playerUserIds = [], currentScorer = 0) => {
      if (playerUserIds && playerUserIds[currentScorer]) return currentScorer
      if (playerUserIds && playerUserIds[0]) return 0
      const firstOnline = playerUserIds ? playerUserIds.findIndex(id => Boolean(id)) : -1
      if (firstOnline !== -1) return firstOnline
      return 0
    }

    // Scenario 1: Scorer (Player 4 / idx 3) is online -> remains 3
    assert.equal(computeFallbackScorer(['host-1', 'client-2', null, 'client-4'], 3), 3)

    // Scenario 2: Scorer (Player 4 / idx 3) stands up -> falls back to Host (idx 0)
    assert.equal(computeFallbackScorer(['host-1', 'client-2', null, null], 3), 0)

    // Scenario 3: Scorer (idx 3) stands up and Host (idx 0) is also offline -> falls back to first online player (idx 1)
    assert.equal(computeFallbackScorer([null, 'client-2', 'client-3', null], 3), 1)

    // Scenario 4: All players offline -> falls back to Player 0
    assert.equal(computeFallbackScorer([null, null, null, null], 3), 0)
  })
})
