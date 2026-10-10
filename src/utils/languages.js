// Colors for the languages, picked to stay distinct on the dark
// background. Languages past the palette share a neutral gray.
export const LANGUAGE_COLORS = ['#5b8def', '#e0823d', '#3fb27f', '#c9a227', '#d0679d', '#8b7cf6', '#3fb5c4', '#a3b14b']
export const OTHER_COLOR = '#6b7689'

// Turns GitHub's { JavaScript: 52000, CSS: 4000 } into a sorted list:
//   [{ name, bytes, percent, color }]
export function toLanguageList(languages) {
  const entries = Object.entries(languages || {}).filter(
    ([, bytes]) => Number.isFinite(bytes) && bytes > 0,
  )
  const total = entries.reduce((sum, [, bytes]) => sum + bytes, 0)
  if (total === 0) {
    return []
  }
  return entries
    .sort((a, b) => b[1] - a[1])
    .map(([name, bytes], index) => ({
      name,
      bytes,
      percent: (bytes / total) * 100,
      color: LANGUAGE_COLORS[index] ?? OTHER_COLOR,
    }))
}

// Keeps the first `max` languages and groups the rest into "Other",
// so the stacked bar stays readable.
export function groupSmallLanguages(list, max = LANGUAGE_COLORS.length) {
  if (list.length <= max) {
    return list
  }
  const rest = list.slice(max)
  return [
    ...list.slice(0, max),
    {
      name: `Other (${rest.length})`,
      bytes: rest.reduce((sum, item) => sum + item.bytes, 0),
      percent: rest.reduce((sum, item) => sum + item.percent, 0),
      color: OTHER_COLOR,
    },
  ]
}
