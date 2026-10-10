// Remembers recently analyzed repositories in the browser's localStorage.
// Only public "owner/repo" names and the time they were opened are stored.
import { isValidOwner, isValidRepoName } from './parseRepo.js'

const STORAGE_KEY = 'repolens:recent-repos'
export const HISTORY_LIMIT = 8

function isValidEntry(entry) {
  return (
    entry &&
    isValidOwner(entry.owner) &&
    isValidRepoName(entry.repo) &&
    typeof entry.viewedAt === 'string'
  )
}

// localStorage can be missing or blocked (private mode, strict settings),
// so every access is wrapped in try/catch and falls back to an empty list.
export function loadHistory() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(saved) ? saved.filter(isValidEntry).slice(0, HISTORY_LIMIT) : []
  } catch {
    return []
  }
}

function saveHistory(list) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // Storage is full or blocked; history simply won't be remembered.
  }
}

// Adds a repository to the top of the list, removing older duplicates.
export function addToHistory(owner, repo, now = new Date()) {
  const key = `${owner}/${repo}`.toLowerCase()
  const rest = loadHistory().filter((item) => `${item.owner}/${item.repo}`.toLowerCase() !== key)
  const list = [{ owner, repo, viewedAt: now.toISOString() }, ...rest].slice(0, HISTORY_LIMIT)
  saveHistory(list)
  return list
}

export function clearHistory() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing to clear if storage is unavailable.
  }
  return []
}
