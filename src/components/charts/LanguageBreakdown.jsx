import { formatBytes, formatPercent } from '../../utils/format.js'
import { groupSmallLanguages } from '../../utils/languages.js'

// A stacked horizontal bar (the share of each language) plus a table
// with the exact byte counts. `languages` comes from toLanguageList().
function LanguageBreakdown({ languages }) {
  const barParts = groupSmallLanguages(languages)
  const summary = barParts.map((item) => `${item.name} ${formatPercent(item.percent)}`).join(', ')

  return (
    <div className="languages">
      <div className="language-bar" role="img" aria-label={`Language share: ${summary}`}>
        {barParts.map((item) => (
          <span
            key={item.name}
            style={{ width: `${item.percent}%`, background: item.color }}
            title={`${item.name}: ${formatPercent(item.percent)}`}
          />
        ))}
      </div>

      <div className="table-scroll language-table-wrap">
        <table className="data-table language-table">
          <thead>
            <tr>
              <th scope="col">Language</th>
              <th scope="col" className="num">Bytes</th>
              <th scope="col" className="num">Share</th>
            </tr>
          </thead>
          <tbody>
            {languages.map((item) => (
              <tr key={item.name}>
                <th scope="row">
                  <span className="language-dot" style={{ background: item.color }} aria-hidden="true" />
                  {item.name}
                </th>
                <td className="num mono">{formatBytes(item.bytes)}</td>
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
