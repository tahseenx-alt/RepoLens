// Remembers GitHub's answers, so the same data isn't requested twice.
//
// Answers are kept in two places:
//   - memory, until the tab is closed or reloaded
//   - the browser's localStorage, which survives a reload, so opening a
//     repository again later doesn't cost any requests
//
// Each answer counts as "fresh" for a time that depends on how quickly that
// kind of data changes (see FRESH_FOR). After that it is requested again.
// An expired answer is kept for up to a week, but it is only shown when
// GitHub can't answer (rate limit, offline, server error), and the page
// then says how old it is.
//
// Only public repository data is stored: never tokens or anything personal.

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

// How long each kind of answer stays fresh. The first matching rule wins.
const FRESH_FOR = [
  { pattern: /\/languages$/, time: 6 * HOUR },
  { pattern: /\/(readme|community\/profile)$/, time: 6 * HOUR },
  { pattern: /\/contributors\?/, time: HOUR },
]
// Repository details, commits, issues and pull requests change more often.
const DEFAULT_FRESH_FOR = 10 * MINUTE
// Expired answers are kept this long, to show when GitHub can't answer.
export const KEEP_FOR = 7 * DAY

// The "v1" changes if the stored format ever changes, so old data is ignored.
const STORAGE_PREFIX = 'repolens:api:v1:'
// At most this many answers are stored: about 10 repositories.
const MAX_STORED = 60

export function freshFor(key) {
  return FRESH_FOR.find((rule) => rule.pattern.test(key))?.time ?? DEFAULT_FRESH_FOR
}

// Owner and repository names aren't case-sensitive on GitHub, so
// "Facebook/React" and "facebook/react" share one entry.
export function cacheKey(path) {
  return path.toLowerCase()
}

// ---------- Memory ----------

// key -> { data, savedAt, expired }
const memory = new Map()

function isFresh(key, entry, now = Date.now()) {
  return !entry.expired && now - entry.savedAt < freshFor(key)
}

function isKept(entry, now = Date.now()) {
  return now - entry.savedAt < KEEP_FOR
}

// ---------- localStorage ----------
// Every access is wrapped in try/catch: storage can be full, blocked
// (private mode, strict settings) or edited by hand.

function isValidEntry(entry) {
  return Boolean(entry) && Number.isFinite(entry.savedAt) && 'data' in entry
}

function readStored(key) {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) {
      return null
    }
    const entry = JSON.parse(raw)
    if (isValidEntry(entry) && isKept(entry)) {
      return { data: entry.data, savedAt: entry.savedAt, expired: Boolean(entry.expired) }
    }
    window.localStorage.removeItem(STORAGE_PREFIX + key)
  } catch {
    // Unreadable: treat it as not stored.
  }
  return null
}

function storedKeys() {
  const keys = []
  for (let index = 0; index < window.localStorage.length; index++) {
    const key = window.localStorage.key(index)
    if (key?.startsWith(STORAGE_PREFIX)) {
      keys.push(key)
    }
  }
  return keys
}

// Removes the oldest stored answers until only `keep` are left.
function removeOldest(keep) {
  const entries = storedKeys().map((key) => {
    try {
      return { key, savedAt: JSON.parse(window.localStorage.getItem(key))?.savedAt ?? 0 }
    } catch {
      return { key, savedAt: 0 }
    }
  })
  entries.sort((a, b) => a.savedAt - b.savedAt)
  for (const { key } of entries.slice(0, Math.max(0, entries.length - keep))) {
    window.localStorage.removeItem(key)
  }
}

function writeStored(key, entry) {
  const value = JSON.stringify(entry)
  // If storage is full, make room once and try again.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      window.localStorage.setItem(STORAGE_PREFIX + key, value)
      if (storedKeys().length > MAX_STORED) {
        // Leave room for a couple of repositories, so this doesn't run on every save.
        removeOldest(MAX_STORED - 12)
      }
      return
    } catch {
      try {
        removeOldest(Math.floor(storedKeys().length / 2))
      } catch {
        return
      }
    }
  }
}

// ---------- Used by the request code ----------

// A fresh answer from memory or storage, or null.
export function readFresh(key) {
  const inMemory = memory.get(key)
  if (inMemory && isFresh(key, inMemory)) {
    return inMemory
  }
  const stored = readStored(key)
  if (stored && isFresh(key, stored)) {
    memory.set(key, stored)
    return stored
  }
  return null
}

// Any answer still kept, fresh or not, or null. Only for when GitHub
// can't answer: the caller must say the data may be out of date.
export function readSaved(key) {
  const inMemory = memory.get(key)
  if (inMemory && isKept(inMemory)) {
    return inMemory
  }
  return readStored(key)
}

// Saves a new answer from GitHub and returns its entry.
export function remember(key, data) {
  const entry = { data, savedAt: Date.now(), expired: false }
  memory.set(key, entry)
  writeStored(key, entry)
  return entry
}

// Marks every answer for one repository as expired, so the next request
// goes to GitHub ("Refresh"). The old answers stay as a fallback.
export function expireRepository(prefix) {
  const matches = (key) => key === prefix || key.startsWith(`${prefix}/`) || key.startsWith(`${prefix}?`)
  for (const [key, entry] of memory) {
    if (matches(key)) {
      memory.set(key, { ...entry, expired: true })
    }
  }
  try {
    for (const storageKey of storedKeys()) {
      const key = storageKey.slice(STORAGE_PREFIX.length)
      if (matches(key)) {
        const entry = readStored(key)
        if (entry) {
          window.localStorage.setItem(storageKey, JSON.stringify({ ...entry, expired: true }))
        }
      }
    }
  } catch {
    // Storage is blocked; memory was already updated.
  }
}

// Forgets the answers kept in memory (a reload does the same).
export function clearMemory() {
  memory.clear()
}

// Removes every stored answer from localStorage.
export function clearStored() {
  try {
    for (const key of storedKeys()) {
      window.localStorage.removeItem(key)
    }
  } catch {
    // Nothing to remove if storage is blocked.
  }
}

// ---------- When was the data on screen fetched? ----------

// Remembers, for each object handed to the page, when GitHub sent it and
// whether it is an expired answer shown because GitHub couldn't answer.
// A WeakMap lets the browser forget the details together with the data.
const dataInfo = new WeakMap()

// Records the details for `data` and returns `data`.
// `problem` is the GitHubError that made an expired answer necessary.
export function deliver(entry, problem = null) {
  const { data } = entry
  if (data && typeof data === 'object') {
    dataInfo.set(data, {
      savedAt: new Date(entry.savedAt),
      stale: problem ? { reason: problem.type, retryAt: problem.retryAt ?? null } : null,
    })
  }
  return data
}

// Gives `copy` (made from `original`) the same details.
export function copyInfo(original, copy) {
  const info = dataInfo.get(original)
  if (info) {
    dataInfo.set(copy, info)
  }
  return copy
}

// { savedAt: Date, stale: null | { reason, retryAt } } for data returned
// by the fetch functions, or null if unknown.
export function getDataInfo(data) {
  return (data && typeof data === 'object' && dataInfo.get(data)) || null
}
