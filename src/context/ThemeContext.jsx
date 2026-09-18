import React, { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext({
  theme: 'system',
  resolvedTheme: 'dark',
  setTheme: () => {},
  cycleTheme: () => {}
})

const THEME_STORAGE_KEY = 'kancasela_theme_mode'

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof localStorage === 'undefined') return 'system'
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'system'
    } catch {
      return 'system'
    }
  })

  const [systemPreference, setSystemPreference] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  // Listen to OS system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => {
      setSystemPreference(e.matches ? 'dark' : 'light')
    }

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange)
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange)
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange)
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange)
      }
    }
  }, [])

  const resolvedTheme = theme === 'system' ? systemPreference : theme

  useEffect(() => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.setAttribute('data-theme', resolvedTheme)

    // Update theme-color meta tag for mobile browsers / PWA
    let metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta')
      metaThemeColor.name = 'theme-color'
      document.head.appendChild(metaThemeColor)
    }
    metaThemeColor.setAttribute('content', resolvedTheme === 'dark' ? '#0B0C14' : '#F8FAFC')
  }, [resolvedTheme])

  const setTheme = (newTheme) => {
    setThemeState(newTheme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme)
    } catch (err) {
      console.warn('Could not save theme preference to localStorage:', err)
    }
  }

  const cycleTheme = () => {
    const nextTheme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system'
    setTheme(nextTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
