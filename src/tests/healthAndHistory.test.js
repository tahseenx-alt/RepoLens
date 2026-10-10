import { describe, expect, it } from 'vitest'
import { countByStatus, runHealthChecks } from '../utils/healthChecks.js'
import { HISTORY_LIMIT, addToHistory, clearHistory, loadHistory } from '../utils/history.js'
import repoFixture from './fixtures/repo.json'
import commitsFixture from './fixtures/commits.json'
import communityFixture from './fixtures/community.json'

const success = (data) => ({ status: 'success', data, error: null })
const failed = { status: 'error', data: null, error: new Error('GitHub returned status 500.') }
const loading = { status: 'loading', data: null, error: null }
const now = new Date('2026-10-10T12:00:00Z')

function byId(checks) {
  return Object.fromEntries(checks.map((check) => [check.id, check]))
}

describe('health checks', () => {
  it('uses real data for each check', () => {
    const checks = byId(
      runHealthChecks({
        repo: repoFixture,
        readme: success({ found: true, file: { path: 'README.md' } }),
        commits: success(commitsFixture),
        community: success(communityFixture),
        now,
      }),
    )
    expect(checks.readme.status).toBe('passed')
    // The fixture repository has no license and no topics.
    expect(checks.license.status).toBe('warning')
    expect(checks.topics.status).toBe('warning')
    expect(checks.description.status).toBe('passed')
    expect(checks.contributing.status).toBe('warning')
    expect(checks.activity.status).toBe('passed')
    expect(checks.issues.status).toBe('passed')
    expect(checks.archived.status).toBe('passed')
  })

  it('says "unavailable", not "missing", when a request failed', () => {
    const checks = byId(
      runHealthChecks({ repo: repoFixture, readme: failed, commits: failed, community: failed, now }),
    )
    expect(checks.readme.status).toBe('unavailable')
    expect(checks.contributing.status).toBe('unavailable')
    expect(checks.activity.status).toBe('unavailable')
    expect(checks.readme.summary).toMatch(/couldn't check/i)
  })

  it('only warns about a README when GitHub confirmed it is missing', () => {
    const checks = byId(
      runHealthChecks({
        repo: repoFixture,
        readme: success({ found: false }),
        commits: loading,
        community: loading,
        now,
      }),
    )
    expect(checks.readme.status).toBe('warning')
    expect(checks.activity.status).toBe('pending')
  })

  it('warns when the latest commit is old', () => {
    const old = [{ commit: { committer: { date: '2025-01-01T00:00:00Z' } } }]
    const checks = byId(
      runHealthChecks({ repo: repoFixture, readme: loading, commits: success(old), community: loading, now }),
    )
    expect(checks.activity.status).toBe('warning')
  })

  it('reports a detected license and counts statuses', () => {
    const repo = { ...repoFixture, license: { key: 'mit', name: 'MIT License', spdx_id: 'MIT' } }
    const checks = runHealthChecks({ repo, readme: loading, commits: loading, community: loading, now })
    expect(byId(checks).license).toMatchObject({ status: 'passed', summary: 'MIT License.' })
    const counts = countByStatus(checks)
    expect(counts.pending).toBe(3)
    expect(counts.passed + counts.warning + counts.unavailable + counts.pending).toBe(checks.length)
  })
})

describe('recent repository history', () => {
  it('adds, de-duplicates and limits entries', () => {
    addToHistory('facebook', 'react')
    addToHistory('vitejs', 'vite')
    addToHistory('Facebook', 'React')
    const list = loadHistory()
    expect(list.map((item) => `${item.owner}/${item.repo}`)).toEqual(['Facebook/React', 'vitejs/vite'])

    for (let i = 0; i < HISTORY_LIMIT + 3; i++) {
      addToHistory('owner', `repo${i}`)
    }
    expect(loadHistory()).toHaveLength(HISTORY_LIMIT)
  })

  it('clears the history', () => {
    addToHistory('facebook', 'react')
    clearHistory()
    expect(loadHistory()).toEqual([])
  })

  it('ignores broken or unexpected saved data', () => {
    window.localStorage.setItem('repolens:recent-repos', '{not json')
    expect(loadHistory()).toEqual([])
    window.localStorage.setItem(
      'repolens:recent-repos',
      JSON.stringify([{ owner: '<script>', repo: 'x', viewedAt: 'now' }, { owner: 'ok', repo: 'fine', viewedAt: 'now' }]),
    )
    expect(loadHistory()).toEqual([{ owner: 'ok', repo: 'fine', viewedAt: 'now' }])
  })
})
