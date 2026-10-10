// Everything that talks to the GitHub REST API lives in this file.
// Docs: https://docs.github.com/en/rest
//
// No token is used: RepoLens only reads public data, so it works without
// logging in. GitHub allows about 60 of these requests per hour per IP
// address, so RepoLens tries hard not to waste any:
//   - answers are saved (see cache.js) and reused when a repository is opened again
//   - two parts of the page asking for the same thing share one request
//   - only the fields the page uses are kept, so many repositories fit in storage
//   - once GitHub says the limit is used up, nothing is sent until it resets
//     (see rateLimit.js)
//
// A repository costs 5 requests (repository, languages, commits,
// contributors, community profile), plus 1 when the Issues & PRs tab is
// opened, plus 1 if the README has to be checked separately.

import { formatClock } from '../utils/format.js'
import {
  cacheKey,
  clearMemory,
  clearStored,
  copyInfo,
  deliver,
  expireRepository,
  getDataInfo,
  readFresh,
  readSaved,
  remember,
} from './cache.js'
import {
  DEFAULT_WAIT,
  currentBlock,
  getRateLimit,
  onRateLimitChange,
  pauseRequests,
  recordRateLimit,
  reloadRateLimit,
  resetRateLimit,
} from './rateLimit.js'

export { getDataInfo, getRateLimit, onRateLimitChange }

const API_URL = 'https://api.github.com'

// Limits used by the dashboard. GitHub returns at most 100 items per page.
export const COMMITS_LIMIT = 100
export const CONTRIBUTORS_LIMIT = 20
export const ISSUES_LIMIT = 30

// A custom error type, so the page can show a message that matches
// what went wrong. `type` is one of:
//   'not-found', 'rate-limit', 'network', 'empty-repo', 'unavailable'
// Rate-limit errors also have `retryAt`: the Date when GitHub will accept
// requests again, or null if GitHub didn't say.
export class GitHubError extends Error {
  constructor(type, message, status, retryAt = null) {
    super(message)
    this.name = 'GitHubError'
    this.type = type
    this.status = status
    this.retryAt = retryAt
  }
}

function rateLimitError(block, status) {
  if (!block) {
    return new GitHubError(
      'rate-limit',
      "GitHub's request limit has been reached. Wait a minute and try again.",
      status,
    )
  }
  const time = formatClock(block.until)
  const messages = {
    hourly: `GitHub allows ${getRateLimit()?.limit || 60} requests per hour without signing in, and all of them have been used. The limit resets at ${time}.`,
    secondary: `GitHub is briefly refusing requests because too many arrived at once. Try again after ${time}.`,
    wait: `GitHub's request limit has been reached. Try again after ${time}.`,
  }
  return new GitHubError('rate-limit', messages[block.reason] || messages.wait, status, block.until)
}

// ---------- Cache controls ----------

function repoPath(owner, repo) {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
}

// "Refresh": the next request for this repository goes to GitHub. The
// old answers are kept, in case GitHub can't answer.
export function clearRepoCache(owner, repo) {
  expireRepository(cacheKey(repoPath(owner, repo)))
}

// Removes every saved answer from this browser ("Clear history").
export function clearSavedResponses() {
  clearMemory()
  clearStored()
}

// Used by tests to start from a clean state.
export function clearAllCache() {
  clearSavedResponses()
  inFlight.clear()
  resetRateLimit()
}

// Used by tests to act as if the page was reloaded: memory is empty,
// but whatever was saved in localStorage is still there.
export function simulateReload() {
  clearMemory()
  inFlight.clear()
  reloadRateLimit()
}

async function readErrorMessage(response) {
  try {
    const body = await response.json()
    return typeof body?.message === 'string' ? body.message : ''
  } catch {
    // The body was not JSON; the status code is enough.
    return ''
  }
}

// ---------- The request function ----------

// Requests that are still on their way, so two parts of the page asking
// for the same thing at the same time share one request.
const inFlight = new Map()

// Lets one caller stop waiting (for example when the page changes) without
// cancelling the shared request for everyone else. The answer still lands
// in the cache, so it isn't wasted.
function waitWithSignal(promise, signal) {
  if (!signal) {
    return promise
  }
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('The request was cancelled.', 'AbortError'))
    promise.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
    if (signal.aborted) {
      abort()
    } else {
      signal.addEventListener('abort', abort, { once: true })
    }
  })
}

const keepAsIs = (data) => data

// Gets one piece of data: from the cache when it's fresh, otherwise from
// GitHub. Options:
//   signal          - lets the caller stop waiting for the answer
//   notFoundMessage - shown when GitHub answers 404
//   shape(data)     - keeps only what the page needs, before it is saved
//   orElse          - answers that count as data, e.g. { 'not-found': () => ({ found: false }) }
export function githubRequest(path, { signal, ...options } = {}) {
  const key = cacheKey(path)
  const fresh = readFresh(key)
  if (fresh) {
    return Promise.resolve(deliver(fresh))
  }

  if (!inFlight.has(key)) {
    const request = fetchAndSave(path, key, options).finally(() => inFlight.delete(key))
    inFlight.set(key, request)
  }
  return waitWithSignal(inFlight.get(key), signal)
}

// When GitHub can't answer for one of these reasons, an older saved answer
// is better than nothing, as long as the page says it's old. A 404 is
// different: the repository is gone or private, so old data would mislead.
function canUseSavedAnswer(error) {
  return (
    error instanceof GitHubError &&
    (error.type === 'rate-limit' || error.type === 'network' || (error.type === 'unavailable' && error.status >= 500))
  )
}

async function fetchAndSave(path, key, { notFoundMessage, shape = keepAsIs, orElse = {} }) {
  let data
  try {
    // Once GitHub has said "no more for now", don't send anything until it resets.
    const block = currentBlock()
    if (block) {
      throw rateLimitError(block)
    }
    data = shape(await sendRequest(path, notFoundMessage))
  } catch (error) {
    const answer = error instanceof GitHubError ? orElse[error.type] : undefined
    if (answer) {
      data = answer()
    } else {
      const saved = canUseSavedAnswer(error) ? readSaved(key) : null
      if (saved) {
        return deliver(saved, error)
      }
      throw error
    }
  }
  return deliver(remember(key, data))
}

async function sendRequest(path, notFoundMessage) {
  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
  } catch {
    // fetch() only throws when the request never reached GitHub,
    // for example when the user is offline.
    throw new GitHubError(
      'network',
      'Could not reach GitHub. Check your internet connection and try again.',
    )
  }

  recordRateLimit(response)

  if (response.ok) {
    // 204 means "no content", e.g. contributors of an empty repository.
    return response.status === 204 ? null : response.json()
  }

  const detail = await readErrorMessage(response)

  // GitHub answers 403 or 429 when the hourly limit runs out, and when too
  // many requests arrive at once (a "secondary" limit).
  const remaining = response.headers.get('x-ratelimit-remaining')
  if (
    response.status === 429 ||
    (response.status === 403 && (remaining === '0' || /rate limit/i.test(detail)))
  ) {
    const retryAfter = Number(response.headers.get('retry-after'))
    const secondary = response.status === 429 || /secondary/i.test(detail) || retryAfter > 0
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      pauseRequests(retryAfter * 1000, 'secondary')
    } else if (!currentBlock()) {
      // No reset time we can use: wait at least a minute, as GitHub asks.
      pauseRequests(DEFAULT_WAIT, secondary ? 'secondary' : 'wait')
    }
    throw rateLimitError(currentBlock(), response.status)
  }

  if (response.status === 404) {
    throw new GitHubError(
      'not-found',
      notFoundMessage || 'GitHub could not find this information.',
      404,
    )
  }

  // 409 "Git Repository is empty."
  if (response.status === 409 && /empty/i.test(detail)) {
    throw new GitHubError('empty-repo', 'This repository is empty.', 409)
  }

  throw new GitHubError(
    'unavailable',
    detail
      ? `GitHub couldn't provide this: ${detail.replace(/\.$/, '')}.`
      : `GitHub returned an unexpected error (status ${response.status}). Please try again.`,
    response.status,
  )
}

// ---------- Keeping only what the page uses ----------
// Saved answers stay small, so many repositories fit in localStorage.
// A field GitHub didn't send stays missing (it never turns into 0).

function pick(source, keys) {
  if (!source || typeof source !== 'object') {
    return source
  }
  return Object.fromEntries(keys.filter((key) => key in source).map((key) => [key, source[key]]))
}

function listOf(shapeItem) {
  return (data) => (Array.isArray(data) ? data.map(shapeItem) : [])
}

function shapeCommit(item) {
  return {
    ...pick(item, ['sha', 'html_url']),
    commit: item?.commit && {
      ...pick(item.commit, ['message']),
      author: pick(item.commit.author, ['name', 'date']),
      committer: pick(item.commit.committer, ['date']),
    },
    author: pick(item?.author, ['login', 'avatar_url', 'html_url']),
  }
}

function shapeContributor(person) {
  // Anonymous contributors also have an email address; it isn't shown, so it isn't kept.
  return pick(person, ['id', 'login', 'avatar_url', 'html_url', 'contributions', 'type', 'name'])
}

function shapeIssue(item) {
  return {
    ...pick(item, ['id', 'number', 'title', 'html_url', 'state', 'state_reason', 'draft', 'updated_at']),
    user: pick(item?.user, ['login']),
    // Only pull requests have this field, so it is copied only when present.
    ...(item && 'pull_request' in item ? { pull_request: pick(item.pull_request, ['merged_at']) } : {}),
  }
}

function shapeCommunity(profile) {
  const files = profile?.files
  return {
    files: files && {
      readme: pick(files.readme, ['url', 'html_url']),
      contributing: pick(files.contributing, ['url', 'html_url']),
    },
  }
}

// ---------- One function per piece of data ----------

// The repository's details: stars, forks, license, dates and so on.
// Kept whole: it is small and the header uses many of its fields.
export function fetchRepository(owner, repo, signal) {
  return githubRequest(repoPath(owner, repo), {
    signal,
    notFoundMessage: `We couldn't find "${owner}/${repo}". Check the spelling, and make sure the repository is public.`,
  })
}

// Bytes of code per language, e.g. { JavaScript: 52000, CSS: 4000 }.
export function fetchLanguages(owner, repo, signal) {
  return githubRequest(`${repoPath(owner, repo)}/languages`, {
    signal,
    shape: (data) => data ?? {},
  })
}

// The latest commits on the default branch, newest first.
export function fetchCommits(owner, repo, signal) {
  return githubRequest(`${repoPath(owner, repo)}/commits?per_page=${COMMITS_LIMIT}`, {
    signal,
    shape: listOf(shapeCommit),
    // An empty repository has no commits; that's not an error.
    orElse: { 'empty-repo': () => [] },
  })
}

// Top contributors by commit count. `anon=1` also includes commits whose
// email isn't linked to a GitHub account.
export function fetchContributors(owner, repo, signal) {
  return githubRequest(
    `${repoPath(owner, repo)}/contributors?per_page=${CONTRIBUTORS_LIMIT}&anon=1`,
    { signal, shape: listOf(shapeContributor) },
  )
}

// The most recently updated issues AND pull requests. GitHub's issues
// endpoint returns both; pull requests have a `pull_request` field.
export function fetchIssuesAndPulls(owner, repo, signal) {
  return githubRequest(
    `${repoPath(owner, repo)}/issues?state=all&sort=updated&direction=desc&per_page=${ISSUES_LIMIT}`,
    { signal, shape: listOf(shapeIssue) },
  )
}

// GitHub's community profile lists files like README and CONTRIBUTING.
// GitHub doesn't provide it for forks, so for a fork nothing is requested.
export function fetchCommunityProfile(owner, repo, signal, { isFork = false } = {}) {
  if (isFork) {
    return Promise.reject(
      new GitHubError('unavailable', "GitHub doesn't provide community profile data for forks."),
    )
  }
  return githubRequest(`${repoPath(owner, repo)}/community/profile`, {
    signal,
    shape: shapeCommunity,
  })
}

// "contents/docs/README.md" in the file's API address -> "docs/README.md".
function readmeFromProfile(profile) {
  const file = profile?.files?.readme
  if (!file) {
    return null
  }
  let path = null
  try {
    const [, rest] = new URL(file.url).pathname.split('/contents/')
    path = rest ? decodeURIComponent(rest) : null
  } catch {
    // Unusual address: the README is still there, just without a path.
  }
  return { found: true, file: { name: path?.split('/').pop() ?? null, path, html_url: file.html_url } }
}

// Checks for a README. Returns { found: true, file } or { found: false }.
// The community profile (which the page loads anyway) usually answers this,
// so the README endpoint is only asked when the profile can't: for forks,
// when the profile failed, or when it found no README.
// Only a 404 counts as "no README"; any other failure is thrown, so the
// health check can say the answer is unknown rather than wrongly "missing".
export async function fetchReadme(owner, repo, signal, { isFork = false } = {}) {
  if (!isFork) {
    try {
      const profile = await fetchCommunityProfile(owner, repo, signal)
      const fromProfile = readmeFromProfile(profile)
      if (fromProfile) {
        return copyInfo(profile, fromProfile)
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw error
      }
      // Ask the README endpoint instead.
    }
  }
  return githubRequest(`${repoPath(owner, repo)}/readme`, {
    signal,
    shape: (file) => ({ found: true, file: pick(file, ['name', 'path', 'html_url']) }),
    orElse: { 'not-found': () => ({ found: false }), 'empty-repo': () => ({ found: false }) },
  })
}
