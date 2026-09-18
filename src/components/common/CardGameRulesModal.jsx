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
          border: '1px solid var(--border-glass-light)',
          background: 'var(--bg-modal)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 30px var(--primary-glow)',
          color: 'var(--text-main)'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-glass)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>📖</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
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
          background: 'var(--bg-glass)'
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
                  border: isActive ? `1.5px solid ${tab.color}` : '1px solid transparent',
                  background: isActive ? `rgba(${tab.key === 'truf' ? '139, 92, 246' : tab.key === 'remi' ? '236, 72, 153' : tab.key === 'omben' ? '245, 158, 11' : '59, 130, 246'}, 0.18)` : 'transparent',
                  color: isActive ? 'var(--text-main)' : 'var(--text-dim)',
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
                background: 'var(--badge-purple-bg)',
                border: '1px solid var(--badge-purple-border)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, color: 'var(--badge-purple-text)', fontSize: '0.9rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🃏</span> {t('rules_modal.sec_summary')}
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                  {t('rules_modal.truf.summary_desc')}
                </p>
              </div>

              {/* Player Count Variations Card */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '8px', color: 'var(--text-main)' }}>
                  👥 {t('rules_modal.sec_players_variation')}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  {t('rules_modal.truf.players_variation_desc')}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                    <strong style={{ color: 'var(--badge-gold-text)' }}>{t('rules_modal.truf.var_3p')}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'var(--badge-purple-bg)', borderRadius: '8px', border: '1px solid var(--badge-purple-border)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                    <strong style={{ color: 'var(--badge-purple-text)' }}>{t('rules_modal.truf.var_4p')}</strong>
                  </div>
                  <div style={{ padding: '8px 12px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                    <strong style={{ color: 'var(--badge-blue-text)' }}>{t('rules_modal.truf.var_5p')}</strong>
                  </div>
                </div>
              </div>

              {/* Suit Hierarchy */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '8px', color: 'var(--text-main)' }}>
                  👑 {t('rules_modal.sec_suits')}
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  {t('rules_modal.truf.suits_desc')}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  <div style={{ padding: '8px 10px', background: 'var(--badge-blue-bg)', borderRadius: '8px', border: '1px solid var(--badge-blue-border)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--badge-blue-text)' }}>
                    1. ♠ {t('truf.suit_spade')} <span style={{ fontSize: '0.7rem', color: 'var(--badge-blue-text)', opacity: 0.85, display: 'block' }}>Kasta Tertinggi</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--badge-red-bg)', borderRadius: '8px', border: '1px solid var(--badge-red-border)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--badge-red-text)' }}>
                    2. ♥ {t('truf.suit_heart')} <span style={{ fontSize: '0.7rem', color: 'var(--badge-red-text)', opacity: 0.85, display: 'block' }}>Kasta Kedua</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--badge-orange-bg)', borderRadius: '8px', border: '1px solid var(--badge-orange-border)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--badge-orange-text)' }}>
                    3. ♦ {t('truf.suit_diamond')} <span style={{ fontSize: '0.7rem', color: 'var(--badge-orange-text)', opacity: 0.85, display: 'block' }}>Kasta Ketiga</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--badge-green-bg)', borderRadius: '8px', border: '1px solid var(--badge-green-border)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--badge-green-text)' }}>
                    4. ♣ {t('truf.suit_club')} <span style={{ fontSize: '0.7rem', color: 'var(--badge-green-text)', opacity: 0.85, display: 'block' }}>Kasta Keempat</span>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-glass)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                    5. 🚫 {t('truf.no_truf')} <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>Tanpa Kembang</span>
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
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '8px', color: 'var(--text-main)' }}>
                  🔄 {t('rules_modal.sec_phases')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--badge-purple-text)', marginBottom: '4px' }}>
                      {t('rules_modal.truf.phase_1_title')}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>
                      {t('rules_modal.truf.phase_1_desc')}
                    </p>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--badge-green-text)', marginBottom: '4px' }}>
                      {t('rules_modal.truf.phase_2_title')}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>
                      {t('rules_modal.truf.phase_2_desc')}
                    </p>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--badge-gold-bg)', border: '1px solid var(--badge-gold-border)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--badge-gold-text)', marginBottom: '4px' }}>
                      {t('rules_modal.truf.bid13_title')}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--badge-gold-text)', margin: 0, lineHeight: 1.4 }}>
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
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: 'var(--text-main)' }}>
                  📊 {t('rules_modal.sec_scoring')}
                </div>

                <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--table-header-bg)', borderBottom: '1px solid var(--border-glass)' }}>
                        <th style={{ padding: '8px 10px', textAlign: 'left', color: 'var(--text-dim)' }}>Kondisi</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--badge-purple-text)' }}>Main Atas (&gt; Total Trik)</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--badge-green-text)' }}>Main Bawah (&lt; Total Trik)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>Tepat Target (Won == Bid &gt; 0)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--badge-green-text)', fontWeight: 700 }}>+Bid × Mult</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--badge-green-text)', fontWeight: 700 }}>+Bid × Mult</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>Kurang Trik (Won &lt; Bid)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--badge-red-text)', fontWeight: 700 }}>-(Kurang × 2 × Mult)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--badge-red-text)' }}>-(Kurang × 1 × Mult)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>Kelebihan Trik (Won &gt; Bid)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--badge-orange-text)' }}>-(Lebih × 1 × Mult)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--badge-red-text)', fontWeight: 700 }}>-(Lebih × 2 × Mult)</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>Bid 0 Sukses (Won == 0)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--badge-blue-text)', fontWeight: 700 }}>+MaxBid × Mult</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--badge-blue-text)', fontWeight: 700 }}>+MaxBid × Mult</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>Bid 0 Gagal (Won &gt; 0)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--badge-orange-text)', fontWeight: 700 }}>-(Won × 1 × Mult)</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--badge-red-text)', fontWeight: 700 }}>-(Won × 2 × Mult)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', padding: '8px 12px', borderRadius: '8px', lineHeight: 1.4 }}>
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
                background: 'var(--badge-purple-bg)',
                border: '1px solid var(--badge-purple-border)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, color: 'var(--badge-purple-text)', fontSize: '0.9rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: 'var(--text-main)' }}>
                  🃏 {t('rules_modal.sec_melds')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--badge-purple-text)', marginBottom: '4px' }}>
                      {t('rules_modal.remi.meld_run_title')}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>
                      {t('rules_modal.remi.meld_run_desc')}
                    </p>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--badge-blue-text)', marginBottom: '4px' }}>
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
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: 'var(--text-main)' }}>
                  💰 {t('rules_modal.sec_penalties')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  <div style={{ padding: '10px', background: 'var(--badge-red-bg)', borderRadius: '8px', border: '1px solid var(--badge-red-border)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--badge-red-text)' }}>As (A)</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--badge-red-text)', opacity: 0.85 }}>15 Poin Denda</div>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--badge-gold-bg)', borderRadius: '8px', border: '1px solid var(--badge-gold-border)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--badge-gold-text)' }}>King / Queen / Jack</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--badge-gold-text)', opacity: 0.85 }}>10 Poin per lembar</div>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--badge-blue-bg)', borderRadius: '8px', border: '1px solid var(--badge-blue-border)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--badge-blue-text)' }}>Angka 2 s/d 10</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--badge-blue-text)', opacity: 0.85 }}>Sesuai Nominal (2–10)</div>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--badge-purple-bg)', borderRadius: '8px', border: '1px solid var(--badge-purple-border)' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--badge-purple-text)' }}>Joker</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--badge-purple-text)', opacity: 0.85 }}>25 / 50 Poin Denda</div>
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
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: 'var(--text-main)' }}>
                  🎯 {t('rules_modal.sec_closing')} & {t('rules_modal.sec_elimination')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ padding: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--badge-green-text)', marginBottom: '4px' }}>
                      {t('rules_modal.remi.close_normal_title')}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>
                      {t('rules_modal.remi.close_normal_desc')}
                    </p>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--badge-purple-bg)', border: '1px solid var(--badge-purple-border)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--badge-purple-text)', marginBottom: '4px' }}>
                      ⚡ {t('rules_modal.remi.close_pure_title')}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-main)', margin: 0, lineHeight: 1.4 }}>
                      {t('rules_modal.remi.close_pure_desc')}
                    </p>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', padding: '8px 12px', borderRadius: '8px', lineHeight: 1.4 }}>
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
                background: 'var(--badge-gold-bg)',
                border: '1px solid var(--badge-gold-border)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, color: 'var(--badge-gold-text)', fontSize: '0.9rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: 'var(--text-main)' }}>
                  🔄 {t('rules_modal.sec_mechanics')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    {t('rules_modal.omben.flow_lead')}
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    {t('rules_modal.omben.flow_follow')}
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--badge-gold-bg)', border: '1px solid var(--badge-gold-border)', borderRadius: '8px', color: 'var(--badge-gold-text)' }}>
                    {t('rules_modal.omben.flow_cangkul')}
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
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
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: 'var(--text-main)' }}>
                  🏅 {t('rules_modal.sec_ranks')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ padding: '8px 10px', background: 'var(--badge-green-bg)', border: '1px solid var(--badge-green-border)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--badge-green-text)', fontWeight: 700 }}>
                    🥇 {t('rules_modal.omben.rank_1st')}
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                    🥈 {t('rules_modal.omben.rank_2nd_3rd')}
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--badge-red-bg)', border: '1px solid var(--badge-red-border)', borderRadius: '8px', fontSize: '0.78rem', color: 'var(--badge-red-text)', fontWeight: 700 }}>
                    💀 {t('rules_modal.omben.rank_omben')}
                  </div>
                  <div style={{ marginTop: '6px', fontSize: '0.76rem', color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', padding: '8px 12px', borderRadius: '8px', lineHeight: 1.4 }}>
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
                background: 'var(--badge-blue-bg)',
                border: '1px solid var(--badge-blue-border)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, color: 'var(--badge-blue-text)', fontSize: '0.9rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>♟️</span> {t('rules_modal.sec_summary')}
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                  {t('rules_modal.chess.summary_desc')}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                <div style={{ padding: '12px', background: 'var(--badge-red-bg)', border: '1px solid var(--badge-red-border)', borderRadius: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--badge-red-text)', marginBottom: '4px' }}>⚡ Bullet</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('rules_modal.chess.bullet_desc')}</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--badge-gold-bg)', border: '1px solid var(--badge-gold-border)', borderRadius: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--badge-gold-text)', marginBottom: '4px' }}>🔥 Blitz</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('rules_modal.chess.blitz_desc')}</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--badge-green-bg)', border: '1px solid var(--badge-green-border)', borderRadius: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--badge-green-text)', marginBottom: '4px' }}>⏱️ Rapid</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t('rules_modal.chess.rapid_desc')}</div>
                </div>
                <div style={{ padding: '12px', background: 'var(--badge-purple-bg)', border: '1px solid var(--badge-purple-border)', borderRadius: '12px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--badge-purple-text)', marginBottom: '4px' }}>➕ Increment</div>
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
          background: 'var(--bg-glass)'
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
