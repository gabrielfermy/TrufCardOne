import React, { useState } from 'react'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'

export default function DiceRoller() {
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
          style={{ width: '120px' }}
        >
          <option value={6}>D6 (Standar)</option>
          <option value={20}>D20 (RPG)</option>
          <option value={100}>D100 (%)</option>
        </select>

        <select
          className="form-select"
          value={diceCount}
          onChange={e => {
            const count = Number(e.target.value)
            setDiceCount(count)
            setResults(Array.from({ length: count }, () => Math.floor(Math.random() * diceType) + 1))
          }}
          style={{ width: '120px' }}
        >
          <option value={1}>1 Dadu</option>
          <option value={2}>2 Dadu</option>
          <option value={3}>3 Dadu</option>
          <option value={4}>4 Dadu</option>
          <option value={6}>6 Dadu</option>
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
          <div
            key={idx}
            style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #1E1B4B, #0F172A)',
              border: '2px solid #8B5CF6',
              borderRadius: diceType === 20 ? '50%' : '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.2rem',
              fontWeight: 900,
              color: '#FFF',
              boxShadow: '0 8px 25px -4px rgba(139, 92, 246, 0.4)',
              transform: isRolling ? `rotate(${rotations[idx] || 0}deg) scale(1.08)` : 'none',
              transition: 'transform 0.08s ease'
            }}
          >
            {val}
          </div>
        ))}
      </div>

      {/* Total Score */}
      <div style={{ marginBottom: '24px' }}>
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total: </span>
        <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#34D399' }}>{total}</span>
      </div>

      {/* Roll Button */}
      <button
        className="btn btn-primary"
        style={{ padding: '16px 36px', fontSize: '1.15rem', borderRadius: '999px' }}
        onClick={rollDice}
        disabled={isRolling}
      >
        🎲 {isRolling ? 'Mengocok...' : 'Lempar Dadu!'}
      </button>
    </div>
  )
}
