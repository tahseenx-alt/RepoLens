import { GithubIcon, LogoIcon } from './Icons.jsx'

function Navbar() {
  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <a href="#" className="brand">
          <span className="brand-mark">
            <LogoIcon size={18} />
          </span>
          RepoLens
        </a>

        <nav className="nav-links" aria-label="Main">
          <a href="#features">Features</a>
          <a href="#analyze">Analyze</a>
        </nav>

        <a
          href="https://github.com/tahseenx-alt/RepoLens"
          className="nav-github"
          aria-label="RepoLens on GitHub"
          target="_blank"
          rel="noreferrer"
        >
          <GithubIcon size={18} />
          <span>GitHub</span>
        </a>
      </div>
    </header>
  )
}

export default Navbar
