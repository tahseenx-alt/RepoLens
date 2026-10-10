import { Link } from 'react-router'
import GitHubMark from '../ui/GitHubMark.jsx'

// The bar at the top of every page. Pages can pass a search form
// (or anything else) as `children` to show it in the middle.
function SiteHeader({ children }) {
  return (
    <header className="site-header">
      <div className="container site-header-inner">
        <Link to="/" className="brand" aria-label="RepoLens home">
          <span className="brand-mark" aria-hidden="true">
            RL
          </span>
          <span className="brand-name">RepoLens</span>
        </Link>

        {children && <div className="site-header-center">{children}</div>}

        <a
          href="https://github.com/tahseenx-alt/RepoLens"
          className="header-link"
          target="_blank"
          rel="noreferrer"
        >
          <GitHubMark size={16} />
          <span className="header-link-text">Source</span>
          <span className="sr-only">(RepoLens on GitHub, opens in a new tab)</span>
        </a>
      </div>
    </header>
  )
}

export default SiteHeader
