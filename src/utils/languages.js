// Turns GitHub's { JavaScript: 52000, CSS: 4000 } into a list sorted from
// most to least bytes: [{ name, bytes, percent }]. Colors are picked by the
// chart component, because they depend on the light or dark theme.
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
    .map(([name, bytes]) => ({ name, bytes, percent: (bytes / total) * 100 }))
}

// Keeps the first `max` languages and groups the rest into "Other",
// so the stacked bar stays readable.
export function groupSmallLanguages(list, max) {
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
      isOther: true,
    },
  ]
}
