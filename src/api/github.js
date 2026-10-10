// Everything that talks to the GitHub REST API lives in this file.
// Docs: https://docs.github.com/en/rest/repos/repos#get-a-repository

const API_URL = 'https://api.github.com'

// GitHub usernames use letters, numbers and dashes.
// Repository names can also use dots and underscores.
const OWNER_PATTERN = /^[A-Za-z0-9-]+$/
const REPO_PATTERN = /^[A-Za-z0-9._-]+$/

// Turns what the user typed into { owner, repo }, or returns null
// if it doesn't look like a repository. All of these work:
//   facebook/react
//   github.com/facebook/react
//   https://github.com/facebook/react.git
//   https://github.com/facebook/react/tree/main/packages
export function parseRepoInput(input) {
  let text = input.trim()

  // Remove the start of a URL, if there is one.
  text = text.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '')

  // Only the first two parts matter: owner and repo.
  const [owner, rawRepo] = text.split('/')
  if (!owner || !rawRepo) {
    return null
  }

  const repo = rawRepo.replace(/\.git$/i, '')
  if (!OWNER_PATTERN.test(owner) || !REPO_PATTERN.test(repo)) {
    return null
  }

  return { owner, repo }
}

// A custom error type, so the page can show a friendly message
// that matches what went wrong.
export class GitHubError extends Error {
  constructor(type, message) {
    super(message)
    this.type = type
  }
}

// Formats the time when the rate limit resets, e.g. "3:45 PM".
function formatResetTime(response) {
  const reset = response.headers.get('x-ratelimit-reset')
  if (!reset) {
    return null
  }
  const date = new Date(Number(reset) * 1000)
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// Answers we already received, so searching the same repository again
// does not spend more of GitHub's rate limit.
const cache = new Map()

// Sends one GET request to GitHub and turns failures into friendly errors.
// `notFoundMessage` is shown when GitHub answers 404.
async function githubRequest(path, { signal, notFoundMessage } = {}) {
  if (cache.has(path)) {
    return cache.get(path)
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal,
    })
  } catch (error) {
    // A cancelled request is not a real error, so pass it on unchanged.
    if (error.name === 'AbortError') {
      throw error
    }
    // fetch() only throws when the request never reached GitHub,
    // for example when the user is offline.
    throw new GitHubError(
      'network',
      'Could not reach GitHub. Check your internet connection and try again.',
    )
  }

  if (response.ok) {
    // 204 means "no content", e.g. contributors of an empty repository.
    const data = response.status === 204 ? [] : await response.json()
    cache.set(path, data)
    return data
  }

  if (response.status === 404) {
    throw new GitHubError(
      'not-found',
      notFoundMessage || 'GitHub could not find this information.',
    )
  }

  // GitHub allows 60 requests per hour without logging in.
  // When that runs out it answers with 403 or 429.
  const remaining = response.headers.get('x-ratelimit-remaining')
  if (response.status === 429 || (response.status === 403 && remaining === '0')) {
    const resetTime = formatResetTime(response)
    throw new GitHubError(
      'rate-limit',
      resetTime
        ? `GitHub's rate limit has been reached. Please try again after ${resetTime}.`
        : "GitHub's rate limit has been reached. Please wait a while and try again.",
    )
  }

  // GitHub sometimes explains the problem, e.g. "too large to list contributors".
  let detail = ''
  try {
    detail = (await response.json()).message || ''
  } catch {
    // The body was not JSON; the status code is enough.
  }

  throw new GitHubError(
    'unknown',
    detail
      ? `GitHub couldn't load this: ${detail.replace(/\.$/, '')}.`
      : `GitHub returned an unexpected error (status ${response.status}). Please try again.`,
  )
}

// Downloads one repository's details from GitHub.
// `signal` lets the page cancel the request if a new search starts.
export function fetchRepository(owner, repo, signal) {
  return githubRequest(`/repos/${owner}/${repo}`, {
    signal,
    notFoundMessage: `We couldn't find "${owner}/${repo}". Check the spelling, and make sure the repository is public.`,
  })
}

// Bytes of code per language, e.g. { JavaScript: 52000, CSS: 4000 }.
export function fetchLanguages(fullName, signal) {
  return githubRequest(`/repos/${fullName}/languages`, { signal })
}

// The latest 100 commits (the most GitHub returns in one request).
// One request feeds both the activity chart and the recent commits list.
export async function fetchCommits(fullName, signal) {
  try {
    return await githubRequest(`/repos/${fullName}/commits?per_page=100`, { signal })
  } catch (error) {
    // GitHub answers 409 for a repository with no commits yet.
    if (error.type === 'unknown' && /empty/i.test(error.message)) {
      return []
    }
    throw error
  }
}

// The top 10 contributors, sorted by number of commits.
export function fetchContributors(fullName, signal) {
  return githubRequest(`/repos/${fullName}/contributors?per_page=10`, { signal })
}
