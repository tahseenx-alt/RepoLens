import { useMemo, useState } from 'react'
import {
  CircleCheck,
  CircleDot,
  CircleSlash,
  GitMerge,
  GitPullRequest,
  GitPullRequestClosed,
  GitPullRequestDraft,
} from 'lucide-react'
import { ISSUES_LIMIT } from '../../api/github.js'
import { formatDate, formatNumber, safeExternalUrl } from '../../utils/format.js'
import { STATE_LABELS, isPullRequest, itemState, summarizeItems } from '../../utils/issues.js'
import Panel from '../ui/Panel.jsx'
import { AsyncContent, EmptyState } from '../ui/States.jsx'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'issues', label: 'Issues' },
  { id: 'pulls', label: 'Pull requests' },
]

// Each state has an icon AND a text label, so color is never the only signal.
const STATE_ICONS = {
  issue: { open: CircleDot, completed: CircleCheck, 'not-planned': CircleSlash, closed: CircleCheck },
  pull: { open: GitPullRequest, draft: GitPullRequestDraft, merged: GitMerge, closed: GitPullRequestClosed },
}

function ItemRow({ item }) {
  const pull = isPullRequest(item)
  const state = itemState(item)
  const Icon = STATE_ICONS[pull ? 'pull' : 'issue'][state] || CircleDot
  const url = safeExternalUrl(item.html_url)
  const title = item.title || '(no title)'

  return (
    <li className="item-row">
      <Icon size={16} className={`item-icon state-${state}`} aria-hidden="true" />
      <div className="item-main">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="item-title" title={title}>
            {title}
          </a>
        ) : (
          <span className="item-title">{title}</span>
        )}
        <div className="item-meta">
          <span className={`type-label ${pull ? 'type-pull' : 'type-issue'}`}>
            {pull ? 'Pull request' : 'Issue'}
          </span>
          <span className={`state-label state-${state}`}>{STATE_LABELS[state]}</span>
          <span>#{item.number}</span>
          {item.user?.login && <span>by {item.user.login}</span>}
          <span>
            updated <time dateTime={item.updated_at}>{formatDate(item.updated_at)}</time>
          </span>
        </div>
      </div>
    </li>
  )
}

function IssueList({ items, repo }) {
  const [filter, setFilter] = useState('all')
  const summary = useMemo(() => summarizeItems(items), [items])
  const shown = items.filter((item) =>
    filter === 'all' ? true : filter === 'pulls' ? isPullRequest(item) : !isPullRequest(item),
  )

  return (
    <>
      <div className="issue-toolbar">
        <div className="segmented" role="group" aria-label="Filter by type">
          {FILTERS.map((option) => {
            const count =
              option.id === 'all' ? items.length : option.id === 'issues' ? summary.issues : summary.pulls
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={filter === option.id}
                onClick={() => setFilter(option.id)}
              >
                {option.label} <span className="count">{count}</span>
              </button>
            )
          })}
        </div>
        <p className="issue-total">
          <strong>{formatNumber(repo.open_issues_count)}</strong> open issues and PRs in total
        </p>
      </div>

      {shown.length === 0 ? (
        <EmptyState>
          {items.length === 0
            ? 'This repository has no issues or pull requests yet.'
            : `None of the ${items.length} most recently updated items are ${filter === 'pulls' ? 'pull requests' : 'issues'}.`}
        </EmptyState>
      ) : (
        <ul className="item-list">
          {shown.map((item) => (
            <ItemRow key={item.id ?? item.number} item={item} />
          ))}
        </ul>
      )}

      <p className="note">
        Showing the {Math.min(items.length, ISSUES_LIMIT)} most recently updated issues and pull
        requests (open and closed). GitHub&apos;s open issue count of{' '}
        {formatNumber(repo.open_issues_count)} includes open pull requests, so RepoLens labels the
        two separately here.
      </p>
    </>
  )
}

function IssuesPanel({ state, repo }) {
  return (
    <Panel
      id="issues"
      title="Issues and pull requests"
      description="Most recently updated first."
    >
      {!repo.has_issues && (
        <p className="note">Issues are turned off for this repository, so only pull requests can appear.</p>
      )}
      <AsyncContent state={state} loadingLabel="Loading issues and pull requests…" lines={6}>
        {(items) => <IssueList items={items} repo={repo} />}
      </AsyncContent>
    </Panel>
  )
}

export default IssuesPanel
