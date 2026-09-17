import React, { useState, useEffect } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'

export default function CardGameRulesModal({ isOpen, onClose, initialGame = 'truf' }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState(initialGame)

  useEffect(() => {
    if (initialGame) {
      setActiveTab(initialGame)
    }
  }, [initialGame, isOpen])

  if (!isOpen) return null

  const handleTabChange = (tabKey) => {
    try {
      hapticsService.light()
      soundService.playTick()
    } catch {}
    setActiveTab(tabKey)
  }

  const handleClose = () => {
    try {
      hapticsService.light()
      soundService.playClick()
    } catch {}
    onClose()
  }

  return (
    <div 
      className="modal-overlay" 
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <div 
        className="glass-panel" 
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          background: 'linear-gradient(135deg, rgba(22, 24, 38, 0.95), rgba(13, 14, 21, 0.98))',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(139, 92, 246, 0.15)'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>📖</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#FFF' }}>
                {t('rules_modal.title')}
              </h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {t('rules_modal.subtitle')}
              </p>
            </div>
          </div>
          <button 
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handleClose}
            style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '6px',
          padding: '12px 20px',
          borderBottom: '1px solid var(--border-glass)',
          overflowX: 'auto',
          background: 'rgba(0, 0, 0, 0.15)'
        }}>
          {[
            { key: 'truf', label: t('rules_modal.tab_truf'), color: '#8B5CF6' },
            { key: 'remi', label: t('rules_modal.tab_remi'), color: '#EC4899' },
            { key: 'omben', label: t('rules_modal.tab_omben'), color: '#F59E0B' },
            { key: 'chess', label: t('rules_modal.tab_chess'), color: '#3B82F6' }
          ].map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  border: isActive ? `1px solid ${tab.color}` : '1px solid transparent',
                  background: isActive ? `rgba(${tab.key === 'truf' ? '139, 92, 246' : tab.key === 'remi' ? '236, 72, 153' : tab.key === 'omben' ? '245, 158, 11' : '59, 130, 246'}, 0.2)` : 'transparent',
                  color: isActive ? '#FFF' : 'var(--text-dim)',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content Body */}
        <div style={{
          padding: '20px 24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {/* TAB 1: TRUF */}
          {activeTab === 'truf' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Summary Card */}
              <div style={{
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, color: '#C084FC', fontSize: '0.9rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🃏</span> {t('rules_modal.sec_summary')}
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                  {t('rules_modal.truf.summary_desc')}
                </p>
              </div>

              {/* Suit Hierarchy */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '8px', color: '#FFF' }}>
                  👑 {t('rules_modal.sec_suits')}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  {t('rules_modal.truf.suits_desc')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', fontWeight: 700, color: '#93C5FD' }}>
                    1. ♠ {t('truf.suit_spade')} <span style={{ fontSize: '0.7rem', color: '#60A5FA', display: 'block' }}>Kasta Tertinggi</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', fontWeight: 700, color: '#F87171' }}>
                    2. ♥ {t('truf.suit_heart')} <span style={{ fontSize: '0.7rem', color: '#EF4444', display: 'block' }}>Kasta Kedua</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', fontWeight: 700, color: '#FCA5A5' }}>
                    3. ♦ {t('truf.suit_diamond')} <span style={{ fontSize: '0.7rem', color: '#F87171', display: 'block' }}>Kasta Ketiga</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', fontWeight: 700, color: '#86EFAC' }}>
                    4. ♣ {t('truf.suit_club')} <span style={{ fontSize: '0.7rem', color: '#34D399', display: 'block' }}>Kasta Keempat</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1' }}>
                    5. 🚫 {t('truf.no_truf')} <span style={{ fontSize: '0.7rem', color: '#94A3B8', display: 'block' }}>Tanpa Kembang</span>
                  </div>
                </div>
              </div>

              {/* Round Phases & Bid 13 */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '8px', color: '#FFF' }}>
                  🔄 {t('rules_modal.sec_phases')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#C084FC', marginBottom: '4px' }}>
                      {t('rules_modal.truf.phase_1_title')}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>
                      {t('rules_modal.truf.phase_1_desc')}
                    </p>
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#34D399', marginBottom: '4px' }}>
                      {t('rules_modal.truf.phase_2_title')}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>
                      {t('rules_modal.truf.phase_2_desc')}
                    </p>
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#FBBF24', marginBottom: '4px' }}>
                      {t('rules_modal.truf.bid13_title')}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#FDE68A', margin: 0, lineHeight: 1.4 }}>
                      {t('rules_modal.truf.bid13_desc')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Mathematical Scoring Table */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: '#FFF' }}>
                  📊 {t('rules_modal.sec_scoring')}
                </div>

                <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--border-glass)' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-dim)' }}>Kondisi</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', color: '#C084FC' }}>Main Atas (&gt;13)</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', color: '#34D399' }}>Main Bawah (&lt;13)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>Tepat Target (Won == Bid &gt; 0)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#34D399', fontWeight: 700 }}>+Bid × Mult</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#34D399', fontWeight: 700 }}>+Bid × Mult</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>Kurang Trik (Won &lt; Bid)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#F87171', fontWeight: 700 }}>-(Kurang × 2 × Mult)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#F87171' }}>-(Kurang × 1 × Mult)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>Kelebihan Trik (Won &gt; Bid)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#FCA5A5' }}>-(Lebih × 1 × Mult)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#F87171', fontWeight: 700 }}>-(Lebih × 2 × Mult)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>Bid 0 Sukses (Won == 0)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#60A5FA', fontWeight: 700 }}>+Bonus0 × Mult</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#60A5FA', fontWeight: 700 }}>+Bonus0 × Mult</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>Bid 0 Gagal (Won &gt; 0)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#EF4444', fontWeight: 700 }}>-(Won × 2 × Mult)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#EF4444', fontWeight: 700 }}>-(Won × 2 × Mult)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px', lineHeight: 1.4 }}>
                  ⚠️ {t('rules_modal.truf.dealer_streak_rule')}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: REMI */}
          {activeTab === 'remi' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Summary Card */}
              <div style={{
                background: 'rgba(236, 72, 153, 0.08)',
                border: '1px solid rgba(236, 72, 153, 0.3)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, color: '#F472B6', fontSize: '0.9rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎴</span> {t('rules_modal.sec_summary')}
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                  {t('rules_modal.remi.summary_desc')}
                </p>
              </div>

              {/* Valid Melds */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: '#FFF' }}>
                  🃏 {t('rules_modal.sec_melds')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#F472B6', marginBottom: '4px' }}>
                      {t('rules_modal.remi.meld_run_title')}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>
                      {t('rules_modal.remi.meld_run_desc')}
                    </p>
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#60A5FA', marginBottom: '4px' }}>
                      {t('rules_modal.remi.meld_set_title')}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>
                      {t('rules_modal.remi.meld_set_desc')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Card Penalty Values */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: '#FFF' }}>
                  💰 {t('rules_modal.sec_penalties')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#F87171' }}>As (A)</div>
                    <div style={{ fontSize: '0.75rem', color: '#FCA5A5' }}>15 Poin Denda</div>
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#FBBF24' }}>King / Queen / Jack</div>
                    <div style={{ fontSize: '0.75rem', color: '#FDE68A' }}>10 Poin per lembar</div>
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#60A5FA' }}>Angka 2 s/d 10</div>
                    <div style={{ fontSize: '0.75rem', color: '#93C5FD' }}>Sesuai Nominal (2–10)</div>
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#C084FC' }}>Joker</div>
                    <div style={{ fontSize: '0.75rem', color: '#E9D5FF' }}>25 / 50 Poin Denda</div>
                  </div>
                </div>
              </div>

              {/* Closing Types & Elimination */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: '#FFF' }}>
                  🎯 {t('rules_modal.sec_closing')} & {t('rules_modal.sec_elimination')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '10px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#34D399', marginBottom: '4px' }}>
                      {t('rules_modal.remi.close_normal_title')}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>
                      {t('rules_modal.remi.close_normal_desc')}
                    </p>
                  </div>
                  <div style={{ padding: '10px', background: 'rgba(236, 72, 153, 0.15)', border: '1px solid rgba(236, 72, 153, 0.3)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#F472B6', marginBottom: '4px' }}>
                      ⚡ {t('rules_modal.remi.close_pure_title')}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: '#FCE7F3', margin: 0, lineHeight: 1.4 }}>
                      {t('rules_modal.remi.close_pure_desc')}
                    </p>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px', lineHeight: 1.4 }}>
                    🏆 {t('rules_modal.remi.elimination_desc')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OMBEN */}
          {activeTab === 'omben' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Summary Card */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, color: '#FBBF24', fontSize: '0.9rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🍺</span> {t('rules_modal.sec_summary')}
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                  {t('rules_modal.omben.summary_desc')}
                </p>
              </div>

              {/* Gameplay Flow */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: '#FFF' }}>
                  🔄 {t('rules_modal.sec_mechanics')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                  <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                    {t('rules_modal.omben.flow_lead')}
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                    {t('rules_modal.omben.flow_follow')}
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '8px', color: '#FDE68A' }}>
                    {t('rules_modal.omben.flow_cangkul')}
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px' }}>
                    {t('rules_modal.omben.flow_win_trick')}
                  </div>
                </div>
              </div>

              {/* Finishing Ranks & Penalty */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: '#FFF' }}>
                  🏅 {t('rules_modal.sec_ranks')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ padding: '8px 10px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px', fontSize: '0.78rem', color: '#6EE7B7' }}>
                    🥇 {t('rules_modal.omben.rank_1st')}
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                    🥈 {t('rules_modal.omben.rank_2nd_3rd')}
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '8px', fontSize: '0.78rem', color: '#FCA5A5' }}>
                    💀 {t('rules_modal.omben.rank_omben')}
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '0.76rem', color: 'var(--text-muted)', background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '8px', lineHeight: 1.4 }}>
                    🍺 {t('rules_modal.omben.tally_desc')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CHESS CLOCK */}
          {activeTab === 'chess' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, color: '#93C5FD', fontSize: '0.9rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>♟️</span> {t('rules_modal.sec_summary')}
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                  {t('rules_modal.chess.summary_desc')}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#F87171', marginBottom: '4px' }}>⚡ Bullet</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('rules_modal.chess.bullet_desc')}</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#FBBF24', marginBottom: '4px' }}>🔥 Blitz</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('rules_modal.chess.blitz_desc')}</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#34D399', marginBottom: '4px' }}>⏱️ Rapid</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('rules_modal.chess.rapid_desc')}</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#C084FC', marginBottom: '4px' }}>➕ Increment</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('rules_modal.chess.fischer_desc')}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-glass)',
          display: 'flex',
          justifyContent: 'flex-end',
          background: 'rgba(0, 0, 0, 0.2)'
        }}>
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={handleClose}
            style={{ padding: '8px 20px', borderRadius: '10px', fontWeight: 700 }}
          >
            {t('app.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
