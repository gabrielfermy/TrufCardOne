import React, { useState, useEffect } from 'react'
import { shareService } from '../../services/shareService'
import { useTranslation } from '../../i18n/I18nContext'

export default function StoryCardModal({ isOpen, onClose, sessionData }) {
  const { t } = useTranslation()
  const [previewUrl, setPreviewUrl] = useState(null)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    let active = true
    let currentObjectUrl = null

    if (isOpen && sessionData) {
      setGenerating(true)
      shareService.generateStoryCardBlob(sessionData).then(blob => {
        if (active && blob) {
          currentObjectUrl = URL.createObjectURL(blob)
          setPreviewUrl(currentObjectUrl)
        }
        if (active) setGenerating(false)
      })
    }

    return () => {
      active = false
      if (currentObjectUrl) {
        URL.revokeObjectURL(currentObjectUrl)
      }
    }
  }, [isOpen, sessionData])

  if (!isOpen) return null

  const handleShare = () => {
    if (sessionData) {
      shareService.shareStoryCard(sessionData)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px', textAlign: 'center' }}>
        <div className="modal-header">
          <h3 className="modal-title">📸 {t('share.story_card_title')}</h3>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '16px' }}>
          {t('share.story_card_desc')}
        </p>

        {/* 9:16 Preview Box */}
        <div style={{
          width: '100%',
          aspectRatio: '9/16',
          maxHeight: '420px',
          background: '#0B0C14',
          borderRadius: '16px',
          overflow: 'hidden',
          border: '1px solid var(--border-glass)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '18px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
        }}>
          {generating ? (
            <div style={{ color: 'var(--text-muted)' }}>{t('app.loading')}</div>
          ) : previewUrl ? (
            <img 
              src={previewUrl} 
              alt="Story Preview" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          ) : null}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button 
            className="btn btn-primary btn-block" 
            onClick={handleShare}
          >
            🚀 {t('share.share_whatsapp')}
          </button>
          
          <button 
            className="btn btn-secondary btn-block" 
            onClick={handleShare}
          >
            💾 {t('share.download_card')}
          </button>
        </div>
      </div>
    </div>
  )
}
