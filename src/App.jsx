import React, { useState, useEffect } from 'react'
import { I18nProvider, useTranslation } from './i18n/I18nContext'
import { authService } from './services/authService'
import { gameService } from './services/gameService'

import AppHeader from './components/layout/AppHeader'
import BottomNav from './components/layout/BottomNav'
import HubDashboard from './components/layout/HubDashboard'
import AuthModal from './components/common/AuthModal'
import StoryCardModal from './components/common/StoryCardModal'
import SessionRecapModal from './components/common/SessionRecapModal'
import GameLobby from './components/common/GameLobby'

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
import PricingModal from './components/pricing/PricingModal'

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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
  const [isRecapModalOpen, setIsRecapModalOpen] = useState(false)
  const [selectedRecapSession, setSelectedRecapSession] = useState(null)
  const [shareData, setShareData] = useState(null)

  // Navigation View State (Synced with Browser URL & LocalStorage)
  const [currentView, setCurrentView] = useState(() => {
    try {
      const pathView = getViewFromPath(window.location.pathname)
      if (pathView !== 'hub') return pathView
      return localStorage.getItem('gns_current_view') || 'hub'
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

  useEffect(() => {
    try {
      localStorage.setItem('gns_current_view', currentView)
    } catch {}
  }, [currentView])

  const loadUserSessions = async (userId) => {
    const data = await gameService.getUserSessions(userId || 'guest-user')
    setRecentSessions(data || [])
  }

  // Join Room by Code or Link
  const handleJoinRoom = async (roomCode) => {
    if (!roomCode) return false
    const session = await gameService.getSession(null, roomCode.toUpperCase())
    if (session) {
      setActiveSession(session)
      setSessionRounds(session.game_rounds || session.rounds || [])
      setCurrentView(session.game_type)
      setGameMode('play')
      return true
    }
    return false
  }

  // Claim a Seat at the Table
  const handleClaimSeat = async (playerIndex) => {
    if (!activeSession || !user) return
    await gameService.claimSeat(activeSession.id, playerIndex, user.id)
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

    authService.getCurrentUser().then(currUser => {
      setUser(currUser)
      loadUserSessions(currUser?.id)
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
      if (subscription) subscription.unsubscribe()
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  // Seamlessly keep Browser Address Bar URL in sync with Navigation & Room Codes
  useEffect(() => {
    updateBrowserUrl(currentView, gameMode, activeSession, utilitiesTab)
  }, [currentView, gameMode, activeSession?.id, activeSession?.room_code, utilitiesTab])

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
      setGameMode('lobby')
    }
    setCurrentView(viewId)
  }

  // 1. Start a New Game Session
  const handleStartGame = async (gameType, setupData) => {
    const session = await gameService.createSession({
      userId: user?.id || 'guest-user',
      gameType,
      playerNames: setupData.playerNames,
      settings: setupData.settings,
      title: `${gameType.toUpperCase()} - ${new Date().toLocaleDateString()}`
    })

    setActiveSession(session)
    setSessionRounds([])
    setCurrentView(gameType)
    setGameMode('play')
    loadUserSessions(user?.id)
  }

  // 2. Save a Game Round
  const handleSaveRound = async (roundPayload) => {
    if (!activeSession) return
    const saved = await gameService.saveRound({
      sessionId: activeSession.id,
      roundNumber: roundPayload.roundNumber,
      roundData: roundPayload.roundData,
      playerScores: roundPayload.playerScores
    })

    if (saved) {
      setSessionRounds(prev => [...prev, saved])
      loadUserSessions(user?.id)
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

  // 4. Finalize Game & Open Story Card Modal
  const handleFinalizeGame = async () => {
    if (!activeSession) return
    await gameService.completeSession(activeSession.id)
    
    // Calculate final rankings for the 9:16 story card
    const scores = Array(activeSession.player_names?.length || 4).fill(0)
    sessionRounds.forEach(r => {
      r.player_scores?.forEach(ps => {
        scores[ps.player_index] += (ps.score_change || 0)
      })
    })

    const playersWithScores = (activeSession.player_names || []).map((name, idx) => ({
      name,
      score: scores[idx]
    })).sort((a, b) => b.score - a.score)

    setShareData({
      gameType: activeSession.game_type?.toUpperCase(),
      title: activeSession.title,
      hostName: user?.profile?.display_name || 'Guest Host',
      date: new Date().toLocaleDateString(),
      players: playersWithScores
    })

    setIsShareModalOpen(true)
    loadUserSessions(user?.id)
  }

  // 5. Quick Rematch with Same Roster
  const handleRematch = (session) => {
    handleStartGame(session.game_type, {
      playerNames: session.player_names,
      settings: session.settings
    })
  }

  // 6. Open Share Modal for Past Session
  const handleShareSession = (session) => {
    const rounds = session.game_rounds || session.rounds || []
    const scores = Array(session.player_names?.length || 4).fill(0)
    rounds.forEach(r => {
      r.player_scores?.forEach(ps => {
        scores[ps.player_index] += (ps.score_change || 0)
      })
    })

    const playersWithScores = (session.player_names || []).map((name, idx) => ({
      name,
      score: scores[idx]
    })).sort((a, b) => b.score - a.score)

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
      {/* Top Header */}
      <AppHeader
        user={user}
        currentView={currentView}
        onNavigate={handleNavigate}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenPricing={() => setIsPricingModalOpen(true)}
      />

      {/* Main View Router */}
      <main className="main-content">
        {currentView === 'hub' && (
          <HubDashboard
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
            onOpenShareModal={handleFinalizeGame}
            onBackToLobby={() => setGameMode('lobby')}
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
            onOpenShareModal={handleFinalizeGame}
            onBackToLobby={() => setGameMode('lobby')}
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
            onOpenShareModal={handleFinalizeGame}
            onBackToLobby={() => setGameMode('lobby')}
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
        onNavigate={(viewId) => {
          setActiveSession(null) // Reset active in-memory session when navigating tabs
          handleNavigate(viewId)
        }}
        isAdmin={user?.profile?.role === 'admin'}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        onAuthSuccess={() => {
          authService.getCurrentUser().then(currUser => {
            setUser(currUser)
            loadUserSessions(currUser?.id)
          })
        }}
      />

      {/* 9:16 Social Story Card Modal */}
      <StoryCardModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
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

      {/* Pricing / Tiers Modal */}
      <PricingModal
        isOpen={isPricingModalOpen}
        onClose={() => setIsPricingModalOpen(false)}
      />
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <MainApp />
    </I18nProvider>
  )
}
