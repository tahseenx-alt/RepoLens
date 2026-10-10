import { Suspense, lazy, useMemo, useState } from 'react'
import { COMMITS_LIMIT } from '../../api/github.js'
import { PERIODS, buildCommitActivity } from '../../utils/commitActivity.js'
import { formatDate, pluralize } from '../../utils/format.js'
import Panel from '../ui/Panel.jsx'
import { AsyncContent, EmptyState, LoadingState } from '../ui/States.jsx'

// The chart library is large, so it is downloaded only when a dashboard
// opens, not on the start page.
const CommitActivityChart = lazy(() => import('../charts/CommitActivityChart.jsx'))

const UNIT_WORD = { day: 'day', week: 'week', month: 'month' }

function PeriodPicker({ value, onChange }) {
  return (
    <div className="segmented" role="group" aria-label="Time period">
      {PERIODS.map((period) => (
        <button
          key={period.id}
          type="button"
          aria-pressed={value === period.id}
          onClick={() => onChange(period.id)}
        >
          {period.label}
        </button>
      ))}
    </div>
  )
}

function ActivityContent({ commits, periodId, branch }) {
  const period = PERIODS.find((item) => item.id === periodId)
  // useMemo: only regroup when the commits or the period change.
  const activity = useMemo(
    () => buildCommitActivity(commits, { periodDays: period.days, limit: COMMITS_LIMIT }),
    [commits, period.days],
  )

  if (commits.length === 0) {
    return <EmptyState>No commits were found on the default branch.</EmptyState>
  }

  const rangeText =
    activity.rangeStart && activity.rangeEnd
      ? `${formatDate(activity.rangeStart)} – ${formatDate(activity.rangeEnd)}`
      : ''

  return (
    <>
      <p className="activity-summary">
        <strong>{pluralize(activity.total, 'commit')}</strong>{' '}
        <span className="muted">
          on <code>{branch}</code>, {rangeText}, grouped by {UNIT_WORD[activity.unit]}
        </span>
      </p>

      {activity.total === 0 ? (
        <EmptyState>No commits in this period.</EmptyState>
      ) : (
        <Suspense fallback={<LoadingState label="Loading chart…" lines={4} />}>
          <CommitActivityChart buckets={activity.buckets} unit={activity.unit} />
        </Suspense>
      )}

      {activity.total > 0 && (
        <details className="data-table-toggle">
          <summary>Show chart data as a table</summary>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">{activity.unit === 'week' ? 'Week starting' : activity.unit === 'month' ? 'Month' : 'Date'}</th>
                  <th scope="col" className="num">Commits</th>
                </tr>
              </thead>
              <tbody>
                {activity.buckets.map((bucket) => (
                  <tr key={bucket.start}>
                    <td>{bucket.label}</td>
                    <td className="num">{bucket.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      <ActivityNotes activity={activity} fetched={commits.length} />
    </>
  )
}

// Explains exactly what the chart covers.
function ActivityNotes({ activity, fetched }) {
  if (activity.truncated) {
    return (
      <p className="note">
        GitHub returned only the latest {COMMITS_LIMIT} commits, and they all fall inside this
        period, so the chart starts at the oldest fetched commit ({formatDate(activity.rangeStart)})
        instead of the start of the period. Earlier commits are not shown.
      </p>
    )
  }
  if (activity.limitReached) {
    return (
      <p className="note">
        Based on the latest {COMMITS_LIMIT} commits on the default branch, not the full history.
      </p>
    )
  }
  return (
    <p className="note">
      Based on all {pluralize(fetched, 'commit')} on the default branch. Commits on other branches
      are not included.
    </p>
  )
}

function CommitActivityPanel({ state, repo }) {
  const [periodId, setPeriodId] = useState(PERIODS[0].id)

  return (
    <Panel
      id="activity"
      title="Commit activity"
      description="Commits on the default branch, by the date they were committed."
      actions={<PeriodPicker value={periodId} onChange={setPeriodId} />}
    >
      <AsyncContent state={state} loadingLabel="Loading commits…" lines={5}>
        {(commits) => (
          <ActivityContent commits={commits} periodId={periodId} branch={repo.default_branch} />
        )}
      </AsyncContent>
    </Panel>
  )
}

export default CommitActivityPanel
