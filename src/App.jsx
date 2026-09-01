import React, { useState, useEffect } from 'react'
import { I18nProvider, useTranslation } from './i18n/I18nContext'
import { authService } from './services/authService'
import { gameService } from './services/gameService'

import AppHeader from './components/layout/AppHeader'
import BottomNav from './components/layout/BottomNav'
import HubDashboard from './components/layout/HubDashboard'
import AuthModal from './components/common/AuthModal'
import StoryCardModal from './components/common/StoryCardModal'

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

function MainApp() {
  const { t } = useTranslation()
  const [user, setUser] = useState(null)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
  const [shareData, setShareData] = useState(null)

  // Navigation View State
  const [currentView, setCurrentView] = useState('hub') // 'hub' | 'truf' | 'remi' | 'omben' | 'chess' | 'scoreboard' | 'utilities' | 'admin'
  const [utilitiesTab, setUtilitiesTab] = useState('dice')

  // Active Game Session State
  const [activeSession, setActiveSession] = useState(null)
  const [recentSessions, setRecentSessions] = useState([])
  const [sessionRounds, setSessionRounds] = useState([])

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
      setSessionRounds(session.game_rounds || [])
      setCurrentView(session.game_type)
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
      setSessionRounds(refreshed.game_rounds || [])
    }
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
    }

    return () => {
      if (subscription) subscription.unsubscribe()
    }
  }, [])

  // Subscribe to Realtime Live Room Changes for Active Session
  useEffect(() => {
    if (!activeSession?.id || activeSession.id.startsWith('guest-session')) return
    const channel = gameService.subscribeToLiveRoom(activeSession.id, async () => {
      const refreshed = await gameService.getSession(activeSession.id)
      if (refreshed && Array.isArray(refreshed.game_rounds) && refreshed.game_rounds.length > 0) {
        setSessionRounds(prev => {
          if (refreshed.game_rounds.length >= prev.length) {
            return refreshed.game_rounds
          }
          return prev
        })
      }
    })
    return () => {
      if (channel) gameService.unsubscribeLiveRoom(channel)
    }
  }, [activeSession?.id])

  // Navigation Handler
  const handleNavigate = (viewId, extraTab = 'dice') => {
    if (viewId === 'admin' && user?.profile?.role !== 'admin') {
      alert(t('admin.access_denied'))
      return
    }
    if (viewId === 'utilities') {
      setUtilitiesTab(extraTab)
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
    const scores = Array(session.player_names?.length || 4).fill(0)
    session.game_rounds?.forEach(r => {
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
          />
        )}

        {/* Truf Views */}
        {currentView === 'truf' && !activeSession && (
          <TrufSetup
            onStartGame={setup => handleStartGame('truf', setup)}
            onBack={() => setCurrentView('hub')}
          />
        )}
        {currentView === 'truf' && activeSession && (
          <TrufPlay
            session={activeSession}
            rounds={sessionRounds}
            onSaveRound={handleSaveRound}
            onUndoRound={handleUndoRound}
            onFinalizeGame={handleFinalizeGame}
            onOpenShareModal={handleFinalizeGame}
            user={user}
            onClaimSeat={handleClaimSeat}
          />
        )}

        {/* Remi Views */}
        {currentView === 'remi' && !activeSession && (
          <RemiSetup
            onStartGame={setup => handleStartGame('remi', setup)}
            onBack={() => setCurrentView('hub')}
          />
        )}
        {currentView === 'remi' && activeSession && (
          <RemiPlay
            session={activeSession}
            rounds={sessionRounds}
            onSaveRound={handleSaveRound}
            onUndoRound={handleUndoRound}
            onFinalizeGame={handleFinalizeGame}
            onOpenShareModal={handleFinalizeGame}
            user={user}
            onClaimSeat={handleClaimSeat}
          />
        )}

        {/* Omben Views */}
        {currentView === 'omben' && !activeSession && (
          <OmbenSetup
            onStartGame={setup => handleStartGame('omben', setup)}
            onBack={() => setCurrentView('hub')}
          />
        )}
        {currentView === 'omben' && activeSession && (
          <OmbenPlay
            session={activeSession}
            rounds={sessionRounds}
            onSaveRound={handleSaveRound}
            onUndoRound={handleUndoRound}
            onFinalizeGame={handleFinalizeGame}
            onOpenShareModal={handleFinalizeGame}
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
