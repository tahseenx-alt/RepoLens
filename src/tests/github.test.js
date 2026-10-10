import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAllCache,
  clearRepoCache,
  fetchCommits,
  fetchReadme,
  fetchRepository,
  getRateLimit,
} from '../api/github.js'
import { mockFetch } from './mockFetch.js'
import repoFixture from './fixtures/repo.json'

beforeEach(() => clearAllCache())
afterEach(() => vi.unstubAllGlobals())

describe('GitHub API module', () => {
  it('returns repository data and records the rate limit', async () => {
    mockFetch([['/repos/tahseenx-alt/RepoLens', { body: repoFixture }]])
    const repo = await fetchRepository('tahseenx-alt', 'RepoLens')
    expect(repo.full_name).toBe('tahseenx-alt/RepoLens')
    expect(getRateLimit()).toMatchObject({ limit: 60, remaining: 55 })
  })

  it('caches answers so the same repository is requested once', async () => {
    const fetchMock = mockFetch([['/repos/tahseenx-alt/RepoLens', { body: repoFixture }]])
    await fetchRepository('tahseenx-alt', 'RepoLens')
    await fetchRepository('tahseenx-alt', 'RepoLens')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Refresh clears the cache for that repository only.
    clearRepoCache('tahseenx-alt', 'RepoLens')
    await fetchRepository('tahseenx-alt', 'RepoLens')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('shares one request between callers asking at the same time', async () => {
    const fetchMock = mockFetch([['/repos/tahseenx-alt/RepoLens', { body: repoFixture }]])
    const controller = new AbortController()
    const first = fetchRepository('tahseenx-alt', 'RepoLens', controller.signal)
    const second = fetchRepository('tahseenx-alt', 'RepoLens')
    // The first caller stops waiting; the second still gets the answer.
    controller.abort()
    await expect(first).rejects.toMatchObject({ name: 'AbortError' })
    await expect(second).resolves.toMatchObject({ full_name: 'tahseenx-alt/RepoLens' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('explains a missing repository', async () => {
    mockFetch([])
    await expect(fetchRepository('nobody', 'nothing')).rejects.toMatchObject({
      type: 'not-found',
      message: expect.stringMatching(/couldn't find "nobody\/nothing"/i),
    })
  })

  it('detects the hourly rate limit', async () => {
    mockFetch([
      [
        '/repos/a/b',
        {
          status: 403,
          body: { message: 'API rate limit exceeded for 1.2.3.4.' },
          headers: { 'x-ratelimit-remaining': '0' },
        },
      ],
    ])
    await expect(fetchRepository('a', 'b')).rejects.toMatchObject({ type: 'rate-limit' })
  })

  it('detects the secondary rate limit', async () => {
    mockFetch([
      [
        '/repos/a/b',
        {
          status: 403,
          body: { message: 'You have exceeded a secondary rate limit.' },
          headers: { 'x-ratelimit-remaining': '40' },
        },
      ],
    ])
    await expect(fetchRepository('a', 'b')).rejects.toMatchObject({ type: 'rate-limit' })
  })

  it('reports network failures in plain words', async () => {
    mockFetch([['/repos/a/b', new TypeError('Failed to fetch')]])
    await expect(fetchRepository('a', 'b')).rejects.toMatchObject({
      type: 'network',
      message: expect.stringMatching(/could not reach github/i),
    })
  })

  it('does not cache failures', async () => {
    let calls = 0
    const fetchMock = mockFetch([
      ['/repos/a/b', () => (++calls === 1 ? { status: 500, body: {} } : { body: { id: 1 } })],
    ])
    await expect(fetchRepository('a', 'b')).rejects.toMatchObject({ type: 'unavailable' })
    await expect(fetchRepository('a', 'b')).resolves.toEqual({ id: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('treats an empty repository as having no commits', async () => {
    mockFetch([[/\/commits/, { status: 409, body: { message: 'Git Repository is empty.' } }]])
    await expect(fetchCommits('a', 'b')).resolves.toEqual([])
  })

  it('only reports a README as missing when GitHub says 404', async () => {
    mockFetch([[/\/readme$/, { status: 404, body: { message: 'Not Found' } }]])
    await expect(fetchReadme('a', 'b')).resolves.toEqual({ found: false })

    clearAllCache()
    mockFetch([[/\/readme$/, { status: 500, body: {} }]])
    // A server error means "unknown", so it is thrown instead of "missing".
    await expect(fetchReadme('a', 'b')).rejects.toMatchObject({ type: 'unavailable' })
  })
})
