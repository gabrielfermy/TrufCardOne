import React from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { authService } from '../../services/authService'
import ThemeSelector from '../common/ThemeSelector'

export default function AppHeader({ user, onOpenAuth, onOpenProfile, onNavigate, currentView, onOpenPricing, onOpenRules }) {
  const { locale, toggleLocale, t } = useTranslation()
  const isPro = authService.isUserPro(user)

  const handleProfileClick = () => {
    if (user && onOpenProfile) {
      onOpenProfile()
    } else if (onOpenAuth) {
      onOpenAuth()
    }
  }

  return (
    <header className="app-header">
      <div className="brand-logo" onClick={() => onNavigate('hub')}>
        <span>♠</span>
        <span>{t('app.name')}</span>
      </div>

      <div className="header-actions">
        {/* Pricing / Pro Badge Button */}
        {isPro ? (
          <div
            onClick={handleProfileClick}
            style={{
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.25), rgba(5, 150, 105, 0.25))',
              border: '1px solid rgba(16, 185, 129, 0.6)',
              color: '#34D399',
              fontWeight: 800,
              fontSize: '0.74rem',
              padding: '3px 8px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.2)',
              whiteSpace: 'nowrap'
            }}
            title="Kanca Pro Aktif - Klik untuk lihat status & transaksi"
          >
            <span>👑</span>
            <span>PRO</span>
          </div>
        ) : (
          <button
            className="btn btn-sm"
            onClick={onOpenPricing}
            style={{
              background: 'linear-gradient(90deg, var(--badge-purple-bg), var(--badge-blue-bg))',
              border: '1px solid var(--badge-purple-border)',
              color: 'var(--badge-purple-text)',
              fontWeight: 800,
              fontSize: '0.76rem',
              padding: '4px 8px',
              display: 'flex',
              alignItems: 'center',
              gap: '3px',
              whiteSpace: 'nowrap'
            }}
          >
            <span>⭐</span>
            <span className="hide-mobile">Upgrade</span>
          </button>
        )}

        {/* Game Rules Reference Button (Desktop only, mobile has it inside games) */}
        <button
          className="btn btn-sm btn-secondary hide-mobile"
          onClick={onOpenRules}
          style={{
            fontSize: '0.78rem',
            padding: '5px 10px',
            borderRadius: '8px',
            color: 'var(--text-main)',
            alignItems: 'center',
            gap: '4px'
          }}
          title={t('rules_modal.title')}
        >
          <span>📖</span>
          <span>{t('rules_modal.quick_btn')}</span>
        </button>

        {/* Language Switcher */}
        <button 
          className="btn-lang" 
          onClick={toggleLocale}
          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
          title="Toggle Language / Ganti Bahasa"
        >
          <span>{locale === 'id' ? 'ID' : 'EN'}</span>
        </button>

        {/* Theme Selector (Dark, Light, System) */}
        <ThemeSelector compact={true} />

        {/* Admin Portal Shortcut if Admin */}
        {user?.profile?.role === 'admin' && (
          <button 
            className="btn btn-sm btn-secondary hide-mobile"
            onClick={() => {
              if (typeof window !== 'undefined') {
                const host = window.location.hostname
                const port = window.location.port ? `:${window.location.port}` : ''
                const protocol = window.location.protocol
                if (host.includes('kancasela.test')) {
                  window.location.href = `${protocol}//admin.kancasela.test${port}`
                } else if (host.includes('koncoselo.my.id')) {
                  window.location.href = `${protocol}//admin.koncoselo.my.id${port}`
                } else if (host.includes('localhost') || host.includes('127.0.0.1')) {
                  window.location.href = `${protocol}//admin.localhost${port}`
                } else if (host.startsWith('admin.')) {
                  window.location.href = `${protocol}//${host}${port}`
                } else {
                  window.location.href = `${protocol}//admin.${host.replace(/^www\./, '')}${port}`
                }
              }
            }}
            style={{ fontSize: '0.74rem', padding: '4px 8px', borderColor: 'rgba(139, 92, 246, 0.5)', color: '#A78BFA' }}
            title="Buka Portal Superadmin"
          >
            🛡️ {t('nav.admin')} ↗
          </button>
        )}

        {/* User Profile or Guest Login Button */}
        {user ? (
          <div className="user-badge" onClick={handleProfileClick} style={{ cursor: 'pointer', padding: '2px 6px' }}>
            <div className="avatar-circle" style={{ width: '26px', height: '26px', fontSize: '0.75rem', overflow: 'hidden', padding: 0 }}>
              {user.profile?.avatar_url ? (
                <img 
                  src={user.profile.avatar_url} 
                  alt="Avatar" 
                  referrerPolicy="no-referrer"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} 
                />
              ) : (
                user.profile?.display_name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <span className="hide-mobile" style={{ fontSize: '0.8rem', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.profile?.display_name || user.email?.split('@')[0]}
            </span>
          </div>
        ) : (
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={onOpenAuth}
            style={{ padding: '4px 8px', fontSize: '0.76rem' }}
          >
            {t('nav.login')}
          </button>
        )}
      </div>
    </header>
  )
}
