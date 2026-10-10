import { formatBytes, formatPercent } from '../../utils/format.js'
import { groupSmallLanguages } from '../../utils/languages.js'
import { LANGUAGE_COLORS, OTHER_LANGUAGE_COLOR } from '../../theme/chartColors.js'
import { useTheme } from '../../theme/themeContext.js'

// A stacked horizontal bar (the share of each language) plus a table
// with the exact byte counts. `languages` comes from toLanguageList().
function LanguageBreakdown({ languages }) {
  const { theme } = useTheme()
  const palette = LANGUAGE_COLORS[theme]
  const colorAt = (index) => palette[index] ?? OTHER_LANGUAGE_COLOR[theme]

  const barParts = groupSmallLanguages(languages, palette.length)
  const summary = barParts.map((item) => `${item.name} ${formatPercent(item.percent)}`).join(', ')

  return (
    <div className="languages">
      <div className="language-bar grow-in" role="img" aria-label={`Language share: ${summary}`}>
        {barParts.map((item, index) => (
          <span
            key={item.name}
            style={{
              width: `${item.percent}%`,
              background: item.isOther ? OTHER_LANGUAGE_COLOR[theme] : colorAt(index),
            }}
            title={`${item.name}: ${formatPercent(item.percent)}`}
          />
        ))}
      </div>

      <div className="table-scroll language-table-wrap">
        <table className="data-table language-table">
          <caption className="sr-only">Bytes of code per language</caption>
          <thead>
            <tr>
              <th scope="col">Language</th>
              <th scope="col" className="num">Bytes</th>
              <th scope="col" className="num">Share</th>
            </tr>
          </thead>
          <tbody>
            {languages.map((item, index) => (
              <tr key={item.name}>
                <th scope="row">
                  <span className="language-dot" style={{ background: colorAt(index) }} aria-hidden="true" />
                  {item.name}
                </th>
                <td className="num mono" title={`${item.bytes.toLocaleString('en')} bytes`}>
                  {formatBytes(item.bytes)}
                </td>
                <td className="num mono">{formatPercent(item.percent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default LanguageBreakdown
