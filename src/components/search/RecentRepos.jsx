import { Link } from 'react-router'
import { History } from 'lucide-react'
import { formatRelative } from '../../utils/format.js'

// The "Recently analyzed" list, saved in this browser only.
function RecentRepos({ history, onClear }) {
  if (history.length === 0) {
    return null
  }

  return (
    <section className="recent" aria-labelledby="recent-title">
      <div className="recent-header">
        <h2 id="recent-title">
          <History size={14} aria-hidden="true" />
          Recently analyzed
        </h2>
        <button
          type="button"
          className="text-button"
          onClick={onClear}
          title="Also removes the GitHub data saved in this browser"
        >
          Clear history
        </button>
      </div>
      <ul className="recent-list">
        {history.map((item) => (
          <li key={`${item.owner}/${item.repo}`}>
            <Link to={`/${item.owner}/${item.repo}`}>
              <span className="recent-name">
                <span className="muted">{item.owner}/</span>
                {item.repo}
              </span>
              <span className="recent-time">{formatRelative(item.viewedAt)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default RecentRepos
