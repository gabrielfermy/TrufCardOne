/**
 * Procedural Web Audio API sound synthesizer
 * Zero external audio assets required - fast, reliable, offline-ready!
 */
class SoundService {
  constructor() {
    this.ctx = null
  }

  _initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (AudioContext) {
        this.ctx = new AudioContext()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  // Subtle mechanical chess clock tick
  playTick() {
    try {
      this._initContext()
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(300, this.ctx.currentTime + 0.04)
      gain.gain.setValueAtTime(0.2, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.04)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.04)
    } catch (e) {
      console.debug('Sound tick error', e)
    }
  }

  // Urgent low-time warning beep (<10s on chess clock)
  playWarning() {
    try {
      this._initContext()
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'square'
      osc.frequency.setValueAtTime(880, this.ctx.currentTime)
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.1)
    } catch (e) {
      console.debug('Sound warning error', e)
    }
  }

  // Victory / Final Round Chime
  playVictory() {
    try {
      this._initContext()
      if (!this.ctx) return
      const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + i * 0.1)
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime + i * 0.1)
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + i * 0.1 + 0.35)
        osc.connect(gain)
        gain.connect(this.ctx.destination)
        osc.start(this.ctx.currentTime + i * 0.1)
        osc.stop(this.ctx.currentTime + i * 0.1 + 0.35)
      })
    } catch (e) {
      console.debug('Sound victory error', e)
    }
  }

  // Dice roll rattle sound
  playDice() {
    try {
      this._initContext()
      if (!this.ctx) return
      for (let i = 0; i < 5; i++) {
        const osc = this.ctx.createOscillator()
        const gain = this.ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(200 + Math.random() * 400, this.ctx.currentTime + i * 0.05)
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime + i * 0.05)
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + i * 0.05 + 0.04)
        osc.connect(gain)
        gain.connect(this.ctx.destination)
        osc.start(this.ctx.currentTime + i * 0.05)
        osc.stop(this.ctx.currentTime + i * 0.05 + 0.04)
      }
    } catch (e) {
      console.debug('Sound dice error', e)
    }
  }

  // Card Deal / Flip sound
  playCardFlip() {
    try {
      this._initContext()
      if (!this.ctx) return
      const osc = this.ctx.createOscillator()
      const gain = this.ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(600, this.ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.06)
      gain.gain.setValueAtTime(0.18, this.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.06)
      osc.connect(gain)
      gain.connect(this.ctx.destination)
      osc.start()
      osc.stop(this.ctx.currentTime + 0.06)
    } catch (e) {
      console.debug('Sound card error', e)
    }
  }
}

export const soundService = new SoundService()
