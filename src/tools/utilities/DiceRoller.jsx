import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'

/**
 * Authentic Tabletop Die Face
 * Displays standard dice pips (mata dadu) for D6, or numerical value for polyhedral dice
 */
function DiceFace({ val, type, isRolling, rotation }) {
  if (type === 6) {
    // 3x3 grid positions:
    // 0 1 2
    // 3 4 5
    // 6 7 8
    const pipsConfig = {
      1: [4],
      2: [0, 8],
      3: [0, 4, 8],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 3, 6, 2, 5, 8]
    }
    const activePips = pipsConfig[val] || [4]
    const isOne = val === 1

    return (
      <div
        style={{
          width: '84px',
          height: '84px',
          background: 'linear-gradient(145deg, #241A5E, #110E33)',
          border: '2.5px solid #8B5CF6',
          borderRadius: '20px',
          padding: '12px',
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          alignItems: 'center',
          justifyItems: 'center',
          boxShadow: '0 10px 28px -4px rgba(139, 92, 246, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.25)',
          transform: isRolling ? `rotate(${rotation || 0}deg) scale(1.08)` : 'none',
          transition: 'transform 0.08s ease'
        }}
      >
        {Array.from({ length: 9 }).map((_, i) => {
          const isActive = activePips.includes(i)
          return (
            <div
              key={i}
              style={{
                width: isActive ? (isOne ? '18px' : '13px') : '0px',
                height: isActive ? (isOne ? '18px' : '13px') : '0px',
                borderRadius: '50%',
                background: isOne 
                  ? 'radial-gradient(circle, #EF4444 40%, #B91C1C 100%)' 
                  : 'radial-gradient(circle, #FFFFFF 50%, #E2E8F0 100%)',
                boxShadow: isActive 
                  ? (isOne 
                      ? '0 0 10px rgba(239, 68, 68, 0.7), inset 0 1px 2px rgba(0,0,0,0.3)' 
                      : '0 0 8px rgba(255, 255, 255, 0.8), inset 0 1px 2px rgba(0,0,0,0.25)') 
                  : 'none',
                transition: 'all 0.1s ease'
              }}
            />
          )
        })}
      </div>
    )
  }

  return (
    <div
      style={{
        width: '84px',
        height: '84px',
        background: 'linear-gradient(145deg, #241A5E, #110E33)',
        border: '2.5px solid #8B5CF6',
        borderRadius: type === 20 ? '50%' : '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '2rem',
        fontWeight: 900,
        color: '#FFF',
        boxShadow: '0 10px 28px -4px rgba(139, 92, 246, 0.45)',
        transform: isRolling ? `rotate(${rotation || 0}deg) scale(1.08)` : 'none',
        transition: 'transform 0.08s ease'
      }}
    >
      {val}
    </div>
  )
}

export default function DiceRoller() {
  const { t } = useTranslation()
  const [diceCount, setDiceCount] = useState(2)
  const [diceType, setDiceType] = useState(6) // D6 or D20
  const [results, setResults] = useState([4, 6])
  const [rotations, setRotations] = useState([0, 0])
  const [isRolling, setIsRolling] = useState(false)

  const rollDice = () => {
    if (isRolling) return
    setIsRolling(true)
    hapticsService.medium()
    soundService.playDice()

    let count = 0
    const interval = setInterval(() => {
      setResults(Array.from({ length: diceCount }, () => Math.floor(Math.random() * diceType) + 1))
      setRotations(Array.from({ length: diceCount }, () => Math.floor(Math.random() * 40 - 20)))
      count++
      if (count > 8) {
        clearInterval(interval)
        setIsRolling(false)
        hapticsService.success()
      }
    }, 60)
  }

  const total = results.reduce((a, b) => a + b, 0)

  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      {/* Dice Type & Count Selector */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '24px' }}>
        <select
          className="form-select"
          value={diceType}
          onChange={e => setDiceType(Number(e.target.value))}
          style={{ width: '130px' }}
        >
          <option value={6}>{t('utilities.d6_label')}</option>
          <option value={20}>{t('utilities.d20_label')}</option>
          <option value={100}>{t('utilities.d100_label')}</option>
        </select>

        <select
          className="form-select"
          value={diceCount}
          onChange={e => {
            const count = Number(e.target.value)
            setDiceCount(count)
            setResults(Array.from({ length: count }, () => Math.floor(Math.random() * diceType) + 1))
          }}
          style={{ width: '130px' }}
        >
          <option value={1}>{t('utilities.dice_count_1')}</option>
          <option value={2}>{t('utilities.dice_count_2')}</option>
          <option value={3}>{t('utilities.dice_count_3')}</option>
          <option value={4}>{t('utilities.dice_count_4')}</option>
          <option value={6}>{t('utilities.dice_count_6')}</option>
        </select>
      </div>

      {/* Dice Visual Box */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '16px',
        margin: '32px 0',
        minHeight: '110px',
        alignItems: 'center'
      }}>
        {results.map((val, idx) => (
          <DiceFace
            key={idx}
            val={val}
            type={diceType}
            isRolling={isRolling}
            rotation={rotations[idx]}
          />
        ))}
      </div>

      {/* Total Score */}
      <div style={{ marginBottom: '24px' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('utilities.total')}</span>
        <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#34D399' }}>{total}</span>
      </div>

      {/* Roll Button */}
      <button
        className="btn btn-primary"
        style={{ padding: '16px 36px', fontSize: '1.15rem', borderRadius: '999px' }}
        onClick={rollDice}
        disabled={isRolling}
      >
        🎲 {isRolling ? t('utilities.rolling') : t('utilities.roll_button')}
      </button>
    </div>
  )
}
