// Rule-based repository health checks.
//
// Every check is based on one real piece of GitHub data, named in `source`.
// Each check returns one of these statuses:
//   'passed'      - the data shows the item is in place
//   'warning'     - the data confirms something worth improving
//   'unavailable' - the request failed, so we don't know either way
//   'pending'     - the data is still loading
// There is deliberately no overall score: the checks are simple signals,
// not a measure of code quality or security.
import { formatDate, formatNumber, formatRelative, isCount } from './format.js'
import { commitDate } from './commitActivity.js'

const DAY = 24 * 60 * 60 * 1000
// A default branch with no commits for this long gets a warning.
export const STALE_AFTER_DAYS = 180

function pending(check) {
  return { ...check, status: 'pending', summary: 'Checking…' }
}

function unavailable(check, error) {
  return {
    ...check,
    status: 'unavailable',
    summary: `Couldn't check this. ${error?.message || 'The request to GitHub failed.'}`,
  }
}

function readmeCheck(readme) {
  const check = { id: 'readme', title: 'README', source: 'GET /repos/{owner}/{repo}/readme' }
  if (readme.status === 'loading') return pending(check)
  if (readme.status === 'error') return unavailable(check, readme.error)
  if (readme.data.found) {
    return { ...check, status: 'passed', summary: `Found ${readme.data.file.path}.` }
  }
  return {
    ...check,
    status: 'warning',
    summary: 'GitHub found no README in this repository.',
    suggestion: 'Add a README.md that explains what the project does and how to run it.',
  }
}

function licenseCheck(repo) {
  const check = { id: 'license', title: 'License', source: 'Repository metadata (license)' }
  if (!repo.license) {
    return {
      ...check,
      status: 'warning',
      summary: "GitHub didn't detect a license file.",
      suggestion:
        'Add a LICENSE file so others know how they may use the code. Without one, default copyright applies.',
    }
  }
  if (repo.license.key === 'other') {
    return {
      ...check,
      status: 'warning',
      summary: "A license file exists, but GitHub couldn't identify which license it is.",
      suggestion: 'If you intend a standard license, use its exact text so tools can recognize it.',
    }
  }
  return { ...check, status: 'passed', summary: `${repo.license.name}.` }
}

function descriptionCheck(repo) {
  const check = { id: 'description', title: 'Description', source: 'Repository metadata (description)' }
  if (repo.description?.trim()) {
    return { ...check, status: 'passed', summary: 'The repository has a description.' }
  }
  return {
    ...check,
    status: 'warning',
    summary: 'The repository has no description.',
    suggestion: 'Add a one-line description in the repository settings so people know what it is.',
  }
}

function topicsCheck(repo) {
  const check = { id: 'topics', title: 'Topics', source: 'Repository metadata (topics)' }
  if (!Array.isArray(repo.topics)) {
    return { ...check, status: 'unavailable', summary: 'GitHub did not return topic information.' }
  }
  if (repo.topics.length > 0) {
    return { ...check, status: 'passed', summary: `${repo.topics.length} topic${repo.topics.length === 1 ? '' : 's'} set.` }
  }
  return {
    ...check,
    status: 'warning',
    summary: 'No topics are set.',
    suggestion: 'Add a few topics (like "react" or "cli") to make the project easier to find.',
  }
}

function contributingCheck(community) {
  const check = {
    id: 'contributing',
    title: 'Contributing guide',
    source: 'GET /repos/{owner}/{repo}/community/profile',
  }
  if (community.status === 'loading') return pending(check)
  if (community.status === 'error') return unavailable(check, community.error)
  if (community.data?.files?.contributing) {
    return { ...check, status: 'passed', summary: 'A CONTRIBUTING file was found.' }
  }
  return {
    ...check,
    status: 'warning',
    summary: 'GitHub found no CONTRIBUTING file.',
    suggestion: 'Add CONTRIBUTING.md to explain how others can report bugs and propose changes.',
  }
}

function activityCheck(repo, commits, now) {
  const check = {
    id: 'activity',
    title: 'Recent commits',
    source: 'GET /repos/{owner}/{repo}/commits (latest commit)',
  }
  if (commits.status === 'loading') return pending(check)
  if (commits.status === 'error') return unavailable(check, commits.error)
  const latest = commitDate(commits.data[0])
  if (!latest) {
    return {
      ...check,
      status: 'warning',
      summary: `No commits were found on the default branch (${repo.default_branch}).`,
    }
  }
  const when = `${formatRelative(latest, now.getTime())} (${formatDate(latest)})`
  if (now.getTime() - latest.getTime() > STALE_AFTER_DAYS * DAY) {
    return {
      ...check,
      status: 'warning',
      summary: `The latest commit on ${repo.default_branch} was ${when}.`,
      suggestion:
        'No commits in over 6 months. That can be fine for finished projects, but check whether it is still maintained before depending on it.',
    }
  }
  return { ...check, status: 'passed', summary: `The latest commit on ${repo.default_branch} was ${when}.` }
}

function issuesCheck(repo) {
  const check = { id: 'issues', title: 'Issue tracker', source: 'Repository metadata (has_issues, open_issues_count)' }
  if (!repo.has_issues) {
    return {
      ...check,
      status: 'warning',
      summary: 'Issues are turned off for this repository.',
      suggestion: 'Users have no place to report problems here; check whether the project uses another tracker.',
    }
  }
  return {
    ...check,
    status: 'passed',
    summary: isCount(repo.open_issues_count)
      ? `Issues are enabled. ${formatNumber(repo.open_issues_count)} open issues and pull requests (GitHub counts both together).`
      : "Issues are enabled. GitHub didn't report how many are open.",
  }
}

function archivedCheck(repo) {
  const check = { id: 'archived', title: 'Archive status', source: 'Repository metadata (archived)' }
  if (repo.archived) {
    return {
      ...check,
      status: 'warning',
      summary: 'This repository is archived and read-only.',
      suggestion: 'Archived projects no longer receive changes; look for a maintained alternative or fork.',
    }
  }
  return { ...check, status: 'passed', summary: 'The repository is not archived.' }
}

// `readme`, `commits` and `community` are { status, data, error } objects
// from useGitHubData. `repo` is the loaded repository.
export function runHealthChecks({ repo, readme, commits, community, now = new Date() }) {
  return [
    readmeCheck(readme),
    licenseCheck(repo),
    descriptionCheck(repo),
    topicsCheck(repo),
    contributingCheck(community),
    activityCheck(repo, commits, now),
    issuesCheck(repo),
    archivedCheck(repo),
  ]
}

export function countByStatus(checks) {
  const counts = { passed: 0, warning: 0, unavailable: 0, pending: 0 }
  for (const check of checks) {
    counts[check.status] += 1
  }
  return counts
}
