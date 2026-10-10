// Turns what the user types into a GitHub owner and repository name.
//
// Accepted:
//   facebook/react
//   github.com/facebook/react
//   https://github.com/facebook/react
//   https://github.com/facebook/react.git
//   https://github.com/facebook/react/tree/main/packages
//   git@github.com:facebook/react.git
//
// Returns { ok: true, owner, repo } or { ok: false, error }.

// GitHub usernames: 1–39 letters, numbers or dashes, not starting or
// ending with a dash. (New accounts can't use "--", but some old ones do,
// so it is allowed here rather than rejecting a real repository.)
const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/
// Repository names: up to 100 letters, numbers, dots, dashes or underscores.
const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/

// Pages on github.com that look like "owner/repo" but are not repositories.
const RESERVED_OWNERS = new Set([
  'about',
  'collections',
  'explore',
  'features',
  'login',
  'marketplace',
  'notifications',
  'orgs',
  'organizations',
  'pricing',
  'pulls',
  'issues',
  'search',
  'settings',
  'sponsors',
  'topics',
  'trending',
])

const FORMAT_HINT = 'Use owner/repo (like facebook/react) or a github.com repository link.'

export function isValidOwner(owner) {
  return typeof owner === 'string' && OWNER_PATTERN.test(owner) && !RESERVED_OWNERS.has(owner.toLowerCase())
}

export function isValidRepoName(repo) {
  return typeof repo === 'string' && REPO_PATTERN.test(repo) && repo !== '.' && repo !== '..'
}

function fail(error) {
  return { ok: false, error }
}

// Checks the two path parts and builds the result.
function fromParts(owner, rawRepo) {
  if (!owner || !rawRepo) {
    return fail(`That link doesn't point to a repository. ${FORMAT_HINT}`)
  }
  const repo = rawRepo.replace(/\.git$/i, '')
  if (!isValidOwner(owner)) {
    return fail(`"${owner}" is not a valid GitHub user or organization name.`)
  }
  if (!isValidRepoName(repo)) {
    return fail(`"${repo}" is not a valid repository name.`)
  }
  return { ok: true, owner, repo }
}

export function parseRepoInput(input) {
  const text = (input ?? '').trim()
  if (!text) {
    return fail(`Enter a repository to analyze. ${FORMAT_HINT}`)
  }
  if (/\s/.test(text)) {
    return fail(`Repository names can't contain spaces. ${FORMAT_HINT}`)
  }

  // SSH clone address: git@github.com:owner/repo.git
  const ssh = text.match(/^git@github\.com:([^/]+)\/([^/]+)$/i)
  if (ssh) {
    return fromParts(ssh[1], ssh[2])
  }

  // Short form: exactly "owner/repo" (a trailing slash is fine).
  // A dot in the first part means it's a domain, so it's handled as a link.
  const shortForm = text.match(/^([^/.:]+)\/([^/:]+)\/?$/)
  if (shortForm) {
    return fromParts(shortForm[1], shortForm[2])
  }

  // Anything else must be a link. Add https:// if it was left out.
  const hasProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(text)
  if (!hasProtocol && !text.split('/')[0].includes('.')) {
    // e.g. "react" or "facebook/react/extra": not a link and not owner/repo.
    return fail(FORMAT_HINT)
  }
  const withProtocol = hasProtocol ? text : `https://${text}`
  let url
  try {
    url = new URL(withProtocol)
  } catch {
    return fail(`That doesn't look like a valid link. ${FORMAT_HINT}`)
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return fail(`Only http and https links are supported. ${FORMAT_HINT}`)
  }
  const host = url.hostname.toLowerCase()
  if (host !== 'github.com' && host !== 'www.github.com') {
    return fail(`RepoLens only analyzes repositories on github.com, not ${url.hostname}.`)
  }
  if (url.username || url.password || url.port) {
    return fail(`That doesn't look like a normal GitHub link. ${FORMAT_HINT}`)
  }

  // Only the first two parts of the path matter: /owner/repo/...
  const [owner, repo] = url.pathname.split('/').filter(Boolean)
  return fromParts(owner, repo)
}
