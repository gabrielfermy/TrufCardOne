import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'

export const PRESETS = [
  // Bullet
  { name: '1 min', minutes: 1, increment: 0, category: 'bullet' },
  { name: '1 | 1', minutes: 1, increment: 1, category: 'bullet' },
  { name: '2 | 1', minutes: 2, increment: 1, category: 'bullet' },
  // Blitz
  { name: '3 min', minutes: 3, increment: 0, category: 'blitz' },
  { name: '3 | 2 (FIDE)', minutes: 3, increment: 2, category: 'blitz' },
  { name: '5 min', minutes: 5, increment: 0, category: 'blitz' },
  { name: '5 | 3', minutes: 5, increment: 3, category: 'blitz' },
  // Rapid
  { name: '10 min', minutes: 10, increment: 0, category: 'rapid' },
  { name: '15 | 10 (FIDE)', minutes: 15, increment: 10, category: 'rapid' },
  { name: '30 min', minutes: 30, increment: 0, category: 'rapid' }
]

export default function TimeControlModal({ isOpen, onClose, onSelect, currentControl }) {
  const { t } = useTranslation()
  const [customMin, setCustomMin] = useState(5)
  const [customInc, setCustomInc] = useState(0)

  if (!isOpen) return null

  const handleCustomApply = () => {
    onSelect({
      name: `${customMin} | ${customInc}`,
      minutes: Number(customMin),
      increment: Number(customInc),
      category: 'custom'
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3 className="modal-title">⏱️ Kontrol Waktu Catur</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Bullet */}
        <div className="section-label" style={{ color: '#F472B6' }}>⚡ {t('chess.bullet')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '14px' }}>
          {PRESETS.filter(p => p.category === 'bullet').map((p, i) => (
            <button
              key={i}
              className={`btn btn-sm ${currentControl.name === p.name ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { onSelect(p); onClose() }}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Blitz */}
        <div className="section-label" style={{ color: '#FBBF24' }}>🔥 {t('chess.blitz')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '14px' }}>
          {PRESETS.filter(p => p.category === 'blitz').map((p, i) => (
            <button
              key={i}
              className={`btn btn-sm ${currentControl.name === p.name ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { onSelect(p); onClose() }}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Rapid */}
        <div className="section-label" style={{ color: '#60A5FA' }}>⏳ {t('chess.rapid')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {PRESETS.filter(p => p.category === 'rapid').map((p, i) => (
            <button
              key={i}
              className={`btn btn-sm ${currentControl.name === p.name ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { onSelect(p); onClose() }}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div style={{ background: 'rgba(0,0,0,0.25)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '10px' }}>🛠️ Kontrol Kustom</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label className="form-label">Menit</label>
              <input
                type="number"
                min="1"
                max="180"
                className="form-input"
                value={customMin}
                onChange={e => setCustomMin(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">+ Detik (Inc)</label>
              <input
                type="number"
                min="0"
                max="60"
                className="form-input"
                value={customInc}
                onChange={e => setCustomInc(e.target.value)}
              />
            </div>
          </div>
          <button className="btn btn-primary btn-block btn-sm" onClick={handleCustomApply}>
            Terapkan Waktu Kustom
          </button>
        </div>
      </div>
    </div>
  )
}
