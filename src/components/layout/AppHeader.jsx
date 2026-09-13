import React from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { authService } from '../../services/authService'

export default function AppHeader({ user, onOpenAuth, onNavigate, currentView, onOpenPricing }) {
  const { locale, toggleLocale, t } = useTranslation()
  const isPro = authService.isUserPro(user)

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
            onClick={onOpenPricing}
            style={{
              background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.25))',
              border: '1px solid rgba(245, 158, 11, 0.6)',
              color: '#FCD34D',
              fontWeight: 800,
              fontSize: '0.76rem',
              padding: '4px 10px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(245, 158, 11, 0.2)'
            }}
          >
            <span>👑</span>
            <span>PRO</span>
          </div>
        ) : (
          <button
            className="btn btn-sm"
            onClick={onOpenPricing}
            style={{
              background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              color: '#C084FC',
              fontWeight: 800,
              fontSize: '0.78rem',
              padding: '5px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>⭐</span>
            <span>Upgrade</span>
          </button>
        )}

        {/* Language Switcher */}
        <button 
          className="btn-lang" 
          onClick={toggleLocale}
          title="Toggle Language / Ganti Bahasa"
        >
          <span>{locale === 'id' ? '🇮🇩 ID' : '🇬🇧 EN'}</span>
        </button>

        {/* Admin Portal Shortcut if Admin */}
        {user?.profile?.role === 'admin' && (
          <button 
            className={`btn btn-sm ${currentView === 'admin' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onNavigate('admin')}
            style={{ fontSize: '0.78rem', padding: '5px 10px' }}
          >
            🛡️ {t('nav.admin')}
          </button>
        )}

        {/* User Profile or Guest Login Button */}
        {user ? (
          <div className="user-badge" onClick={onOpenAuth} style={{ cursor: 'pointer' }}>
            <div className="avatar-circle">
              {user.profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <span>{user.profile?.display_name || user.email?.split('@')[0]}</span>
          </div>
        ) : (
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={onOpenAuth}
          >
            {t('nav.login')}
          </button>
        )}
      </div>
    </header>
  )
}
