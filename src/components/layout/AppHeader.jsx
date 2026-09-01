import React from 'react'
import { useTranslation } from '../../i18n/I18nContext'

export default function AppHeader({ user, onOpenAuth, onNavigate, currentView }) {
  const { locale, toggleLocale, t } = useTranslation()

  return (
    <header className="app-header">
      <div className="brand-logo" onClick={() => onNavigate('hub')}>
        <span>♠</span>
        <span>{t('app.name')}</span>
      </div>

      <div className="header-actions">
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
