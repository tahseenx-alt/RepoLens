import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearAllCache,
  clearRepoCache,
  fetchCommits,
  fetchCommunityProfile,
  fetchContributors,
  fetchLanguages,
  fetchReadme,
  fetchRepository,
  getDataInfo,
  getRateLimit,
  simulateReload,
} from '../api/github.js'
import { mockFetch } from './mockFetch.js'
import repoFixture from './fixtures/repo.json'
import commitsFixture from './fixtures/commits.json'
import contributorsFixture from './fixtures/contributors.json'
import communityFixture from './fixtures/community.json'

const MINUTE = 60 * 1000

beforeEach(() => clearAllCache())
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

// Lets a test move the clock. Only Date is faked; timers stay real.
function setClock(time) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(time)
}

function rateLimited(resetInMinutes = 30) {
  return {
    status: 403,
    body: { message: 'API rate limit exceeded for 1.2.3.4.' },
    headers: {
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': String(Math.floor((Date.now() + resetInMinutes * MINUTE) / 1000)),
    },
  }
}

function storedValues() {
  return Object.keys(window.localStorage)
    .filter((key) => key.startsWith('repolens:api:'))
    .map((key) => window.localStorage.getItem(key))
}

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

describe('saved answers', () => {
  it('reuses saved answers after a reload instead of asking GitHub again', async () => {
    const fetchMock = mockFetch([['/repos/tahseenx-alt/RepoLens', { body: repoFixture }]])
    await fetchRepository('tahseenx-alt', 'RepoLens')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    simulateReload()
    const again = await fetchRepository('TahseenX-Alt', 'repolens') // names aren't case-sensitive
    expect(again.full_name).toBe('tahseenx-alt/RepoLens')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(getDataInfo(again)).toMatchObject({ stale: null })
  })

  it('keeps each kind of answer fresh for a sensible time', async () => {
    const start = new Date('2026-10-10T09:00:00Z').getTime()
    setClock(start)
    const fetchMock = mockFetch([
      ['/repos/a/b', { body: repoFixture }],
      ['/repos/a/b/languages', { body: { JavaScript: 100 } }],
    ])
    await fetchRepository('a', 'b')
    await fetchLanguages('a', 'b')

    // 11 minutes later the repository details are requested again,
    // but languages (which change slowly) are still fresh.
    setClock(start + 11 * MINUTE)
    simulateReload()
    await fetchRepository('a', 'b')
    await fetchLanguages('a', 'b')
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      'https://api.github.com/repos/a/b',
      'https://api.github.com/repos/a/b/languages',
      'https://api.github.com/repos/a/b',
    ])
  })

  it('shows an expired answer, marked as old, when the rate limit is reached', async () => {
    const start = new Date('2026-10-10T09:00:00Z').getTime()
    setClock(start)
    mockFetch([['/repos/a/b', { body: { ...repoFixture, stargazers_count: 7 } }]])
    await fetchRepository('a', 'b')

    setClock(start + 2 * 60 * MINUTE)
    simulateReload()
    mockFetch([['/repos/a/b', rateLimited()]])
    const repo = await fetchRepository('a', 'b')
    expect(repo.stargazers_count).toBe(7)
    const info = getDataInfo(repo)
    expect(info.savedAt.getTime()).toBe(start)
    expect(info.stale.reason).toBe('rate-limit')
    expect(info.stale.retryAt).toBeInstanceOf(Date)
  })

  it('does not show old data for a repository that is now missing', async () => {
    const start = new Date('2026-10-10T09:00:00Z').getTime()
    setClock(start)
    mockFetch([['/repos/a/b', { body: repoFixture }]])
    await fetchRepository('a', 'b')

    setClock(start + 60 * MINUTE)
    simulateReload()
    mockFetch([])
    await expect(fetchRepository('a', 'b')).rejects.toMatchObject({ type: 'not-found' })
  })

  it('asks GitHub again after Refresh, but keeps the old answer as a fallback', async () => {
    const fetchMock = mockFetch([['/repos/a/b', { body: { ...repoFixture, stargazers_count: 3 } }]])
    await fetchRepository('a', 'b')
    clearRepoCache('a', 'b')
    mockFetch([['/repos/a/b', new TypeError('Failed to fetch')]])
    const repo = await fetchRepository('a', 'b')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(repo.stargazers_count).toBe(3)
    expect(getDataInfo(repo).stale.reason).toBe('network')
  })

  it('only saves the fields the page uses', async () => {
    const commits = commitsFixture.map((item) => ({
      ...item,
      parents: [{ sha: 'abc' }],
      commit: { ...item.commit, verification: { verified: true }, tree: { sha: 'def' } },
    }))
    const contributors = [{ ...contributorsFixture[0], email: 'person@example.com', gravatar_id: '' }]
    mockFetch([
      [/\/commits\?/, { body: commits }],
      [/\/contributors\?/, { body: contributors }],
    ])
    const savedCommits = await fetchCommits('a', 'b')
    const savedContributors = await fetchContributors('a', 'b')

    expect(savedCommits[0]).toEqual({
      sha: commitsFixture[0].sha,
      html_url: commitsFixture[0].html_url,
      commit: {
        message: commitsFixture[0].commit.message,
        author: { name: commitsFixture[0].commit.author.name, date: commitsFixture[0].commit.author.date },
        committer: { date: commitsFixture[0].commit.committer.date },
      },
      author: {
        login: commitsFixture[0].author.login,
        avatar_url: commitsFixture[0].author.avatar_url,
        html_url: commitsFixture[0].author.html_url,
      },
    })
    expect(savedContributors[0]).not.toHaveProperty('email')
    const stored = storedValues().join('')
    expect(stored).not.toMatch(/verification|parents|person@example\.com/)
  })

  it('never turns a missing field into a value', async () => {
    mockFetch([[/\/contributors\?/, { body: [{ login: 'someone', contributions: null }] }]])
    const [person] = await fetchContributors('a', 'b')
    expect(person).toEqual({ login: 'someone', contributions: null })
  })

  it('still works when localStorage is full or blocked', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    const fetchMock = mockFetch([['/repos/a/b', { body: repoFixture }]])
    await fetchRepository('a', 'b')
    await fetchRepository('a', 'b')
    expect(fetchMock).toHaveBeenCalledTimes(1) // memory still works
    setItem.mockRestore()
  })

  it('ignores a damaged saved answer', async () => {
    window.localStorage.setItem('repolens:api:v1:/repos/a/b', '{not json')
    const fetchMock = mockFetch([['/repos/a/b', { body: repoFixture }]])
    await expect(fetchRepository('a', 'b')).resolves.toMatchObject({ id: repoFixture.id })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe('rate limits', () => {
  it('stops sending requests until the hourly limit resets', async () => {
    const fetchMock = mockFetch([['/repos/a/b', rateLimited(30)]])
    const error = await fetchRepository('a', 'b').catch((caught) => caught)
    expect(error).toMatchObject({ type: 'rate-limit', status: 403 })
    expect(error.message).toMatch(/60 requests per hour.*resets at/i)
    expect(error.retryAt.getTime()).toBeGreaterThan(Date.now())

    // Nothing is sent for other data either, until the reset time.
    await expect(fetchLanguages('a', 'b')).rejects.toMatchObject({ type: 'rate-limit' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(getRateLimit()).toMatchObject({ remaining: 0 })
  })

  it('waits as long as GitHub asks after a secondary limit', async () => {
    const fetchMock = mockFetch([
      ['/repos/a/b', { status: 429, body: { message: 'Too many requests' }, headers: { 'retry-after': '90' } }],
    ])
    const error = await fetchRepository('a', 'b').catch((caught) => caught)
    expect(error).toMatchObject({ type: 'rate-limit', status: 429 })
    expect(error.message).toMatch(/too many arrived at once/i)
    expect(error.retryAt.getTime() - Date.now()).toBeGreaterThan(80 * 1000)

    await expect(fetchRepository('a', 'b')).rejects.toMatchObject({ type: 'rate-limit' })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('remembers the limit after a reload, until it resets', async () => {
    const start = new Date('2026-10-10T09:00:00Z').getTime()
    setClock(start)
    mockFetch([['/repos/a/b', rateLimited(30)]])
    await expect(fetchRepository('a', 'b')).rejects.toMatchObject({ type: 'rate-limit' })

    simulateReload()
    expect(getRateLimit()).toMatchObject({ remaining: 0, fromEarlierVisit: true })
    const fetchMock = mockFetch([['/repos/a/b', { body: repoFixture }]])
    await expect(fetchRepository('a', 'b')).rejects.toMatchObject({ type: 'rate-limit' })
    expect(fetchMock).not.toHaveBeenCalled()

    // After the reset time the old numbers are dropped and requests work again.
    setClock(start + 31 * MINUTE)
    simulateReload()
    expect(getRateLimit()).toBeNull()
    await expect(fetchRepository('a', 'b')).resolves.toMatchObject({ id: repoFixture.id })
  })
})

describe('README and community profile', () => {
  it('reads the README from the community profile without another request', async () => {
    const fetchMock = mockFetch([['/repos/a/b/community/profile', { body: communityFixture }]])
    await fetchCommunityProfile('a', 'b')
    await expect(fetchReadme('a', 'b')).resolves.toEqual({
      found: true,
      file: { name: 'README.md', path: 'README.md', html_url: communityFixture.files.readme.html_url },
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('asks the README endpoint when the profile found no README', async () => {
    const fetchMock = mockFetch([
      ['/repos/a/b/community/profile', { body: { ...communityFixture, files: { ...communityFixture.files, readme: null } } }],
      ['/repos/a/b/readme', { body: { name: 'readme.rst', path: 'docs/readme.rst', html_url: 'https://github.com/a/b/blob/main/docs/readme.rst' } }],
    ])
    await expect(fetchReadme('a', 'b')).resolves.toMatchObject({ found: true, file: { path: 'docs/readme.rst' } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not request the community profile for a fork', async () => {
    const fetchMock = mockFetch([['/repos/a/b/readme', { body: { name: 'README.md', path: 'README.md' } }]])
    await expect(fetchCommunityProfile('a', 'b', undefined, { isFork: true })).rejects.toMatchObject({
      type: 'unavailable',
      message: expect.stringMatching(/forks/),
    })
    await expect(fetchReadme('a', 'b', undefined, { isFork: true })).resolves.toMatchObject({ found: true })
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['https://api.github.com/repos/a/b/readme'])
  })
})
