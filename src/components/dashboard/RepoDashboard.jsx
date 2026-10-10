import { useCallback, useMemo, useState } from 'react'
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
import { summarizeDataAge } from '../../utils/dataAge.js'
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

// Loads each section's data once and shows it in tabs.
// The requests live here (not inside each tab) so data shared by several
// tabs, like commits, is fetched only once, and switching tabs or filters
// never triggers new requests.
function RepoDashboard({ repo, onRefresh }) {
  const owner = repo.owner.login
  const name = repo.name
  // GitHub has no community profile for forks, so it isn't requested for them.
  const isFork = repo.fork === true

  // The open tab is part of the address (?tab=issues), so it can be shared.
  // `replace` keeps tab clicks out of the browser's back history.
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const activeTab = TAB_IDS.includes(requested) ? requested : 'overview'
  const selectTab = useCallback(
    (id) => setSearchParams(id === 'overview' ? {} : { tab: id }, { replace: true }),
    [setSearchParams],
  )

  // Issues and pull requests are only shown in their own tab, so they are
  // requested the first time that tab opens. That saves a request for
  // everyone who only looks at the overview.
  const [issuesWanted, setIssuesWanted] = useState(activeTab === 'issues')
  if (activeTab === 'issues' && !issuesWanted) {
    setIssuesWanted(true)
  }

  // useCallback keeps each function the same between renders,
  // so the data is requested once per repository.
  const loadLanguages = useCallback((signal) => fetchLanguages(owner, name, signal), [owner, name])
  const loadCommits = useCallback((signal) => fetchCommits(owner, name, signal), [owner, name])
  const loadContributors = useCallback((signal) => fetchContributors(owner, name, signal), [owner, name])
  const loadIssues = useCallback((signal) => fetchIssuesAndPulls(owner, name, signal), [owner, name])
  const loadReadme = useCallback(
    (signal) => fetchReadme(owner, name, signal, { isFork }),
    [owner, name, isFork],
  )
  const loadCommunity = useCallback(
    (signal) => fetchCommunityProfile(owner, name, signal, { isFork }),
    [owner, name, isFork],
  )

  const languages = useGitHubData(loadLanguages)
  const commits = useGitHubData(loadCommits)
  const contributors = useGitHubData(loadContributors)
  const issues = useGitHubData(issuesWanted ? loadIssues : null)
  // The README check usually reuses the community profile's answer.
  const readme = useGitHubData(loadReadme)
  const community = useGitHubData(loadCommunity)

  const checks = useMemo(
    () => runHealthChecks({ repo, readme, commits, community }),
    [repo, readme, commits, community],
  )
  const warnings = countByStatus(checks).warning

  // How old the data on screen is, for the header.
  const dataAge = summarizeDataAge([
    { label: 'Repository details', state: { status: 'success', data: repo } },
    { label: 'Languages', state: languages },
    { label: 'Commits', state: commits },
    { label: 'Contributors', state: contributors },
    { label: 'Issues & PRs', state: issues },
    { label: 'README check', state: readme },
    { label: 'Community profile', state: community },
  ])

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'commits', label: 'Commits', badge: countOf(commits), badgeHint: 'fetched' },
    { id: 'contributors', label: 'Contributors', badge: countOf(contributors), badgeHint: 'listed' },
    { id: 'issues', label: 'Issues & PRs', badge: countOf(issues), badgeHint: 'fetched' },
    { id: 'health', label: 'Health', badge: warnings > 0 ? warnings : null, badgeHint: 'warnings' },
  ]

  return (
    <div className="repo-dashboard fade-in">
      <RepoHeader repo={repo} dataAge={dataAge} onRefresh={onRefresh} />

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
