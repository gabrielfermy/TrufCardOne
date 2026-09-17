import React, { useState, useEffect } from 'react'
import { supabase } from '../../services/supabaseClient'
import { authService } from '../../services/authService'
import { adminService } from '../../services/adminService'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import AdminDashboard from './AdminDashboard'

export default function AdminPortalShell() {
  const [adminUser, setAdminUser] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  
  // Login Form States
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [authError, setAuthError] = useState('')

  // Check existing session on mount
  const checkAdminAuth = async () => {
    setCheckingAuth(true)
    setAuthError('')
    try {
      const currentUser = await authService.getCurrentUser()
      if (currentUser) {
        if (currentUser.profile?.role === 'admin') {
          setAdminUser(currentUser)
        } else {
          // Logged in user is NOT an admin -> log out from admin subdomain
          await authService.signOut()
          setAdminUser(null)
          setAuthError('Akses Ditolak: Akun Anda tidak memiliki hak akses Superadmin.')
        }
      } else {
        setAdminUser(null)
      }
    } catch (err) {
      console.warn('Admin auth check error:', err)
      setAdminUser(null)
    } finally {
      setCheckingAuth(false)
    }
  }

  useEffect(() => {
    checkAdminAuth()
    
    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        checkAdminAuth()
      } else if (event === 'SIGNED_OUT') {
        setAdminUser(null)
      }
    })

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // Handle Admin Login Submit
  const handleAdminLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password || loginLoading) return

    setLoginLoading(true)
    setAuthError('')

    try {
      const result = await adminService.signInAdmin(email.trim(), password)
      soundService.playVictory()
      hapticsService.success()
      setAdminUser(result)
    } catch (err) {
      soundService.playClick()
      hapticsService.error()
      setAuthError(err.message || 'Login gagal. Periksa kembali email dan password Anda.')
    } finally {
      setLoginLoading(false)
    }
  }

  // Handle Admin Logout
  const handleAdminLogout = async () => {
    try {
      await authService.signOut()
      soundService.playClick()
      setAdminUser(null)
      setAuthError('')
    } catch (err) {
      console.warn('Logout error:', err)
    }
  }

  // Get main website link
  const getMainSiteUrl = () => {
    if (typeof window === 'undefined') return 'https://kancasela.my.id'
    const hostname = window.location.hostname
    const port = window.location.port ? `:${window.location.port}` : ''
    const protocol = window.location.protocol
    if (hostname.includes('admin.kancasela.test')) {
      return `${protocol}//kancasela.test${port}`
    }
    if (hostname.includes('admin.koncoselo.my.id')) {
      return `${protocol}//koncoselo.my.id${port}`
    }
    if (hostname.includes('admin.localhost')) {
      return `${protocol}//localhost${port}`
    }
    if (hostname.startsWith('admin.')) {
      return `${protocol}//${hostname.replace(/^admin\./, '')}${port}`
    }
    return 'https://www.kancasela.my.id'
  }

  if (checkingAuth) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0B0F19',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#94A3B8',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '14px', animation: 'pulse 1.5s infinite' }}>🛡️</div>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: '#A78BFA' }}>Memvalidasi Sesi Superadmin...</div>
        <div style={{ fontSize: '0.8rem', color: '#64748B', marginTop: '4px' }}>
          {typeof window !== 'undefined' ? window.location.hostname : 'admin.kancasela.my.id'}
        </div>
      </div>
    )
  }

  // ============================================================================
  // VIEW A: LOGGED IN AS SUPERADMIN
  // ============================================================================
  if (adminUser) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0B0F19 0%, #0F172A 100%)',
        color: '#F8FAFC',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        {/* Dedicated Admin Top Navigation Bar */}
        <header style={{
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(139, 92, 246, 0.25)',
          padding: '12px 24px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>♠️</span>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#FFF', letterSpacing: '0.5px' }}>
                KancaSela <span style={{ color: '#A78BFA' }}>Enterprise</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#34D399', fontWeight: 700 }}>
                🔒 Subdomain Auth: <code>admin.kancasela.my.id</code>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '999px',
              padding: '4px 12px',
              fontSize: '0.78rem',
              color: '#C084FC',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>🛡️</span>
              <strong>{adminUser.profile?.display_name || adminUser.email}</strong>
              <span style={{ background: '#10B981', color: '#000', fontSize: '0.65rem', fontWeight: 900, padding: '1px 6px', borderRadius: '999px' }}>
                SUPERADMIN
              </span>
            </div>

            <a
              href={getMainSiteUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem', padding: '6px 12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              🌐 Buka Web Game ↗
            </a>

            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={handleAdminLogout}
              style={{ fontSize: '0.78rem', padding: '6px 14px' }}
            >
              🚪 Logout
            </button>
          </div>
        </header>

        {/* Dashboard Workspace */}
        <main style={{ padding: '24px 16px', maxWidth: '1200px', margin: '0 auto' }}>
          <AdminDashboard />
        </main>
      </div>
    )
  }

  // ============================================================================
  // VIEW B: DEDICATED SUPERADMIN LOGIN FORM
  // ============================================================================
  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(ellipse at top, #1E1B4B 0%, #0B0F19 70%, #030712 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      color: '#F8FAFC',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Login Card Container */}
      <div style={{
        maxWidth: '440px',
        width: '100%',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 30px rgba(139, 92, 246, 0.15)',
        borderRadius: '24px',
        padding: '36px 30px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow Top Accent */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, #8B5CF6, #EC4899, #10B981)'
        }} />

        {/* Header Branding */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(16, 185, 129, 0.2))',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: '20px',
            fontSize: '2rem',
            marginBottom: '14px',
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.25)'
          }}>
            🛡️
          </div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 900, margin: '0 0 6px 0', color: '#FFF', letterSpacing: '0.3px' }}>
            Superadmin Console
          </h1>
          <div style={{ fontSize: '0.82rem', color: '#94A3B8' }}>
            Portal Manajemen Resmi • <code>admin.kancasela.my.id</code>
          </div>
        </div>

        {/* Error Notification */}
        {authError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#FCA5A5',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '0.82rem',
            lineHeight: 1.4,
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <div>{authError}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleAdminLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ fontSize: '0.82rem', color: '#CBD5E1', fontWeight: 700 }}>
              Email Administrator
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="admin@kancasela.my.id"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                borderColor: 'rgba(139, 92, 246, 0.3)',
                color: '#FFF',
                padding: '12px 14px',
                borderRadius: '12px',
                fontSize: '0.92rem'
              }}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ fontSize: '0.82rem', color: '#CBD5E1', fontWeight: 700, margin: 0 }}>
                Kata Sandi
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#A78BFA',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showPassword ? 'Sembunyikan' : 'Tampilkan'}
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="••••••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                background: 'rgba(0, 0, 0, 0.4)',
                borderColor: 'rgba(139, 92, 246, 0.3)',
                color: '#FFF',
                padding: '12px 14px',
                borderRadius: '12px',
                fontSize: '0.92rem'
              }}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loginLoading}
            style={{
              padding: '13px',
              fontSize: '0.95rem',
              fontWeight: 800,
              borderRadius: '12px',
              background: 'linear-gradient(90deg, #8B5CF6, #7C3AED)',
              boxShadow: '0 8px 20px rgba(139, 92, 246, 0.35)',
              marginTop: '6px',
              border: 'none'
            }}
          >
            {loginLoading ? 'Memverifikasi Hak Akses...' : '🛡️ Masuk ke Konsol Admin'}
          </button>
        </form>

        {/* Security Seals & Back Link */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          marginTop: '24px',
          paddingTop: '16px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div style={{ fontSize: '0.74rem', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span>🔒</span>
            <span>256-bit Encrypted • Isolated Subdomain Auth Guard</span>
          </div>

          <a
            href={getMainSiteUrl()}
            style={{
              fontSize: '0.82rem',
              color: '#A78BFA',
              textDecoration: 'none',
              fontWeight: 600
            }}
          >
            ← Kembali ke Website Utama (kancasela.my.id)
          </a>
        </div>
      </div>
    </div>
  )
}
