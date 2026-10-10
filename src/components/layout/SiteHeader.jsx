import { Link } from 'react-router'
import GitHubMark from '../ui/GitHubMark.jsx'
import ThemeToggle from './ThemeToggle.jsx'

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

        <div className="site-header-end">
          <ThemeToggle />
          <a
            href="https://github.com/tahseenx-alt/RepoLens"
            className="icon-button"
            target="_blank"
            rel="noreferrer"
            aria-label="RepoLens source code on GitHub (opens in a new tab)"
            title="Source code on GitHub"
          >
            <GitHubMark size={16} />
          </a>
        </div>
      </div>
    </header>
  )
}

export default SiteHeader
