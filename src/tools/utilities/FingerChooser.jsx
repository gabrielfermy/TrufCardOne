import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'

const COLORS = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#06B6D4']

export default function FingerChooser() {
  const { t } = useTranslation()
  const [touches, setTouches] = useState([])
  const [chosenTouchId, setChosenTouchId] = useState(null)
  const [isCounting, setIsCounting] = useState(false)
  const timerRef = useRef(null)

  const handleTouchStart = (e) => {
    e.preventDefault()
    if (chosenTouchId !== null) return

    const newTouches = Array.from(e.touches).map((t, idx) => ({
      id: t.identifier,
      x: t.clientX,
      y: t.clientY,
      color: COLORS[idx % COLORS.length]
    }))

    setTouches(newTouches)
    hapticsService.light()

    if (newTouches.length >= 2) {
      setIsCounting(true)
      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const winner = newTouches[Math.floor(Math.random() * newTouches.length)]
        setChosenTouchId(winner.id)
        setIsCounting(false)
        hapticsService.success()
        soundService.playVictory()
      }, 2500)
    } else {
      clearTimeout(timerRef.current)
      setIsCounting(false)
    }
  }

  const handleTouchMove = (e) => {
    e.preventDefault()
    if (chosenTouchId !== null) return

    const updated = Array.from(e.touches).map(t => {
      const match = touches.find(item => item.id === t.identifier)
      return {
        id: t.identifier,
        x: t.clientX,
        y: t.clientY,
        color: match?.color || COLORS[0]
      }
    })
    setTouches(updated)
  }

  const handleTouchEnd = (e) => {
    e.preventDefault()
    if (e.touches.length === 0) {
      clearTimeout(timerRef.current)
      setTouches([])
      setChosenTouchId(null)
      setIsCounting(false)
      return
    }

    if (chosenTouchId === null) {
      clearTimeout(timerRef.current)
      setIsCounting(false)
      const remaining = Array.from(e.touches).map((t, idx) => ({
        id: t.identifier,
        x: t.clientX,
        y: t.clientY,
        color: COLORS[idx % COLORS.length]
      }))
      setTouches(remaining)
    }
  }

  useEffect(() => {
    return () => clearTimeout(timerRef.current)
  }, [])

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        height: '420px',
        background: 'rgba(0,0,0,0.4)',
        borderRadius: '24px',
        border: '1px dashed var(--border-glass-light)',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '20px',
        touchAction: 'none',
        userSelect: 'none'
      }}
    >
      {/* Background instruction */}
      {touches.length === 0 ? (
        <div>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>👆</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>
            {t('utilities.finger_title')}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {t('utilities.finger_desc')}
          </p>
        </div>
      ) : isCounting ? (
        <div style={{ color: '#FBBF24', fontWeight: 800, fontSize: '1.2rem' }}>
          {t('utilities.finger_counting')}
        </div>
      ) : chosenTouchId !== null ? (
        <div style={{ color: '#34D399', fontWeight: 900, fontSize: '1.5rem', textShadow: '0 0 20px rgba(52, 211, 153, 0.6)' }}>
          {t('utilities.finger_winner')}
        </div>
      ) : null}

      {/* Render touch circles */}
      {touches.map(t => {
        const isChosen = chosenTouchId === t.id
        const isExcluded = chosenTouchId !== null && !isChosen

        return (
          <div
            key={t.id}
            style={{
              position: 'fixed',
              left: t.x - 45,
              top: t.y - 45,
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              background: `radial-gradient(circle, ${t.color} 30%, rgba(0,0,0,0.5) 100%)`,
              border: `3px solid ${isChosen ? '#FFF' : t.color}`,
              boxShadow: isChosen 
                ? `0 0 40px 15px ${t.color}, 0 0 60px 30px #FFF`
                : `0 0 25px 5px ${t.color}`,
              transform: isChosen ? 'scale(1.4)' : isCounting ? 'scale(1.15)' : 'scale(1)',
              opacity: isExcluded ? 0.2 : 1,
              transition: 'transform 0.15s ease, opacity 0.2s ease',
              pointerEvents: 'none',
              zIndex: 100
            }}
          />
        )
      })}
    </div>
  )
}
