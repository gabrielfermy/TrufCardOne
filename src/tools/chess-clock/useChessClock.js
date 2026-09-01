import { useState, useEffect, useRef, useCallback } from 'react'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { wakeLockService } from '../../services/wakeLockService'

export function useChessClock(initialMinutes = 3, initialIncrement = 2) {
  const [timeControl, setTimeControl] = useState({
    minutes: initialMinutes,
    increment: initialIncrement,
    name: 'Blitz (3+2)'
  })

  const [p1TimeMs, setP1TimeMs] = useState(initialMinutes * 60 * 1000)
  const [p2TimeMs, setP2TimeMs] = useState(initialMinutes * 60 * 1000)
  const [activePlayer, setActivePlayer] = useState(null) // null | 1 | 2
  const [isRunning, setIsRunning] = useState(false)
  const [movesCount, setMovesCount] = useState(0)
  const [winner, setWinner] = useState(null) // null | 'p1' | 'p2' (timeout)

  const lastTickRef = useRef(null)
  const requestRef = useRef(null)

  // Start / Switch Turn
  const switchTurn = useCallback(() => {
    if (winner) return

    hapticsService.medium()
    soundService.playTick()

    if (!isRunning) {
      setIsRunning(true)
      wakeLockService.enable()
      setActivePlayer(1) // Player 1 starts
      lastTickRef.current = performance.now()
      return
    }

    // Add increment to the player who just finished their move
    if (activePlayer === 1) {
      setP1TimeMs(prev => prev + timeControl.increment * 1000)
      setActivePlayer(2)
      setMovesCount(m => m + 1)
    } else if (activePlayer === 2) {
      setP2TimeMs(prev => prev + timeControl.increment * 1000)
      setActivePlayer(1)
      setMovesCount(m => m + 1)
    }
    lastTickRef.current = performance.now()
  }, [activePlayer, isRunning, timeControl.increment, winner])

  // Pause Clock
  const pauseClock = useCallback(() => {
    setIsRunning(false)
    lastTickRef.current = null
    wakeLockService.disable()
  }, [])

  // Resume Clock
  const resumeClock = useCallback(() => {
    if (!activePlayer || winner) return
    setIsRunning(true)
    lastTickRef.current = performance.now()
    wakeLockService.enable()
  }, [activePlayer, winner])

  // Reset Clock
  const resetClock = useCallback((newControl = null) => {
    const tc = newControl || timeControl
    setIsRunning(false)
    setActivePlayer(null)
    setMovesCount(0)
    setWinner(null)
    lastTickRef.current = null
    setP1TimeMs(tc.minutes * 60 * 1000)
    setP2TimeMs(tc.minutes * 60 * 1000)
    wakeLockService.disable()
  }, [timeControl])

  // Change Time Control
  const changeTimeControl = useCallback((newControl) => {
    setTimeControl(newControl)
    resetClock(newControl)
  }, [resetClock])

  // High precision timer loop using requestAnimationFrame
  useEffect(() => {
    if (!isRunning || !activePlayer || winner) return

    const updateTimer = (now) => {
      if (!lastTickRef.current) {
        lastTickRef.current = now
      }
      const delta = now - lastTickRef.current
      lastTickRef.current = now

      if (activePlayer === 1) {
        setP1TimeMs(prev => {
          const next = prev - delta
          if (next <= 0) {
            setWinner('p2')
            setIsRunning(false)
            hapticsService.warning()
            soundService.playWarning()
            wakeLockService.disable()
            return 0
          }
          if (prev > 10000 && next <= 10000) {
            soundService.playWarning()
          }
          return next
        })
      } else if (activePlayer === 2) {
        setP2TimeMs(prev => {
          const next = prev - delta
          if (next <= 0) {
            setWinner('p1')
            setIsRunning(false)
            hapticsService.warning()
            soundService.playWarning()
            wakeLockService.disable()
            return 0
          }
          if (prev > 10000 && next <= 10000) {
            soundService.playWarning()
          }
          return next
        })
      }

      requestRef.current = requestAnimationFrame(updateTimer)
    }

    requestRef.current = requestAnimationFrame(updateTimer)

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current)
    }
  }, [isRunning, activePlayer, winner])

  return {
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
  }
}
