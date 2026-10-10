// Colors for the top languages, checked to stay readable on the dark
// background and for people with color blindness. Always used in this order.
const LANGUAGE_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300']
const OTHER_COLOR = '#6b7285'

// Turns { JavaScript: 52000, CSS: 4000, ... } into a sorted list with
// percentages. Languages after the 6th are grouped into "Other".
function toLanguageList(languages) {
  const total = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0)
  const sorted = Object.entries(languages).sort((a, b) => b[1] - a[1])

  const top = sorted.slice(0, LANGUAGE_COLORS.length).map(([name, bytes], index) => ({
    name,
    percent: (bytes / total) * 100,
    color: LANGUAGE_COLORS[index],
  }))

  const otherBytes = sorted
    .slice(LANGUAGE_COLORS.length)
    .reduce((sum, [, bytes]) => sum + bytes, 0)
  if (otherBytes > 0) {
    top.push({ name: 'Other', percent: (otherBytes / total) * 100, color: OTHER_COLOR })
  }

  return top
}

function formatPercent(percent) {
  return percent < 0.1 ? '<0.1%' : `${percent.toFixed(1)}%`
}

function LanguageChart({ languages }) {
  const list = toLanguageList(languages)

  if (list.length === 0) {
    return <p className="analytics-empty">GitHub found no code languages in this repository.</p>
  }

  return (
    <div className="languages">
      {/* One bar split into colored parts, one part per language. */}
      <div className="language-bar" role="img" aria-label="Language distribution">
        {list.map((language) => (
          <span
            key={language.name}
            className="language-segment"
            style={{ width: `${language.percent}%`, background: language.color }}
            title={`${language.name}: ${formatPercent(language.percent)}`}
          />
        ))}
      </div>

      <ul className="language-list">
        {list.map((language) => (
          <li key={language.name}>
            <span className="language-dot" style={{ background: language.color }} />
            <span className="language-name">{language.name}</span>
            <span className="language-percent">{formatPercent(language.percent)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default LanguageChart
