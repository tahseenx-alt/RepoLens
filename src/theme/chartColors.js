// Colors for charts, one set per theme. SVG chart parts can't read CSS
// variables reliably, so the values live here and match styles/base.css.
export const CHART_COLORS = {
  dark: {
    bar: '#5b8def',
    barHover: '#7aa3f3',
    grid: '#1f2735',
    axis: '#2b3546',
    tick: '#8b95a7',
    cursor: 'rgba(255, 255, 255, 0.05)',
  },
  light: {
    bar: '#2f62d6',
    barHover: '#244fb3',
    grid: '#e6e9ef',
    axis: '#cfd6df',
    tick: '#5b6577',
    cursor: 'rgba(15, 23, 42, 0.05)',
  },
}

// Language colors. The light set is darker so it stays visible on white.
export const LANGUAGE_COLORS = {
  dark: ['#5b8def', '#e0823d', '#3fb27f', '#c9a227', '#d0679d', '#8b7cf6', '#3fb5c4', '#a3b14b'],
  light: ['#2f62d6', '#b85a17', '#1b7f53', '#8a6d00', '#b0407a', '#6a4fd9', '#167f8c', '#6b7a1c'],
}

export const OTHER_LANGUAGE_COLOR = { dark: '#6b7689', light: '#8a93a3' }
