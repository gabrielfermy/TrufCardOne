import React, { useState, useRef, useEffect } from 'react'
import { useTheme } from '../../context/ThemeContext'
import { useTranslation } from '../../i18n/I18nContext'

export default function ThemeSelector({ compact = false }) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen])

  const options = [
    {
      id: 'dark',
      icon: '🌙',
      label: t('theme.dark') || 'Dark',
      desc: t('theme.dark_desc') || 'Deep obsidian mode'
    },
    {
      id: 'light',
      icon: '☀️',
      label: t('theme.light') || 'Light',
      desc: t('theme.light_desc') || 'Clean crystal slate'
    },
    {
      id: 'system',
      icon: '💻',
      label: t('theme.system') || 'System',
      desc: t('theme.system_desc') || 'Follow device theme'
    }
  ]

  const currentOption = options.find(o => o.id === theme) || options[2]

  if (compact) {
    return (
      <div className="theme-selector-compact" ref={dropdownRef} style={{ position: 'relative' }}>
        <button
          type="button"
          className="btn-theme-toggle"
          onClick={() => setIsOpen(!isOpen)}
          title={`${t('theme.title') || 'Theme'}: ${currentOption.label}`}
          aria-label="Toggle theme"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ fontSize: '0.95rem' }}>{currentOption.icon}</span>
          <span className="theme-toggle-label hide-mobile" style={{ fontSize: '0.78rem' }}>{currentOption.label}</span>
          <span className="hide-mobile" style={{ fontSize: '0.65rem', opacity: 0.7 }}>▾</span>
        </button>

        {isOpen && (
          <div
            className="theme-dropdown-menu"
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              right: 0,
              zIndex: 150,
              minWidth: '150px',
              background: 'var(--bg-card)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid var(--border-glass-light)',
              borderRadius: 'var(--radius-md)',
              padding: '6px',
              boxShadow: 'var(--shadow-card)',
              animation: 'fadeIn 0.15s ease-out'
            }}
          >
            <div style={{ padding: '4px 8px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {t('theme.title') || 'Tampilan / Theme'}
            </div>
            {options.map((opt) => {
              const isSelected = theme === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setTheme(opt.id)
                    setIsOpen(false)
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'var(--badge-purple-bg)' : 'transparent',
                    border: isSelected ? '1px solid var(--badge-purple-border)' : '1px solid transparent',
                    color: isSelected ? 'var(--badge-purple-text)' : 'var(--text-muted)',
                    fontSize: '0.84rem',
                    fontWeight: isSelected ? 800 : 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{opt.icon}</span>
                  <span style={{ flex: 1 }}>{opt.label}</span>
                  {isSelected && <span style={{ color: 'var(--badge-purple-text)', fontWeight: 800 }}>✓</span>}
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Segmented Pill Version (For Settings / Profile modals)
  return (
    <div
      className="theme-segmented-group"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '6px',
        padding: '4px',
        background: 'var(--bg-glass-strong)',
        border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-md)'
      }}
    >
      {options.map((opt) => {
        const isSelected = theme === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '10px 6px',
              borderRadius: 'var(--radius-sm)',
              background: isSelected ? 'var(--bg-card)' : 'transparent',
              border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
              boxShadow: isSelected ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
              color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: isSelected ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{opt.icon}</span>
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
