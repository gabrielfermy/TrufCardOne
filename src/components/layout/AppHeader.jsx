import React from 'react'
import { useTranslation } from '../../i18n/I18nContext'
import { authService } from '../../services/authService'

export default function AppHeader({ user, onOpenAuth, onOpenProfile, onNavigate, currentView, onOpenPricing }) {
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
              fontSize: '0.76rem',
              padding: '4px 10px',
              borderRadius: '999px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.2)'
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
            className="btn btn-sm btn-secondary"
            onClick={() => {
              if (typeof window !== 'undefined') {
                const host = window.location.hostname
                const port = window.location.port ? `:${window.location.port}` : ''
                if (host.includes('localhost') || host.includes('127.0.0.1')) {
                  window.location.href = `${window.location.protocol}//admin.localhost${port}`
                } else {
                  window.location.href = 'https://admin.kancasela.my.id'
                }
              }
            }}
            style={{ fontSize: '0.78rem', padding: '5px 10px', borderColor: 'rgba(139, 92, 246, 0.5)', color: '#A78BFA' }}
            title="Buka Portal Superadmin di admin.kancasela.my.id"
          >
            🛡️ {t('nav.admin')} ↗
          </button>
        )}

        {/* User Profile or Guest Login Button */}
        {user ? (
          <div className="user-badge" onClick={handleProfileClick} style={{ cursor: 'pointer' }}>
            <div className="avatar-circle" style={{ overflow: 'hidden', padding: 0 }}>
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
