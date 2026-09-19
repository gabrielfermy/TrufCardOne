import React, { useState } from 'react'
import CardGameRulesModal from './CardGameRulesModal'

export default function GameLobby({ 
  gameType = 'truf', 
  sessions = [], 
  onStartNewGame, 
  onOpenSession, 
  onCompleteSession, 
  onDeleteSession, 
  onShareSession, 
  onRematch,
  onViewRecap,
  onBack 
}) {
  const [activeTab, setActiveTab] = useState('active') // 'active' | 'completed'
  const [isRulesOpen, setIsRulesOpen] = useState(false)

  // Filter sessions for this specific game type
  const gameSessions = sessions.filter(s => s.game_type === gameType)
  const activeList = gameSessions.filter(s => !s.is_completed)
  const completedList = gameSessions.filter(s => s.is_completed)

  const meta = {
    truf: { title: 'Truf Scorekeeper', icon: '🃏', color: '#8B5CF6', desc: 'Game kartu trik 4 pemain dengan fase bid, truf suit, & main atas/bawah.' },
    bridge: { title: 'Contract Bridge Scorekeeper', icon: '🃏', color: '#818CF8', desc: 'Duplicate / Chicago bridge scoring, contract builder, slam bonuses, & vulnerability.' },
    spades: { title: 'Spades Scorekeeper', icon: '♠️', color: '#A855F7', desc: 'Partnership 2v2 / Solo, Nil bonuses, overtrick bags, & 10-bag penalty system.' },
    remi: { title: 'Remi 7-Card Scorekeeper', icon: '🎴', color: '#F59E0B', desc: 'Kalkulator denda kartu remi, minus kartu tertinggal, & kartu penutup.' },
    remijawa: { title: 'Remi Jawa Scorekeeper', icon: '🎴', color: '#EAB308', desc: 'Remi Jawa tradisi lokal, kombinasi seri/tris, bonus tutup & denda kartu.' },
    capsa: { title: 'Capsa Scorekeeper', icon: '🎴', color: '#06B6D4', desc: 'Capsa Susun (Chinese Poker) & Capsa Banting (Big Two) dengan kalkulator skor otomatis.' },
    domino: { title: 'Domino Scorekeeper', icon: '🀄', color: '#38BDF8', desc: 'Domino Gaple tradisional (Individu & Pasangan) serta Domino QiuQiu 9-9.' },
    omben: { title: 'Omben (Cangkulan)', icon: '🍺', color: '#F97316', desc: 'Pencatat hukuman omben/cangkulan & ranking pemain per ronde.' }
  }[gameType] || { title: 'Game Lobby', icon: '🎮', color: '#8B5CF6', desc: '' }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'left' }}>
      {/* Header Banner */}
      <div className="glass-panel" style={{ padding: '20px 24px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>←</span> Beranda
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsRulesOpen(true)}
              style={{
                color: meta.color,
                borderColor: `${meta.color}50`,
                fontSize: '0.78rem',
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>📖</span> Aturan & Cara Hitung
            </button>
            <span style={{ 
              fontSize: '0.8rem', 
              fontWeight: 800, 
              color: meta.color, 
              background: 'rgba(255,255,255,0.05)', 
              padding: '4px 10px', 
              borderRadius: '8px', 
              border: `1px solid ${meta.color}40` 
            }}>
              Lobby Permainan
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
          <span style={{ fontSize: '2.4rem' }}>{meta.icon}</span>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, color: '#FFF' }}>
              {meta.title}
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              {meta.desc}
            </p>
          </div>
        </div>

        {/* Big Start New Game Button */}
        <button 
          className="btn btn-primary btn-block" 
          onClick={onStartNewGame}
          style={{ 
            padding: '14px', 
            fontSize: '1rem', 
            fontWeight: 800, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            boxShadow: `0 0 20px ${meta.color}50`
          }}
        >
          <span>➕</span>
          <span>Mulai Game Baru ({gameType.toUpperCase()})</span>
        </button>
      </div>

      {/* Tabs: Active vs Completed */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          className={`btn ${activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '10px 14px', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={() => setActiveTab('active')}
        >
          <span>🟢 Game Aktif</span>
          <span style={{ 
            background: activeTab === 'active' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', 
            padding: '2px 8px', 
            borderRadius: '12px', 
            fontSize: '0.78rem' 
          }}>
            {activeList.length}
          </span>
        </button>

        <button
          className={`btn ${activeTab === 'completed' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ flex: 1, padding: '10px 14px', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
          onClick={() => setActiveTab('completed')}
        >
          <span>🏁 Riwayat Selesai</span>
          <span style={{ 
            background: activeTab === 'completed' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)', 
            padding: '2px 8px', 
            borderRadius: '12px', 
            fontSize: '0.78rem' 
          }}>
            {completedList.length}
          </span>
        </button>
      </div>

      {/* Tab Content: Active Games */}
      {activeTab === 'active' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {activeList.length > 0 ? (
            activeList.map(session => {
              const roundsCount = session.game_rounds?.length || session.rounds?.length || 0
              return (
                <div 
                  key={session.id} 
                  className="glass-panel" 
                  style={{ 
                    padding: '16px 20px', 
                    border: '1.5px solid rgba(52, 211, 153, 0.3)',
                    background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.05), rgba(0,0,0,0.3))'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 800, 
                          color: '#34D399', 
                          background: 'rgba(52, 211, 153, 0.15)', 
                          padding: '2px 8px', 
                          borderRadius: '6px' 
                        }}>
                          🟢 Sedang Berjalan
                        </span>
                        {session.room_code && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#A855F7' }}>
                            🔗 {session.room_code}
                          </span>
                        )}
                      </div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#FFF' }}>
                        {session.title || `${gameType.toUpperCase()} Match`}
                      </h4>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {session.player_names?.join(', ')}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#FCD34D' }}>
                        Ronde {roundsCount + 1}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {roundsCount} ronde tercatat
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', marginTop: '8px' }}>
                    <button 
                      className="btn btn-primary btn-sm" 
                      style={{ flex: 2, fontWeight: 800 }}
                      onClick={() => onOpenSession(session)}
                    >
                      ▶️ Lanjutkan Main
                    </button>
                    {onCompleteSession && (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        style={{ flex: 1 }}
                        onClick={() => {
                          if (confirm('Selesaikan game ini dan simpan ke riwayat selesai?')) {
                            onCompleteSession(session.id)
                          }
                        }}
                      >
                        🏁 Selesai
                      </button>
                    )}
                    {onDeleteSession && (
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => {
                          if (confirm('Hapus game ini dari daftar?')) {
                            onDeleteSession(session.id)
                          }
                        }}
                        title="Hapus Game"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="glass-panel" style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '8px' }}>📭</span>
              <p style={{ margin: 0, fontWeight: 600 }}>Tidak ada game {gameType.toUpperCase()} yang sedang aktif.</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                Klik tombol <strong>"Mulai Game Baru"</strong> di atas untuk membuat meja baru!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Completed Games History */}
      {activeTab === 'completed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {completedList.length > 0 ? (
            completedList.map(session => {
              const rounds = session.game_rounds || session.rounds || []
              const playerNames = session.player_names || []
              
              // Find Winner
              let winnerName = '-'
              if (rounds.length > 0 && playerNames.length > 0) {
                const lastRound = rounds[rounds.length - 1]
                let highest = -Infinity
                let winnerIdx = 0
                playerNames.forEach((_, idx) => {
                  const ps = lastRound.player_scores?.find(p => p.player_index === idx)
                  const score = ps?.score_cumulative ?? 0
                  if (score > highest) {
                    highest = score
                    winnerIdx = idx
                  }
                })
                winnerName = playerNames[winnerIdx]
              }

              return (
                <div key={session.id} className="glass-panel" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 800, 
                          color: '#F59E0B', 
                          background: 'rgba(245, 158, 11, 0.15)', 
                          padding: '2px 8px', 
                          borderRadius: '6px' 
                        }}>
                          🏁 Selesai
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          {new Date(session.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#FFF' }}>
                        {session.title || `${gameType.toUpperCase()} Match`}
                      </h4>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {playerNames.join(', ')}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FCD34D' }}>
                        👑 Juara: {winnerName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                        {rounds.length} ronde dimainkan
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px', marginTop: '8px' }}>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ flex: 1, fontWeight: 700 }}
                      onClick={() => onViewRecap(session)}
                    >
                      📊 Lihat Hasil & Rekap
                    </button>
                    {onShareSession && (
                      <button 
                        className="btn btn-secondary btn-sm" 
                        onClick={() => onShareSession(session)}
                        title="Bagikan Story 9:16"
                      >
                        📸 9:16
                      </button>
                    )}
                    {onRematch && (
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => onRematch(session)}
                      >
                        🔄 Rematch
                      </button>
                    )}
                    {onDeleteSession && (
                      <button 
                        className="btn btn-danger btn-sm" 
                        onClick={() => {
                          if (confirm('Hapus riwayat pertandingan ini?')) {
                            onDeleteSession(session.id)
                          }
                        }}
                        title="Hapus"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="glass-panel" style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '8px' }}>🏁</span>
              <p style={{ margin: 0, fontWeight: 600 }}>Belum ada riwayat game {gameType.toUpperCase()} yang diselesaikan.</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                Game yang diselesaikan (klik "🏁 Selesai") akan tercatat rapi di sini!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Card Game Rules Modal */}
      <CardGameRulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        initialGame={gameType}
      />
    </div>
  )
}
