import { useCallback } from 'react'
import {
  fetchCommits,
  fetchCommunityProfile,
  fetchContributors,
  fetchIssuesAndPulls,
  fetchLanguages,
  fetchReadme,
} from '../../api/github.js'
import { useGitHubData } from '../../hooks/useGitHubData.js'
import RepoHeader from './RepoHeader.jsx'
import CommitActivityPanel from './CommitActivityPanel.jsx'
import LanguagesPanel from './LanguagesPanel.jsx'
import RecentCommitsPanel from './RecentCommitsPanel.jsx'
import ContributorsPanel from './ContributorsPanel.jsx'
import IssuesPanel from './IssuesPanel.jsx'
import HealthPanel from './HealthPanel.jsx'

// Loads every section's data once, in parallel, and lays out the panels.
// The requests live here (not inside each panel) so data shared by several
// panels, like commits, is fetched only once, and so filters inside a
// panel never trigger new requests.
function RepoDashboard({ repo, onRefresh }) {
  const owner = repo.owner.login
  const name = repo.name

  // useCallback keeps each function the same between renders,
  // so the data is requested once per repository.
  const loadLanguages = useCallback((signal) => fetchLanguages(owner, name, signal), [owner, name])
  const loadCommits = useCallback((signal) => fetchCommits(owner, name, signal), [owner, name])
  const loadContributors = useCallback((signal) => fetchContributors(owner, name, signal), [owner, name])
  const loadIssues = useCallback((signal) => fetchIssuesAndPulls(owner, name, signal), [owner, name])
  const loadReadme = useCallback((signal) => fetchReadme(owner, name, signal), [owner, name])
  const loadCommunity = useCallback((signal) => fetchCommunityProfile(owner, name, signal), [owner, name])

  const languages = useGitHubData(loadLanguages)
  const commits = useGitHubData(loadCommits)
  const contributors = useGitHubData(loadContributors)
  const issues = useGitHubData(loadIssues)
  const readme = useGitHubData(loadReadme)
  const community = useGitHubData(loadCommunity)

  return (
    <>
      <RepoHeader repo={repo} onRefresh={onRefresh} />

      <nav className="section-nav" aria-label="Dashboard sections">
        <a href="#activity">Activity</a>
        <a href="#languages">Languages</a>
        <a href="#commits">Commits</a>
        <a href="#contributors">Contributors</a>
        <a href="#issues">Issues &amp; PRs</a>
        <a href="#health">Health</a>
      </nav>

      {/* Two columns on wide screens, one column on narrow screens. */}
      <div className="dashboard-grid">
        <div className="dashboard-column">
          <CommitActivityPanel state={commits} repo={repo} />
          <RecentCommitsPanel state={commits} repo={repo} />
          <IssuesPanel state={issues} repo={repo} />
        </div>
        <div className="dashboard-column">
          <LanguagesPanel state={languages} />
          <ContributorsPanel state={contributors} />
          <HealthPanel repo={repo} readme={readme} commits={commits} community={community} />
        </div>
      </div>
    </>
  )
}

export default RepoDashboard
