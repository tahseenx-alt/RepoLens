import { useEffect, useRef, useState } from 'react'
import { fetchRepository, parseRepoInput } from '../api/github.js'
import RepoResult from './RepoResult.jsx'
import RepoAnalytics from './RepoAnalytics.jsx'
import { AlertIcon, ArrowRightIcon, SearchIcon } from './Icons.jsx'

function Hero() {
  // What the user types in the search box.
  const [repoUrl, setRepoUrl] = useState('')
  // 'idle' (nothing yet), 'loading', 'success' or 'error'.
  const [status, setStatus] = useState('idle')
  const [repo, setRepo] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  // Remembers the request in progress, so a new search can cancel it.
  const requestRef = useRef(null)

  // Cancel any request still running if the page goes away.
  useEffect(() => () => requestRef.current?.abort(), [])

  async function handleSubmit(event) {
    // Stop the browser from reloading the page.
    event.preventDefault()

    const parsed = parseRepoInput(repoUrl)
    if (!parsed) {
      setStatus('error')
      setErrorMessage(
        'Please enter a repository as owner/repo (like facebook/react) or a GitHub link.',
      )
      return
    }

    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller

    setStatus('loading')
    setErrorMessage('')

    try {
      const data = await fetchRepository(parsed.owner, parsed.repo, controller.signal)
      setRepo(data)
      setStatus('success')
    } catch (error) {
      // A newer search replaced this one, so ignore it.
      if (error.name === 'AbortError') {
        return
      }
      setErrorMessage(error.message || 'Something went wrong. Please try again.')
      setStatus('error')
    }
  }

  const isLoading = status === 'loading'

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
          <button type="submit" className="analyze-button" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Analyzing
              </>
            ) : (
              <>
                Analyze
                <ArrowRightIcon size={18} />
              </>
            )}
          </button>
        </form>

        <p className="hero-hint">
          Try <code>facebook/react</code> or <code>vitejs/vite</code>
        </p>

        {/* aria-live tells screen readers to announce changes here. */}
        <div className="result-area" aria-live="polite">
          {isLoading && (
            <div className="repo-card repo-loading">
              <span className="spinner spinner-large" aria-hidden="true" />
              Fetching repository from GitHub…
            </div>
          )}

          {status === 'error' && (
            <div className="error-message" role="alert">
              <AlertIcon size={20} />
              <p>{errorMessage}</p>
            </div>
          )}

          {status === 'success' && repo && <RepoResult repo={repo} />}
        </div>

        {/* key makes React start fresh for every new repository. */}
        {status === 'success' && repo && (
          <RepoAnalytics key={repo.id} fullName={repo.full_name} />
        )}
      </div>
    </section>
  )
}

export default Hero
