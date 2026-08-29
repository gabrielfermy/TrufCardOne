import React, { useState, useEffect } from 'react'
import { authService } from './services/authService'
import { gameService } from './services/gameService'
import './App.css'

export default function App() {
  // Authentication & Session States
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [authError, setAuthError] = useState('')

  // App Navigation View
  const [view, setView] = useState('auth') // 'auth' | 'dashboard' | 'setup' | 'play'
  const [sessions, setSessions] = useState([])
  const [currentSession, setCurrentSession] = useState(null)

  // Current Game State
  const [rounds, setRounds] = useState([])
  const [scoresByRound, setScoresByRound] = useState({})
  
  // Game Setup Inputs
  const [playerNames, setPlayerNames] = useState(['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4'])
  const [settings, setSettings] = useState({
    multiplier: 10, // x10 is standard in Indonesia (e.g. Bid 3 = 30 points)
    bid0Bonus: 10,  // Bonus points for bid 0 success
    prevent13: false, // Default false now that we have bid 13 decision
    bid13Decision: true, // Default true for decision rule
    atasLackMult: -2,
    atasExcessMult: 1,
    bawahLackMult: -1,
    bawahExcessMult: -2
  })
  const [showSettingsDetail, setShowSettingsDetail] = useState(false)

  // Play Input State for current round
  const [bids, setBids] = useState([0, 0, 0, 0])
  const [wons, setWons] = useState([0, 0, 0, 0])
  const [trufSuit, setTrufSuit] = useState(4) // 0: Spade, 1: Heart, 2: Diamond, 3: Club, 4: No Truf
  const [inputPhase, setInputPhase] = useState('bid') // 'bid' | 'won'
  const [playError, setPlayError] = useState('')

  // Bid 13 rule states
  const [showBid13Modal, setShowBid13Modal] = useState(false)
  const [bid13Decider, setBid13Decider] = useState('')
  const [bid13DeciderIndex, setBid13DeciderIndex] = useState(-1)
  const [forcedPlayMode, setForcedPlayMode] = useState(null) // 'atas' | 'bawah' | null
  const [originalBidsBeforeAdjustment, setOriginalBidsBeforeAdjustment] = useState(null)

  // Suits Constant
  const SUITS = [
    { id: 0, label: '♠', name: 'Spade', color: '#60a5fa' },
    { id: 1, label: '♥', name: 'Heart', color: '#f87171' },
    { id: 2, label: '♦', name: 'Diamond', color: '#fb923c' },
    { id: 3, label: '♣', name: 'Club', color: '#34d399' },
    { id: 4, label: '🚫', name: 'No Truf', color: '#9ca3af' }
  ]

  // Monitor Auth State Changes on Load
  useEffect(() => {
    // Check initial user
    authService.getCurrentUser().then(currUser => {
      setUser(currUser)
      setLoading(false)
      if (currUser) {
        setView('dashboard')
        loadUserSessions(currUser.id)
      }
    })

    const subscription = authService.onAuthStateChange((event, session) => {
      const currUser = session?.user || null
      setUser(currUser)
      if (currUser) {
        setView('dashboard')
        loadUserSessions(currUser.id)
      } else {
        setView('auth')
        setSessions([])
        setCurrentSession(null)
      }
      setLoading(false)
    })

    return () => {
      if (subscription) subscription.unsubscribe()
    }
  }, [])

  // Fetch all sessions of the user
  const loadUserSessions = async (userId) => {
    try {
      const data = await gameService.getSessions(userId)
      setSessions(data)
    } catch (err) {
      console.error("Error loading sessions:", err)
    }
  }

  // Handle Register/Login
  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthError('')
    try {
      if (isRegistering) {
        await authService.signUp(authEmail, authPassword, authDisplayName)
        alert("Pendaftaran berhasil! Silakan login.")
        setIsRegistering(false)
      } else {
        await authService.signIn(authEmail, authPassword)
      }
    } catch (err) {
      setAuthError(err.message || "Terjadi kesalahan.")
    }
  }

  const handleGoogleLogin = async () => {
    setAuthError('')
    try {
      await authService.signInWithGoogle()
    } catch (err) {
      setAuthError(err.message || "Gagal login dengan Google.")
    }
  }

  const handleLogout = async () => {
    if (confirm("Apakah Anda yakin ingin keluar?")) {
      await authService.signOut()
    }
  }

  // Start new game setup
  const initNewGameSetup = () => {
    setPlayerNames(['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4'])
    setView('setup')
  }

  // Create game session and start play
  const handleCreateSession = async () => {
    try {
      const session = await gameService.createSession(user.id, playerNames, settings)
      setCurrentSession(session)
      setRounds([])
      setScoresByRound({})
      resetPlayInputs()
      setView('play')
      loadUserSessions(user.id)
    } catch (err) {
      alert("Gagal membuat game: " + err.message)
    }
  }

  // Load a saved session
  const handleOpenSession = async (sessionId) => {
    setLoading(true)
    try {
      const details = await gameService.getSessionDetails(sessionId)
      setCurrentSession(details.session)
      setRounds(details.rounds)
      setScoresByRound(details.scoresByRound)
      resetPlayInputs(details.rounds)
      setView('play')
    } catch (err) {
      alert("Gagal membuka game: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Reset inputs for the next round
  const resetPlayInputs = (currentRounds = rounds) => {
    setBids([0, 0, 0, 0])
    setWons([0, 0, 0, 0])
    setTrufSuit(4)
    setInputPhase('bid')
    setPlayError('')
    setShowBid13Modal(false)
    setBid13Decider('')
    setBid13DeciderIndex(-1)
    setForcedPlayMode(null)
    setOriginalBidsBeforeAdjustment(null)
  }

  // Calculate current round dealer index (rotates clockwise)
  const getDealerIndex = () => {
    const nextRoundNumber = rounds.length + 1
    return (nextRoundNumber - 1) % 4
  }

  // Calculate Truf Suit suggestion based on highest bid
  // Spade (0) > Heart (1) > Diamond (2) > Club (3)
  useEffect(() => {
    if (inputPhase === 'bid') {
      // Find highest bid
      let maxBid = -1
      let maxIndices = []
      bids.forEach((bid, idx) => {
        if (bid > maxBid) {
          maxBid = bid
          maxIndices = [idx]
        } else if (bid === maxBid) {
          maxIndices.push(idx)
        }
      })

      if (maxBid > 0) {
        // Suggested truf suit is Spade by default for tie or highest bidder
        // For simplicity, default to Spade (0) when a bid exists, but let user change
        if (trufSuit === 4) {
          setTrufSuit(0) // Default to Spade if there's a bid
        }
      } else {
        setTrufSuit(4) // No Truf if all bid 0
      }
    }
  }, [bids, inputPhase])

  // Scoring logic calculation
  const calculateScoresForSubmission = () => {
    const totalBid = bids.reduce((a, b) => a + b, 0)
    // Check if there was a forced play mode from the decider (for bid 13)
    const isMainAtas = forcedPlayMode ? (forcedPlayMode === 'atas') : (totalBid > 13)
    const isMainBawah = forcedPlayMode ? (forcedPlayMode === 'bawah') : (totalBid < 13)
    const mult = currentSession.settings.multiplier
    const bonus0 = currentSession.settings.bid0Bonus

    // Fetch latest cumulative scores
    const cumulative = [0, 0, 0, 0]
    if (rounds.length > 0) {
      const lastRoundId = rounds[rounds.length - 1].id
      const lastScores = scoresByRound[lastRoundId] || []
      lastScores.forEach(score => {
        cumulative[score.player_index] = score.score_cumulative
      })
    }

    const roundData = bids.map((bid, index) => {
      const won = wons[index]
      const diff = Math.abs(won - bid)
      let scoreChange = 0

      if (won === bid) {
        // Success
        if (bid === 0) {
          scoreChange = bonus0 * mult
        } else {
          scoreChange = bid * mult
        }
      } else {
        // Fail
        if (bid === 0) {
          scoreChange = won * currentSession.settings.atasLackMult * mult
        } else {
          if (won < bid) {
            const multiplier = isMainAtas ? currentSession.settings.atasLackMult : currentSession.settings.bawahLackMult
            scoreChange = diff * multiplier * mult
          } else {
            const multiplier = isMainAtas ? currentSession.settings.atasExcessMult : currentSession.settings.bawahExcessMult
            scoreChange = diff * multiplier * mult
          }
        }
      }

      const scoreCumulative = cumulative[index] + scoreChange

      return {
        bid,
        won,
        scoreChange,
        scoreCumulative
      }
    })

    return roundData
  }

  // Handle Bid Phase Next
  const handleBidNext = () => {
    const totalBid = bids.reduce((a, b) => a + b, 0)
    if (totalBid === 13) {
      if (currentSession.settings.prevent13) {
        setPlayError("Total Bid tidak boleh tepat 13 (Aturan Atas/Bawah wajib)!")
        return
      }
      if (currentSession.settings.bid13Decision) {
        // Find player with highest bid
        let maxBid = -1
        let maxIndices = []
        bids.forEach((bid, idx) => {
          if (bid > maxBid) {
            maxBid = bid
            maxIndices = [idx]
          } else if (bid === maxBid) {
            maxIndices.push(idx)
          }
        })
        
        // Tiebreaker: pick dealer if in tie, else first index
        const dealerIdx = getDealerIndex()
        let deciderIdx = maxIndices[0]
        if (maxIndices.includes(dealerIdx)) {
          deciderIdx = dealerIdx
        }
        
        setBid13Decider(playerNames[deciderIdx])
        setBid13DeciderIndex(deciderIdx)
        setOriginalBidsBeforeAdjustment([...bids])
        setShowBid13Modal(true)
        setPlayError('')
        return
      }
    }
    setPlayError('')
    setInputPhase('won')
  }

  // Handle choice when Bid Total is 13
  const handleBid13Decision = (choice) => {
    setForcedPlayMode(choice)
    setShowBid13Modal(false)
    
    // Adjust bids:
    // - Main Atas: all bids -1 (clamped to 0)
    // - Main Bawah: all bids +1
    const adjustedBids = originalBidsBeforeAdjustment.map(bid => {
      if (choice === 'atas') {
        return Math.max(0, bid - 1)
      } else {
        return bid + 1
      }
    })
    setBids(adjustedBids)
    setInputPhase('won')
  }

  // Save Round to Database
  const handleSaveRound = async () => {
    const totalWon = wons.reduce((a, b) => a + b, 0)
    if (totalWon !== 13) {
      setPlayError(`Total Won harus tepat 13! Saat ini: ${totalWon}`)
      return
    }

    setPlayError('')
    try {
      const nextRoundNumber = rounds.length + 1
      const dealerIndex = getDealerIndex()
      const calculatedData = calculateScoresForSubmission()

      await gameService.saveRoundWithScores(
        currentSession.id,
        nextRoundNumber,
        dealerIndex,
        trufSuit,
        calculatedData,
        forcedPlayMode
      )

      // Reload session details to update state from DB
      const details = await gameService.getSessionDetails(currentSession.id)
      setRounds(details.rounds)
      setScoresByRound(details.scoresByRound)
      resetPlayInputs(details.rounds)
    } catch (err) {
      alert("Gagal menyimpan ronde: " + err.message)
    }
  }

  // Undo Last Round
  const handleUndoRound = async () => {
    if (rounds.length === 0) return
    if (confirm("Apakah Anda yakin ingin menghapus ronde terakhir?")) {
      try {
        await gameService.deleteLastRound(currentSession.id)
        const details = await gameService.getSessionDetails(currentSession.id)
        setRounds(details.rounds)
        setScoresByRound(details.scoresByRound)
        resetPlayInputs(details.rounds)
      } catch (err) {
        alert("Gagal menghapus ronde: " + err.message)
      }
    }
  }

  // Complete Game Sesi
  const handleCompleteGame = async () => {
    if (confirm("Selesaikan sesi permainan ini? Anda tidak akan bisa menambah ronde lagi.")) {
      try {
        await gameService.completeSession(currentSession.id)
        const details = await gameService.getSessionDetails(currentSession.id)
        setCurrentSession(details.session)
        loadUserSessions(user.id)
      } catch (err) {
        alert("Gagal menyelesaikan game: " + err.message)
      }
    }
  }

  // Delete Sesi
  const handleDeleteSession = async (sessionId, e) => {
    e.stopPropagation()
    if (confirm("Hapus seluruh catatan sesi permainan ini secara permanen?")) {
      try {
        await gameService.deleteSession(sessionId)
        loadUserSessions(user.id)
      } catch (err) {
        alert("Gagal menghapus sesi: " + err.message)
      }
    }
  }

  // Leaderboard Calculation
  const getLeaderboard = () => {
    const players = [
      { name: currentSession.player1_name, score: 0, index: 0 },
      { name: currentSession.player2_name, score: 0, index: 1 },
      { name: currentSession.player3_name, score: 0, index: 2 },
      { name: currentSession.player4_name, score: 0, index: 3 }
    ]

    if (rounds.length > 0) {
      const lastRoundId = rounds[rounds.length - 1].id
      const lastScores = scoresByRound[lastRoundId] || []
      lastScores.forEach(score => {
        players[score.player_index].score = score.score_cumulative
      })
    }

    return [...players].sort((a, b) => b.score - a.score)
  }

  // Render Views
  if (loading) {
    return (
      <div className="glass-panel text-center animate-fade-in" style={{ marginTop: '40vh' }}>
        <h3 className="text-secondary">Loading...</h3>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* AUTHENTICATION VIEW */}
      {view === 'auth' && (
        <div className="auth-container animate-fade-in">
          <div className="glass-panel flex-col gap-24">
            <div className="text-center">
              <h1 style={{ background: 'linear-gradient(to right, #a78bfa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Truf Card</h1>
              <p className="text-muted mt-8">Score Tracker & Multi-tenant Sesi</p>
            </div>

            {authError && <div className="glass-panel" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--danger)', color: 'var(--danger)', padding: '12px' }}>{authError}</div>}

            <form onSubmit={handleAuth} className="flex-col gap-16">
              {isRegistering && (
                <div className="flex-col gap-8">
                  <label className="text-secondary" style={{ fontSize: '0.875rem' }}>Nama Tampilan</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Gabriel Aswinta" 
                    value={authDisplayName} 
                    onChange={e => setAuthDisplayName(e.target.value)} 
                    required 
                  />
                </div>
              )}
              <div className="flex-col gap-8">
                <label className="text-secondary" style={{ fontSize: '0.875rem' }}>Email</label>
                <input 
                  type="email" 
                  placeholder="name@domain.com" 
                  value={authEmail} 
                  onChange={e => setAuthEmail(e.target.value)} 
                  required 
                />
              </div>
              <div className="flex-col gap-8">
                <label className="text-secondary" style={{ fontSize: '0.875rem' }}>Kata Sandi</label>
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={authPassword} 
                  onChange={e => setAuthPassword(e.target.value)} 
                  required 
                />
              </div>

              <button type="submit" className="btn-primary w-full mt-8">
                {isRegistering ? 'Daftar Sekarang' : 'Masuk ke Aplikasi'}
              </button>
            </form>

            <div className="divider">atau</div>

            <button onClick={handleGoogleLogin} className="social-login-btn w-full">
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84c-.21 1.12-.84 2.07-1.79 2.7v2.24h2.9c1.69-1.55 2.69-3.85 2.69-6.57z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.47-.8 5.96-2.23l-2.9-2.24c-.8.54-1.84.87-3.06.87-2.35 0-4.34-1.59-5.05-3.73H.95v2.3C2.43 15.89 5.5 18 9 18z" fill="#34A853"/>
                <path d="M3.95 10.67a5.4 5.4 0 0 1 0-3.34V5.03H.95a9 9 0 0 0 0 7.94l3-2.3z" fill="#FBBC05"/>
                <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2A9 9 0 0 0 .95 5.03l3 2.3C4.66 5.17 6.65 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Masuk dengan Google
            </button>

            <div className="text-center">
              <span className="text-muted" style={{ fontSize: '0.875rem' }}>
                {isRegistering ? 'Sudah memiliki akun?' : 'Belum memiliki akun?'}
              </span>
              <button 
                onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }} 
                className="btn-secondary" 
                style={{ background: 'transparent', border: 'none', color: 'var(--primary)', padding: '0 4px', fontSize: '0.875rem' }}
              >
                {isRegistering ? 'Masuk' : 'Daftar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD VIEW */}
      {view === 'dashboard' && (
        <div className="flex-col gap-24 animate-fade-in">
          {/* Header */}
          <div className="flex-row justify-between align-center glass-panel" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center' }}>
            <div>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>Akun Aktif</p>
              <h3 style={{ fontSize: '1rem', color: '#fff' }}>{user?.user_metadata?.full_name || user?.email}</h3>
            </div>
            <button onClick={handleLogout} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.875rem' }}>Keluar</button>
          </div>

          <div className="glass-panel flex-col gap-16">
            <div className="flex-row justify-between align-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2>Daftar Sesi Permainan</h2>
              <button onClick={initNewGameSetup} className="btn-primary" style={{ padding: '10px 18px', fontSize: '0.9rem' }}>
                + Game Baru
              </button>
            </div>

            {sessions.length === 0 ? (
              <div className="text-center py-24" style={{ padding: '40px 0' }}>
                <p className="text-muted">Belum ada sesi permainan tersimpan.</p>
                <p className="text-muted" style={{ fontSize: '0.875rem', marginTop: '4px' }}>Klik tombol "+ Game Baru" untuk mulai bermain!</p>
              </div>
            ) : (
              <div className="flex-col gap-12">
                {sessions.map(session => (
                  <div 
                    key={session.id} 
                    onClick={() => handleOpenSession(session.id)}
                    className="session-card animate-fade-in"
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="flex-col gap-4">
                      <div className="flex-row gap-8" style={{ display: 'flex', alignItems: 'center' }}>
                        <span className={`session-status ${session.is_completed ? 'status-completed' : 'status-active'}`}>
                          {session.is_completed ? 'Selesai' : 'Aktif'}
                        </span>
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                          {new Date(session.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <p style={{ fontWeight: '500', color: '#fff', fontSize: '0.95rem', marginTop: '4px' }}>
                        {session.player1_name}, {session.player2_name}, {session.player3_name}, {session.player4_name}
                      </p>
                    </div>

                    <button 
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className="btn-secondary"
                      style={{ padding: '8px', borderRadius: '8px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                    >
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* GAME SETUP VIEW */}
      {view === 'setup' && (
        <div className="glass-panel flex-col gap-24 animate-fade-in">
          <div>
            <h2>Pengaturan Game Baru</h2>
            <p className="text-muted">Isi nama pemain dan konfigurasi opsi skor.</p>
          </div>

          {/* Player Names Input */}
          <div className="flex-col gap-12">
            {playerNames.map((name, index) => (
              <div key={index} className="flex-col gap-4">
                <label className="text-secondary" style={{ fontSize: '0.875rem' }}>Nama Pemain {index + 1}</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => {
                    const newNames = [...playerNames]
                    newNames[index] = e.target.value
                    setPlayerNames(newNames)
                  }}
                  placeholder={`Nama Pemain ${index + 1}`}
                  required
                />
              </div>
            ))}
          </div>

          {/* Rules / Settings detail dropdown */}
          <div className="flex-col gap-8">
            <button 
              onClick={() => setShowSettingsDetail(!showSettingsDetail)} 
              className="btn-secondary w-full"
              style={{ justifyContent: 'space-between' }}
            >
              <span>Aturan & Multiplier Skor (Default Standar)</span>
              <span>{showSettingsDetail ? '▲' : '▼'}</span>
            </button>

            {showSettingsDetail && (
              <div className="glass-panel flex-col gap-12" style={{ backgroundColor: 'rgba(0,0,0,0.1)', padding: '16px', borderRadius: '12px' }}>
                <div className="flex-row justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="text-secondary" style={{ fontSize: '0.875rem' }}>Skala Multiplier</label>
                  <select 
                    value={settings.multiplier} 
                    onChange={e => setSettings({ ...settings, multiplier: parseInt(e.target.value) })}
                    style={{ width: '120px', padding: '6px 12px' }}
                  >
                    <option value="1">x1 (Poin Kecil)</option>
                    <option value="10">x10 (Standar)</option>
                  </select>
                </div>
                <div className="flex-row justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="text-secondary" style={{ fontSize: '0.875rem' }}>Bonus Sukses Bid 0</label>
                  <input 
                    type="number" 
                    value={settings.bid0Bonus} 
                    onChange={e => setSettings({ ...settings, bid0Bonus: parseInt(e.target.value) })}
                    style={{ width: '80px', padding: '6px 12px', textAlign: 'center' }}
                  />
                </div>
                <div className="flex-row justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="text-secondary" style={{ fontSize: '0.875rem' }}>Larang Total Bid 13</label>
                  <input 
                    type="checkbox" 
                    checked={settings.prevent13} 
                    onChange={e => {
                      const val = e.target.checked
                      setSettings({ 
                        ...settings, 
                        prevent13: val,
                        bid13Decision: val ? false : settings.bid13Decision
                      })
                    }}
                    style={{ width: '20px', height: '20px' }}
                  />
                </div>
                <div className="flex-row justify-between" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label className="text-secondary" style={{ fontSize: '0.875rem' }}>Bid 13: Pemutus Memilih Atas/Bawah</label>
                  <input 
                    type="checkbox" 
                    checked={settings.bid13Decision} 
                    disabled={settings.prevent13}
                    onChange={e => setSettings({ ...settings, bid13Decision: e.target.checked })}
                    style={{ width: '20px', height: '20px' }}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex-row gap-12 mt-16" style={{ display: 'flex' }}>
            <button onClick={() => setView('dashboard')} className="btn-secondary w-full">Batal</button>
            <button onClick={handleCreateSession} className="btn-primary w-full">Mulai Game</button>
          </div>
        </div>
      )}

      {/* GAME PLAY VIEW */}
      {view === 'play' && currentSession && (
        <div className="flex-col gap-16 animate-fade-in" style={{ position: 'relative' }}>
          {/* Bid 13 Decision Modal */}
          {showBid13Modal && (
            <div style={{
              position: 'fixed',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.85)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px',
              zIndex: 1000,
              backdropFilter: 'blur(8px)'
            }}>
              <div className="glass-panel flex-col gap-16 w-full animate-fade-in" style={{ maxWidth: '400px' }}>
                <h3 className="text-center" style={{ color: 'var(--warning)' }}>Total Bid Tepat 13!</h3>
                <p className="text-center" style={{ fontSize: '0.95rem' }}>
                  Pemain dengan bid tertinggi adalah <strong>{bid13Decider}</strong> (Bid {originalBidsBeforeAdjustment ? originalBidsBeforeAdjustment[bid13DeciderIndex] : ''}). 
                  Beliau berhak memutuskan jenis permainan ronde ini:
                </p>
                <div className="flex-col gap-12 mt-8">
                  <button onClick={() => handleBid13Decision('atas')} className="btn-primary w-full">
                    Main Atas (Semua Bid -1)
                  </button>
                  <button onClick={() => handleBid13Decision('bawah')} className="btn-primary w-full" style={{ backgroundColor: 'var(--success)', boxShadow: '0 4px 14px 0 var(--success-glow)' }}>
                    Main Bawah (Semua Bid +1)
                  </button>
                  <button 
                    onClick={() => {
                      setShowBid13Modal(false)
                      setOriginalBidsBeforeAdjustment(null)
                    }} 
                    className="btn-secondary w-full"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex-row justify-between align-center glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button 
              onClick={() => setView('dashboard')} 
              className="btn-secondary"
              style={{ padding: '8px 12px', fontSize: '0.85rem' }}
            >
              ← Kembali
            </button>
            <div className="text-center">
              <h3 style={{ fontSize: '1rem', color: '#fff' }}>Sesi Game</h3>
              <p className="text-muted" style={{ fontSize: '0.75rem' }}>
                {new Date(currentSession.created_at).toLocaleDateString('id-ID')}
              </p>
            </div>
            <span className={`session-status ${currentSession.is_completed ? 'status-completed' : 'status-active'}`} style={{ fontSize: '0.8rem' }}>
              {currentSession.is_completed ? 'Selesai' : 'Aktif'}
            </span>
          </div>

          {/* Leaderboard Panel */}
          <div className="glass-panel flex-col gap-12">
            <h2>Papan Peringkat</h2>
            <div>
              {getLeaderboard().map((player, rankIdx) => (
                <div key={player.index} className="leaderboard-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span className={`leaderboard-rank rank-${rankIdx + 1}`}>{rankIdx + 1}</span>
                    <span style={{ fontWeight: '500', color: '#fff' }}>{player.name}</span>
                  </div>
                  <span style={{ fontWeight: '700', fontSize: '1.1rem', color: player.score >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {player.score}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Round Score Recording Panel */}
          {!currentSession.is_completed && (
            <div className="glass-panel flex-col gap-16">
              <div className="flex-row justify-between align-center" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Ronde {rounds.length + 1}</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="text-muted" style={{ fontSize: '0.8rem' }}>Dealer:</span>
                  <span className="dealer-badge">
                    {playerNames[getDealerIndex()]}
                  </span>
                </div>
              </div>

              {playError && <div className="glass-panel" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--danger)', color: 'var(--danger)', padding: '12px', fontSize: '0.875rem' }}>{playError}</div>}

              {/* Suit Picker */}
              <div className="flex-col gap-8">
                <span className="text-secondary" style={{ fontSize: '0.85rem' }}>Pilih Kartu Truf Ronde Ini:</span>
                <div className="flex-row gap-8" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  {SUITS.map(suit => (
                    <button 
                      key={suit.id}
                      onClick={() => setTrufSuit(suit.id)}
                      className={`suit-btn ${trufSuit === suit.id ? 'active' : ''}`}
                      style={{ color: suit.color }}
                      title={suit.name}
                    >
                      {suit.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Phase Selector Tabs */}
              <div className="flex-row" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '8px' }}>
                <button 
                  onClick={() => setInputPhase('bid')}
                  className="w-full"
                  style={{ 
                    background: 'transparent', 
                    borderRadius: '0', 
                    borderBottom: inputPhase === 'bid' ? '2px solid var(--primary)' : 'none', 
                    color: inputPhase === 'bid' ? 'var(--primary)' : 'var(--text-secondary)',
                    padding: '8px'
                  }}
                >
                  Fase Bid (Tawaran)
                </button>
                <button 
                  onClick={handleBidNext}
                  className="w-full"
                  style={{ 
                    background: 'transparent', 
                    borderRadius: '0', 
                    borderBottom: inputPhase === 'won' ? '2px solid var(--primary)' : 'none', 
                    color: inputPhase === 'won' ? 'var(--primary)' : 'var(--text-secondary)',
                    padding: '8px'
                  }}
                >
                  Fase Won (Hasil)
                </button>
              </div>

              {/* Bids Input */}
              {inputPhase === 'bid' && (
                <div className="flex-col gap-12">
                  {playerNames.map((name, idx) => (
                    <div key={idx} className="flex-row justify-between" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '500' }}>{name}</span>
                      <input 
                        type="number"
                        min="0"
                        max="13"
                        value={bids[idx]}
                        onChange={e => {
                          const newBids = [...bids]
                          newBids[idx] = parseInt(e.target.value) || 0
                          setBids(newBids)
                        }}
                        style={{ width: '80px', textAlign: 'center' }}
                      />
                    </div>
                  ))}

                  <div className="flex-row justify-between" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px dashed var(--border-color)', marginTop: '8px' }}>
                    <span style={{ fontWeight: '600' }}>Total Bid:</span>
                    <span style={{ fontWeight: '700', color: bids.reduce((a, b) => a + b, 0) === 13 ? 'var(--danger)' : 'var(--success)' }}>
                      {bids.reduce((a, b) => a + b, 0)} / 13
                    </span>
                  </div>

                  <button onClick={handleBidNext} className="btn-primary w-full mt-8">
                    Lanjut ke Input Hasil (Won) →
                  </button>
                </div>
              )}

              {/* Won Input */}
              {inputPhase === 'won' && (
                <div className="flex-col gap-12">
                  {playerNames.map((name, idx) => (
                    <div key={idx} className="flex-row justify-between" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div className="flex-col">
                        <span style={{ fontWeight: '500' }}>{name}</span>
                        <span className="text-muted" style={{ fontSize: '0.75rem' }}>Bid: {bids[idx]}</span>
                      </div>
                      <input 
                        type="number"
                        min="0"
                        max="13"
                        value={wons[idx]}
                        onChange={e => {
                          const newWons = [...wons]
                          newWons[idx] = parseInt(e.target.value) || 0
                          setWons(newWons)
                        }}
                        style={{ width: '80px', textAlign: 'center' }}
                      />
                    </div>
                  ))}

                  <div className="flex-row justify-between" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px dashed var(--border-color)', marginTop: '8px' }}>
                    <span style={{ fontWeight: '600' }}>Total Won:</span>
                    <span style={{ fontWeight: '700', color: wons.reduce((a, b) => a + b, 0) === 13 ? 'var(--success)' : 'var(--danger)' }}>
                      {wons.reduce((a, b) => a + b, 0)} / 13
                    </span>
                  </div>

                  <div className="flex-row gap-12 mt-8" style={{ display: 'flex' }}>
                    <button onClick={() => setInputPhase('bid')} className="btn-secondary w-full">← Edit Bid</button>
                    <button onClick={handleSaveRound} className="btn-primary w-full">Simpan Ronde</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* History Score Table */}
          <div className="glass-panel flex-col gap-12">
            <h2>Riwayat Ronde</h2>
            {rounds.length === 0 ? (
              <p className="text-muted text-center py-16">Belum ada ronde tercatat.</p>
            ) : (
              <div className="history-table-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th style={{ width: '45px' }}>Rnd</th>
                      <th style={{ width: '40px' }}>Truf</th>
                      {playerNames.map((name, i) => (
                        <th key={i}>{name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.map(round => {
                      const scores = scoresByRound[round.id] || []
                      return (
                        <tr key={round.id}>
                          <td>
                            <strong>R{round.round_number}</strong>
                            {round.play_mode && (
                              <div style={{ fontSize: '0.65rem', color: round.play_mode === 'atas' ? 'var(--primary)' : 'var(--success)', fontWeight: '600', marginTop: '2px' }}>
                                {round.play_mode === 'atas' ? 'ATAS' : 'BWH'}
                              </div>
                            )}
                          </td>
                          <td style={{ color: SUITS[round.truf_suit_index]?.color || '#fff', fontSize: '1.1rem' }}>
                            {SUITS[round.truf_suit_index]?.label || '🚫'}
                          </td>
                          {playerNames.map((_, pIdx) => {
                            const pScore = scores.find(s => s.player_index === pIdx)
                            if (!pScore) return <td key={pIdx}>-</td>
                            return (
                              <td key={pIdx}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  B:{pScore.bid} / W:{pScore.won}
                                </div>
                                <div style={{ fontWeight: '600', marginTop: '2px' }}>
                                  <span className={pScore.score_change > 0 ? 'score-positive' : pScore.score_change < 0 ? 'score-negative' : 'score-zero'}>
                                    {pScore.score_change > 0 ? `+${pScore.score_change}` : pScore.score_change}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                                  Total: {pScore.score_cumulative}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {!currentSession.is_completed && rounds.length > 0 && (
            <div className="flex-row gap-12" style={{ display: 'flex' }}>
              <button onClick={handleUndoRound} className="btn-secondary w-full" style={{ color: 'var(--danger)' }}>
                Urungkan Ronde Terakhir
              </button>
              <button onClick={handleCompleteGame} className="btn-danger w-full">
                Selesaikan Game
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
