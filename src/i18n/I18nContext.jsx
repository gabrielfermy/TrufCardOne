import React, { createContext, useContext, useState, useEffect } from 'react'
import idTranslations from './locales/id.json'
import enTranslations from './locales/en.json'

const translations = {
  id: idTranslations,
  en: enTranslations
}

const I18nContext = createContext(null)

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    const saved = localStorage.getItem('app_language')
    if (saved && (saved === 'id' || saved === 'en')) return saved
    if (typeof navigator !== 'undefined' && navigator.language && navigator.language.startsWith('id')) {
      return 'id'
    }
    return 'en'
  })

  useEffect(() => {
    localStorage.setItem('app_language', locale)
    document.documentElement.lang = locale
  }, [locale])

  const toggleLocale = () => {
    setLocale(prev => prev === 'id' ? 'en' : 'id')
  }

  /**
   * Helper translation function with key dot-notation and string interpolation
   * e.g. t('truf.round', { num: 1 }) -> "Ronde 1"
   */
  const t = (keyPath, params = {}) => {
    const keys = keyPath.split('.')
    let current = translations[locale] || translations.en

    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k]
      } else {
        // Fallback to English if key is missing in active locale
        let fallback = translations.en
        for (const fbKey of keys) {
          if (fallback && typeof fallback === 'object' && fbKey in fallback) {
            fallback = fallback[fbKey]
          } else {
            return keyPath
          }
        }
        current = fallback
        break
      }
    }

    if (typeof current === 'string') {
      let result = current
      for (const [paramKey, paramVal] of Object.entries(params)) {
        result = result.replace(new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g'), String(paramVal))
      }
      return result
    }

    return current || keyPath
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, toggleLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider')
  }
  return context
}
