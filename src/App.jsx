import React, { useState, useEffect, useRef } from 'react'
import { I18nProvider, useTranslation } from './i18n/I18nContext'
import { ThemeProvider } from './context/ThemeContext'
import { authService } from './services/authService'
import { sessionTimeoutService } from './services/sessionTimeoutService'
import { gameService } from './services/gameService'
import { deviceService } from './services/deviceService'
import { networkService } from './services/networkService'

import AppHeader from './components/layout/AppHeader'
import BottomNav from './components/layout/BottomNav'
import HubDashboard from './components/layout/HubDashboard'
import AuthModal from './components/common/AuthModal'
import StoryCardModal from './components/common/StoryCardModal'
import SessionRecapModal from './components/common/SessionRecapModal'
import GameLobby from './components/common/GameLobby'
import CheckInModal from './components/common/CheckInModal'

// Game Modules
import TrufSetup from './tools/truf/TrufSetup'
import TrufPlay from './tools/truf/TrufPlay'
import RemiSetup from './tools/remi/RemiSetup'
import RemiPlay from './tools/remi/RemiPlay'
import OmbenSetup from './tools/omben/OmbenSetup'
import OmbenPlay from './tools/omben/OmbenPlay'
import ChessClock from './tools/chess-clock/ChessClock'
import GenericScoreboard from './tools/scoreboard/GenericScoreboard'
import UtilitiesView from './tools/utilities/UtilitiesView'
import AdminDashboard from './components/admin/AdminDashboard'
import AdminPortalShell from './components/admin/AdminPortalShell'
import PricingModal from './components/pricing/PricingModal'
import ProfileModal from './components/profile/ProfileModal'
import SupportTicketModal from './components/common/SupportTicketModal'
import SimulatedAdModal from './components/common/SimulatedAdModal'
import LiveUpdateNotification from './components/common/LiveUpdateNotification'
import DevToolsDock from './components/common/DevToolsDock'
import CardGameRulesModal from './components/common/CardGameRulesModal'
import { adService } from './services/adService'

import './App.css'

function getViewFromPath(pathname) {
  const cleanPath = pathname.replace(/^\//, '').toLowerCase().split('/')[0]
  const validViews = ['truf', 'remi', 'omben', 'chess', 'scoreboard', 'utilities', 'admin']
  if (validViews.includes(cleanPath)) {
    return cleanPath
  }
  return 'hub'
}

function updateBrowserUrl(view, mode, session, extraTab) {
  try {
    let path = '/'
    const params = new URLSearchParams()

    if (view && view !== 'hub') {
      path = `/${view}`
      if (mode === 'play' && session?.room_code) {
        params.set('room', session.room_code)
      } else if (view === 'utilities' && extraTab && extraTab !== 'dice') {
        params.set('tab', extraTab)
      }
    }

    const search = params.toString() ? `?${params.toString()}` : ''
    const targetUrl = `${path}${search}`

    if (window.location.pathname + window.location.search !== targetUrl) {
      window.history.pushState({ view, mode, sessionCode: session?.room_code }, '', targetUrl)
    }
  } catch (e) {
    console.warn('History pushState error:', e)
  }
}

function MainApp() {
  const { t } = useTranslation()
  const [user, setUser] = useState(null)
  const userRef = useRef(user)
  useEffect(() => {
    userRef.current = user
  }, [user])

  const isPro = authService.isUserPro(user)

  // Synchronize Ad Service with Pro status
  useEffect(() => {
    adService.initAds(isPro)
  }, [isPro])

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false)
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isCheckInModalOpen, setIsCheckInModalOpen] = useState(false)
  const [pendingJoinSession, setPendingJoinSession] = useState(null)
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
  const [isRecapModalOpen, setIsRecapModalOpen] = useState(false)
  const [selectedRecapSession, setSelectedRecapSession] = useState(null)
  const [shareData, setShareData] = useState(null)
  const [isOnline, setIsOnline] = useState(() => networkService.isOnline())
  const [isGlobalRulesOpen, setIsGlobalRulesOpen] = useState(false)
  const [globalRulesGame, setGlobalRulesGame] = useState('truf')
  const [syncNotice, setSyncNotice] = useState(null)

  // Navigation View State (Synced with Browser URL)
  const [currentView, setCurrentView] = useState(() => {
    try {
      return getViewFromPath(window.location.pathname)
    } catch {
      return 'hub'
    }
  })
  const [gameMode, setGameMode] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get('room') ? 'play' : 'lobby'
    } catch {
      return 'lobby'
    }
  })
  const [utilitiesTab, setUtilitiesTab] = useState(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search)
      return urlParams.get('tab') || 'dice'
    } catch {
      return 'dice'
    }
  })

  // Active Game Session State (Persisted in LocalStorage)
  const [activeSession, setActiveSession] = useState(() => {
    try {
      const saved = localStorage.getItem('gns_active_session')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [recentSessions, setRecentSessions] = useState([])
  const [sessionRounds, setSessionRounds] = useState(() => {
    try {
      const saved = localStorage.getItem('gns_session_rounds')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Synchronize Active Session & Rounds to LocalStorage
  useEffect(() => {
    try {
      if (activeSession) {
        localStorage.setItem('gns_active_session', JSON.stringify(activeSession))
      } else {
        localStorage.removeItem('gns_active_session')
      }
    } catch {}
  }, [activeSession])

  useEffect(() => {
    try {
      localStorage.setItem('gns_session_rounds', JSON.stringify(sessionRounds))
    } catch {}
  }, [sessionRounds])

  // Clean up any legacy saved view from localStorage so user is not redirected
  useEffect(() => {
    try {
      localStorage.removeItem('gns_current_view')
    } catch {}
  }, [])

  // Listen to network changes and auto-flush pending late sync queue
  useEffect(() => {
    const unsub = networkService.subscribe((online) => {
      setIsOnline(online)
      if (online) {
        gameService.flushPendingRounds().then(({ synced }) => {
          if (synced > 0) {
            setSyncNotice(`✅ ${synced} ronde berhasil disinkronkan ke cloud!`)
            setTimeout(() => setSyncNotice(null), 5000)
            if (activeSession?.id) {
              gameService.getSession(activeSession.id).then(fresh => {
                if (fresh?.game_rounds) setSessionRounds(fresh.game_rounds)
              })
            }
          }
        })
      }
    })
    return () => unsub()
  }, [activeSession?.id])

  const loadUserSessions = async (userId) => {
    const data = await gameService.getUserSessions(userId || 'guest-user')
    setRecentSessions(data || [])
  }

  // Join Room by Code or Link
  const handleJoinRoom = async (roomCode) => {
    if (!roomCode) return false
    const session = await gameService.getSession(null, roomCode.toUpperCase())
    if (session) {
      const currentClientId = deviceService.getClientIdentifier(user)
      const seatIndex = session.player_user_ids?.findIndex(id => id && (id === currentClientId || (user?.id && id === user.id)))
      const localSeat = deviceService.getSessionSeat(session.id)
      const existingSeat = seatIndex !== -1 && seatIndex !== undefined ? seatIndex : localSeat

      // If user is already bound to a seat in this room
      if (existingSeat !== null && existingSeat !== undefined) {
        setActiveSession(session)
        setSessionRounds(session.game_rounds || session.rounds || [])
        setCurrentView(session.game_type)
        setGameMode('play')
        return true
      }

      // If not yet checked in, open CheckInModal so player can choose seat or spectate
      setPendingJoinSession(session)
      setIsCheckInModalOpen(true)
      return true
    }
    return false
  }

  // Handle Seat Selection from CheckInModal
  const handleSelectSeat = async (playerIndex) => {
    if (!pendingJoinSession) return
    const currentClientId = deviceService.getClientIdentifier(user)
    await gameService.claimSeat(pendingJoinSession.id, playerIndex, currentClientId)
    deviceService.setSessionSeat(pendingJoinSession.id, playerIndex)

    const refreshed = await gameService.getSession(pendingJoinSession.id) || pendingJoinSession
    setActiveSession(refreshed)
    setSessionRounds(refreshed.game_rounds || refreshed.rounds || [])
    setCurrentView(refreshed.game_type)
    setGameMode('play')
    setIsCheckInModalOpen(false)
    setPendingJoinSession(null)
  }

  // Handle Enter Room as Spectator
  const handleEnterAsSpectator = () => {
    if (!pendingJoinSession) return
    deviceService.clearSessionSeat(pendingJoinSession.id)
    setActiveSession(pendingJoinSession)
    setSessionRounds(pendingJoinSession.game_rounds || pendingJoinSession.rounds || [])
    setCurrentView(pendingJoinSession.game_type)
    setGameMode('play')
    setIsCheckInModalOpen(false)
    setPendingJoinSession(null)
  }

  // Claim a Seat at the Table from within game view
  const handleClaimSeat = async (playerIndex) => {
    if (!activeSession) return
    const currentClientId = deviceService.getClientIdentifier(user)
    await gameService.claimSeat(activeSession.id, playerIndex, currentClientId)
    deviceService.setSessionSeat(activeSession.id, playerIndex)
    const refreshed = await gameService.getSession(activeSession.id)
    if (refreshed) {
      setActiveSession(refreshed)
      setSessionRounds(refreshed.game_rounds || refreshed.rounds || [])
    }
  }

  // Open an Existing Session (from Lobby or Hub)
  const handleOpenSession = async (session) => {
    const fullSession = await gameService.getSession(session.id) || session
    setActiveSession(fullSession)
    setSessionRounds(fullSession.game_rounds || fullSession.rounds || [])
    setCurrentView(fullSession.game_type)
    setGameMode('play')
  }

  // Start Setup Mode for a Game Type
  const handleStartSetup = (gameType) => {
    setCurrentView(gameType)
    setGameMode('setup')
  }

  // Open Detailed Match Recap Modal
  const handleViewRecap = async (session) => {
    const fullSession = await gameService.getSession(session.id) || session
    setSelectedRecapSession(fullSession)
    setIsRecapModalOpen(true)
  }

  // Complete Session and Move to Completed List
  const handleCompleteSession = async (sessionId) => {
    await gameService.completeSession(sessionId)
    if (activeSession?.id === sessionId) {
      setActiveSession(prev => prev ? { ...prev, is_completed: true } : null)
      setGameMode('lobby')
    }
    loadUserSessions(user?.id)
  }

  // Delete Session
  const handleDeleteSession = async (sessionId) => {
    await gameService.deleteSession(sessionId)
    if (activeSession?.id === sessionId) {
      setActiveSession(null)
      setSessionRounds([])
      setGameMode('lobby')
    }
    loadUserSessions(user?.id)
  }

  // Initialize Auth, Deep Links & Auto-Join from URL
  useEffect(() => {
    authService.initMobileDeepLinks()

    const handleSessionTimeout = async () => {
      try {
        await authService.signOut()
      } catch (e) {
        console.warn('Timeout signout error:', e)
      }
      setUser(null)
      loadUserSessions('guest-user')
      setSessionExpiredNotice(true)
      setIsAuthModalOpen(true)
    }

    if (sessionTimeoutService.isSessionExpired()) {
      handleSessionTimeout()
    } else {
      authService.getCurrentUser().then(currUser => {
        setUser(currUser)
        loadUserSessions(currUser?.id)
      })
    }

    const destroyTimeout = sessionTimeoutService.initSessionTimeout({
      onTimeout: handleSessionTimeout,
      getIsAuthenticated: () => !!userRef.current
    })

    const subscription = authService.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const fullUser = await authService.getCurrentUser()
        setUser(fullUser)
        loadUserSessions(fullUser?.id)
      } else {
        setUser(null)
        loadUserSessions('guest-user')
      }
    })

    // Check if user clicked a shared invite link (?room=CODE)
    const urlParams = new URLSearchParams(window.location.search)
    const roomParam = urlParams.get('room')
    if (roomParam) {
      handleJoinRoom(roomParam)
    } else if (activeSession?.id && !activeSession.id.startsWith('guest-session')) {
      // Re-synchronize active cloud session on page load/refresh
      gameService.getSession(activeSession.id).then(refreshed => {
        if (refreshed) {
          setActiveSession(refreshed)
          setSessionRounds(refreshed.game_rounds || refreshed.rounds || [])
        }
      })
    }

    // Handle Browser Back / Forward buttons & URL changes
    const handlePopState = async () => {
      const pathView = getViewFromPath(window.location.pathname)
      const currentParams = new URLSearchParams(window.location.search)
      const room = currentParams.get('room')
      const tab = currentParams.get('tab')

      if (tab) setUtilitiesTab(tab)

      if (room) {
        await handleJoinRoom(room)
      } else {
        setCurrentView(pathView)
        setGameMode('lobby')
      }
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      destroyTimeout()
      if (subscription) subscription.unsubscribe()
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Seamlessly keep Browser Address Bar URL in sync with Navigation & Room Codes
  useEffect(() => {
    updateBrowserUrl(currentView, gameMode, activeSession, utilitiesTab)
  }, [currentView, gameMode, activeSession?.id, activeSession?.room_code, utilitiesTab])

  // Derive list of games with an active, uncompleted match in progress
  const activeGameTypes = React.useMemo(() => {
    const types = new Set()
    if (activeSession && !activeSession.is_completed && activeSession.game_type) {
      types.add(activeSession.game_type)
    }
    recentSessions.forEach(s => {
      if (!s.is_completed && s.game_type) {
        types.add(s.game_type)
      }
    })
    return Array.from(types)
  }, [activeSession, recentSessions])

  // Navigation Handler
  const handleNavigate = (viewId, extraTab = 'dice') => {
    if (viewId === 'admin' && user?.profile?.role !== 'admin') {
      alert(t('admin.access_denied'))
      return
    }
    if (viewId === 'utilities') {
      setUtilitiesTab(extraTab)
    }
    if (viewId === 'truf' || viewId === 'remi' || viewId === 'omben') {
      // Check if current active session matches this game and is uncompleted
      if (activeSession && activeSession.game_type === viewId && !activeSession.is_completed) {
        setGameMode('play')
      } else {
        // Look in recent/local sessions for an active uncompleted session for this game
        const activeMatch = recentSessions.find(s => s.game_type === viewId && !s.is_completed)
        if (activeMatch) {
          handleOpenSession(activeMatch)
        } else {
          setGameMode('lobby')
        }
      }
    }
    setCurrentView(viewId)
  }

  // Always refresh user sessions when entering lobby or hub view
  useEffect(() => {
    if (gameMode === 'lobby' || currentView === 'hub') {
      loadUserSessions(user?.id)
    }
  }, [gameMode, currentView, user?.id])

  const handleBackToLobby = () => {
    setGameMode('lobby')
    loadUserSessions(user?.id)
  }

  // 1. Start a New Game Session (Host binds to Seat 0)
  const handleStartGame = async (gameType, setupData) => {
    const isOfflineLocal = Boolean(setupData?.isOfflineLocal) || !networkService.isOnline()

    // Host Login Enforcement: Creating a shareable multiplayer room requires login
    if (!isOfflineLocal && !user) {
      alert(t('room_mode.host_login_required'))
      setIsAuthModalOpen(true)
      return
    }

    const currentClientId = deviceService.getClientIdentifier(user)
    const firstDealer = setupData?.firstDealer ?? 0
    const session = await gameService.createSession({
      userId: user?.id || 'guest-user',
      creatorClientId: currentClientId,
      gameType,
      playerNames: setupData.playerNames,
      firstDealer,
      settings: {
        ...setupData.settings,
        first_dealer: firstDealer,
        firstDealer: firstDealer
      },
      title: `${gameType.toUpperCase()} - ${new Date().toLocaleDateString()}`,
      isOfflineLocal
    })

    deviceService.setSessionSeat(session.id, 0)
    setActiveSession(session)
    setSessionRounds([])
    setCurrentView(gameType)
    setGameMode('play')
    loadUserSessions(user?.id)
  }

  // 2. Save a Game Round
  // 2. Save a Game Round
  const handleSaveRound = async (roundPayload) => {
    if (!activeSession) return
    const roundData = roundPayload.roundData || roundPayload.round_data || {}
    const playerScores = roundPayload.playerScores || roundPayload.player_scores || []
    const roundNumber = roundPayload.roundNumber || roundPayload.round_number

    // Ensure sessionRounds has the optimistic payload immediately
    setSessionRounds(prev => [...prev, {
      ...roundPayload,
      roundNumber,
      round_number: roundNumber,
      roundData,
      round_data: roundData,
      playerScores,
      player_scores: playerScores
    }])

    try {
      const saved = await gameService.saveRound({
        sessionId: activeSession.id,
        roundNumber,
        roundData,
        playerScores
      })

      if (saved) {
        if (!activeSession.settings?.isOfflineLocal && activeSession.id) {
          gameService.broadcastRound(activeSession.id, saved)
        }
        loadUserSessions(user?.id)
      }
    } catch (err) {
      console.warn('saveRound error:', err)
    }
  }

  // 3. Undo Last Round
  const handleUndoRound = async () => {
    if (sessionRounds.length === 0 || !activeSession) return
    const lastRound = sessionRounds[sessionRounds.length - 1]
    await gameService.deleteRound(lastRound.id, activeSession.id)
    setSessionRounds(prev => prev.slice(0, -1))
    loadUserSessions(user?.id)
  }

  // 4. Share Current Live Session (Non-Destructive, does not end game)
  const handleShareCurrentSession = (customRounds) => {
    if (!activeSession) return
    const roundsToUse = (Array.isArray(customRounds) && customRounds.length > 0)
      ? customRounds
      : (sessionRounds.length > 0 ? sessionRounds : (activeSession.game_rounds || []))

    const isLowestWins = activeSession.game_type === 'remi' || activeSession.game_type === 'omben'
    const initialScores = activeSession.settings?.initialScores || activeSession.initial_scores || []
    const scores = Array(activeSession.player_names?.length || 4).fill(0)
    initialScores.forEach((s, idx) => {
      if (scores[idx] !== undefined) scores[idx] = Number(s) || 0
    })

    roundsToUse.forEach(r => {
      const pScores = r.player_scores || r.playerScores || []
      pScores.forEach(ps => {
        const pIdx = ps.player_index ?? 0
        const change = ps.score_change ?? 0
        scores[pIdx] += change
      })
    })

    const playersWithScores = (activeSession.player_names || []).map((name, idx) => ({
      name,
      score: scores[idx]
    })).sort((a, b) => isLowestWins ? a.score - b.score : b.score - a.score)

    setShareData({
      gameType: activeSession.game_type?.toUpperCase(),
      title: activeSession.title,
      hostName: user?.profile?.display_name || 'Host',
      date: new Date().toLocaleDateString(),
      players: playersWithScores
    })

    setIsShareModalOpen(true)
  }

  // 5. Finalize Game & Open Story Card Modal
  const handleFinalizeGame = async (customRounds) => {
    if (!activeSession) return
    try {
      await gameService.completeSession(activeSession.id)
    } catch (err) {
      console.warn('Could not complete session on cloud/storage:', err)
    }
    
    const roundsToUse = (Array.isArray(customRounds) && customRounds.length > 0)
      ? customRounds
      : (sessionRounds.length > 0 ? sessionRounds : (activeSession.game_rounds || []))

    // Calculate final rankings (lowest score wins for remi/omben, highest for truf)
    const isLowestWins = activeSession.game_type === 'remi' || activeSession.game_type === 'omben'
    const initialScores = activeSession.settings?.initialScores || activeSession.initial_scores || []
    const scores = Array(activeSession.player_names?.length || 4).fill(0)
    initialScores.forEach((s, idx) => {
      if (scores[idx] !== undefined) scores[idx] = Number(s) || 0
    })

    roundsToUse.forEach(r => {
      const pScores = r.player_scores || r.playerScores || []
      pScores.forEach(ps => {
        const pIdx = ps.player_index ?? 0
        const change = ps.score_change ?? 0
        scores[pIdx] += change
      })
    })

    const playersWithScores = (activeSession.player_names || []).map((name, idx) => ({
      name,
      score: scores[idx]
    })).sort((a, b) => isLowestWins ? a.score - b.score : b.score - a.score)

    setShareData({
      gameType: activeSession.game_type?.toUpperCase(),
      title: activeSession.title,
      hostName: user?.profile?.display_name || 'Host',
      date: new Date().toLocaleDateString(),
      players: playersWithScores
    })

    setActiveSession(prev => prev ? { ...prev, is_completed: true } : null)
    setIsShareModalOpen(true)
    loadUserSessions(user?.id)

    // Trigger interstitial ad at match conclusion if eligible (skipped for Pro users)
    adService.showInterstitialIfEligible()
  }

  // 6. Quick Rematch with Same Roster
  const handleRematch = (session) => {
    handleStartGame(session.game_type, {
      playerNames: session.player_names,
      settings: session.settings
    })
  }

  // 7. Open Share Modal for Past Session
  const handleShareSession = (session) => {
    const rounds = session.game_rounds || session.rounds || []
    const isLowestWins = session.game_type === 'remi' || session.game_type === 'omben'
    const initialScores = session.settings?.initialScores || session.initial_scores || []
    const scores = Array(session.player_names?.length || 4).fill(0)
    initialScores.forEach((s, idx) => {
      if (scores[idx] !== undefined) scores[idx] = Number(s) || 0
    })

    rounds.forEach(r => {
      r.player_scores?.forEach(ps => {
        scores[ps.player_index] += (ps.score_change || 0)
      })
    })

    const playersWithScores = (session.player_names || []).map((name, idx) => ({
      name,
      score: scores[idx]
    })).sort((a, b) => isLowestWins ? a.score - b.score : b.score - a.score)

    setShareData({
      gameType: session.game_type?.toUpperCase(),
      title: session.title,
      hostName: session.user_id ? 'Host' : 'Guest Host',
      date: new Date(session.created_at).toLocaleDateString(),
      players: playersWithScores
    })
    setIsShareModalOpen(true)
  }

  return (
    <div className="app-container">
      {/* Offline Connection Banner */}
      {!isOnline && (
        <div style={{
          background: 'linear-gradient(90deg, #F59E0B, #D97706)',
          color: '#000',
          fontWeight: 700,
          fontSize: '0.8rem',
          padding: '8px 16px',
          textAlign: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <span>⚠️</span>
          <span>Koneksi Terputus • Skor tersimpan aman di HP & otomatis disinkronkan ke room saat online kembali.</span>
        </div>
      )}

      {/* Sync Success Notice */}
      {syncNotice && (
        <div style={{
          background: 'linear-gradient(90deg, #10B981, #059669)',
          color: '#FFF',
          fontWeight: 700,
          fontSize: '0.8rem',
          padding: '8px 16px',
          textAlign: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          {syncNotice}
        </div>
      )}

      {/* Top Header */}
      <AppHeader
        user={user}
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onOpenPricing={() => setIsPricingModalOpen(true)}
        onOpenRules={() => {
          const matchedGame = ['truf', 'remi', 'omben', 'chess'].includes(currentView) ? currentView : 'truf'
          setGlobalRulesGame(matchedGame)
          setIsGlobalRulesOpen(true)
        }}
      />

      {/* Floating Active Game Quick-Resume Banner */}
      {activeSession && !activeSession.is_completed && (currentView !== activeSession.game_type || gameMode !== 'play') && (
        <div 
          onClick={() => {
            setCurrentView(activeSession.game_type)
            setGameMode('play')
          }}
          style={{
            background: 'linear-gradient(90deg, #7C3AED, #4F46E5)',
            color: '#FFF',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: syncNotice || !isOnline ? '36px' : '0px',
            zIndex: 9998,
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.45)',
            cursor: 'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <span style={{ fontSize: '1.2rem' }}>⚡</span>
            <span>
              Game <strong>{activeSession.game_type?.toUpperCase()}</strong> Sedang Berjalan 
              <span style={{ opacity: 0.85, marginLeft: '6px' }}>({sessionRounds.length > 0 ? `Ronde ${sessionRounds.length + 1}` : 'Belum Mulai Ronde'})</span>
            </span>
          </div>
          <button 
            type="button" 
            className="btn btn-sm btn-primary"
            style={{ 
              padding: '4px 12px', 
              fontSize: '0.78rem', 
              fontWeight: 800,
              background: '#FFF',
              color: '#7C3AED',
              border: 'none',
              borderRadius: '6px'
            }}
          >
            ▶️ Lanjutkan Main
          </button>
        </div>
      )}

      {/* Main View Router */}
      <main className="main-content">
        {currentView === 'hub' && (
          <HubDashboard
            user={user}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onSelectTool={handleNavigate}
            recentSessions={recentSessions}
            onRematch={handleRematch}
            onShareSession={handleShareSession}
            onOpenPricing={() => setIsPricingModalOpen(true)}
            onJoinRoom={handleJoinRoom}
            onOpenSession={handleOpenSession}
            onViewRecap={handleViewRecap}
            onCompleteSession={handleCompleteSession}
            onDeleteSession={handleDeleteSession}
          />
        )}

        {/* Truf Views */}
        {currentView === 'truf' && gameMode === 'lobby' && (
          <GameLobby
            gameType="truf"
            sessions={recentSessions}
            onStartNewGame={() => handleStartSetup('truf')}
            onOpenSession={handleOpenSession}
            onCompleteSession={handleCompleteSession}
            onDeleteSession={handleDeleteSession}
            onShareSession={handleShareSession}
            onRematch={handleRematch}
            onViewRecap={handleViewRecap}
            onBack={() => setCurrentView('hub')}
          />
        )}
        {currentView === 'truf' && gameMode === 'setup' && (
          <TrufSetup
            onStartGame={setup => handleStartGame('truf', setup)}
            onBack={() => setGameMode('lobby')}
          />
        )}
        {currentView === 'truf' && gameMode === 'play' && activeSession && (
          <TrufPlay
            session={activeSession}
            rounds={sessionRounds}
            onSaveRound={handleSaveRound}
            onUndoRound={handleUndoRound}
            onFinalizeGame={handleFinalizeGame}
            onOpenShareModal={handleShareCurrentSession}
            onBackToLobby={handleBackToLobby}
            user={user}
            onClaimSeat={handleClaimSeat}
          />
        )}

        {/* Remi Views */}
        {currentView === 'remi' && gameMode === 'lobby' && (
          <GameLobby
            gameType="remi"
            sessions={recentSessions}
            onStartNewGame={() => handleStartSetup('remi')}
            onOpenSession={handleOpenSession}
            onCompleteSession={handleCompleteSession}
            onDeleteSession={handleDeleteSession}
            onShareSession={handleShareSession}
            onRematch={handleRematch}
            onViewRecap={handleViewRecap}
            onBack={() => setCurrentView('hub')}
          />
        )}
        {currentView === 'remi' && gameMode === 'setup' && (
          <RemiSetup
            onStartGame={setup => handleStartGame('remi', setup)}
            onBack={() => setGameMode('lobby')}
          />
        )}
        {currentView === 'remi' && gameMode === 'play' && activeSession && (
          <RemiPlay
            session={activeSession}
            rounds={sessionRounds}
            onSaveRound={handleSaveRound}
            onUndoRound={handleUndoRound}
            onFinalizeGame={handleFinalizeGame}
            onOpenShareModal={handleShareCurrentSession}
            onBackToLobby={handleBackToLobby}
            user={user}
            onClaimSeat={handleClaimSeat}
          />
        )}

        {/* Omben Views */}
        {currentView === 'omben' && gameMode === 'lobby' && (
          <GameLobby
            gameType="omben"
            sessions={recentSessions}
            onStartNewGame={() => handleStartSetup('omben')}
            onOpenSession={handleOpenSession}
            onCompleteSession={handleCompleteSession}
            onDeleteSession={handleDeleteSession}
            onShareSession={handleShareSession}
            onRematch={handleRematch}
            onViewRecap={handleViewRecap}
            onBack={() => setCurrentView('hub')}
          />
        )}
        {currentView === 'omben' && gameMode === 'setup' && (
          <OmbenSetup
            onStartGame={setup => handleStartGame('omben', setup)}
            onBack={() => setGameMode('lobby')}
          />
        )}
        {currentView === 'omben' && gameMode === 'play' && activeSession && (
          <OmbenPlay
            session={activeSession}
            rounds={sessionRounds}
            onSaveRound={handleSaveRound}
            onUndoRound={handleUndoRound}
            onFinalizeGame={handleFinalizeGame}
            onOpenShareModal={handleShareCurrentSession}
            onBackToLobby={handleBackToLobby}
            user={user}
            onClaimSeat={handleClaimSeat}
          />
        )}

        {/* Chess Clock View */}
        {currentView === 'chess' && (
          <ChessClock onBack={() => setCurrentView('hub')} />
        )}

        {/* Generic Scoreboard View */}
        {currentView === 'scoreboard' && (
          <GenericScoreboard
            onBack={() => setCurrentView('hub')}
            onOpenShareModal={data => {
              setShareData(data)
              setIsShareModalOpen(true)
            }}
          />
        )}

        {/* Tabletop Utilities View */}
        {currentView === 'utilities' && (
          <UtilitiesView
            initialTab={utilitiesTab}
            onBack={() => setCurrentView('hub')}
          />
        )}

        {/* Admin Dashboard */}
        {currentView === 'admin' && (
          <AdminDashboard onBack={() => setCurrentView('hub')} />
        )}
      </main>

      {/* Bottom Navigation for Mobile */}
      <BottomNav
        activeView={currentView}
        activeGameTypes={activeGameTypes}
        onNavigate={(viewId) => {
          handleNavigate(viewId)
        }}
        isAdmin={user?.profile?.role === 'admin'}
      />

      {/* Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false)
          setSessionExpiredNotice(false)
        }}
        user={user}
        sessionExpiredNotice={sessionExpiredNotice}
        onAuthSuccess={() => {
          setSessionExpiredNotice(false)
          authService.getCurrentUser().then(currUser => {
            setUser(currUser)
            loadUserSessions(currUser?.id)
          })
        }}
      />

      {/* User Profile & Billing / Payment History Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        onUserUpdated={(updatedUser) => {
          setUser(updatedUser)
        }}
        onOpenPricing={() => setIsPricingModalOpen(true)}
        onOpenSupportTicket={() => setIsSupportModalOpen(true)}
        onSignOut={async () => {
          await authService.signOut()
          setUser(null)
          loadUserSessions('guest-user')
        }}
      />

      {/* Support & Trouble Ticket Modal */}
      <SupportTicketModal
        isOpen={isSupportModalOpen}
        onClose={() => setIsSupportModalOpen(false)}
        user={user}
      />

      {/* 9:16 Social Story Card Modal */}
      <StoryCardModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false)
          if (activeSession?.is_completed) {
            setGameMode('lobby')
          }
        }}
        sessionData={shareData}
      />

      {/* Match Detailed Recap Modal */}
      <SessionRecapModal
        isOpen={isRecapModalOpen}
        onClose={() => setIsRecapModalOpen(false)}
        session={selectedRecapSession}
        onShareStory={handleShareSession}
        onRematch={handleRematch}
      />

      {/* Pricing / Tiers Modal with Midtrans Checkout */}
      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
        user={user}
        onOpenAuth={() => {
          setIsPricingModalOpen(false)
          setIsAuthModalOpen(true)
        }}
        onOpenProfile={() => {
          setIsPricingModalOpen(false)
          setIsProfileModalOpen(true)
        }}
        onPaymentSuccess={() => {
          authService.getCurrentUser().then(currUser => {
            setUser(currUser)
            loadUserSessions(currUser?.id)
          })
        }}
      />

      {/* Check-in / Seat Selector / Spectator Entry Modal */}
      <CheckInModal
        isOpen={isCheckInModalOpen}
        session={pendingJoinSession}
        onSelectSeat={handleSelectSeat}
        onEnterAsSpectator={handleEnterAsSpectator}
      />

      {/* Simulated Interstitial & Rewarded Ad Modal (Dev / Web) */}
      <SimulatedAdModal />

      {/* Production & Staging Live Auto-Update / HMR Sync Notification */}
      <LiveUpdateNotification />

      {/* Local Developer Test Dock (Only on Localhost / Dev) */}
      {(import.meta.env.DEV || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))) && (
        <DevToolsDock
          user={user}
          onUserRefresh={() => {
            authService.getCurrentUser().then(currUser => {
              setUser(currUser)
              loadUserSessions(currUser?.id)
            })
          }}
          onOpenPricing={() => setIsPricingModalOpen(true)}
          onOpenAuth={() => setIsAuthModalOpen(true)}
        />
      )}

      {/* Global Card Game Rules & Scoring Reference Modal */}
      <CardGameRulesModal
        isOpen={isGlobalRulesOpen}
        onClose={() => setIsGlobalRulesOpen(false)}
        initialGame={globalRulesGame}
      />
    </div>
  )
}

function isSubdomainAdmin() {
  if (typeof window === 'undefined') return false
  const host = window.location.hostname.toLowerCase()
  if (host.startsWith('admin.') || host === 'admin.kancasela.my.id') return true
  const search = new URLSearchParams(window.location.search)
  if (search.get('portal') === 'admin' || search.get('subdomain') === 'admin') return true
  return false
}

export default function App() {
  const [isAdminPortal, setIsAdminPortal] = useState(() => isSubdomainAdmin())

  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminPortal(isSubdomainAdmin())
    }
    window.addEventListener('popstate', handleLocationChange)
    return () => window.removeEventListener('popstate', handleLocationChange)
  }, [])

  if (isAdminPortal) {
    return (
      <ThemeProvider>
        <I18nProvider>
          <AdminPortalShell />
        </I18nProvider>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <I18nProvider>
        <MainApp />
      </I18nProvider>
    </ThemeProvider>
  )
}
