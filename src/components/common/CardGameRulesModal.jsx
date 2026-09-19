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
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          background: 'var(--bg-glass)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
            <span style={{ fontSize: '1.6rem', lineHeight: 1, flexShrink: 0 }}>📖</span>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.2px' }}>
                {t('rules_modal.title')}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                {t('rules_modal.subtitle')}
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={handleClose}
            aria-label="Tutup"
            style={{ width: '32px', height: '32px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          borderBottom: '1px solid var(--border-glass)',
          overflowX: 'auto',
          background: 'var(--bg-glass)',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none'
        }}>
          {[
            { 
              key: 'truf', 
              icon: '🃏', 
              label: t('rules_modal.tab_truf').replace(/^🃏\s*/, '') || 'Truf (Trup)', 
              activeBg: 'var(--badge-purple-bg)', 
              activeBorder: 'var(--badge-purple-border)', 
              activeText: 'var(--badge-purple-text)' 
            },
            { 
              key: 'remi', 
              icon: '🎴', 
              label: t('rules_modal.tab_remi').replace(/^🎴\s*/, '') || 'Remi (7-Card)', 
              activeBg: 'rgba(236, 72, 153, 0.16)', 
              activeBorder: 'rgba(236, 72, 153, 0.45)', 
              activeText: '#F472B6' 
            },
            { 
              key: 'remi_jawa', 
              icon: '🎴', 
              label: t('rules_modal.tab_remi_jawa') || 'Remi Jawa', 
              activeBg: 'rgba(245, 158, 11, 0.16)', 
              activeBorder: 'rgba(245, 158, 11, 0.45)', 
              activeText: '#F59E0B' 
            },
            { 
              key: 'capsa', 
              icon: '🎴', 
              label: t('rules_modal.tab_capsa') || 'Capsa', 
              activeBg: 'rgba(6, 182, 212, 0.16)', 
              activeBorder: 'rgba(6, 182, 212, 0.45)', 
              activeText: '#06B6D4' 
            },
            { 
              key: 'domino', 
              icon: '🀄', 
              label: t('rules_modal.tab_domino') || 'Domino Gaple', 
              activeBg: 'rgba(56, 189, 248, 0.16)', 
              activeBorder: 'rgba(56, 189, 248, 0.45)', 
              activeText: '#38BDF8' 
            },
            { 
              key: 'omben', 
              icon: '🍺', 
              label: t('rules_modal.tab_omben').replace(/^🍺\s*/, '') || 'Omben (Cangkulan)', 
              activeBg: 'var(--badge-gold-bg)', 
              activeBorder: 'var(--badge-gold-border)', 
              activeText: 'var(--badge-gold-text)' 
            },
            { 
              key: 'chess', 
              icon: '♟️', 
              label: t('rules_modal.tab_chess').replace(/^♟️\s*/, '') || 'Jam Catur', 
              activeBg: 'var(--badge-blue-bg)', 
              activeBorder: 'var(--badge-blue-border)', 
              activeText: 'var(--badge-blue-text)' 
            }
          ].map(tab => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  height: '36px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  border: isActive ? `1.5px solid ${tab.activeBorder}` : '1.5px solid var(--border-glass)',
                  background: isActive ? tab.activeBg : 'rgba(255, 255, 255, 0.03)',
                  color: isActive ? tab.activeText : 'var(--text-dim)',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxSizing: 'border-box',
                  verticalAlign: 'middle',
                  transition: 'all 0.15s ease'
                }}
              >
                <span style={{ fontSize: '1rem', lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>{tab.icon}</span>
                <span style={{ lineHeight: 1, display: 'inline-flex', alignItems: 'center' }}>{tab.label}</span>
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

          {/* TAB: REMI JAWA */}
          {activeTab === 'remi_jawa' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Summary Card */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, color: 'var(--accent-gold)', fontSize: '0.9rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎴</span> Ringkasan Remi Jawa (2 - 4 Pemain)
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                  Variasi kartu remi khas Jawa dengan sistem poin individual (angka +1, gambar +2, As +3), syarat pengambilan sampah dengan 2 kartu seri awal, serta sistem pergantian Dealer otomatis ke pemain dengan nilai terendah dan tracking dealer 10x berturut-turut (CHOLOKOPOK).
                </p>
              </div>

              {/* Aturan Kartu Jadi & Seri/Tris */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: 'var(--text-main)' }}>
                  🃏 Aturan Kartu Jadi (Seri & Tris)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <strong>1. Kartu Seri (Urut Motif Sama)</strong>: Minimal 3 kartu dengan motif sama (cth: 2♠, 3♠, 4♠ atau 6♥, 7♥, 8♥, 9♥, 10♥).
                    <div style={{ color: 'var(--accent-red)', marginTop: '4px', fontSize: '0.74rem' }}>
                      ⚠️ As tidak bisa digabung dengan 2-3 atau Q-K. Kartu Gambar (J-Q-K) tidak bisa disambung dengan angka 10 (10-J-Q tidak sah).
                    </div>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <strong>2. Kartu Tris / Paralel</strong>: Set angka atau gambar sama dari motif berbeda (minimal 3 kartu, cth: 7♣, 7♥, 7♠).
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <strong>3. Batas Kartu di Tangan</strong>: Pada akhir giliran pemain, kartu di tangan harus berjumlah maksimal 7 kartu.
                  </div>
                </div>
              </div>

              {/* Aturan Ambil Buangan (Sampah) */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: 'var(--text-main)' }}>
                  🗑️ Syarat Pengambilan Kartu Buangan (Sampah)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <strong>Pengambilan Pertama</strong>: Harus sudah memiliki 2 kartu awalan seri di tangan (bukan kartu tengah, bukan tris). Pemain harus membuka/menjatuhkan kartu seri modal terlebih dahulu sebelum mengambil sampah.
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <strong>Pengambilan Berikutnya</strong>: Jatuhkan minimal 2 kartu awalannya lalu ambil kartu yang dituju beserta semua kartu di bawahnya (kartu di tangan di akhir giliran tetap maks 7).
                  </div>
                </div>
              </div>

              {/* Aturan Tutup & Bonus */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: 'var(--text-main)' }}>
                  🏆 Aturan Tutup (Closing) & Bonus Poin
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div style={{ padding: '10px', background: 'var(--badge-green-bg)', border: '1px solid var(--badge-green-border)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--badge-green-text)' }}>🎴 Tutup Atas (+10 Poin)</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>Tutup dari kartu sisa/deck tertutup.</div>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--badge-purple-bg)', border: '1px solid var(--badge-purple-border)', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--badge-purple-text)' }}>🗑️ Tutup Bawah (+25 Poin)</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>Tutup dari kartu tumpukan buangan/sampah.</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '0.76rem' }}>
                    🅰️ <strong>Tutup Pakai As</strong>: Tambahan <strong>+5 Poin</strong>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px', fontSize: '0.76rem' }}>
                    🃏 <strong>Tutup Pakai Joker</strong>: Tambahan <strong>+15 Poin</strong>
                  </div>
                </div>
              </div>

              {/* Tabel Nilai Kartu Jadi vs Mati */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: 'var(--text-main)' }}>
                  📊 Nilai Kartu per Lembar
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                  <div style={{ padding: '8px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>Angka 2-10</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 700 }}>+1 Jadi</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: 700 }}>-1 Mati</div>
                  </div>
                  <div style={{ padding: '8px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>Gambar JQK</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 700 }}>+2 Jadi</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: 700 }}>-2 Mati</div>
                  </div>
                  <div style={{ padding: '8px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>Kartu As</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 700 }}>+3 Jadi</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: 700 }}>-3 Mati</div>
                  </div>
                  <div style={{ padding: '8px', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>Joker</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-green)', fontWeight: 700 }}>Sesuai Jadi</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontWeight: 700 }}>-10 Mati</div>
                  </div>
                </div>
              </div>

              {/* Aturan Dealer & CHOLOKOPOK */}
              <div style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '6px', color: 'var(--accent-gold)' }}>
                  👑 Aturan Dealer & Batas Streak 10x (CHOLOKOPOK)
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                  Pemain dengan <strong>nilai ronde paling rendah</strong> otomatis menjadi dealer untuk mengocok kartu di ronde berikutnya. Jika pemain menjadi dealer selama <strong>10 kali berturut-turut</strong> tanpa tergantikan (lengkap 10 huruf <code>C-H-O-L-O-K-O-P-O-K</code>), permainan dinyatakan selesai / game over.
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

          {/* TAB: CAPSA (SUSUN & BANTING) */}
          {activeTab === 'capsa' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{
                background: 'rgba(6, 182, 212, 0.12)',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, color: '#06B6D4', fontSize: '0.9rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🎴</span> Panduan Lengkap Permainan Capsa (Susun & Banting)
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                  Dimainkan 2–4 pemain dengan dek standar 52 kartu (13 kartu per orang). KancaSela mendukung mode <strong>Capsa Susun</strong> (Chinese Poker 3 baris) dan <strong>Capsa Banting</strong> (Big Two).
                </p>
              </div>

              {/* Capsa Susun */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: '#38BDF8' }}>
                  🃏 1. Aturan Capsa Susun (13 Kartu / Chinese Poker)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <strong>Susunan 3 Tingkat</strong>: Kartu dibagi menjadi <strong>Bawah (5 kartu)</strong>, <strong>Tengah (5 kartu)</strong>, dan <strong>Atas (3 kartu)</strong>.
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#FCA5A5' }}>
                    <strong>⚠️ Aturan Sah / Pao (Salah Susun)</strong>: Kekuatan baris WAJIB berurutan: <code>Bawah ≥ Tengah ≥ Atas</code>. Jika baris atas lebih kuat dari tengah/bawah, dianggap <em>Pao / Salah Susun</em> dan terkena denda penalti penuh (-9 poin ke setiap lawan).
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <strong>Sistem Poin Head-to-Head</strong>: Setiap pasangan pemain membandingkan kartu per baris (+1 / -1 poin per baris).
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', color: '#FCD34D' }}>
                    <strong>🔥 Bonus Tembus (Sweep)</strong>: Menang 3 baris sekaligus dari 1 lawan = Poin digandakan 2x (+6 poin). <strong>Tembus Keliling (Super Sweep)</strong> = Menang 3 baris dari seluruh pemain di meja.
                  </div>
                </div>
              </div>

              {/* Capsa Banting */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: '#FB923C' }}>
                  💥 2. Aturan Capsa Banting (Big Two)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <strong>Tujuan</strong>: Pemain pertama yang menghabiskan seluruh 13 kartu di tangan dinyatakan sebagai Juara ronde (0 denda).
                  </div>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <strong>Perhitungan Denda Sisa Kartu</strong>:
                    <ul style={{ margin: '4px 0 0 16px', padding: 0, lineHeight: 1.5 }}>
                      <li>1–9 kartu sisa: Denda 1x (1 poin per lembar).</li>
                      <li>10–12 kartu sisa: <strong>Denda Ganda 2x</strong> (misal 10 kartu = 20 poin).</li>
                      <li>13 kartu sisa (Hang / Belum Jalan): <strong>Denda 3x Lipat</strong> (39 poin).</li>
                      <li>Sisa kartu angka 2: Denda ekstra +2 poin per lembar.</li>
                      <li>Sisa Bom (Four of a Kind): Denda ekstra +5 poin.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: DOMINO (GAPLE & QIUQIU) */}
          {activeTab === 'domino' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, color: '#38BDF8', fontSize: '0.9rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>🀄</span> Panduan Resmi Domino (Gaple & QiuQiu)
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.5, margin: 0 }}>
                  Set domino standar 28 kartu balak (0-0 s/d 6-6). KancaSela mendukung mode <strong>Gaple Tradisional (Individu / Pasangan 2v2)</strong> dan <strong>Domino QiuQiu (9-9 / Ceme)</strong>.
                </p>
              </div>

              {/* Gaple */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: '#38BDF8' }}>
                  🀄 1. Gaple Tradisional & Aturan Buntu (Deadlock)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <strong>Menang Normal (Out)</strong>: Pemain yang pertama kali menghabiskan kartu di tangan mendapat 0 denda. Seluruh lawan menjumlahkan total titik kartu yang tersisa di tangan.
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', color: '#FCD34D' }}>
                    <strong>🔒 Kondisi Gaple (Macet / Buntu)</strong>: Jika kedua ujung meja tertutup dan tidak ada pemain yang bisa jalan, seluruh pemain membuka kartu di tangan:
                    <ul style={{ margin: '4px 0 0 16px', padding: 0, lineHeight: 1.5 }}>
                      <li><strong>Aturan Titik Terendah</strong>: Pemain dengan total titik terkecil menang (0 denda), pemain lain dikenakan denda sesuai titik masing-masing.</li>
                      <li><strong>Aturan Pembuat Buntu Dihukum</strong>: Jika pemain yang meletakkan kartu penutup buntu tidak memiliki titik terkecil, ia menanggung total seluruh titik meja!</li>
                    </ul>
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#FCA5A5' }}>
                    <strong>⚠️ Denda Balak Mati</strong>: Balak 0-0 mati dikenakan denda +10 titik, Balak 6-6 mati dikenakan denda +12 titik.
                  </div>
                </div>
              </div>

              {/* QiuQiu */}
              <div style={{
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '14px',
                padding: '14px 16px'
              }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', marginBottom: '10px', color: '#34D399' }}>
                  🎲 2. Domino QiuQiu (9-9 / Ceme)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem', color: 'var(--text-main)' }}>
                  <div style={{ padding: '8px 10px', background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                    <strong>Nilai Kombinasi (Modulo 10)</strong>: 4 kartu dibagi menjadi 2 pasang (Kiri & Kanan). Jumlah titik tiap pasang diambil digit satuannya (target 9-9).
                  </div>
                  <div style={{ padding: '8px 10px', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', color: '#FCD34D' }}>
                    <strong>Hierarki Kartu Spesial (Dewa)</strong>:
                    <ol style={{ margin: '4px 0 0 16px', padding: 0, lineHeight: 1.5 }}>
                      <li><strong>6 Dewa (Six Devils)</strong>: Keempat kartu masing-masing bernilai tepat 6 titik (Kasta Tertinggi).</li>
                      <li><strong>4 Balak (4 Doubles)</strong>: Keempat kartu semuanya adalah kartu kembar (balak).</li>
                      <li><strong>Murni Kecil</strong>: Total titik seluruh 4 kartu ≤ 9.</li>
                      <li><strong>Murni Besar</strong>: Total titik seluruh 4 kartu ≥ 39.</li>
                      <li><strong>Qiu Qiu</strong>: Kombinasi seimbang 9 - 9.</li>
                    </ol>
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
