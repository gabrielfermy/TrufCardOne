import React from 'react'

export default function SessionRecapModal({ isOpen, onClose, session, onShareStory, onRematch }) {
  if (!isOpen || !session) return null

  const gameType = session.game_type || 'truf'
  const playerNames = session.player_names || ['Pemain 1', 'Pemain 2', 'Pemain 3', 'Pemain 4']
  const rounds = session.game_rounds || session.rounds || []

  // Compute final scores
  const finalScores = playerNames.map((_, idx) => {
    if (rounds.length === 0) return 0
    const lastRound = rounds[rounds.length - 1]
    const lastScores = lastRound.player_scores || lastRound.playerScores || []
    const ps = lastScores.find(p => (p.player_index ?? p.playerIndex) === idx)
    if (ps && (ps.score_cumulative !== undefined || ps.scoreCumulative !== undefined)) {
      return ps.score_cumulative ?? ps.scoreCumulative ?? 0
    }
    // Fallback: calculate sum of score_change across rounds
    return rounds.reduce((sum, r) => {
      const pScores = r.player_scores || r.playerScores || []
      const p = pScores.find(item => (item.player_index ?? item.playerIndex) === idx)
      return sum + (p?.score_change ?? p?.scoreChange ?? 0)
    }, 0)
  })

  // Determine winner (highest score for truf, lowest penalty for remi, lowest omben for omben)
  let bestScore = -Infinity
  let winnerIndex = 0

  if (gameType === 'remi' || gameType === 'omben') {
    let minScore = Infinity
    finalScores.forEach((score, idx) => {
      if (score < minScore) {
        minScore = score
        winnerIndex = idx
      }
    })
  } else {
    finalScores.forEach((score, idx) => {
      if (score > bestScore) {
        bestScore = score
        winnerIndex = idx
      }
    })
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', textAlign: 'left' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-glass)', paddingBottom: '14px', marginBottom: '16px' }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              {gameType.toUpperCase()} MATCH RECAP • {session.room_code || 'ROOM'}
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '2px 0 0', color: '#FFF' }}>
              {session.title || 'Rekap Hasil Pertandingan'}
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
              {new Date(session.created_at).toLocaleString()} • {rounds.length} Ronde Selesai
            </span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={onClose} style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}>
            ✕
          </button>
        </div>

        {/* Winner Highlight Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(139, 92, 246, 0.2))',
          border: '1.5px solid rgba(245, 158, 11, 0.5)',
          borderRadius: '14px',
          padding: '16px',
          textAlign: 'center',
          marginBottom: '20px'
        }}>
          <span style={{ fontSize: '2.2rem' }}>👑</span>
          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#FCD34D', textTransform: 'uppercase', letterSpacing: '1px' }}>
            JUARA PERTANDINGAN
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#FFF', margin: '4px 0' }}>
            {playerNames[winnerIndex]}
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#34D399' }}>
            Skor Akhir: {finalScores[winnerIndex] > 0 ? `+${finalScores[winnerIndex]}` : finalScores[winnerIndex]} Poin
          </div>
        </div>

        {/* Leaderboard Table */}
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px' }}>📊 Klasemen Akhir</h4>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.03)' }}>
                  <th style={{ padding: '10px 8px', textAlign: 'left' }}>Peringkat & Pemain</th>
                  <th style={{ padding: '10px 8px' }}>Skor Akhir</th>
                  {rounds.map((r, i) => (
                    <th key={i} style={{ padding: '10px 6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      R{r.round_number ?? r.roundNumber}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {playerNames.map((name, idx) => {
                  const score = finalScores[idx] || 0
                  const isWinner = idx === winnerIndex
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isWinner ? 'rgba(245, 158, 11, 0.05)' : 'transparent' }}>
                      <td style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 700 }}>
                        {isWinner ? '👑 ' : ''}{name}
                      </td>
                      <td style={{ padding: '10px 8px', fontWeight: 800, fontSize: '0.95rem', color: score >= 0 ? '#34D399' : '#F87171' }}>
                        {score > 0 ? `+${score}` : score}
                      </td>
                      {rounds.map((r, rIdx) => {
                        const pScores = r.player_scores || r.playerScores || []
                        const ps = pScores.find(p => (p.player_index ?? p.playerIndex) === idx)
                        const change = ps?.score_change ?? ps?.scoreChange ?? 0
                        const bid = ps?.stats?.bid ?? ps?.bid
                        const won = ps?.stats?.won ?? ps?.won
                        const isPass = bid !== undefined && bid === won

                        return (
                          <td key={rIdx} style={{ padding: '8px 4px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                              {isPass ? (
                                <span style={{ 
                                  width: '24px', 
                                  height: '24px', 
                                  borderRadius: '50%', 
                                  border: '1.5px solid #34D399', 
                                  color: '#34D399', 
                                  fontWeight: 800,
                                  fontSize: '0.78rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  background: 'rgba(52, 211, 153, 0.15)'
                                }}>
                                  {change > 0 ? `+${change}` : change}
                                </span>
                              ) : (
                                <span style={{ fontWeight: 800, fontSize: '0.8rem', color: change >= 0 ? '#38BDF8' : '#F87171' }}>
                                  {change > 0 ? `+${change}` : change}
                                </span>
                              )}
                              {bid !== undefined && (
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                  {bid}/{won}
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          {onShareStory && (
            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => onShareStory(session)}>
              📸 Bagikan Story 9:16
            </button>
          )}
          {onRematch && (
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => onRematch(session)}>
              🔄 Main Lagi (Rematch)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
