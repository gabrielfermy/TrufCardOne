import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'

export default function CoinFlipper() {
  const { t } = useTranslation()
  const [result, setResult] = useState('HEADS')
  const [isFlipping, setIsFlipping] = useState(false)

  const flipCoin = () => {
    if (isFlipping) return
    setIsFlipping(true)
    hapticsService.medium()
    soundService.playTick()

    let flips = 0
    const interval = setInterval(() => {
      setResult(Math.random() > 0.5 ? 'HEADS' : 'TAILS')
      flips++
      if (flips > 10) {
        clearInterval(interval)
        setIsFlipping(false)
        hapticsService.success()
        soundService.playVictory()
      }
    }, 80)
  }

  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      {/* 3D Coin Graphic */}
      <div style={{
        width: '140px',
        height: '140px',
        margin: '0 auto 28px auto',
        borderRadius: '50%',
        background: result === 'HEADS' 
          ? 'radial-gradient(circle, #FBBF24, #B45309)' 
          : 'radial-gradient(circle, #94A3B8, #475569)',
        border: '6px solid rgba(255, 255, 255, 0.4)',
        boxShadow: '0 15px 35px -5px rgba(245, 158, 11, 0.4)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transform: isFlipping ? 'rotateX(720deg) scale(1.1)' : 'none',
        transition: 'transform 0.1s ease',
        userSelect: 'none'
      }}>
        <span style={{ fontSize: '2.5rem' }}>{result === 'HEADS' ? '👑' : '🦅'}</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 900, color: '#FFF', letterSpacing: '1px' }}>
          {result === 'HEADS' ? t('utilities.heads') : t('utilities.tails')}
        </span>
      </div>

      <h3 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '24px', color: result === 'HEADS' ? '#FBBF24' : '#E2E8F0' }}>
        {result === 'HEADS' ? t('utilities.heads_full') : t('utilities.tails_full')}
      </h3>

      <button
        className="btn btn-primary"
        style={{ padding: '16px 36px', fontSize: '1.15rem', borderRadius: '999px' }}
        onClick={flipCoin}
        disabled={isFlipping}
      >
        🪙 {isFlipping ? t('utilities.flipping') : t('utilities.flip_button')}
      </button>
    </div>
  )
}
