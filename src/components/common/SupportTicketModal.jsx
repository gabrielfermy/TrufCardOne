import React, { useState } from 'react'
import { adminService } from '../../services/adminService'
import { soundService } from '../../services/soundService'
import { hapticsService } from '../../services/hapticsService'

export default function SupportTicketModal({ isOpen, onClose, user }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('payment') // 'payment' | 'gameplay' | 'account' | 'feature_request' | 'other'
  const [priority, setPriority] = useState('normal') // 'low' | 'normal' | 'high' | 'urgent'
  const [email, setEmail] = useState(user?.email || '')
  const [submitting, setSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim() || !email.trim()) return

    setSubmitting(true)
    try {
      await adminService.createSupportTicket({
        email: email.trim(),
        subject: subject.trim(),
        message: message.trim(),
        category,
        priority,
        userId: user?.id
      })

      soundService.playVictory()
      hapticsService.success()
      setIsSuccess(true)
    } catch (err) {
      alert('Gagal mengirim tiket bantuan: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetAndClose = () => {
    setIsSuccess(false)
    setSubject('')
    setMessage('')
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleResetAndClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '520px', width: '95%', padding: '24px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.4rem' }}>🎫</span>
            <h3 className="modal-title" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
              Bantuan & Lapor Kendala
            </h3>
          </div>
          <button className="btn-close" onClick={handleResetAndClose}>✕</button>
        </div>

        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '24px 8px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
            <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFF', marginBottom: '8px' }}>
              Tiket Berhasil Dikirim!
            </h4>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '20px' }}>
              Tim Superadmin KancaSela telah menerima laporan Anda. Kami akan segera menindaklanjuti dan menghubungi Anda melalui email <strong>{email}</strong>.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={handleResetAndClose}
            >
              Selesai & Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
              Ada kendala pembayaran, akun, atau bug saat bermain? Isi form tiket di bawah untuk penanganan langsung oleh Superadmin.
            </p>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Email Kontak</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Kategori Kendala</label>
                <select
                  className="form-input"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  style={{ background: '#1E293B', color: '#FFF' }}
                >
                  <option value="payment">💳 Pembayaran / Midtrans</option>
                  <option value="gameplay">🎮 Masalah Room & Game</option>
                  <option value="account">👤 Akses / Akun</option>
                  <option value="feature_request">💡 Usulan Fitur</option>
                  <option value="other">📝 Lainnya</option>
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem' }}>Tingkat Prioritas</label>
                <select
                  className="form-input"
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  style={{ background: '#1E293B', color: '#FFF' }}
                >
                  <option value="low">Rendah (Santai)</option>
                  <option value="normal">Normal (Standar)</option>
                  <option value="high">Tinggi (Penting)</option>
                  <option value="urgent">Mendesak (Urgent)</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Subjek Kendala</label>
              <input
                type="text"
                className="form-input"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Contoh: Pembayaran Order #KANCA-PRO belum terupdate"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem' }}>Rincian Masalah</label>
              <textarea
                className="form-input"
                rows={4}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Jelaskan kendala Anda selengkap mungkin (misal: Order ID, nomor VA, atau waktu transfer)..."
                required
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={handleResetAndClose}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 2, background: 'linear-gradient(90deg, #8B5CF6, #7C3AED)', border: 'none', fontWeight: 800 }}
                disabled={submitting}
              >
                {submitting ? 'Mengirim...' : '🚀 Kirim Tiket Bantuan'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
