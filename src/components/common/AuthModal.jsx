import React, { useState, useEffect, useRef } from 'react'
import { authService } from '../../services/authService'
import { useTranslation } from '../../i18n/I18nContext'

export default function AuthModal({ isOpen, onClose, user, onAuthSuccess }) {
  const { t } = useTranslation()
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const googleBtnRef = useRef(null)

  useEffect(() => {
    if (isOpen && !user && googleBtnRef.current) {
      authService.renderGoogleButton(
        googleBtnRef.current,
        () => {
          if (onAuthSuccess) onAuthSuccess()
          onClose()
        },
        (err) => {
          setErrorMsg(err.message || 'Gagal masuk dengan Google.')
        }
      )
    }
  }, [isOpen, user, isRegistering, onAuthSuccess, onClose])

  if (!isOpen) return null

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)
    try {
      if (isRegistering) {
        await authService.signUp(email, password, displayName)
        alert('Pendaftaran berhasil! Silakan periksa email Anda atau langsung masuk.')
        setIsRegistering(false)
      } else {
        await authService.signIn(email, password)
        if (onAuthSuccess) onAuthSuccess()
        onClose()
      }
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat masuk.')
    } finally {
      setLoading(false)
    }
  }

  const handleFallbackGoogleAuth = async () => {
    setErrorMsg('')
    try {
      await authService.signInWithGoogle()
    } catch (err) {
      setErrorMsg(err.message || 'Gagal masuk dengan Google.')
    }
  }

  const handleSignOut = async () => {
    await authService.signOut()
    if (onAuthSuccess) onAuthSuccess()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3 className="modal-title">
            {user ? 'Profil Pengguna' : isRegistering ? t('auth.register_title') : t('auth.login_title')}
          </h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {user ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div className="avatar-circle" style={{ width: '64px', height: '64px', fontSize: '1.8rem', margin: '0 auto 12px auto' }}>
              {user.profile?.display_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <h4 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{user.profile?.display_name || 'Player'}</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>{user.email}</p>

            <div style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '999px', background: 'var(--bg-glass-strong)', fontSize: '0.78rem', marginBottom: '24px' }}>
              Peran: <strong style={{ color: 'var(--primary)' }}>{user.profile?.role?.toUpperCase() || 'USER'}</strong>
            </div>

            <button className="btn btn-danger btn-block" onClick={handleSignOut}>
              🚪 {t('nav.logout')}
            </button>
          </div>
        ) : (
          <div>
            {errorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#F87171', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                {errorMsg}
              </div>
            )}

            {/* Official Native Google Sign-In Button (In-Page on gns.avl.my.id) */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px', minHeight: '44px' }}>
              <div ref={googleBtnRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                {/* Fallback button if Google script is loading */}
                <button 
                  type="button"
                  className="btn btn-block btn-secondary" 
                  onClick={handleFallbackGoogleAuth}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                >
                  <span style={{ fontSize: '1.1rem' }}>🌐</span>
                  <span>{t('auth.google_sso')}</span>
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'center', position: 'relative', margin: '18px 0' }}>
              <hr style={{ borderColor: 'var(--border-glass)' }} />
              <span style={{ position: 'absolute', top: '-10px', left: '50%', transform: 'translateX(-50%)', background: '#151828', padding: '0 10px', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                ATAU EMAIL
              </span>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleEmailAuth}>
              {isRegistering && (
                <div className="form-group">
                  <label className="form-label">{t('auth.name_placeholder')}</label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="form-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="btn btn-primary btn-block"
                disabled={loading}
                style={{ marginTop: '8px' }}
              >
                {loading ? t('app.loading') : isRegistering ? t('auth.sign_up') : t('auth.sign_in')}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button 
                className="btn btn-sm"
                onClick={() => { setIsRegistering(!isRegistering); setErrorMsg('') }}
                style={{ background: 'transparent', color: 'var(--primary)' }}
              >
                {isRegistering ? t('auth.has_account') : t('auth.no_account')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
