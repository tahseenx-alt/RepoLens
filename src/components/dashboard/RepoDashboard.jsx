import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import {
  fetchCommits,
  fetchCommunityProfile,
  fetchContributors,
  fetchIssuesAndPulls,
  fetchLanguages,
  fetchReadme,
} from '../../api/github.js'
import { useGitHubData } from '../../hooks/useGitHubData.js'
import { countByStatus, runHealthChecks } from '../../utils/healthChecks.js'
import { TabList, TabPanel } from '../ui/Tabs.jsx'
import RepoHeader from './RepoHeader.jsx'
import OverviewTab from './OverviewTab.jsx'
import RecentCommitsPanel from './RecentCommitsPanel.jsx'
import ContributorsPanel from './ContributorsPanel.jsx'
import IssuesPanel from './IssuesPanel.jsx'
import HealthPanel from './HealthPanel.jsx'

const TAB_IDS = ['overview', 'commits', 'contributors', 'issues', 'health']

// A count for a tab label, shown only once the data has loaded.
function countOf(state) {
  return state.status === 'success' && Array.isArray(state.data) ? state.data.length : null
}

// Loads every section's data once, in parallel, and shows it in tabs.
// The requests live here (not inside each tab) so data shared by several
// tabs, like commits, is fetched only once, and switching tabs or filters
// never triggers new requests.
function RepoDashboard({ repo, fetchedAt, onRefresh }) {
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

  const checks = useMemo(
    () => runHealthChecks({ repo, readme, commits, community }),
    [repo, readme, commits, community],
  )
  const warnings = countByStatus(checks).warning

  // The open tab is part of the address (?tab=issues), so it can be shared.
  // `replace` keeps tab clicks out of the browser's back history.
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const activeTab = TAB_IDS.includes(requested) ? requested : 'overview'
  const selectTab = useCallback(
    (id) => setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true }),
    [setSearchParams],
  )

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'commits', label: 'Commits', badge: countOf(commits), badgeHint: 'fetched' },
    { id: 'contributors', label: 'Contributors', badge: countOf(contributors), badgeHint: 'listed' },
    { id: 'issues', label: 'Issues & PRs', badge: countOf(issues), badgeHint: 'fetched' },
    { id: 'health', label: 'Health', badge: warnings > 0 ? warnings : null, badgeHint: 'warnings' },
  ]

  return (
    <div className="repo-dashboard fade-in">
      <RepoHeader repo={repo} fetchedAt={fetchedAt} onRefresh={onRefresh} />

      <TabList
        tabs={tabs}
        activeId={activeTab}
        onChange={selectTab}
        label="Dashboard sections"
        idPrefix="dashboard"
      />

      <TabPanel id={activeTab} idPrefix="dashboard">
        {activeTab === 'overview' && (
          <OverviewTab
            repo={repo}
            commits={commits}
            languages={languages}
            contributors={contributors}
            checks={checks}
            onSelectTab={selectTab}
          />
        )}
        {activeTab === 'commits' && <RecentCommitsPanel state={commits} repo={repo} />}
        {activeTab === 'contributors' && <ContributorsPanel state={contributors} />}
        {activeTab === 'issues' && <IssuesPanel state={issues} repo={repo} />}
        {activeTab === 'health' && <HealthPanel checks={checks} />}
      </TabPanel>
    </div>
  )
}

export default RepoDashboard
