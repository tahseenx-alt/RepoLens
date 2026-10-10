// Light and dark theme helpers.
// The chosen theme is saved in localStorage. Before anyone chooses,
// RepoLens follows the operating system's light/dark setting.
// index.html runs a tiny copy of getInitialTheme() before React starts,
// so the page never flashes the wrong colors.

export const THEME_STORAGE_KEY = 'repolens:theme'
export const THEMES = ['light', 'dark']

export function getSavedTheme() {
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY)
    return THEMES.includes(saved) ? saved : null
  } catch {
    return null
  }
}

export function getSystemTheme() {
  try {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function getInitialTheme() {
  return getSavedTheme() ?? getSystemTheme()
}

export function saveTheme(theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage is blocked; the theme still applies until the page closes.
  }
}

// Sets data-theme on <html>, which switches every CSS color variable.
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
}
