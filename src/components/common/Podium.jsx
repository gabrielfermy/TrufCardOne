import React from 'react'

export default function Podium({ players = [] }) {
  if (!players || players.length === 0) return null

  // Sort by score descending (or custom ranking)
  const ranked = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))
  const p1 = ranked[0]
  const p2 = ranked[1]
  const p3 = ranked[2]

  return (
    <div className="podium-container">
      {/* 2nd Place */}
      {p2 && (
        <div className="podium-slot">
          <div className="podium-name">{p2.name}</div>
          <div className="podium-score">{p2.score > 0 ? `+${p2.score}` : p2.score}</div>
          <div className="podium-pillar pillar-2">2</div>
        </div>
      )}

      {/* 1st Place (Champion) */}
      {p1 && (
        <div className="podium-slot">
          <div style={{ fontSize: '1.5rem', marginBottom: '2px' }}>👑</div>
          <div className="podium-name" style={{ color: '#F59E0B' }}>{p1.name}</div>
          <div className="podium-score" style={{ color: '#FBBF24', fontWeight: 800 }}>
            {p1.score > 0 ? `+${p1.score}` : p1.score}
          </div>
          <div className="podium-pillar pillar-1">1</div>
        </div>
      )}

      {/* 3rd Place */}
      {p3 && (
        <div className="podium-slot">
          <div className="podium-name">{p3.name}</div>
          <div className="podium-score">{p3.score > 0 ? `+${p3.score}` : p3.score}</div>
          <div className="podium-pillar pillar-3">3</div>
        </div>
      )}
    </div>
  )
}
