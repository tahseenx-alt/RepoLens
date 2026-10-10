import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../theme/themeContext.js'

// The light/dark switch in the header. The icon shows the theme you will
// switch TO, and the label says it in words for screen readers.
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${next} theme`}
      title={`Switch to ${next} theme`}
    >
      {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
    </button>
  )
}

export default ThemeToggle
