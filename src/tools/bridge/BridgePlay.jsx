import React, { useState, useMemo } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { calculateBridgeScore, BRIDGE_SUITS, BRIDGE_DOUBLES, BRIDGE_VULNERABILITY } from './bridgeLogic'
import CardGameRulesModal from '../../components/common/CardGameRulesModal'

export default function BridgePlay({
  session,
  onSaveRound,
  onUndoRound,
  onFinishGame,
  onShareStory,
  onBackToHub
}) {
  const { t } = useTranslation()
  const [isRulesOpen, setIsRulesOpen] = useState(false)

  const players = session?.player_names || ['North (U)', 'East (T)', 'South (S)', 'West (B)']
  const rounds = session?.game_rounds || session?.rounds || []
  const currentBoardNum = rounds.length + 1

  // Contract state for active board
  const [contractLevel, setContractLevel] = useState(4)
  const [contractSuit, setContractSuit] = useState('spades')
  const [contractDoubled, setContractDoubled] = useState('undoubled')
  const [declarerIdx, setDeclarerIdx] = useState(0) // 0: North, 1: East, 2: South, 3: West
  const [vulnerability, setVulnerability] = useState('none') // 'none' | 'ns' | 'ew' | 'both'
  const [tricksWon, setTricksWon] = useState(10)

  const declarerTeam = declarerIdx % 2 === 0 ? 'ns' : 'ew'
  const isDeclarerVulnerable = vulnerability === 'both' || vulnerability === declarerTeam

  // Live calculation
  const liveCalculation = useMemo(() => {
    return calculateBridgeScore({
      level: contractLevel,
      suit: contractSuit,
      doubled: contractDoubled,
      declarerTeam
    }, tricksWon, isDeclarerVulnerable)
  }, [contractLevel, contractSuit, contractDoubled, declarerTeam, tricksWon, isDeclarerVulnerable])

  // Total scores
  const totalScores = useMemo(() => {
    let ns = 0
    let ew = 0
    rounds.forEach(r => {
      if (r.ns_score !== undefined && r.ew_score !== undefined) {
        ns += r.ns_score
        ew += r.ew_score
      }
    })
    return { ns, ew }
  }, [rounds])

  const handleSave = () => {
    const netPoints = liveCalculation.scoreDelta
    const nsScore = declarerTeam === 'ns' ? (netPoints > 0 ? netPoints : 0) : (netPoints < 0 ? Math.abs(netPoints) : 0)
    const ewScore = declarerTeam === 'ew' ? (netPoints > 0 ? netPoints : 0) : (netPoints < 0 ? Math.abs(netPoints) : 0)

    const roundData = {
      round_number: currentBoardNum,
      contract: {
        level: contractLevel,
        suit: contractSuit,
        doubled: contractDoubled,
        declarer_name: players[declarerIdx],
        declarer_team: declarerTeam,
        vulnerability
      },
      tricks_won: tricksWon,
      is_made: liveCalculation.isMade,
      diff: liveCalculation.diff,
      score_delta: netPoints,
      ns_score: nsScore,
      ew_score: ewScore,
      breakdown: liveCalculation.breakdown,
      timestamp: new Date().toISOString()
    }

    onSaveRound(roundData)

    // Reset default for next board
    setTricksWon(10)
  }

  return (
    <div className="main-content" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '0.8rem', color: '#818CF8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            🃏 CONTRACT BRIDGE SCORECARD
          </span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, margin: '2px 0 0 0' }}>
            Board / Deal #{currentBoardNum}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button 
            type="button" 
            className="btn btn-sm btn-secondary"
            onClick={() => setIsRulesOpen(true)}
            style={{ color: '#818CF8', borderColor: 'rgba(129, 140, 248, 0.4)' }}
          >
            📖 {t('rules_modal.quick_btn') || 'Aturan'}
          </button>
          {onBackToHub && (
            <button className="btn btn-sm btn-secondary" onClick={onBackToHub}>
              🏠 Hub
            </button>
          )}
        </div>
      </div>

      {/* Main Scoreboard Standings: NS vs EW */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', textAlign: 'center' }}>
          <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38BDF8' }}>
              🔵 NORTH - SOUTH ({players[0]}, {players[2]})
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFF', margin: '4px 0' }}>
              {totalScores.ns} Pts
            </div>
          </div>
          <div style={{ padding: '14px', borderRadius: '14px', background: 'rgba(244, 114, 182, 0.1)', border: '1px solid rgba(244, 114, 182, 0.3)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#F472B6' }}>
              🔴 EAST - WEST ({players[1]}, {players[3]})
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: '#FFF', margin: '4px 0' }}>
              {totalScores.ew} Pts
            </div>
          </div>
        </div>
      </div>

      {/* Contract Builder Panel */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
        <div className="section-label" style={{ marginTop: 0 }}>📜 Konfigurasi Kontrak Deal #{currentBoardNum}</div>

        {/* 1. Contract Level & Suit */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px', marginBottom: '14px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Level (1–7)</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[1, 2, 3, 4, 5, 6, 7].map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  className={`btn btn-sm ${contractLevel === lvl ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setContractLevel(lvl)}
                  style={{ flex: 1, padding: '6px 2px', fontWeight: 800 }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Kembang / Suit</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { id: 'clubs', label: '♣ Clubs' },
                { id: 'diamonds', label: '♦ Dia' },
                { id: 'hearts', label: '♥ Hrt' },
                { id: 'spades', label: '♠ Spd' },
                { id: 'notrump', label: 'NT' }
              ].map(s => (
                <button
                  key={s.id}
                  type="button"
                  className={`btn btn-sm ${contractSuit === s.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setContractSuit(s.id)}
                  style={{ flex: 1, padding: '6px 2px', fontWeight: 800, fontSize: '0.75rem' }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Doubled Status & Vulnerability */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Pengganda Kontrak</label>
            <div style={{ display: 'flex', gap: '4px' }}>
              {[
                { id: 'undoubled', label: 'Normal' },
                { id: 'doubled', label: '✖ Doubled (X)' },
                { id: 'redoubled', label: '✖✖ Redoubled (XX)' }
              ].map(d => (
                <button
                  key={d.id}
                  type="button"
                  className={`btn btn-sm ${contractDoubled === d.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setContractDoubled(d.id)}
                  style={{ flex: 1, padding: '6px 2px', fontSize: '0.72rem', fontWeight: 700 }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Kerentanan (Vulnerability)</label>
            <select className="form-input" value={vulnerability} onChange={e => setVulnerability(e.target.value)} style={{ fontSize: '0.8rem' }}>
              <option value="none">Tidak Rentan (None Vul)</option>
              <option value="ns">NS Rentan (NS Vul)</option>
              <option value="ew">EW Rentan (EW Vul)</option>
              <option value="both">Keduanya Rentan (Both Vul)</option>
            </select>
          </div>
        </div>

        {/* 3. Declarer & Tricks Won */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Deklarator (Pemain Utama)</label>
            <select className="form-input" value={declarerIdx} onChange={e => setDeclarerIdx(Number(e.target.value))} style={{ fontSize: '0.8rem' }}>
              {players.map((name, idx) => (
                <option key={idx} value={idx}>
                  {name} ({idx % 2 === 0 ? '🔵 Pasangan NS' : '🔴 Pasangan EW'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>
              Trik Dimenangkan (Target: {6 + contractLevel})
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button 
                type="button" 
                className="btn btn-sm btn-secondary" 
                onClick={() => setTricksWon(prev => Math.max(0, prev - 1))}
                style={{ width: '32px', height: '32px', padding: 0 }}
              >
                -
              </button>
              <span style={{ minWidth: '40px', textAlign: 'center', fontWeight: 900, fontSize: '1.2rem', color: liveCalculation.isMade ? '#34D399' : '#F87171' }}>
                {tricksWon}
              </span>
              <button 
                type="button" 
                className="btn btn-sm btn-secondary" 
                onClick={() => setTricksWon(prev => Math.min(13, prev + 1))}
                style={{ width: '32px', height: '32px', padding: 0 }}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Live Calculation Result Breakdown */}
      <div className="glass-panel" style={{
        padding: '18px',
        marginBottom: '20px',
        border: liveCalculation.isMade ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
        background: liveCalculation.isMade ? 'rgba(52, 211, 153, 0.06)' : 'rgba(239, 68, 68, 0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: liveCalculation.isMade ? '#34D399' : '#F87171' }}>
            {liveCalculation.isMade 
              ? `✓ KONTRAK BERHASIL (${contractLevel}${BRIDGE_SUITS[contractSuit.toUpperCase()]?.symbol || ''} +${liveCalculation.diff})` 
              : `✕ KONTRAK GAGAL (DOWN ${Math.abs(liveCalculation.diff)})`}
          </div>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: liveCalculation.isMade ? '#34D399' : '#F87171' }}>
            {liveCalculation.isMade ? `+${liveCalculation.scoreDelta}` : `${liveCalculation.scoreDelta}`} Pts
          </div>
        </div>

        {/* Breakdown Tags */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
          {liveCalculation.breakdown.trickPoints > 0 && (
            <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)' }}>
              Trick Pts: +{liveCalculation.breakdown.trickPoints}
            </span>
          )}
          {liveCalculation.breakdown.overtrickPoints > 0 && (
            <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(52,211,153,0.15)', color: '#34D399', fontWeight: 700 }}>
              Overtricks: +{liveCalculation.breakdown.overtrickPoints}
            </span>
          )}
          {liveCalculation.breakdown.gameBonus > 0 && (
            <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(129,140,248,0.2)', color: '#818CF8', fontWeight: 800 }}>
              Game Bonus: +{liveCalculation.breakdown.gameBonus}
            </span>
          )}
          {liveCalculation.breakdown.partScoreBonus > 0 && (
            <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)' }}>
              Part-Score Bonus: +{liveCalculation.breakdown.partScoreBonus}
            </span>
          )}
          {liveCalculation.breakdown.slamBonus > 0 && (
            <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(245,158,11,0.2)', color: '#FCD34D', fontWeight: 900 }}>
              🏆 Slam Bonus: +{liveCalculation.breakdown.slamBonus}
            </span>
          )}
          {liveCalculation.breakdown.undertrickPenalty > 0 && (
            <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.2)', color: '#F87171', fontWeight: 800 }}>
              Penalti Down: -{liveCalculation.breakdown.undertrickPenalty}
            </span>
          )}
        </div>
      </div>

      {/* Save Button */}
      <button 
        type="button" 
        className="btn btn-primary"
        onClick={handleSave}
        style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800, marginBottom: '24px' }}
      >
        💾 Simpan Board #{currentBoardNum} ke Ledger
      </button>

      {/* Round History Ledger */}
      {rounds.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div className="section-label" style={{ margin: 0 }}>📜 Riwayat Board Bridge</div>
            {onUndoRound && (
              <button className="btn btn-sm btn-secondary" onClick={onUndoRound} style={{ fontSize: '0.75rem' }}>
                ↩️ Undo Board Terakhir
              </button>
            )}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Board</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Kontrak</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Deklarator</th>
                  <th style={{ padding: '8px', textAlign: 'center' }}>Trik</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>NS Pts</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>EW Pts</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((r, rIdx) => (
                  <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 800 }}>#{r.round_number || rIdx + 1}</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>
                      {r.contract?.level}{BRIDGE_SUITS[r.contract?.suit?.toUpperCase()]?.symbol || ''}
                      {r.contract?.doubled === 'doubled' ? ' X' : r.contract?.doubled === 'redoubled' ? ' XX' : ''}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{r.contract?.declarer_name}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: r.is_made ? '#34D399' : '#F87171' }}>
                      {r.tricks_won} ({r.diff >= 0 ? `+${r.diff}` : r.diff})
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: r.ns_score > 0 ? '#38BDF8' : 'inherit' }}>
                      {r.ns_score > 0 ? `+${r.ns_score}` : '-'}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: r.ew_score > 0 ? '#F472B6' : 'inherit' }}>
                      {r.ew_score > 0 ? `+${r.ew_score}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {onShareStory && (
          <button className="btn btn-secondary" onClick={onShareStory}>
            📸 Bagikan Cerita 9:16
          </button>
        )}
        {onFinishGame && (
          <button className="btn btn-danger" onClick={onFinishGame}>
            🏁 Selesaikan Pertandingan
          </button>
        )}
      </div>

      <CardGameRulesModal 
        isOpen={isRulesOpen} 
        onClose={() => setIsRulesOpen(false)} 
        initialGame="bridge" 
      />
    </div>
  )
}
