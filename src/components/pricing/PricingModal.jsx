import React, { useState } from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'

export default function PricingModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const [billingCycle, setBillingCycle] = useState('yearly') // 'monthly' | 'yearly'

  if (!isOpen) return null

  const handleSelectPlan = (planName) => {
    hapticsService.medium()
    soundService.playVictory()
    alert(`Terima kasih atas antusiasme Anda! Paket "${planName}" akan segera hadir di pembaruan rilis berikutnya.`)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '840px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className="modal-header">
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#A78BFA', letterSpacing: '1px', textTransform: 'uppercase' }}>
              KANCASELA TIERS
            </span>
            <h3 className="modal-title" style={{ fontSize: '1.6rem', fontWeight: 900, marginTop: '2px' }}>
              💎 {t('pricing.title')}
            </h3>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: '20px' }}>
          {t('pricing.subtitle')}
        </p>

        {/* Billing Cycle Toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.4)',
            padding: '4px',
            borderRadius: '999px',
            border: '1px solid var(--border-glass)'
          }}>
            <button
              className={`btn btn-sm ${billingCycle === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '999px', padding: '6px 18px', fontSize: '0.85rem' }}
              onClick={() => { hapticsService.light(); setBillingCycle('monthly') }}
            >
              {t('pricing.monthly')}
            </button>
            <button
              className={`btn btn-sm ${billingCycle === 'yearly' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: '999px', padding: '6px 18px', fontSize: '0.85rem', position: 'relative' }}
              onClick={() => { hapticsService.light(); setBillingCycle('yearly') }}
            >
              {t('pricing.yearly')}
              <span style={{
                fontSize: '0.65rem',
                background: '#10B981',
                color: '#000',
                fontWeight: 800,
                padding: '1px 6px',
                borderRadius: '999px',
                marginLeft: '6px'
              }}>
                HEMAT 35%
              </span>
            </button>
          </div>
        </div>

        {/* 3 Pricing Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '18px',
          marginBottom: '24px'
        }}>
          {/* 1. FREE PLAN */}
          <div style={{
            background: 'var(--bg-glass-strong)',
            border: '1px solid var(--border-glass)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px' }}>
                🎮 {t('pricing.free_name')}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {t('pricing.free_desc')}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '18px' }}>
                Rp 0 <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>/ selamanya</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>✅ Akses semua game (Truf, Remi, Omben)</li>
                <li>✅ Jam catur 180° & Papan Skor 2-8</li>
                <li>✅ Alat dadu 3D, koin, & finger chooser</li>
                <li>✅ Live spectator room 0-login</li>
                <li>✅ Ekspor Kartu 9:16 Standar</li>
                <li>⚠️ Maksimal 5 riwayat game terakhir</li>
              </ul>
            </div>

            <button 
              className="btn btn-secondary btn-block"
              disabled
              style={{ opacity: 0.8 }}
            >
              {t('pricing.current_plan')}
            </button>
          </div>

          {/* 2. KANCASELA PRO (HIGHLIGHTED) */}
          <div style={{
            background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.15), rgba(15, 23, 42, 0.8))',
            border: '2px solid #8B5CF6',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            boxShadow: '0 12px 35px -5px rgba(139, 92, 246, 0.3)'
          }}>
            <div style={{
              position: 'absolute',
              top: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'linear-gradient(90deg, #8B5CF6, #EC4899)',
              color: '#FFF',
              fontSize: '0.72rem',
              fontWeight: 900,
              letterSpacing: '1px',
              padding: '3px 12px',
              borderRadius: '999px',
              textTransform: 'uppercase'
            }}>
              ⭐ PALING POPULER
            </div>

            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', color: '#C084FC' }}>
                👑 {t('pricing.pro_name')}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {t('pricing.pro_desc')}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '4px', color: '#FFF' }}>
                {billingCycle === 'yearly' ? 'Rp 149.000' : 'Rp 19.000'}
                <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                  {billingCycle === 'yearly' ? ' / tahun' : ' / bulan'}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#10B981', marginBottom: '18px', fontWeight: 700 }}>
                {billingCycle === 'yearly' ? 'Hanya Rp 12.400 / bulan' : 'Langganan fleksibel'}
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>✨ <strong>Riwayat game tanpa batas</strong> seumur hidup</li>
                <li>📊 <strong>Analitik Head-to-Head</strong> (Winrate vs Teman)</li>
                <li>📸 <strong>Template Story 9:16 VIP</strong> (Gold, Neon Cyberpunk)</li>
                <li>🎵 Paket suara mekanikal & selebrasi custom</li>
                <li>📑 Ekspor laporan turnamen ke Excel / PDF</li>
                <li>👑 Badge Mahkota Emas di profil & avatar</li>
              </ul>
            </div>

            <button 
              className="btn btn-primary btn-block"
              style={{
                background: 'linear-gradient(90deg, #8B5CF6, #7C3AED)',
                border: 'none',
                boxShadow: '0 8px 20px rgba(139, 92, 246, 0.4)'
              }}
              onClick={() => handleSelectPlan('KancaSela Pro')}
            >
              🚀 {t('pricing.upgrade_pro')}
            </button>
          </div>

          {/* 3. VENUE / CAFE EDITION (B2B) */}
          <div style={{
            background: 'var(--bg-glass-strong)',
            border: '1px solid var(--border-glass)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '6px', color: '#F59E0B' }}>
                ☕ {t('pricing.venue_name')}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                {t('pricing.venue_desc')}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '18px' }}>
                Rp 199.000 <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>/ bulan</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px 0', fontSize: '0.88rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>📺 <strong>Mode TV Layar Lebar</strong> (Klasemen live di TV kafe)</li>
                <li>🏆 <strong>Bagan Turnamen Otomatis</strong> (Sistem Gugur & Swiss)</li>
                <li>🏷️ <strong>Branding Kafe Sendiri</strong> di story card pemain</li>
                <li>👥 Kelola multi-meja & liga komunitas</li>
                <li>📞 Dukungan Prioritas & Konsultasi Event</li>
              </ul>
            </div>

            <button 
              className="btn btn-secondary btn-block"
              style={{ borderColor: '#F59E0B', color: '#FBBF24' }}
              onClick={() => handleSelectPlan('Venue Edition')}
            >
              ☕ {t('pricing.contact_sales')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
