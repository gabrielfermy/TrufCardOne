import React, { useState } from 'react'
import DiceRoller from './DiceRoller'
import FingerChooser from './FingerChooser'
import CoinFlipper from './CoinFlipper'

export default function UtilitiesView({ initialTab = 'dice', onBack }) {
  const [activeTab, setActiveTab] = useState(initialTab)

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#06B6D4' }}>
          🎲 Alat Tabletop Cepat
        </h2>
        {onBack && (
          <button className="btn btn-secondary btn-sm" onClick={onBack}>
            ✕
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
        <button
          className={`btn ${activeTab === 'dice' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('dice')}
        >
          🎲 Dadu
        </button>
        <button
          className={`btn ${activeTab === 'finger' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('finger')}
        >
          👆 Mulai Duluan
        </button>
        <button
          className={`btn ${activeTab === 'coin' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('coin')}
        >
          🪙 Koin
        </button>
      </div>

      {/* Active Tab Panel */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        {activeTab === 'dice' && <DiceRoller />}
        {activeTab === 'finger' && <FingerChooser />}
        {activeTab === 'coin' && <CoinFlipper />}
      </div>
    </div>
  )
}
