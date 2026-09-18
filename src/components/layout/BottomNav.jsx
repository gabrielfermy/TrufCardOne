import React from 'react'
import { useTranslation } from '../../i18n/I18nContext'

export default function BottomNav({ activeView, onNavigate, isAdmin, activeGameTypes = [] }) {
  const { t } = useTranslation()

  const tabs = [
    { id: 'hub', label: t('nav.home'), icon: '🏠' },
    { id: 'truf', label: t('nav.truf'), icon: '🃏' },
    { id: 'remi', label: t('nav.remi'), icon: '🎴' },
    { id: 'omben', label: t('nav.omben'), icon: '🍺' },
    { id: 'chess', label: t('nav.chess'), icon: '⏱️' },
    { id: 'scoreboard', label: t('nav.scoreboard'), icon: '📊' },
    { id: 'utilities', label: t('nav.utilities'), icon: '🎲' },
  ]

  if (isAdmin) {
    tabs.push({ id: 'admin', label: t('nav.admin'), icon: '🛡️' })
  }

  return (
    <nav className="bottom-nav">
      {tabs.map(tab => {
        const hasActiveGame = activeGameTypes.includes(tab.id)
        return (
          <button
            key={tab.id}
            className={`nav-tab ${activeView === tab.id ? 'active' : ''}`}
            onClick={() => onNavigate(tab.id)}
            style={{ position: 'relative' }}
          >
            <span className="nav-icon" style={{ position: 'relative' }}>
              {tab.icon}
              {hasActiveGame && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-4px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    boxShadow: '0 0 6px #10B981',
                    border: '1.5px solid var(--bg-nav)'
                  }} 
                  title="Ada game yang sedang berjalan"
                />
              )}
            </span>
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
