import { describe, expect, it } from 'vitest'
import { buildCommitActivity } from '../utils/commitActivity.js'
import { groupSmallLanguages, toLanguageList } from '../utils/languages.js'
import { itemState, summarizeItems } from '../utils/issues.js'
import { formatBytes, formatRelative, safeExternalUrl } from '../utils/format.js'
import commitsFixture from './fixtures/commits.json'
import issuesFixture from './fixtures/issues.json'
import languagesFixture from './fixtures/languages.json'

function commitAt(date) {
  return { sha: date, commit: { committer: { date }, author: { date } } }
}

describe('buildCommitActivity', () => {
  it('handles an empty list', () => {
    const result = buildCommitActivity([], { limit: 100 })
    expect(result.buckets).toEqual([])
    expect(result.total).toBe(0)
  })

  it('counts every fetched commit by day, from the oldest to the newest', () => {
    const result = buildCommitActivity(commitsFixture, { limit: 100 })
    expect(result.unit).toBe('day')
    expect(result.total).toBe(commitsFixture.length)
    expect(result.limitReached).toBe(false)
    const counted = result.buckets.reduce((sum, bucket) => sum + bucket.count, 0)
    expect(counted).toBe(commitsFixture.length)
  })

  it('keeps zero days inside the covered range', () => {
    const commits = [commitAt('2026-03-05T12:00:00'), commitAt('2026-03-01T12:00:00')]
    const result = buildCommitActivity(commits, { limit: 100 })
    expect(result.buckets.map((bucket) => bucket.count)).toEqual([1, 0, 0, 0, 1])
  })

  it('only counts commits inside a chosen period', () => {
    const now = new Date('2026-03-31T12:00:00')
    const commits = [commitAt('2026-03-30T10:00:00'), commitAt('2025-12-01T10:00:00')]
    const result = buildCommitActivity(commits, { periodDays: 30, limit: 100, now })
    expect(result.total).toBe(1)
    expect(result.buckets).toHaveLength(30)
    expect(result.truncated).toBe(false)
  })

  it('does not invent empty days before the oldest commit when the limit was reached', () => {
    const now = new Date('2026-03-31T12:00:00')
    // 100 commits, all in the last 2 days: the 30-day period is cut short.
    const commits = Array.from({ length: 100 }, (_, index) =>
      commitAt(new Date(now.getTime() - index * 20 * 60 * 1000).toISOString()),
    )
    const result = buildCommitActivity(commits, { periodDays: 30, limit: 100, now })
    expect(result.truncated).toBe(true)
    expect(result.limitReached).toBe(true)
    expect(result.buckets.length).toBeLessThanOrEqual(3)
    expect(result.total).toBe(100)
  })

  it('switches to weeks and months for long ranges', () => {
    const weeks = buildCommitActivity([commitAt('2026-06-01T00:00:00'), commitAt('2026-01-01T00:00:00')])
    expect(weeks.unit).toBe('week')
    const months = buildCommitActivity([commitAt('2026-06-01T00:00:00'), commitAt('2022-01-01T00:00:00')])
    expect(months.unit).toBe('month')
    expect(months.total).toBe(2)
  })
})

describe('languages', () => {
  it('calculates percentages from byte counts', () => {
    const list = toLanguageList(languagesFixture)
    expect(list.map((item) => item.name)).toEqual(['JavaScript', 'CSS', 'HTML'])
    const total = list.reduce((sum, item) => sum + item.percent, 0)
    expect(total).toBeCloseTo(100)
    expect(list[0].bytes).toBe(languagesFixture.JavaScript)
  })

  it('handles empty data', () => {
    expect(toLanguageList({})).toEqual([])
    expect(toLanguageList(null)).toEqual([])
  })

  it('groups small languages for the bar', () => {
    const many = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`Lang${i}`, 100 - i]))
    const grouped = groupSmallLanguages(toLanguageList(many))
    expect(grouped).toHaveLength(9)
    expect(grouped.at(-1).name).toBe('Other (4)')
  })
})

describe('issues and pull requests', () => {
  it('tells pull requests apart from issues', () => {
    const summary = summarizeItems(issuesFixture)
    expect(summary.pulls).toBe(issuesFixture.length)
    expect(summary.issues).toBe(0)
    expect(itemState(issuesFixture[0])).toBe('merged')
  })

  it('labels issue states', () => {
    expect(itemState({ state: 'open' })).toBe('open')
    expect(itemState({ state: 'closed', state_reason: 'not_planned' })).toBe('not-planned')
    expect(itemState({ state: 'closed', state_reason: 'completed' })).toBe('completed')
    expect(itemState({ state: 'open', draft: true, pull_request: {} })).toBe('draft')
    expect(itemState({ state: 'closed', pull_request: { merged_at: null } })).toBe('closed')
  })
})

describe('format helpers', () => {
  it('only allows http(s) links from API data', () => {
    expect(safeExternalUrl('https://react.dev')).toBe('https://react.dev/')
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull()
    expect(safeExternalUrl('')).toBeNull()
    expect(safeExternalUrl(null)).toBeNull()
  })

  it('formats bytes and relative times', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    const now = new Date('2026-03-31T12:00:00Z').getTime()
    expect(formatRelative('2026-03-28T12:00:00Z', now)).toBe('3 days ago')
    expect(formatRelative('2025-03-31T12:00:00Z', now)).toBe('1 year ago')
    expect(formatRelative(null, now)).toBe('Unknown date')
  })
})
