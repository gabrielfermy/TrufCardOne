import React, { useState } from 'react'
import { useChessClock } from './useChessClock'
import TimeControlModal from './TimeControlModal'
import { useTranslation } from '../../i18n/I18nContext'

function formatTime(ms) {
  if (ms <= 0) return '0:00'
  const totalSeconds = Math.ceil(ms / 1000)
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60

  if (ms < 10000) {
    // Under 10 seconds, show decimal tenths for urgency
    const tenths = Math.floor((ms % 1000) / 100)
    return `${secs}.${tenths}`
  }

  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export default function ChessClock({ onBack }) {
  const { t } = useTranslation()
  const {
    timeControl,
    p1TimeMs,
    p2TimeMs,
    activePlayer,
    isRunning,
    movesCount,
    winner,
    switchTurn,
    pauseClock,
    resumeClock,
    resetClock,
    changeTimeControl
  } = useChessClock(3, 2)

  const [showModal, setShowModal] = useState(false)

  const isP1Active = activePlayer === 1
  const isP2Active = activePlayer === 2
  const isP1Low = p1TimeMs < 15000 && p1TimeMs > 0
  const isP2Low = p2TimeMs < 15000 && p2TimeMs > 0

  return (
    <div style={{
      position: 'relative',
      height: 'calc(100vh - var(--header-height) - var(--bottom-nav-height) - 20px)',
      minHeight: '480px',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '24px',
      overflow: 'hidden',
      border: '1px solid var(--border-glass)'
    }}>
      {/* 1. TOP PLAYER (PLAYER 1 - ROTATED 180 DEG) */}
      <div
        onClick={() => {
          if (!isRunning || isP1Active) switchTurn()
        }}
        style={{
          flex: 1,
          background: winner === 'p2' 
            ? 'linear-gradient(135deg, #7F1D1D, #450A0A)' 
            : isP1Active 
              ? (isP1Low ? 'linear-gradient(135deg, #B45309, #78350F)' : 'linear-gradient(135deg, #4338CA, #1E1B4B)')
              : 'rgba(255, 255, 255, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'rotate(180deg)',
          cursor: (!isRunning || isP1Active) ? 'pointer' : 'default',
          transition: 'background 0.2s ease',
          padding: '20px',
          userSelect: 'none'
        }}
      >
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
          {winner === 'p2' ? '❌ WAKTU HABIS' : isP1Active ? '👉 GILIRAN KAMU' : 'PEMAIN 1'}
        </div>
        <div style={{
          fontSize: '4.5rem',
          fontWeight: 900,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-2px',
          color: isP1Active ? '#FFF' : 'var(--text-dim)'
        }}>
          {formatTime(p1TimeMs)}
        </div>
        {timeControl.increment > 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            +{timeControl.increment}s inc
          </div>
        )}
      </div>

      {/* 2. CENTER FLOATING CONTROLS BAR */}
      <div style={{
        height: '64px',
        background: '#0F111C',
        borderTop: '1px solid var(--border-glass)',
        borderBottom: '1px solid var(--border-glass)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 20
      }}>
        {/* Left: Time control name & Picker */}
        <button
          className="btn btn-sm btn-secondary"
          onClick={() => { pauseClock(); setShowModal(true) }}
          disabled={isRunning}
          style={{ fontSize: '0.85rem' }}
        >
          ⏱️ {timeControl.name}
        </button>

        {/* Center: Moves & Pause/Resume */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {movesCount} {t('chess.moves')}
          </span>

          {isRunning ? (
            <button className="btn btn-sm btn-secondary" onClick={pauseClock}>
              ⏸️ {t('chess.pause')}
            </button>
          ) : activePlayer && !winner ? (
            <button className="btn btn-sm btn-primary" onClick={resumeClock}>
              ▶️ {t('chess.resume')}
            </button>
          ) : null}

          <button className="btn btn-sm btn-secondary" onClick={() => resetClock()}>
            🔄
          </button>
        </div>

        {/* Right: Back to hub */}
        {onBack && (
          <button className="btn btn-sm btn-secondary" onClick={onBack}>
            ✕
          </button>
        )}
      </div>

      {/* 3. BOTTOM PLAYER (PLAYER 2 - NORMAL ORIENTATION) */}
      <div
        onClick={() => {
          if (!isRunning || isP2Active) switchTurn()
        }}
        style={{
          flex: 1,
          background: winner === 'p1' 
            ? 'linear-gradient(135deg, #7F1D1D, #450A0A)' 
            : isP2Active 
              ? (isP2Low ? 'linear-gradient(135deg, #B45309, #78350F)' : 'linear-gradient(135deg, #065F46, #022C22)')
              : 'rgba(255, 255, 255, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: (!isRunning || isP2Active) ? 'pointer' : 'default',
          transition: 'background 0.2s ease',
          padding: '20px',
          userSelect: 'none'
        }}
      >
        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px' }}>
          {winner === 'p1' ? '❌ WAKTU HABIS' : isP2Active ? '👉 GILIRAN KAMU' : 'PEMAIN 2'}
        </div>
        <div style={{
          fontSize: '4.5rem',
          fontWeight: 900,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-2px',
          color: isP2Active ? '#FFF' : 'var(--text-dim)'
        }}>
          {formatTime(p2TimeMs)}
        </div>
        {timeControl.increment > 0 && (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            +{timeControl.increment}s inc
          </div>
        )}
      </div>

      {/* Time Control Modal */}
      <TimeControlModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSelect={changeTimeControl}
        currentControl={timeControl}
      />
    </div>
  )
}
