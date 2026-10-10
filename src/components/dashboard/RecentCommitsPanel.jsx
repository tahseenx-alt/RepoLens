import { useState } from 'react'
import CommitRow from './CommitRow.jsx'
import Panel from '../ui/Panel.jsx'
import { AsyncContent, EmptyState } from '../ui/States.jsx'

const PAGE_SIZE = 10

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
