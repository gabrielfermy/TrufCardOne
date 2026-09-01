import React from 'react'
import { useTranslation } from '../../i18n/I18nContext'

export default function BottomNav({ activeView, onNavigate, isAdmin }) {
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
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={`nav-tab ${activeView === tab.id ? 'active' : ''}`}
          onClick={() => onNavigate(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}
