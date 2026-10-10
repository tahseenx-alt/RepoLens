import { useState } from 'react'
import { commitTitle, formatDate, safeExternalUrl } from '../../utils/format.js'
import { commitDate } from '../../utils/commitActivity.js'
import Panel from '../ui/Panel.jsx'
import { AsyncContent, EmptyState } from '../ui/States.jsx'

const PAGE_SIZE = 10

function CommitRow({ item }) {
  const title = commitTitle(item.commit?.message)
  // `item.author` is the GitHub account. It's missing when the commit's
  // email isn't linked to an account, so fall back to the name in Git.
  const authorName = item.author?.login || item.commit?.author?.name || 'Unknown author'
  const date = commitDate(item)
  const url = safeExternalUrl(item.html_url)
  const shortSha = item.sha?.slice(0, 7)

  return (
    <li className="commit-row">
      <div className="commit-main">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="commit-title" title={title}>
            {title}
          </a>
        ) : (
          <span className="commit-title" title={title}>
            {title}
          </span>
        )}
        <div className="commit-meta">
          {item.author?.avatar_url && (
            <img src={item.author.avatar_url} alt="" width="16" height="16" loading="lazy" />
          )}
          <span>{authorName}</span>
          <span aria-hidden="true">·</span>
          {date ? <time dateTime={date.toISOString()}>{formatDate(date)}</time> : <span>Unknown date</span>}
        </div>
      </div>
      {shortSha && (
        <code className="commit-sha" aria-label={`Commit ${shortSha}`}>
          {shortSha}
        </code>
      )}
    </li>
  )
}

function CommitList({ commits }) {
  const [visible, setVisible] = useState(PAGE_SIZE)

  if (commits.length === 0) {
    return <EmptyState>This repository has no commits yet.</EmptyState>
  }

  return (
    <>
      <ol className="commit-list">
        {commits.slice(0, visible).map((item) => (
          <CommitRow key={item.sha} item={item} />
        ))}
      </ol>
      {visible < commits.length && (
        <button
          type="button"
          className="button button-small show-more"
          onClick={() => setVisible((count) => count + PAGE_SIZE)}
        >
          Show {Math.min(PAGE_SIZE, commits.length - visible)} more
        </button>
      )}
      <p className="note">
        Showing {Math.min(visible, commits.length)} of the {commits.length} most recent commits fetched.
      </p>
    </>
  )
}

function RecentCommitsPanel({ state, repo }) {
  return (
    <Panel
      id="commits"
      title="Recent commits"
      description={`Newest first, on ${repo.default_branch}.`}
    >
      <AsyncContent state={state} loadingLabel="Loading commits…" lines={6}>
        {(commits) => <CommitList commits={commits} />}
      </AsyncContent>
    </Panel>
  )
}

export default RecentCommitsPanel
