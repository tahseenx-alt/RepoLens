// GitHub's issues endpoint returns issues AND pull requests together.
// Pull requests are the items that have a `pull_request` field.

export function isPullRequest(item) {
  return Boolean(item?.pull_request)
}

// A readable state for one item:
//   issues: 'open' | 'completed' | 'not-planned' | 'closed'
//   pull requests: 'open' | 'draft' | 'merged' | 'closed'
export function itemState(item) {
  if (isPullRequest(item)) {
    if (item.state === 'open') return item.draft ? 'draft' : 'open'
    return item.pull_request.merged_at ? 'merged' : 'closed'
  }
  if (item.state === 'open') return 'open'
  if (item.state_reason === 'completed') return 'completed'
  if (item.state_reason === 'not_planned') return 'not-planned'
  return 'closed'
}

export const STATE_LABELS = {
  open: 'Open',
  draft: 'Draft',
  merged: 'Merged',
  closed: 'Closed',
  completed: 'Closed',
  'not-planned': 'Not planned',
}

// Counts per type among the fetched items.
export function summarizeItems(items) {
  const summary = { issues: 0, pulls: 0, openIssues: 0, openPulls: 0 }
  for (const item of items || []) {
    if (isPullRequest(item)) {
      summary.pulls += 1
      if (item.state === 'open') summary.openPulls += 1
    } else {
      summary.issues += 1
      if (item.state === 'open') summary.openIssues += 1
    }
  }
  return summary
}
