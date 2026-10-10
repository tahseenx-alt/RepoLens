import { useState } from 'react'
import { ArrowRightIcon, SearchIcon } from './Icons.jsx'

function Hero() {
  // Remember what the user types. We will use this value
  // later, when the GitHub API is connected.
  const [repoUrl, setRepoUrl] = useState('')

  function handleSubmit(event) {
    // Stop the browser from reloading the page.
    // The analysis itself is not built yet.
    event.preventDefault()
  }

  return (
    <section className="hero" id="analyze">
      <div className="container hero-inner">
        <span className="badge">
          <span className="badge-dot" />
          GitHub repository intelligence
        </span>

        <h1 className="hero-title">
          Understand any GitHub repository{' '}
          <span className="gradient-text">at a glance</span>
        </h1>

        <p className="hero-subtitle">
          Paste a public repository and RepoLens turns its stars, commits,
          contributors and health signals into one clear dashboard.
        </p>

        <form className="search" onSubmit={handleSubmit}>
          <label htmlFor="repo-input" className="sr-only">
            GitHub repository
          </label>
          <div className="search-field">
            <SearchIcon size={20} className="search-icon" />
            <input
              id="repo-input"
              type="text"
              placeholder="owner/repository or https://github.com/owner/repo"
              value={repoUrl}
              onChange={(event) => setRepoUrl(event.target.value)}
              autoComplete="off"
              spellCheck="false"
            />
          </div>
          <button type="submit" className="analyze-button">
            Analyze
            <ArrowRightIcon size={18} />
          </button>
        </form>

        <p className="hero-hint">
          Try <code>facebook/react</code> or <code>vitejs/vite</code>
        </p>
      </div>
    </section>
  )
}

export default Hero
