// Everything that talks to the GitHub REST API lives in this file.
// Docs: https://docs.github.com/en/rest
//
// No token is used: RepoLens only reads public data, so it works without
// logging in. GitHub allows about 60 of these requests per hour per IP.

const API_URL = 'https://api.github.com'

// Answers are kept for 5 minutes, so opening the same repository again
// (or moving back and forward in the browser) doesn't spend more requests.
const CACHE_TIME = 5 * 60 * 1000

// Limits used by the dashboard. GitHub returns at most 100 items per page.
export const COMMITS_LIMIT = 100
export const CONTRIBUTORS_LIMIT = 20
export const ISSUES_LIMIT = 30

// A custom error type, so the page can show a message that matches
// what went wrong. `type` is one of:
//   'not-found', 'rate-limit', 'network', 'empty-repo', 'unavailable'
export class GitHubError extends Error {
  constructor(type, message, status) {
    super(message)
    this.name = 'GitHubError'
    this.type = type
    this.status = status
  }
}

// ---------- Cache ----------

const cache = new Map()

function readCache(path) {
  const entry = cache.get(path)
  if (!entry) {
    return undefined
  }
  if (Date.now() - entry.savedAt > CACHE_TIME) {
    cache.delete(path)
    return undefined
  }
  return entry.data
}

// Forgets every cached answer for one repository (used by "Refresh").
export function clearRepoCache(owner, repo) {
  const prefix = `/repos/${owner}/${repo}`.toLowerCase()
  for (const path of cache.keys()) {
    const lower = path.toLowerCase()
    if (lower === prefix || lower.startsWith(`${prefix}/`) || lower.startsWith(`${prefix}?`)) {
      cache.delete(path)
    }
  }
}

// Used by tests to start from a clean state.
export function clearAllCache() {
  cache.clear()
  inFlight.clear()
}

// ---------- Rate limit tracking ----------

// The latest rate-limit numbers GitHub sent back, so the page can show
// how many requests are left. Components subscribe with onRateLimitChange.
let rateLimit = null
const rateLimitListeners = new Set()

export function getRateLimit() {
  return rateLimit
}

export function onRateLimitChange(listener) {
  rateLimitListeners.add(listener)
  return () => rateLimitListeners.delete(listener)
}

function recordRateLimit(response) {
  const limit = Number(response.headers.get('x-ratelimit-limit'))
  const remaining = Number(response.headers.get('x-ratelimit-remaining'))
  const reset = Number(response.headers.get('x-ratelimit-reset'))
  if (!response.headers.has('x-ratelimit-remaining') || !Number.isFinite(remaining)) {
    return
  }
  rateLimit = {
    limit: Number.isFinite(limit) ? limit : null,
    remaining,
    resetAt: Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000) : null,
  }
  rateLimitListeners.forEach((listener) => listener(rateLimit))
}

function formatResetTime(response) {
  const reset = Number(response.headers.get('x-ratelimit-reset'))
  if (!reset) {
    return null
  }
  return new Date(reset * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
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

// Sends one GET request to GitHub and turns failures into GitHubErrors.
// Options:
//   signal          - lets the caller stop waiting for the answer
//   notFoundMessage - shown when GitHub answers 404
export function githubRequest(path, { signal, notFoundMessage } = {}) {
  const cached = readCache(path)
  if (cached !== undefined) {
    return Promise.resolve(cached)
  }

  if (!inFlight.has(path)) {
    const request = sendRequest(path, notFoundMessage).finally(() => inFlight.delete(path))
    inFlight.set(path, request)
  }
  return waitWithSignal(inFlight.get(path), signal)
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
    const data = response.status === 204 ? null : await response.json()
    cache.set(path, { data, savedAt: Date.now() })
    return data
  }

  const detail = await readErrorMessage(response)

  // GitHub answers 403 or 429 when the hourly limit runs out, and 403 with
  // a "secondary rate limit" message when too many requests arrive at once.
  const remaining = response.headers.get('x-ratelimit-remaining')
  if (
    response.status === 429 ||
    (response.status === 403 && (remaining === '0' || /rate limit/i.test(detail)))
  ) {
    const resetTime = formatResetTime(response)
    throw new GitHubError(
      'rate-limit',
      resetTime
        ? `GitHub's hourly limit for unauthenticated requests has been reached. Try again after ${resetTime}.`
        : "GitHub's request limit has been reached. Please wait a few minutes and try again.",
      response.status,
    )
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

function repoPath(owner, repo) {
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
}

// ---------- One function per piece of data ----------

// The repository's details: stars, forks, license, dates and so on.
export function fetchRepository(owner, repo, signal) {
  return githubRequest(repoPath(owner, repo), {
    signal,
    notFoundMessage: `We couldn't find "${owner}/${repo}". Check the spelling, and make sure the repository is public.`,
  })
}

// Bytes of code per language, e.g. { JavaScript: 52000, CSS: 4000 }.
export async function fetchLanguages(owner, repo, signal) {
  return (await githubRequest(`${repoPath(owner, repo)}/languages`, { signal })) ?? {}
}

// The latest commits on the default branch, newest first.
export async function fetchCommits(owner, repo, signal) {
  try {
    const data = await githubRequest(
      `${repoPath(owner, repo)}/commits?per_page=${COMMITS_LIMIT}`,
      { signal },
    )
    return data ?? []
  } catch (error) {
    // An empty repository has no commits; that's not an error.
    if (error.type === 'empty-repo') {
      return []
    }
    throw error
  }
}

// Top contributors by commit count. `anon=1` also includes commits whose
// email isn't linked to a GitHub account.
export async function fetchContributors(owner, repo, signal) {
  const data = await githubRequest(
    `${repoPath(owner, repo)}/contributors?per_page=${CONTRIBUTORS_LIMIT}&anon=1`,
    { signal },
  )
  return data ?? []
}

// The most recently updated issues AND pull requests. GitHub's issues
// endpoint returns both; pull requests have a `pull_request` field.
export async function fetchIssuesAndPulls(owner, repo, signal) {
  const data = await githubRequest(
    `${repoPath(owner, repo)}/issues?state=all&sort=updated&direction=desc&per_page=${ISSUES_LIMIT}`,
    { signal },
  )
  return data ?? []
}

// Checks for a README. Returns { found: true, file } or { found: false }.
// Only a 404 counts as "no README"; any other failure is thrown, so the
// health check can say the answer is unknown rather than wrongly "missing".
export async function fetchReadme(owner, repo, signal) {
  try {
    const file = await githubRequest(`${repoPath(owner, repo)}/readme`, { signal })
    return { found: true, file: { name: file.name, path: file.path, html_url: file.html_url } }
  } catch (error) {
    if (error.type === 'not-found' || error.type === 'empty-repo') {
      return { found: false }
    }
    throw error
  }
}

// GitHub's community profile lists files like CONTRIBUTING and CODE_OF_CONDUCT.
export function fetchCommunityProfile(owner, repo, signal) {
  return githubRequest(`${repoPath(owner, repo)}/community/profile`, { signal })
}
