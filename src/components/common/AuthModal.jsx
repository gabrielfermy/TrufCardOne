import React, { useState, useEffect, useRef } from 'react'
import { authService } from '../../services/authService'
import { useTranslation } from '../../i18n/I18nContext'

// Helper for evaluating password strength (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)
const evaluatePassword = (pwd) => {
  const p = pwd || ''
  const min8 = p.length >= 8
  const hasUpper = /[A-Z]/.test(p)
  const hasLower = /[a-z]/.test(p)
  const hasNumber = /[0-9]/.test(p)
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(p)

  const passedCount = [min8, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length

  let label = 'strength_very_weak'
  let color = '#EF4444' // red
  let percent = 20

  if (passedCount <= 1) {
    label = 'strength_very_weak'
    color = '#EF4444'
    percent = 20
  } else if (passedCount <= 3) {
    label = 'strength_weak'
    color = '#F97316' // orange
    percent = 50
  } else if (passedCount === 4) {
    label = 'strength_medium'
    color = '#EAB308' // yellow
    percent = 75
  } else {
    label = 'strength_strong'
    color = '#10B981' // emerald
    percent = 100
  }

  return {
    min8,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    passedCount,
    isValid: passedCount === 5,
    label,
    color,
    percent
  }
}

export default function AuthModal({ isOpen, onClose, user, onAuthSuccess }) {
  const { t } = useTranslation()
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [registrationSuccessEmail, setRegistrationSuccessEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const googleBtnRef = useRef(null)

  const passEval = evaluatePassword(password)

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

    if (isRegistering) {
      if (!passEval.isValid) {
        setErrorMsg(t('auth.password_requirements_unmet'))
        return
      }
      if (password !== confirmPassword) {
        setErrorMsg(t('auth.password_mismatch'))
        return
      }
    }

    setLoading(true)
    try {
      if (isRegistering) {
        const data = await authService.signUp(email, password, displayName)
        if (data?.session) {
          if (onAuthSuccess) onAuthSuccess()
          onClose()
        } else {
          setRegistrationSuccessEmail(email)
          setPassword('')
          setConfirmPassword('')
        }
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
        ) : registrationSuccessEmail ? (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div style={{ fontSize: '3.2rem', marginBottom: '12px' }}>✉️</div>
            <h4 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px', color: '#FFF' }}>
              Periksa Email Anda
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '14px' }}>
              Tautan konfirmasi pendaftaran telah dikirim ke:<br />
              <strong style={{ color: '#A78BFA', wordBreak: 'break-all' }}>{registrationSuccessEmail}</strong>
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.5, marginBottom: '20px' }}>
              Silakan buka email Anda dan klik tautan konfirmasi untuk mengaktifkan akun KancaSela Anda sebelum masuk.
            </p>
            <div style={{
              background: 'rgba(139, 92, 246, 0.1)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '0.8rem',
              color: '#C084FC',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              💡 <em>Tidak menemukan email di Inbox? Jangan lupa periksa folder <strong>Spam / Promosi</strong>.</em>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => {
                setRegistrationSuccessEmail('')
                setIsRegistering(false)
                setErrorMsg('')
              }}
            >
              Kembali ke Halaman Masuk
            </button>
          </div>
        ) : (
          <div>
            {errorMsg && (
              <div style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#F87171', padding: '10px 14px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                {errorMsg}
              </div>
            )}

            {/* Official Native Google Sign-In Button (In-Page on kancasela.my.id) */}
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

              <div className="form-group" style={{ marginBottom: isRegistering ? '8px' : '16px' }}>
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    className="form-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ paddingRight: '42px' }}
                    required
                    minLength={isRegistering ? 8 : 6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0.75
                    }}
                    title={showPassword ? "Sembunyikan password" : "Lihat password"}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Password Strength Meter & Live Checklist (Only on Register) */}
              {isRegistering && (
                <div style={{ marginBottom: '16px', marginTop: '4px' }}>
                  {/* Strength Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Kekuatan Kata Sandi:</span>
                    <span style={{ fontSize: '0.74rem', fontWeight: 800, color: password.length > 0 ? passEval.color : 'var(--text-dim)' }}>
                      {password.length > 0 ? t(`auth.${passEval.label}`) : '-'}
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '5px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '999px',
                    overflow: 'hidden',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      width: password.length > 0 ? `${passEval.percent}%` : '0%',
                      height: '100%',
                      background: passEval.color,
                      transition: 'all 0.3s ease',
                      borderRadius: '999px'
                    }} />
                  </div>

                  {/* 5 Criteria Badges */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '5px',
                    fontSize: '0.71rem',
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-glass)'
                  }}>
                    <div style={{ color: passEval.min8 ? '#34D399' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontWeight: 800 }}>{passEval.min8 ? '✓' : '○'}</span>
                      <span>{t('auth.req_min_chars')}</span>
                    </div>
                    <div style={{ color: passEval.hasUpper ? '#34D399' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontWeight: 800 }}>{passEval.hasUpper ? '✓' : '○'}</span>
                      <span>{t('auth.req_uppercase')}</span>
                    </div>
                    <div style={{ color: passEval.hasLower ? '#34D399' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontWeight: 800 }}>{passEval.hasLower ? '✓' : '○'}</span>
                      <span>{t('auth.req_lowercase')}</span>
                    </div>
                    <div style={{ color: passEval.hasNumber ? '#34D399' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ fontWeight: 800 }}>{passEval.hasNumber ? '✓' : '○'}</span>
                      <span>{t('auth.req_number')}</span>
                    </div>
                    <div style={{ color: passEval.hasSpecial ? '#34D399' : 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '5px', gridColumn: 'span 2' }}>
                      <span style={{ fontWeight: 800 }}>{passEval.hasSpecial ? '✓' : '○'}</span>
                      <span>{t('auth.req_special')}</span>
                    </div>
                  </div>
                </div>
              )}

              {isRegistering && (
                <div className="form-group">
                  <label className="form-label">Konfirmasi Password</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      className="form-input"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      style={{ paddingRight: '42px' }}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: 0.75
                      }}
                      title={showConfirmPassword ? "Sembunyikan password" : "Lihat password"}
                    >
                      {showConfirmPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              )}

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
                onClick={() => {
                  setIsRegistering(!isRegistering)
                  setErrorMsg('')
                  setPassword('')
                  setConfirmPassword('')
                  setShowPassword(false)
                  setShowConfirmPassword(false)
                }}
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
