import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { clearRepoCache, fetchRepository, getRepositoryFetchedAt } from '../api/github.js'
import { useGitHubData } from '../hooks/useGitHubData.js'
import { useRepoHistory } from '../hooks/useRepoHistory.js'
import { isValidOwner, isValidRepoName } from '../utils/parseRepo.js'
import RepoDashboard from '../components/dashboard/RepoDashboard.jsx'
import { DashboardSkeleton, ErrorState } from '../components/ui/States.jsx'
import NotFoundPage from './NotFoundPage.jsx'

// The page at /:owner/:repo. It checks the address before asking GitHub
// for anything, then loads the repository and shows the dashboard.
function DashboardPage() {
  const { owner, repo } = useParams()
  const valid = isValidOwner(owner) && isValidRepoName(repo)

  if (!valid) {
    return (
      <NotFoundPage
        title="Not a repository address"
        message={`"/${owner}/${repo}" isn't a valid GitHub owner/repository pair, so nothing was requested from GitHub.`}
      />
    )
  }

  // `key` gives each repository a fresh component, so no old data leaks
  // into the next one.
  return <RefreshableRepository key={`${owner}/${repo}`.toLowerCase()} owner={owner} repo={repo} />
}

// Holds the Refresh button's state. Refreshing clears the cached answers
// and gives RepositoryView a new key, which makes it load everything again.
function RefreshableRepository({ owner, repo }) {
  const [refreshCount, setRefreshCount] = useState(0)

  const refresh = useCallback(() => {
    clearRepoCache(owner, repo)
    setRefreshCount((count) => count + 1)
  }, [owner, repo])

  return <RepositoryView key={refreshCount} owner={owner} repo={repo} onRefresh={refresh} />
}

function RepositoryView({ owner, repo, onRefresh }) {
  const { add } = useRepoHistory()
  const loadRepo = useCallback((signal) => fetchRepository(owner, repo, signal), [owner, repo])
  const repoState = useGitHubData(loadRepo)
  const data = repoState.data

  useEffect(() => {
    document.title = `${owner}/${repo} · RepoLens`
  }, [owner, repo])

  // Remember the repository once it has loaded successfully.
  useEffect(() => {
    if (data) {
      add(data.owner.login, data.name)
    }
  }, [data, add])

  return (
    <main id="main" className="dashboard container">
      {repoState.status === 'loading' && <DashboardSkeleton label={`Loading ${owner}/${repo} from GitHub…`} />}

      {repoState.status === 'error' && (
        <div className="panel dashboard-error fade-in">
          <ErrorState
            title={`Couldn't load ${owner}/${repo}`}
            error={repoState.error}
            // Retrying a repository that doesn't exist won't help.
            onRetry={repoState.error?.type === 'not-found' ? undefined : repoState.retry}
          />
          <p className="muted">
            <Link to="/">Search for another repository</Link>
          </p>
        </div>
      )}

      {repoState.status === 'success' && (
        <RepoDashboard
          repo={data}
          fetchedAt={getRepositoryFetchedAt(owner, repo)}
          onRefresh={onRefresh}
        />
      )}
    </main>
  )
}

export default DashboardPage
