import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRight, LoaderCircle, Search } from 'lucide-react'
import { fetchRepository } from '../../api/github.js'
import { parseRepoInput } from '../../utils/parseRepo.js'

// The repository search box. It checks the input, asks GitHub whether the
// repository exists, and then opens its dashboard at /owner/repo.
// Checking first means mistakes are shown right here, next to the input.
// The answer is cached, so the dashboard doesn't request it again.
//
// `compact` is the smaller version used in the dashboard header.
function RepoSearchForm({ compact = false, autoFocus = false }) {
  const navigate = useNavigate()
  const inputId = useId()
  const errorId = useId()
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  // Counts errors, so the error message replays its small shake each time.
  const [errorCount, setErrorCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const requestRef = useRef(null)

  // Cancel a request that is still running if the form goes away.
  useEffect(() => () => requestRef.current?.abort(), [])

  async function handleSubmit(event) {
    // Stop the browser from reloading the page.
    event.preventDefault()
    if (loading) {
      return
    }

    const parsed = parseRepoInput(value)
    if (!parsed.ok) {
      setError(parsed.error)
      setErrorCount((count) => count + 1)
      return
    }

    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError('')

    try {
      const repo = await fetchRepository(parsed.owner, parsed.repo, controller.signal)
      setValue('')
      // Use GitHub's spelling of the name, e.g. "Facebook/React" -> "facebook/react".
      navigate(`/${repo.owner.login}/${repo.name}`)
    } catch (requestError) {
      if (requestError?.name !== 'AbortError') {
        setError(requestError.message || 'Something went wrong. Please try again.')
        setErrorCount((count) => count + 1)
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }

  return (
    <form
      className={`search ${compact ? 'search-compact' : ''}`}
      onSubmit={handleSubmit}
      noValidate
      role="search"
    >
      <label htmlFor={inputId} className={compact ? 'sr-only' : 'search-label'}>
        {compact ? 'Analyze another repository' : 'Repository'}
      </label>
      <div className="search-row">
        <div className={`search-field ${error ? 'has-error' : ''}`}>
          <Search size={16} className="search-icon" aria-hidden="true" />
          <input
            id={inputId}
            type="text"
            inputMode="url"
            placeholder={compact ? 'owner/repo' : 'facebook/react or https://github.com/facebook/react'}
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              if (error) setError('')
            }}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
            autoFocus={autoFocus}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={error ? errorId : undefined}
          />
        </div>
        <button type="submit" className="button button-primary" disabled={loading}>
          {loading ? (
            <>
              <LoaderCircle size={16} className="spin" aria-hidden="true" />
              <span>Checking…</span>
            </>
          ) : (
            <>
              <span>Analyze</span>
              {!compact && <ArrowRight size={16} aria-hidden="true" />}
            </>
          )}
        </button>
      </div>
      {error && (
        <p key={errorCount} id={errorId} className="search-error shake" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

export default RepoSearchForm
