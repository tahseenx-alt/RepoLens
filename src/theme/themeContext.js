import { createContext, useContext } from 'react'

// Shared by ThemeProvider (which fills it) and useTheme (which reads it).
export const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} })

// Returns { theme: 'light' | 'dark', toggleTheme }.
export function useTheme() {
  return useContext(ThemeContext)
}
