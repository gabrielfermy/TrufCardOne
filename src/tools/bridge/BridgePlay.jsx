import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { calculateBridgeScore, BRIDGE_SUITS, BRIDGE_DOUBLES, BRIDGE_VULNERABILITY } from './bridgeLogic'
import { gameService } from '../../services/gameService'
import { deviceService } from '../../services/deviceService'
import RoomInviteModal from '../../components/common/RoomInviteModal'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

export default function BridgePlay({
  session,
  onSaveRound,
  onUndoRound,
  onFinishGame,
  onShareStory,
  onBackToHub,
  user,
  onClaimSeat,
  onReleaseSeat,
  myPlayerIndex: propMyPlayerIndex
}) {
  const { t } = useTranslation()
  const [isRulesOpen, setIsRulesOpen] = useState(false)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [showTransferScorerModal, setShowTransferScorerModal] = useState(false)

  const players = session?.player_names || ['North (U)', 'East (T)', 'South (S)', 'West (B)']
  const rounds = session?.game_rounds || session?.rounds || []
  const currentBoardNum = rounds.length + 1

  // Reactive live seat claims state to guarantee immediate re-rendering across screens
  const [livePlayerUserIds, setLivePlayerUserIds] = useState(() => session?.player_user_ids || Array(players.length).fill(null))

  useEffect(() => {
    if (session?.player_user_ids) {
      setLivePlayerUserIds(session.player_user_ids)
    }
  }, [session?.player_user_ids])

  // Determine user role and claimed seat index
  const currentClientId = deviceService.getClientIdentifier(user)
  const isLocalOrOffline = !session?.room_code || session?.settings?.isOfflineLocal || !session?.id || session.id.startsWith('guest-session') || session.id.startsWith('local-session')
  const isHost = isLocalOrOffline ||
                 session?.user_id === user?.id || 
                 livePlayerUserIds?.[0] === currentClientId || 
                 propMyPlayerIndex === 0 ||
                 (session?.id?.startsWith('guest-session') && deviceService.getSessionSeat(session.id) === 0)

  let effectiveSeat = propMyPlayerIndex !== undefined ? propMyPlayerIndex : null
  if (effectiveSeat === null) {
    const seatInSession = livePlayerUserIds?.findIndex(id => id && (id === currentClientId || (user?.id && id === user.id)))
    if (seatInSession !== -1 && seatInSession !== undefined) {
      effectiveSeat = seatInSession
    } else {
      const localSeat = deviceService.getSessionSeat(session?.id)
      if (localSeat !== null) effectiveSeat = localSeat
      else if (isHost) effectiveSeat = 0
    }
  }

  const myPlayerIndex = effectiveSeat
  const isSpectator = myPlayerIndex === null && !isHost

  // Scorer role state (defaults to Player 0 / Host)
  const [scorerIndex, setScorerIndex] = useState(session?.settings?.scorerIndex ?? 0)

  // Helper to determine automatic Scorer fallback if current scorer goes offline / stands up
  const computeFallbackScorer = (currentScorer, liveIds) => {
    if (liveIds && liveIds[currentScorer]) return currentScorer
    if (liveIds && liveIds[0]) return 0
    const firstOnline = liveIds ? liveIds.findIndex(id => Boolean(id)) : -1
    if (firstOnline !== -1) return firstOnline
    return 0
  }

  const effectiveScorerIndex = isLocalOrOffline ? scorerIndex : computeFallbackScorer(scorerIndex, livePlayerUserIds)
  const isScorer = isLocalOrOffline || myPlayerIndex === effectiveScorerIndex || (isHost && effectiveScorerIndex === null)
  const canChangeScorer = isLocalOrOffline || isHost || myPlayerIndex === effectiveScorerIndex

  // Realtime Live Room listener
  useEffect(() => {
    if (!session?.id || session.id.startsWith('guest-session') || session.id.startsWith('local-session')) return

    const channel = gameService.subscribeToLiveRoom(session.id, {
      onSeatClaim: (seatPayload) => {
        if (seatPayload?.playerIndex !== undefined) {
          const isRelease = !!seatPayload.isRelease
          setLivePlayerUserIds(prev => {
            const next = [...(prev || Array(players.length).fill(null))]
            if (isRelease) {
              next[seatPayload.playerIndex] = null
            } else if (seatPayload.clientId) {
              next[seatPayload.playerIndex] = seatPayload.clientId
            }
            if (session) session.player_user_ids = next
            return next
          })

          if (isHost && session.id) {
            const currentArr = session?.player_user_ids || Array(players.length).fill(null)
            const updated = [...currentArr]
            if (isRelease) {
              updated[seatPayload.playerIndex] = null
            } else if (seatPayload.clientId) {
              updated[seatPayload.playerIndex] = seatPayload.clientId
            }
            gameService.updateSessionPlayerUserIds(session.id, updated)
          }
        }
      },
      onDbUpdate: async () => {
        const refreshed = await gameService.getSession(session.id)
        if (refreshed?.player_user_ids) {
          setLivePlayerUserIds(refreshed.player_user_ids)
          if (session) session.player_user_ids = refreshed.player_user_ids
        }
      }
    })

    const pollInterval = setInterval(async () => {
      try {
        const refreshed = await gameService.getSession(session.id)
        if (refreshed?.player_user_ids) {
          setLivePlayerUserIds(refreshed.player_user_ids)
          if (session) session.player_user_ids = refreshed.player_user_ids
        }
      } catch (err) {
        // silent catch
      }
    }, 4000)

    return () => {
      clearInterval(pollInterval)
      gameService.unsubscribeFromLiveRoom(channel, session.id)
    }
  }, [session?.id, isHost, players.length])

  // Contract state for active board
  const [contractLevel, setContractLevel] = useState(4)
  const [contractSuit, setContractSuit] = useState('spades')
  const [contractDoubled, setContractDoubled] = useState('undoubled')
  const [declarerIdx, setDeclarerIdx] = useState(0) // 0: North, 1: East, 2: South, 3: West
  const [vulnerability, setVulnerability] = useState('none') // 'none' | 'ns' | 'ew' | 'both'
  const [tricksWon, setTricksWon] = useState(10)

  const declarerTeam = declarerIdx % 2 === 0 ? 'ns' : 'ew'
  const isDeclarerVulnerable = vulnerability === 'both' || vulnerability === declarerTeam

  // Live calculation
  const liveCalculation = useMemo(() => {
    return calculateBridgeScore({
      level: contractLevel,
      suit: contractSuit,
      doubled: contractDoubled,
      declarerTeam
    }, tricksWon, isDeclarerVulnerable)
  }, [contractLevel, contractSuit, contractDoubled, declarerTeam, tricksWon, isDeclarerVulnerable])

  // Total scores
  const totalScores = useMemo(() => {
    let ns = 0
    let ew = 0
    rounds.forEach(r => {
      if (r.ns_score !== undefined && r.ew_score !== undefined) {
        ns += r.ns_score
        ew += r.ew_score
      }
    })
    return { ns, ew }
  }, [rounds])

  const handleSave = () => {
    const netPoints = liveCalculation.scoreDelta
    const nsScore = declarerTeam === 'ns' ? (netPoints > 0 ? netPoints : 0) : (netPoints < 0 ? Math.abs(netPoints) : 0)
    const ewScore = declarerTeam === 'ew' ? (netPoints > 0 ? netPoints : 0) : (netPoints < 0 ? Math.abs(netPoints) : 0)

    const roundData = {
      round_number: currentBoardNum,
      contract: {
        level: contractLevel,
        suit: contractSuit,
        doubled: contractDoubled,
        declarer_name: players[declarerIdx],
        declarer_team: declarerTeam,
        vulnerability
      },
      tricks_won: tricksWon,
      is_made: liveCalculation.isMade,
      diff: liveCalculation.diff,
      score_delta: netPoints,
      ns_score: nsScore,
      ew_score: ewScore,
      breakdown: liveCalculation.breakdown,
      timestamp: new Date().toISOString()
    }

    onSaveRound(roundData)

    // Reset default for next board
    setTricksWon(10)
  }

  return (
    <div className="main-content" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Spectator Live Banner */}
      {isSpectator && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(129, 140, 248, 0.15), rgba(56, 189, 248, 0.15))',
          border: '1px solid rgba(129, 140, 248, 0.35)',
          borderRadius: '12px',
          padding: '10px 14px',
          marginBottom: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: '#A5B4FC',
          fontSize: '0.85rem'
        }}>
          <span style={{ fontSize: '1.2rem' }}>👀</span>
          <span><strong>Mode Penonton (Live Spectator)</strong> • Memantau papan Bridge secara realtime</span>
        </div>
      )}

      {/* Header */}
      <div className="glass-panel" style={{ padding: '10px 12px', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1, overflow: 'hidden' }}>
            {onBackToHub && (
              <button 
                type="button" 
                className="btn btn-secondary btn-sm" 
                onClick={onBackToHub}
                style={{ fontSize: '0.72rem', padding: '3px 8px', borderRadius: '6px', whiteSpace: 'nowrap', flexShrink: 0 }}
                title="Kembali ke Hub"
              >
                ← Hub
              </button>
            )}
            <span style={{
              fontSize: '0.76rem',
              color: 'var(--text-dim)',
              fontWeight: 700,
              textTransform: 'uppercase',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}>
              {session?.title || 'Contract Bridge'}
            </span>

            {/* Role Badge */}
            <span style={{
              fontSize: '0.68rem',
              padding: '2px 6px',
              borderRadius: '5px',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              background: isHost ? 'var(--badge-gold-bg)' : isSpectator ? 'var(--badge-blue-bg)' : 'var(--badge-purple-bg)',
              color: isHost ? 'var(--badge-gold-text)' : isSpectator ? 'var(--badge-blue-text)' : 'var(--badge-purple-text)',
              border: `1px solid ${isHost ? 'var(--badge-gold-border)' : isSpectator ? 'var(--badge-blue-border)' : 'var(--badge-purple-border)'}`
            }}>
              {isHost ? '👑 Host' : isSpectator ? '👀 Penonton' : `🪑 P${(myPlayerIndex ?? 0) + 1}`}
            </span>

            {/* Scorer Badge */}
            <span style={{
              fontSize: '0.68rem',
              padding: '2px 6px',
              borderRadius: '5px',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38BDF8',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span>📝 Pencatat: {players[effectiveScorerIndex] || `P${effectiveScorerIndex + 1}`}</span>
              {canChangeScorer && (
                <button
                  type="button"
                  onClick={() => setShowTransferScorerModal(true)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38BDF8',
                    cursor: 'pointer',
                    padding: '0 2px',
                    fontSize: '0.75rem',
                    fontWeight: 900
                  }}
                  title="Ganti Pencatat Skor"
                >
                  ⇄
                </button>
              )}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {myPlayerIndex !== null && onReleaseSeat && (
              <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={() => {
                  if (window.confirm('Apakah Anda yakin ingin berdiri dan melepaskan kursi?')) {
                    onReleaseSeat(myPlayerIndex)
                    setLivePlayerUserIds(prev => {
                      const next = [...(prev || [])]
                      next[myPlayerIndex] = null
                      return next
                    })
                  }
                }}
                style={{
                  fontSize: '0.68rem',
                  padding: '2px 6px',
                  borderRadius: '6px',
                  color: '#F87171',
                  borderColor: 'rgba(239, 68, 68, 0.4)'
                }}
                title="Berdiri dari Kursi"
              >
                🚶 Berdiri
              </button>
            )}

            <button 
              type="button"
              className="btn btn-sm"
              onClick={() => setIsInviteModalOpen(true)}
              style={{
                fontSize: '0.72rem',
                padding: '3px 7px',
                background: 'rgba(129, 140, 248, 0.15)',
                border: '1px solid rgba(129, 140, 248, 0.4)',
                color: '#818CF8',
                fontWeight: 700,
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title="Undang Teman & Kode Room"
            >
              <span>🔗</span>
              <span>{session?.room_code || 'Undang'}</span>
            </button>

            <button 
              type="button" 
              className="btn btn-sm btn-secondary"
              onClick={() => setIsRulesOpen(true)}
              style={{ color: '#818CF8', borderColor: 'rgba(129, 140, 248, 0.4)', fontSize: '0.72rem', padding: '3px 7px' }}
              title="Aturan Permainan Bridge"
            >
              <span>📖</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', borderTop: '1px solid var(--border-glass)', paddingTop: '8px' }}>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#818CF8', margin: 0 }}>
            Board / Deal #{currentBoardNum}
          </h2>
        </div>
      </div>

      {/* Online / Offline Presence Roster Bar */}
      <div className="glass-panel" style={{ padding: '8px 12px', marginBottom: '14px', display: 'flex', gap: '8px', overflowX: 'auto', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          Meja:
        </span>
        {players.map((name, idx) => {
          const isOccupied = Boolean(livePlayerUserIds && livePlayerUserIds[idx])
          const isMySeat = myPlayerIndex === idx
          const isSeatScorer = effectiveScorerIndex === idx

          return (
            <div
              key={idx}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                background: isMySeat 
                  ? 'rgba(168, 85, 247, 0.2)' 
                  : isOccupied 
                  ? 'rgba(52, 211, 153, 0.15)' 
                  : 'rgba(255, 255, 255, 0.05)',
                border: isMySeat 
                  ? '1px solid rgba(168, 85, 247, 0.5)' 
                  : isOccupied 
                  ? '1px solid rgba(52, 211, 153, 0.4)' 
                  : '1px dashed var(--border-glass)',
                color: isOccupied ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              <span>{isOccupied ? '🟢' : '⚪'}</span>
              <span>{name}</span>
              {isSeatScorer && <span title="Pencatat Skor">📝</span>}
              {isMySeat && <span style={{ fontSize: '0.65rem', color: '#C084FC' }}>(Anda)</span>}
              {!isOccupied && isSpectator && onClaimSeat && (
                <button
                  type="button"
                  onClick={() => {
                    onClaimSeat(idx)
                    setLivePlayerUserIds(prev => {
                      const next = [...(prev || [])]
                      next[idx] = currentClientId
                      return next
                    })
                  }}
                  style={{
                    background: 'var(--primary)',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    padding: '1px 5px',
                    marginLeft: '2px',
                    cursor: 'pointer',
                    fontWeight: 800
                  }}
                >
                  Duduki
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Main Scoreboard Standings: NS vs EW */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'center' }}>
          <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38BDF8' }}>
              🔵 NORTH - SOUTH ({players[0]}, {players[2]})
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFF', margin: '4px 0' }}>
              {totalScores.ns} Pts
            </div>
          </div>
          <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(244, 114, 182, 0.1)', border: '1px solid rgba(244, 114, 182, 0.3)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F472B6' }}>
              🔴 EAST - WEST ({players[1]}, {players[3]})
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFF', margin: '4px 0' }}>
              {totalScores.ew} Pts
            </div>
          </div>
        </div>
      </div>

      {/* Contract Builder Panel (Gated to Scorer) */}
      {!isScorer ? (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
          ⏳ Board #{currentBoardNum} sedang dimainkan. Papan skor Bridge akan ter-update otomatis saat Pencatat Skor (📝 {players[effectiveScorerIndex] || 'Scorer'}) menyimpan board.
        </div>
      ) : (
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div className="section-label" style={{ marginTop: 0 }}>📜 Konfigurasi Kontrak Deal #{currentBoardNum}</div>

        {/* 1. Contract Level & Suit */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px', marginBottom: '14px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Level (1–7)</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4, 5, 6, 7].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  className={`btn btn-sm ${contractLevel === lvl ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setContractLevel(lvl)}
                  style={{ flex: 1, padding: '6px 2px', fontWeight: 800 }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Kembang / Suit</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { id: 'clubs', label: '♣ Clubs' },
                { id: 'diamonds', label: '♦ Dia' },
                { id: 'hearts', label: '♥ Hrt' },
                { id: 'spades', label: '♠ Spd' },
                { id: 'notrump', label: 'NT' }
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`btn btn-sm ${contractSuit === s.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setContractSuit(s.id)}
                  style={{ flex: 1, padding: '6px 2px', fontWeight: 800, fontSize: '0.75rem' }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Doubled Status & Vulnerability */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Pengganda Kontrak</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { id: 'undoubled', label: 'Normal' },
                { id: 'doubled', label: '✖ Doubled (X)' },
                { id: 'redoubled', label: '✖✖ Redoubled (XX)' }
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  className={`btn btn-sm ${contractDoubled === d.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setContractDoubled(d.id)}
                  style={{ flex: 1, padding: '6px 2px', fontSize: '0.72rem', fontWeight: 700 }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Kerentanan (Vulnerability)</label>
            <select className="form-input" value={vulnerability} onChange={e => setVulnerability(e.target.value)} style={{ fontSize: '0.8rem' }}>
              <option value="none">Tidak Rentan (None Vul)</option>
              <option value="ns">NS Rentan (NS Vul)</option>
              <option value="ew">EW Rentan (EW Vul)</option>
              <option value="both">Keduanya Rentan (Both Vul)</option>
            </select>
          </div>
        </div>

        {/* 3. Declarer & Tricks Won */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Deklarator (Pemain Utama)</label>
            <select className="form-input" value={declarerIdx} onChange={e => setDeclarerIdx(Number(e.target.value))} style={{ fontSize: '0.8rem' }}>
              {players.map((name, idx) => (
                <option key={idx} value={idx}>
                  {name} ({idx % 2 === 0 ? '🔵 Pasangan NS' : '🔴 Pasangan EW'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>
              Trik Dimenangkan (Target: {6 + contractLevel})
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button 
                type="button" 
                className="btn btn-sm btn-secondary" 
                onClick={() => setTricksWon(prev => Math.max(0, prev - 1))}
                style={{ width: '32px', height: '32px', padding: 0 }}
              >
                -
              </button>
              <span style={{ minWidth: '40px', textAlign: 'center', fontWeight: 900, fontSize: '1.2rem', color: liveCalculation.isMade ? '#34D399' : '#F87171' }}>
                {tricksWon}
              </span>
              <button 
                type="button" 
                className="btn btn-sm btn-secondary" 
                onClick={() => setTricksWon(prev => Math.min(13, prev + 1))}
                style={{ width: '32px', height: '32px', padding: 0 }}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Live Calculation Result Breakdown */}
      <div className="glass-panel" style={{
        padding: '18px',
        marginBottom: '20px',
        border: liveCalculation.isMade ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
        background: liveCalculation.isMade ? 'rgba(52, 211, 153, 0.06)' : 'rgba(239, 68, 68, 0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: liveCalculation.isMade ? '#34D399' : '#F87171' }}>
            {liveCalculation.isMade 
              ? `✓ KONTRAK BERHASIL (${contractLevel}${BRIDGE_SUITS[contractSuit.toUpperCase()]?.symbol || ''} +${liveCalculation.diff})` 
              : `✕ KONTRAK GAGAL (DOWN ${Math.abs(liveCalculation.diff)})`}
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: liveCalculation.isMade ? '#34D399' : '#F87171' }}>
            {liveCalculation.isMade ? `+${liveCalculation.scoreDelta}` : `${liveCalculation.scoreDelta}`} Pts
          </div>
        </div>

        {/* Breakdown Tags */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
          {liveCalculation.breakdown.trickPoints > 0 && (
            <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)' }}>
              Trick Pts: +{liveCalculation.breakdown.trickPoints}
            </span>
          )}
          {liveCalculation.breakdown.overtrickPoints > 0 && (
            <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(52,211,153,0.15)', color: '#34D399', fontWeight: 700 }}>
              Overtricks: +{liveCalculation.breakdown.overtrickPoints}
            </span>
          )}
          {liveCalculation.breakdown.gameBonus > 0 && (
            <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(129,140,248,0.2)', color: '#818CF8', fontWeight: 800 }}>
              Game Bonus: +{liveCalculation.breakdown.gameBonus}
            </span>
          )}
          {liveCalculation.breakdown.partScoreBonus > 0 && (
            <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)' }}>
              Part-Score Bonus: +{liveCalculation.breakdown.partScoreBonus}
            </span>
          )}
          {liveCalculation.breakdown.slamBonus > 0 && (
            <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(245,158,11,0.2)', color: '#FCD34D', fontWeight: 900 }}>
              🏆 Slam Bonus: +{liveCalculation.breakdown.slamBonus}
            </span>
          )}
          {liveCalculation.breakdown.undertrickPenalty > 0 && (
            <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.2)', color: '#F87171', fontWeight: 800 }}>
              Penalti Down: -{liveCalculation.breakdown.undertrickPenalty}
            </span>
          )}
        </div>
      </div>

      {/* Save Button (Gated to Scorer) */}
      {isScorer && (
        <button 
          type="button" 
          className="btn btn-primary"
          onClick={handleSave}
          style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800, marginBottom: '24px' }}
        >
          💾 Simpan Board #{currentBoardNum} ke Ledger
        </button>
      )}

      {/* Round History Ledger */}
      {rounds.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div className="section-label" style={{ margin: 0 }}>📜 Riwayat Board Bridge</div>
            {isHost && onUndoRound && (
              <button className="btn btn-sm btn-secondary" onClick={onUndoRound} style={{ fontSize: '0.75rem' }}>
                ↩️ Undo Board Terakhir
              </button>
            )}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Board</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Kontrak</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Deklarator</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Trik</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>NS Pts</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>EW Pts</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((r, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 800 }}>#{r.round_number || rIdx + 1}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>
                      {r.contract?.level}{BRIDGE_SUITS[r.contract?.suit?.toUpperCase()]?.symbol || ''}
                      {r.contract?.doubled === 'doubled' ? ' X' : r.contract?.doubled === 'redoubled' ? ' XX' : ''}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{r.contract?.declarer_name}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: r.is_made ? '#34D399' : '#F87171' }}>
                      {r.tricks_won} ({r.diff >= 0 ? `+${r.diff}` : r.diff})
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: r.ns_score > 0 ? '#38BDF8' : 'inherit' }}>
                      {r.ns_score > 0 ? `+${r.ns_score}` : '-'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: r.ew_score > 0 ? '#F472B6' : 'inherit' }}>
                      {r.ew_score > 0 ? `+${r.ew_score}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {onShareStory && (
          <button className="btn btn-secondary" onClick={onShareStory}>
            📸 Bagikan Cerita 9:16
          </button>
        )}
        {isHost && onFinishGame && (
          <button className="btn btn-danger" onClick={onFinishGame}>
            🏁 Selesaikan Pertandingan
          </button>
        )}
      </div>

      {/* Transfer Scorer Modal */}
      {showTransferScorerModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="glass-panel" style={{ maxWidth: '360px', width: '100%', padding: '20px' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', fontWeight: 800 }}>
              📝 Pilih Pencatat Skor (Scorer)
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Pencatat skor bertugas memasukkan hasil board dan menyimpannya ke papan skor.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {players.map((name, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`btn ${effectiveScorerIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => {
                    setScorerIndex(idx)
                    setShowTransferScorerModal(false)
                  }}
                  style={{ justifyContent: 'space-between', padding: '10px 14px', fontSize: '0.9rem' }}
                >
                  <span>{name} {livePlayerUserIds?.[idx] ? '🟢' : '⚪'}</span>
                  {effectiveScorerIndex === idx && <span>✓ Aktif</span>}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-block"
              onClick={() => setShowTransferScorerModal(false)}
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Room Invite Modal */}
      <RoomInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        session={session}
        user={user}
        onClaimSeat={onClaimSeat}
        onReleaseSeat={onReleaseSeat}
        myPlayerIndex={myPlayerIndex}
      />

      <CardGameRulesModal 
        isOpen={isRulesOpen} 
        onClose={() => setIsRulesOpen(false)} 
        initialGame="bridge" 
      />
    </div>
  )
}
