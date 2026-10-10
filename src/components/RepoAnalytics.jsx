import { Suspense, lazy, useCallback } from 'react'
import { fetchCommits, fetchContributors, fetchLanguages } from '../api/github.js'
import { useGitHubData } from '../hooks/useGitHubData.js'
import AnalyticsCard from './AnalyticsCard.jsx'
import ContributorList from './ContributorList.jsx'
import LanguageChart from './LanguageChart.jsx'
import RecentCommits from './RecentCommits.jsx'
import { ChartIcon, CodeIcon, CommitIcon, UsersIcon } from './Icons.jsx'

// The chart library is big, so it is downloaded only when a
// repository is analyzed, not when the page first opens.
const CommitActivityChart = lazy(() => import('./CommitActivityChart.jsx'))

function ChartLoading() {
  return (
    <div className="analytics-loading">
      <span className="spinner spinner-large" aria-hidden="true" />
      Loading chart…
    </div>
  )
}

// The dashboard under the overview card. It makes three requests in
// parallel; each card shows its own loading and error state.
function RepoAnalytics({ fullName }) {
  // useCallback keeps each function the same between renders,
  // so the data is only requested once per repository.
  const loadLanguages = useCallback((signal) => fetchLanguages(fullName, signal), [fullName])
  const loadCommits = useCallback((signal) => fetchCommits(fullName, signal), [fullName])
  const loadContributors = useCallback((signal) => fetchContributors(fullName, signal), [fullName])

  const languages = useGitHubData(loadLanguages)
  // One commits request is shared by the activity chart and the commit list.
  const commits = useGitHubData(loadCommits)
  const contributors = useGitHubData(loadContributors)

  return (
    <section className="analytics" aria-label="Repository analytics">
      <AnalyticsCard
        title="Languages"
        subtitle="Share of code by language"
        Icon={CodeIcon}
        state={languages}
      >
        {(data) => <LanguageChart languages={data} />}
      </AnalyticsCard>

      <AnalyticsCard
        title="Commit activity"
        subtitle="Commits per week"
        Icon={ChartIcon}
        state={commits}
      >
        {(data) => (
          <Suspense fallback={<ChartLoading />}>
            <CommitActivityChart commits={data} />
          </Suspense>
        )}
      </AnalyticsCard>

      <AnalyticsCard
        title="Top contributors"
        subtitle="By number of commits"
        Icon={UsersIcon}
        state={contributors}
      >
        {(data) => <ContributorList contributors={data} />}
      </AnalyticsCard>

      <AnalyticsCard
        title="Recent commits"
        subtitle="Latest changes"
        Icon={CommitIcon}
        state={commits}
      >
        {(data) => <RecentCommits commits={data} />}
      </AnalyticsCard>
    </section>
  )
}

export default RepoAnalytics
