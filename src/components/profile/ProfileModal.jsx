import React, { useState, useEffect } from 'react'
import { authService } from '../../services/authService'
import { paymentHistoryService } from '../../services/paymentHistoryService'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'
import { useTranslation } from '../../i18n/I18nContext'
import { supabase } from '../../services/supabaseClient'
import ThemeSelector from '../common/ThemeSelector'

export default function ProfileModal({
  isOpen,
  onClose,
  user,
  onUserUpdated,
  onOpenPricing,
  onOpenSupportTicket,
  onSignOut
}) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('account') // 'account' | 'billing'
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'settlement' | 'pending' | 'failed'
  const [transactions, setTransactions] = useState([])
  const [loadingTx, setLoadingTx] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  
  // Edit Display Name State
  const [isEditingName, setIsEditingName] = useState(false)
  const [newDisplayName, setNewDisplayName] = useState(user?.profile?.display_name || '')
  const [savingName, setSavingName] = useState(false)
  const [nameSuccessNotice, setNameSuccessNotice] = useState(false)
  const [copiedOrderId, setCopiedOrderId] = useState(null)
  const [copiedVa, setCopiedVa] = useState(null)

  useEffect(() => {
    if (user?.profile?.display_name) {
      setNewDisplayName(user.profile.display_name)
    }
  }, [user])

  // Fetch transactions when modal opens or when tab changes to billing
  const loadTransactions = async () => {
    if (!user?.id || user.id.startsWith('guest')) return
    setLoadingTx(true)
    try {
      const data = await paymentHistoryService.getUserTransactions(user.id)
      setTransactions(data || [])
    } catch (err) {
      console.warn('Failed to load user transactions:', err)
    } finally {
      setLoadingTx(false)
    }
  }

  useEffect(() => {
    if (isOpen && user?.id) {
      loadTransactions()
    }
  }, [isOpen, user?.id])

  if (!isOpen || !user) return null

  const isPro = authService.isUserPro(user)
  const isVenue = user?.profile?.subscription_tier === 'venue'
  const proExpiresAt = user?.profile?.pro_expires_at
  const formattedExpiry = proExpiresAt 
    ? new Date(proExpiresAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  // Handle Save Display Name
  const handleSaveDisplayName = async (e) => {
    e.preventDefault()
    if (!newDisplayName.trim() || savingName) return

    setSavingName(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          display_name: newDisplayName.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single()

      if (error) throw error

      soundService.playClick()
      hapticsService.success()
      setIsEditingName(false)
      setNameSuccessNotice(true)
      setTimeout(() => setNameSuccessNotice(false), 3000)

      if (onUserUpdated) {
        onUserUpdated({
          ...user,
          profile: data
        })
      }
    } catch (err) {
      alert('Gagal memperbarui nama tampilan: ' + err.message)
    } finally {
      setSavingName(false)
    }
  }

  // Copy helper
  const handleCopy = (text, type, id) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      hapticsService.light()
      if (type === 'order') {
        setCopiedOrderId(id)
        setTimeout(() => setCopiedOrderId(null), 2000)
      } else if (type === 'va') {
        setCopiedVa(id)
        setTimeout(() => setCopiedVa(null), 2000)
      }
    }
  }

  // Filtered transactions
  const filteredTransactions = transactions.filter(tx => {
    if (filterStatus === 'all') return true
    if (filterStatus === 'settlement') return tx.status === 'settlement' || tx.status === 'capture'
    if (filterStatus === 'pending') return tx.status === 'pending'
    if (filterStatus === 'failed') return ['expire', 'deny', 'cancel', 'failure'].includes(tx.status)
    return true
  })

  const settlementCount = transactions.filter(t => t.status === 'settlement' || t.status === 'capture').length
  const pendingCount = transactions.filter(t => t.status === 'pending').length
  const failedCount = transactions.filter(t => ['expire', 'deny', 'cancel', 'failure'].includes(t.status)).length

  const getStatusBadge = (status) => {
    switch (status) {
      case 'settlement':
      case 'capture':
        return (
          <span style={{
            background: 'var(--badge-green-bg)',
            border: '1px solid var(--badge-green-border)',
            color: 'var(--badge-green-text)',
            fontSize: '0.74rem',
            fontWeight: 800,
            padding: '2px 10px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            🟢 {t('profile.status_settlement')}
          </span>
        )
      case 'pending':
        return (
          <span style={{
            background: 'var(--badge-gold-bg)',
            border: '1px solid var(--badge-gold-border)',
            color: 'var(--badge-gold-text)',
            fontSize: '0.74rem',
            fontWeight: 800,
            padding: '2px 10px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            animation: 'pulse 2s infinite'
          }}>
            🟡 {t('profile.status_pending')}
          </span>
        )
      case 'expire':
      case 'deny':
      case 'cancel':
      case 'failure':
        return (
          <span style={{
            background: 'var(--badge-red-bg)',
            border: '1px solid var(--badge-red-border)',
            color: 'var(--badge-red-text)',
            fontSize: '0.74rem',
            fontWeight: 700,
            padding: '2px 10px',
            borderRadius: '999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            🔴 {t('profile.status_expire')}
          </span>
        )
      case 'refund':
        return (
          <span style={{
            background: 'var(--badge-blue-bg)',
            border: '1px solid var(--badge-blue-border)',
            color: 'var(--badge-blue-text)',
            fontSize: '0.74rem',
            fontWeight: 700,
            padding: '2px 10px',
            borderRadius: '999px'
          }}>
            🔵 {t('profile.status_refund')}
          </span>
        )
      default:
        return (
          <span style={{
            background: 'var(--badge-gray-bg)',
            border: '1px solid var(--badge-gray-border)',
            color: 'var(--badge-gray-text)',
            fontSize: '0.74rem',
            padding: '2px 8px',
            borderRadius: '999px'
          }}>
            {status}
          </span>
        )
    }
  }

  const formatRupiah = (num) => {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID')
  }

  return (
    <>
      <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9998 }}>
        <div 
          className="modal-content" 
          onClick={e => e.stopPropagation()} 
          style={{ maxWidth: '640px', width: '95%', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}
        >
          {/* Header */}
          <div className="modal-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.4rem' }}>👤</span>
              <h3 className="modal-title" style={{ fontSize: '1.35rem', fontWeight: 800 }}>
                {t('profile.title')}
              </h3>
            </div>
            <button className="btn-close" onClick={onClose}>✕</button>
          </div>

          {/* Navigation Tabs */}
          <div style={{
            display: 'flex',
            gap: '8px',
            background: 'var(--stepper-bg)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid var(--border-glass)',
            marginBottom: '20px'
          }}>
            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'account' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                flex: 1,
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onClick={() => { hapticsService.light(); setActiveTab('account') }}
            >
              <span>👤</span>
              <span>{t('profile.tab_account')}</span>
            </button>

            <button
              type="button"
              className={`btn btn-sm ${activeTab === 'billing' ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                flex: 1,
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                position: 'relative'
              }}
              onClick={() => { hapticsService.light(); setActiveTab('billing'); loadTransactions() }}
            >
              <span>📜</span>
              <span>{t('profile.tab_billing')}</span>
              {transactions.length > 0 && (
                <span style={{
                  background: pendingCount > 0 ? '#F59E0B' : 'rgba(255,255,255,0.2)',
                  color: pendingCount > 0 ? '#000' : '#FFF',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  padding: '1px 6px',
                  borderRadius: '999px',
                  marginLeft: '4px'
                }}>
                  {transactions.length}
                </span>
              )}
            </button>
          </div>

          {/* ======================================================== */}
          {/* TAB 1: ACCOUNT & MEMBERSHIP                              */}
          {/* ======================================================== */}
          {activeTab === 'account' && (
            <div>
              {/* User Avatar & Identity Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                background: 'var(--bg-glass-strong)',
                border: '1px solid var(--border-glass)',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '18px'
              }}>
                <div 
                  className="avatar-circle" 
                  style={{ 
                    width: '68px', 
                    height: '68px', 
                    fontSize: '1.9rem', 
                    border: isPro ? '2px solid #10B981' : '1px solid var(--border-glass)',
                    boxShadow: isPro ? '0 0 20px rgba(16, 185, 129, 0.4)' : 'none',
                    position: 'relative',
                    flexShrink: 0
                  }}
                >
                  {user.profile?.avatar_url ? (
                    <img 
                      src={user.profile.avatar_url} 
                      alt="Avatar" 
                      referrerPolicy="no-referrer"
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
                    />
                  ) : (
                    user.profile?.display_name?.charAt(0)?.toUpperCase() || 'U'
                  )}
                  {isPro && (
                    <span style={{ position: 'absolute', top: '-8px', right: '-8px', fontSize: '1.3rem' }}>👑</span>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, color: '#FFF' }}>
                      {user.profile?.display_name || 'Player'}
                    </h4>
                    {isPro && (
                      <span style={{
                        background: 'linear-gradient(90deg, #10B981, #059669)',
                        color: '#FFF',
                        fontSize: '0.68rem',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        letterSpacing: '0.5px'
                      }}>
                        👑 PRO
                      </span>
                    )}
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: '3px 0 0 0', wordBreak: 'break-all' }}>
                    {user.email}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '6px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    <span>ID: <code>{user.id?.slice(0, 8)}...</code></span>
                    <span>•</span>
                    <span>{t('profile.role')}: <strong style={{ color: 'var(--primary)' }}>{user.profile?.role?.toUpperCase() || 'USER'}</strong></span>
                  </div>
                </div>
              </div>

              {/* VIP Membership Status Card */}
              {isPro ? (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(15, 23, 42, 0.9))',
                  border: '2px solid #10B981',
                  borderRadius: '16px',
                  padding: '18px',
                  marginBottom: '18px',
                  boxShadow: '0 8px 25px -5px rgba(16, 185, 129, 0.25)',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'linear-gradient(90deg, #10B981, #059669)',
                        color: '#FFF',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        padding: '3px 12px',
                        borderRadius: '999px',
                        marginBottom: '8px'
                      }}>
                        👑 KANCA PRO AKTIF
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#FFF' }}>
                        100% Bebas Iklan & Akses Fitur VIP Terbuka
                      </div>
                      {formattedExpiry && (
                        <div style={{ fontSize: '0.8rem', color: '#34D399', marginTop: '4px', fontWeight: 600 }}>
                          🗓️ Masa aktif berlaku sampai: <strong>{formattedExpiry}</strong>
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      style={{
                        fontSize: '0.78rem',
                        borderColor: '#10B981',
                        color: '#34D399',
                        padding: '6px 14px',
                        borderRadius: '999px',
                        fontWeight: 700
                      }}
                      onClick={() => {
                        onClose()
                        if (onOpenPricing) onOpenPricing()
                      }}
                    >
                      💎 {t('profile.extend_membership')}
                    </button>
                  </div>
                </div>
              ) : isVenue ? (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(15, 23, 42, 0.9))',
                  border: '2px solid #F59E0B',
                  borderRadius: '16px',
                  padding: '18px',
                  marginBottom: '18px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: 'linear-gradient(90deg, #F59E0B, #D97706)',
                        color: '#000',
                        fontWeight: 900,
                        fontSize: '0.8rem',
                        padding: '3px 12px',
                        borderRadius: '999px',
                        marginBottom: '6px'
                      }}>
                        ☕ KANCA WARKOP (B2B) AKTIF
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#FCD34D' }}>
                        Mode TV Layar Lebar & Bagan Turnamen Aktif
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: 'var(--bg-glass-strong)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: '18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 800 }}>
                      {t('profile.active_membership')}
                    </div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFF', marginTop: '2px' }}>
                      🎮 Paket Kanca Free
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Akses standar room multiplayer & game tools
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    style={{
                      background: 'linear-gradient(90deg, #8B5CF6, #7C3AED)',
                      border: 'none',
                      fontWeight: 800,
                      padding: '8px 16px',
                      borderRadius: '999px',
                      boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)'
                    }}
                    onClick={() => {
                      onClose()
                      if (onOpenPricing) onOpenPricing()
                    }}
                  >
                    {t('profile.upgrade_pro_btn')}
                  </button>
                </div>
              )}

              {/* Edit Display Name Card */}
              <div style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--border-glass)',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFF' }}>
                    ✏️ {t('profile.edit_name')}
                  </span>
                  {!isEditingName && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '3px 10px' }}
                      onClick={() => setIsEditingName(true)}
                    >
                      Ubah
                    </button>
                  )}
                </div>

                {nameSuccessNotice && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                    color: '#34D399',
                    fontSize: '0.8rem',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    marginBottom: '10px'
                  }}>
                    ✓ {t('profile.name_updated')}
                  </div>
                )}

                {isEditingName ? (
                  <form onSubmit={handleSaveDisplayName} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={newDisplayName}
                      onChange={e => setNewDisplayName(e.target.value)}
                      placeholder="Nama tampilan baru..."
                      required
                      style={{ flex: 1 }}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={savingName}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {savingName ? t('profile.saving') : t('profile.save_name')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setIsEditingName(false)
                        setNewDisplayName(user.profile?.display_name || '')
                      }}
                    >
                      Batal
                    </button>
                  </form>
                ) : (
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    Nama saat ini: <strong style={{ color: '#FFF' }}>{user.profile?.display_name || 'Player'}</strong>
                  </div>
                )}
              </div>

              {/* Display Theme Selector Card */}
              <div style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--border-glass)',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    🎨 {t('theme.title') || 'Tema Tampilan'}
                  </span>
                </div>
                <ThemeSelector compact={false} />
              </div>

              {/* Help & Support Button */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-block btn-sm"
                  style={{ borderRadius: '10px', padding: '10px', borderColor: 'rgba(139, 92, 246, 0.4)', color: '#C084FC' }}
                  onClick={() => {
                    onClose()
                    if (onOpenSupportTicket) onOpenSupportTicket()
                  }}
                >
                  🎫 Laporkan Kendala / Bantuan Superadmin
                </button>
              </div>

              {/* Logout Button */}
              <button 
                type="button" 
                className="btn btn-danger btn-block" 
                style={{ borderRadius: '12px', padding: '12px' }}
                onClick={() => {
                  onClose()
                  if (onSignOut) onSignOut()
                }}
              >
                🚪 {t('nav.logout')}
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: TRANSACTION & BILLING HISTORY                     */}
          {/* ======================================================== */}
          {activeTab === 'billing' && (
            <div>
              {/* Filter Pills & Refresh Button */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${filterStatus === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '999px' }}
                    onClick={() => setFilterStatus('all')}
                  >
                    {t('profile.filter_all')} ({transactions.length})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${filterStatus === 'settlement' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '999px', borderColor: '#10B981' }}
                    onClick={() => setFilterStatus('settlement')}
                  >
                    🟢 {t('profile.filter_success')} ({settlementCount})
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${filterStatus === 'pending' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '999px', borderColor: '#F59E0B' }}
                    onClick={() => setFilterStatus('pending')}
                  >
                    🟡 {t('profile.filter_pending')} ({pendingCount})
                  </button>
                  {failedCount > 0 && (
                    <button
                      type="button"
                      className={`btn btn-sm ${filterStatus === 'failed' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '999px', borderColor: '#EF4444' }}
                      onClick={() => setFilterStatus('failed')}
                    >
                      🔴 {t('profile.filter_failed')} ({failedCount})
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.74rem', padding: '4px 10px', borderRadius: '8px' }}
                  onClick={loadTransactions}
                  disabled={loadingTx}
                  title="Segarkan data transaksi"
                >
                  {loadingTx ? '⏳ Memuat...' : '🔄 Refresh'}
                </button>
              </div>

              {/* Transactions List */}
              {loadingTx && transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                  <span style={{ fontSize: '2rem' }}>⏳</span>
                  <p style={{ marginTop: '10px' }}>Memuat riwayat transaksi...</p>
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '16px',
                  border: '1px dashed var(--border-glass)'
                }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>📜</div>
                  <h5 style={{ fontSize: '1rem', fontWeight: 800, color: '#FFF', margin: '0 0 6px 0' }}>
                    {t('profile.no_transactions')}
                  </h5>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                    {t('profile.no_transactions_sub')}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {filteredTransactions.map(tx => {
                    const isPending = tx.status === 'pending'
                    const isSuccess = tx.status === 'settlement' || tx.status === 'capture'
                    const isYearly = tx.billing_cycle === 'yearly'
                    const planTitle = tx.plan_tier === 'venue'
                      ? `Kanca Warkop (${isYearly ? 'Tahunan' : 'Bulanan'})`
                      : `Kanca Pro (${isYearly ? '1 Tahun' : '1 Bulan'})`

                    const formattedTxTime = tx.transaction_time 
                      ? new Date(tx.transaction_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                      : '-'

                    const formattedExpiryTime = tx.expiry_time 
                      ? new Date(tx.expiry_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
                      : null

                    return (
                      <div 
                        key={tx.id || tx.order_id}
                        style={{
                          background: isPending 
                            ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.8))'
                            : 'var(--bg-glass-strong)',
                          border: isPending 
                            ? '1px solid rgba(245, 158, 11, 0.4)' 
                            : '1px solid var(--border-glass)',
                          borderRadius: '14px',
                          padding: '16px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {/* Top Line: Order ID & Status Badge */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#A78BFA' }}>
                              {tx.order_id}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(tx.order_id, 'order', tx.order_id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.7, fontSize: '0.8rem', padding: '0 2px' }}
                              title="Salin Order ID"
                            >
                              {copiedOrderId === tx.order_id ? '✓' : '📋'}
                            </button>
                          </div>

                          {getStatusBadge(tx.status)}
                        </div>

                        {/* Mid Line: Plan & Amount */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                          <div>
                            <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#FFF' }}>
                              💎 {planTitle}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                              {formattedTxTime} • {tx.payment_type ? tx.payment_type.toUpperCase().replace('_', ' ') : 'Midtrans Snap'}
                              {tx.bank ? ` (${tx.bank.toUpperCase()})` : ''}
                            </div>
                          </div>

                          <div style={{ fontSize: '1.15rem', fontWeight: 900, color: isSuccess ? '#34D399' : (isPending ? '#FCD34D' : 'var(--text-muted)') }}>
                            {formatRupiah(tx.gross_amount)}
                          </div>
                        </div>

                        {/* Special Details for Pending Transactions (VA, QRIS, Countdown) */}
                        {isPending && (
                          <div style={{
                            background: 'rgba(245, 158, 11, 0.12)',
                            border: '1px dashed rgba(245, 158, 11, 0.4)',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            marginBottom: '12px',
                            fontSize: '0.8rem'
                          }}>
                            {tx.va_number && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Nomor VA ({tx.bank?.toUpperCase() || 'Bank'}):</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <strong style={{ color: '#FCD34D', fontSize: '0.9rem', letterSpacing: '0.5px' }}>{tx.va_number}</strong>
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(tx.va_number, 'va', tx.order_id)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FCD34D', fontSize: '0.8rem' }}
                                    title="Salin No. VA"
                                  >
                                    {copiedVa === tx.order_id ? '✓ Tersalin' : '📋 Salin'}
                                  </button>
                                </div>
                              </div>
                            )}

                            {formattedExpiryTime && (
                              <div style={{ color: '#FBBF24', fontSize: '0.74rem' }}>
                                ⏳ Batas Waktu Bayar: <strong>{formattedExpiryTime}</strong>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', flexWrap: 'wrap' }}>
                          {isPending && tx.snap_token && (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{
                                background: 'linear-gradient(90deg, #F59E0B, #D97706)',
                                border: 'none',
                                fontWeight: 800,
                                fontSize: '0.78rem',
                                padding: '6px 14px'
                              }}
                              onClick={() => {
                                paymentHistoryService.resumePendingPayment(tx.snap_token, {
                                  onSuccess: () => {
                                    loadTransactions()
                                    if (onUserUpdated) {
                                      authService.getCurrentUser().then(onUserUpdated)
                                    }
                                  },
                                  onPending: () => loadTransactions()
                                })
                              }}
                            >
                              ⚡ {t('profile.pay_now')}
                            </button>
                          )}

                          {isPending && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
                              onClick={loadTransactions}
                            >
                              {t('profile.check_status')}
                            </button>
                          )}

                          {isSuccess && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{
                                fontSize: '0.78rem',
                                padding: '6px 14px',
                                borderColor: 'rgba(16, 185, 129, 0.4)',
                                color: '#34D399',
                                fontWeight: 700
                              }}
                              onClick={() => setSelectedReceipt(tx)}
                            >
                              {t('profile.view_receipt')}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* DIGITAL RECEIPT MODAL                                    */}
      {/* ======================================================== */}
      {selectedReceipt && (
        <div 
          className="modal-overlay" 
          onClick={() => setSelectedReceipt(null)}
          style={{ zIndex: 9999, background: 'rgba(0,0,0,0.85)' }}
        >
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{
              maxWidth: '460px',
              width: '95%',
              background: '#0F172A',
              border: '2px solid #334155',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              position: 'relative'
            }}
          >
            {/* Watermark "LUNAS" */}
            <div style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%) rotate(-25deg)',
              fontSize: '4.5rem',
              fontWeight: 900,
              color: 'rgba(16, 185, 129, 0.08)',
              border: '6px dashed rgba(16, 185, 129, 0.12)',
              padding: '10px 30px',
              borderRadius: '16px',
              pointerEvents: 'none',
              letterSpacing: '6px',
              textTransform: 'uppercase'
            }}>
              LUNAS
            </div>

            {/* Receipt Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #334155', paddingBottom: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '4px' }}>♠️ KancaSela</div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FFF', margin: '0 0 4px 0' }}>
                {t('profile.receipt_title')}
              </h4>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {t('profile.receipt_subtitle')} • Midtrans Settlement
              </div>

              <div style={{
                display: 'inline-block',
                marginTop: '10px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10B981',
                color: '#34D399',
                fontWeight: 900,
                fontSize: '0.78rem',
                padding: '3px 14px',
                borderRadius: '999px',
                letterSpacing: '1px'
              }}>
                ✓ {t('profile.receipt_status_paid')}
              </div>
            </div>

            {/* Receipt Key Info */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>{t('profile.order_id')}:</span>
                <strong style={{ color: '#A78BFA' }}>{selectedReceipt.order_id}</strong>
              </div>
              {selectedReceipt.transaction_id && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Midtrans ID:</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.76rem' }}>{selectedReceipt.transaction_id}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Pelanggan:</span>
                <span style={{ color: '#FFF' }}>{user.profile?.display_name || 'Player'} ({user.email})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Waktu Transaksi:</span>
                <span style={{ color: '#FFF' }}>
                  {new Date(selectedReceipt.settlement_time || selectedReceipt.transaction_time || Date.now()).toLocaleString('id-ID')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Metode Bayar:</span>
                <span style={{ color: '#FFF', textTransform: 'capitalize' }}>
                  {selectedReceipt.payment_type ? selectedReceipt.payment_type.replace('_', ' ') : 'Snap VA / QRIS'} 
                  {selectedReceipt.bank ? ` (${selectedReceipt.bank.toUpperCase()})` : ''}
                </span>
              </div>
            </div>

            {/* Itemized Table */}
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '12px',
              padding: '12px',
              border: '1px solid #334155',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 800, color: '#FFF', marginBottom: '8px' }}>
                <span>{t('profile.receipt_item')}</span>
                <span>{t('profile.amount')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>
                  KancaSela {selectedReceipt.plan_tier === 'venue' ? 'Venue (B2B)' : 'Pro'} 
                  ({selectedReceipt.billing_cycle === 'yearly' ? '1 Tahun Penuh' : '1 Bulan'})
                </span>
                <span style={{ color: '#FFF' }}>{formatRupiah(selectedReceipt.gross_amount)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '8px' }}>
                <span>{t('profile.receipt_tax')}</span>
                <span>Rp 0</span>
              </div>
              <div style={{ borderTop: '1px dashed #475569', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 900, color: '#34D399' }}>
                <span>{t('profile.receipt_total')}</span>
                <span>{formatRupiah(selectedReceipt.gross_amount)}</span>
              </div>
            </div>

            {/* Footer / Print Action */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, fontSize: '0.82rem' }}
                onClick={() => window.print()}
              >
                🖨️ {t('profile.print_receipt')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, fontSize: '0.82rem' }}
                onClick={() => setSelectedReceipt(null)}
              >
                {t('profile.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
