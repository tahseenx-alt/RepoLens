import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeContext } from '../../theme/themeContext.js'
import { applyTheme, getInitialTheme, getSavedTheme, saveTheme } from '../../theme/theme.js'

// Keeps the current theme in React state and on <html data-theme="...">.
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Until the user picks a theme, follow changes to the system setting.
  useEffect(() => {
    let media
    try {
      media = window.matchMedia('(prefers-color-scheme: light)')
    } catch {
      return undefined
    }
    const onChange = (event) => {
      if (!getSavedTheme()) {
        setTheme(event.matches ? 'light' : 'dark')
      }
    }
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [])

  const toggleTheme = useCallback(() => {
    // A short-lived class turns on color transitions only while switching,
    // so normal hover effects and loading aren't slowed down.
    const root = document.documentElement
    root.classList.add('theme-transition')
    window.setTimeout(() => root.classList.remove('theme-transition'), 300)

    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      saveTheme(next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, toggleTheme }), [theme, toggleTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export default ThemeProvider
