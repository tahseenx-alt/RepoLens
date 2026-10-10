import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import App from '../App.jsx'
import ThemeProvider from '../components/layout/ThemeProvider.jsx'
import { clearAllCache } from '../api/github.js'
import { mockFetch } from './mockFetch.js'
import { setMediaQuery } from './mockMatchMedia.js'
import repo from './fixtures/repo.json'
import languages from './fixtures/languages.json'
import commits from './fixtures/commits.json'
import contributors from './fixtures/contributors.json'
import issues from './fixtures/issues.json'
import readme from './fixtures/readme.json'
import community from './fixtures/community.json'

// Routes for one repository. By default they answer with the responses
// recorded from the real API for tahseenx-alt/RepoLens. `overrides`
// replaces single responses, e.g. { languages: { status: 500, body: {} } }.
function repoRoutes(owner = 'tahseenx-alt', name = 'RepoLens', overrides = {}) {
  const base = `/repos/${owner}/${name}`
  const escaped = base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const routes = {
    repo: [base, { body: repo }],
    languages: [`${base}/languages`, { body: languages }],
    commits: [new RegExp(`^${escaped}/commits\\?`), { body: commits }],
    contributors: [new RegExp(`^${escaped}/contributors\\?`), { body: contributors }],
    issues: [new RegExp(`^${escaped}/issues\\?`), { body: issues }],
    readme: [`${base}/readme`, { body: readme }],
    community: [`${base}/community/profile`, { body: community }],
  }
  for (const [key, response] of Object.entries(overrides)) {
    routes[key] = [routes[key][0], response]
  }
  return Object.values(routes)
}

const BASE = '/repos/tahseenx-alt/RepoLens'

// Shows the current address, so tests can check the URL.
function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.pathname + location.search}</output>
}

function renderAt(path) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
        <LocationProbe />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

function apiCalls(fetchMock, ending) {
  return fetchMock.mock.calls.filter(([url]) => String(url).endsWith(ending))
}

function metric(label) {
  const term = screen.getByText(label, { selector: 'dt' })
  return term.nextElementSibling
}

beforeEach(() => clearAllCache())
afterEach(() => vi.unstubAllGlobals())

describe('search', () => {
  it('shows a validation error without calling GitHub', async () => {
    const fetchMock = mockFetch(repoRoutes())
    renderAt('/')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Repository'), 'https://gitlab.com/a/b{Enter}')

    expect(await screen.findByRole('alert')).toHaveTextContent(/only analyzes repositories on github\.com/i)
    expect(screen.getByLabelText('Repository')).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows GitHub errors next to the search box', async () => {
    mockFetch([])
    renderAt('/')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Repository'), 'nobody/nothing')
    await user.click(screen.getByRole('button', { name: /analyze/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't find "nobody\/nothing"/i)
  })

  it('accepts a full GitHub URL and opens the dashboard', async () => {
    const fetchMock = mockFetch(repoRoutes())
    renderAt('/')
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('Repository'), 'https://github.com/tahseenx-alt/RepoLens{Enter}')

    expect(await screen.findByRole('heading', { level: 1, name: /tahseenx-alt.*RepoLens/ })).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/tahseenx-alt/RepoLens')
    // The dashboard reused the answer the search form already received.
    expect(apiCalls(fetchMock, BASE)).toHaveLength(1)
  })
})

describe('overview metrics', () => {
  it('maps each number to the right API field', async () => {
    mockFetch(
      repoRoutes('tahseenx-alt', 'RepoLens', {
        repo: {
          body: {
            ...repo,
            stargazers_count: 1234,
            watchers_count: 1234, // GitHub's copy of the star count, not watchers
            subscribers_count: 56,
            forks_count: 78,
            open_issues_count: 9,
          },
        },
      }),
    )
    renderAt('/tahseenx-alt/RepoLens')
    await screen.findByRole('heading', { level: 1 })

    expect(metric('Stars')).toHaveTextContent('1,234')
    expect(metric('Watchers')).toHaveTextContent('56')
    expect(metric('Forks')).toHaveTextContent('78')
    expect(metric('Open issues & PRs')).toHaveTextContent('9')
  })

  it('shows real zeros as 0', async () => {
    // Like DemiGod108/Repo-Signals, whose GitHub page showed 0 stars,
    // 0 watching, 0 forks and no open issues or pull requests.
    mockFetch(
      repoRoutes('tahseenx-alt', 'RepoLens', {
        repo: {
          body: { ...repo, stargazers_count: 0, subscribers_count: 0, forks_count: 0, open_issues_count: 0 },
        },
      }),
    )
    renderAt('/tahseenx-alt/RepoLens')
    await screen.findByRole('heading', { level: 1 })

    for (const label of ['Stars', 'Forks', 'Open issues & PRs', 'Watchers']) {
      expect(metric(label)).toHaveTextContent(/^00$/) // visible "0" + screen-reader "0"
    }
  })

  it('shows "Unavailable" instead of inventing a value', async () => {
    const broken = { ...repo, stargazers_count: null, forks_count: '12' }
    delete broken.subscribers_count
    mockFetch(repoRoutes('tahseenx-alt', 'RepoLens', { repo: { body: broken } }))
    renderAt('/tahseenx-alt/RepoLens')
    await screen.findByRole('heading', { level: 1 })

    expect(metric('Stars')).toHaveTextContent('Unavailable')
    expect(metric('Forks')).toHaveTextContent('Unavailable')
    expect(metric('Watchers')).toHaveTextContent('Unavailable')
    expect(metric('Open issues & PRs')).toHaveTextContent('0')
  })

  it('loads new numbers when Refresh is pressed', async () => {
    let stars = 1
    mockFetch(
      repoRoutes('tahseenx-alt', 'RepoLens', {
        repo: () => ({ body: { ...repo, stargazers_count: stars++ } }),
      }),
    )
    renderAt('/tahseenx-alt/RepoLens')
    const user = userEvent.setup()
    await screen.findByRole('heading', { level: 1 })
    expect(metric('Stars')).toHaveTextContent('1')

    await user.click(screen.getByRole('button', { name: /refresh/i }))
    await waitFor(() => expect(metric('Stars')).toHaveTextContent('2'))
  })
})

describe('dashboard tabs', () => {
  it('shows the overview with real data', async () => {
    mockFetch(repoRoutes())
    renderAt('/tahseenx-alt/RepoLens')

    expect(await screen.findByText(repo.description)).toBeInTheDocument()
    const languagesPanel = screen.getByRole('region', { name: 'Languages' })
    expect(await within(languagesPanel).findByText('JavaScript')).toBeInTheDocument()

    const activity = screen.getByRole('region', { name: 'Commit activity' })
    expect(await within(activity).findByText(`${commits.length} commits`)).toBeInTheDocument()

    const latest = screen.getByRole('region', { name: 'Latest commits' })
    expect(await within(latest).findByText(commits[0].sha.slice(0, 7))).toBeInTheDocument()

    const top = screen.getByRole('region', { name: 'Top contributors' })
    expect(await within(top).findByRole('link', { name: 'tahseenx-alt' })).toHaveAttribute(
      'href',
      'https://github.com/tahseenx-alt',
    )

    const health = screen.getByRole('region', { name: 'Health checks' })
    await waitFor(() => expect(within(health).queryByText('Checking')).not.toBeInTheDocument())
    expect(within(health).getAllByText('Passed').length).toBeGreaterThan(0)
  })

  it('switches tabs without new requests and keeps the tab in the address', async () => {
    const fetchMock = mockFetch(repoRoutes())
    renderAt('/tahseenx-alt/RepoLens')
    const user = userEvent.setup()
    await screen.findByText(commits[0].sha.slice(0, 7))
    const callsBefore = fetchMock.mock.calls.length

    await user.click(screen.getByRole('tab', { name: /issues & prs/i }))
    const issuesPanel = await screen.findByRole('region', { name: 'Issues and pull requests' })
    expect(within(issuesPanel).getByText(issues[0].title)).toBeInTheDocument()
    expect(within(issuesPanel).getAllByText('Pull request')).toHaveLength(issues.length)
    expect(screen.getByTestId('location')).toHaveTextContent('/tahseenx-alt/RepoLens?tab=issues')

    // Arrow keys move between tabs.
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: /health/i })).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByText(/Found README\.md/)).toBeInTheDocument()
    expect(screen.getByText(/didn't detect a license/i)).toBeInTheDocument()

    expect(fetchMock.mock.calls.length).toBe(callsBefore)
  })

  it('lists commits with author, date, short SHA and link', async () => {
    const many = Array.from({ length: 25 }, (_, index) => ({
      ...commits[index % commits.length],
      sha: `${String(index).padStart(2, '0')}${commits[0].sha.slice(2)}`,
    }))
    mockFetch(repoRoutes('tahseenx-alt', 'RepoLens', { commits: { body: many } }))
    renderAt('/tahseenx-alt/RepoLens?tab=commits')
    const user = userEvent.setup()

    const panel = await screen.findByRole('region', { name: 'Recent commits' })
    await within(panel).findByText(/showing 10 of the 25/i)
    const first = within(panel).getAllByRole('listitem')[0]
    expect(within(first).getByRole('link')).toHaveAttribute('href', commits[0].html_url)
    expect(within(first).getByText('00' + commits[0].sha.slice(2, 7))).toBeInTheDocument()

    await user.click(within(panel).getByRole('button', { name: /show 10 more/i }))
    expect(within(panel).getByText(/showing 20 of the 25/i)).toBeInTheDocument()
  })

  it('opens the tab named in the address', async () => {
    mockFetch(repoRoutes())
    renderAt('/tahseenx-alt/RepoLens?tab=contributors')
    const table = await screen.findByRole('region', { name: 'Contributors' })
    expect(await within(table).findByRole('link', { name: 'claude' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /contributors/i })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('errors, empty data and switching repositories', () => {
  it('keeps the rest of the dashboard usable when one request fails, and retries it', async () => {
    let languageCalls = 0
    mockFetch(
      repoRoutes('tahseenx-alt', 'RepoLens', {
        languages: () =>
          ++languageCalls === 1 ? { status: 500, body: { message: 'Server Error' } } : { body: languages },
      }),
    )
    renderAt('/tahseenx-alt/RepoLens')
    const user = userEvent.setup()

    const languagesPanel = await screen.findByRole('region', { name: 'Languages' })
    expect(await within(languagesPanel).findByText(/couldn't provide this: Server Error/i)).toBeInTheDocument()
    expect(await screen.findByText(commits[0].sha.slice(0, 7))).toBeInTheDocument()

    await user.click(within(languagesPanel).getByRole('button', { name: /try again/i }))
    expect(await within(languagesPanel).findByText('JavaScript')).toBeInTheDocument()
  })

  it('shows empty states for an empty repository', async () => {
    mockFetch(
      repoRoutes('tahseenx-alt', 'RepoLens', {
        languages: { body: {} },
        commits: { status: 409, body: { message: 'Git Repository is empty.' } },
        contributors: { status: 204 },
        issues: { body: [] },
        readme: { status: 404, body: { message: 'Not Found' } },
      }),
    )
    renderAt('/tahseenx-alt/RepoLens')
    const user = userEvent.setup()

    expect(await screen.findByText(/no programming languages/i)).toBeInTheDocument()
    expect(await screen.findByText(/no commits were found on the default branch\./i)).toBeInTheDocument()
    expect(await screen.findByText(/this repository has no commits yet/i)).toBeInTheDocument()
    expect(await screen.findByText(/returned no contributors/i)).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: /issues & prs/i }))
    expect(await screen.findByText(/no issues or pull requests yet/i)).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /health/i }))
    expect(await screen.findByText(/found no README/i)).toBeInTheDocument()
  })

  it('never shows data from the previous repository', async () => {
    // The first repository's languages arrive late, after the user has
    // already switched to another repository.
    let releaseOldLanguages
    const slowLanguages = new Promise((resolve) => {
      releaseOldLanguages = () => resolve({ body: { Fortran: 999 } })
    })
    const other = {
      ...repo,
      id: 2,
      name: 'other-repo',
      full_name: 'someone/other-repo',
      owner: { ...repo.owner, login: 'someone' },
      description: 'The second repository',
      stargazers_count: 42,
    }
    mockFetch([
      ...repoRoutes('tahseenx-alt', 'RepoLens', { languages: () => slowLanguages }),
      ...repoRoutes('someone', 'other-repo', { repo: { body: other }, languages: { body: { Go: 500 } } }),
    ])
    renderAt('/tahseenx-alt/RepoLens')
    const user = userEvent.setup()
    await screen.findByText(repo.description)

    await user.type(screen.getByLabelText('Analyze another repository'), 'someone/other-repo{Enter}')
    expect(await screen.findByText('The second repository')).toBeInTheDocument()
    expect(screen.queryByText(repo.description)).not.toBeInTheDocument()
    expect(metric('Stars')).toHaveTextContent('42')

    // The old answer finally arrives; it must not appear anywhere.
    await act(async () => releaseOldLanguages())
    const languagesPanel = screen.getByRole('region', { name: 'Languages' })
    expect(await within(languagesPanel).findByText('Go')).toBeInTheDocument()
    expect(screen.queryByText('Fortran')).not.toBeInTheDocument()
  })

  it('shows a clear error for a repository that does not exist', async () => {
    mockFetch([])
    renderAt('/nobody/nothing')
    expect(await screen.findByText(/couldn't find "nobody\/nothing"/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /try again/i })).not.toBeInTheDocument()
  })

  it('offers a retry when the rate limit is reached', async () => {
    mockFetch([
      [BASE, { status: 403, body: { message: 'API rate limit exceeded' }, headers: { 'x-ratelimit-remaining': '0' } }],
    ])
    renderAt('/tahseenx-alt/RepoLens')
    expect(await screen.findByText('GitHub rate limit reached')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
  })

  it('explains network failures', async () => {
    mockFetch([[BASE, new TypeError('Failed to fetch')]])
    renderAt('/tahseenx-alt/RepoLens')
    expect(await screen.findByText(/could not reach github/i)).toBeInTheDocument()
  })

  it('validates the address before calling GitHub', async () => {
    const fetchMock = mockFetch(repoRoutes())
    renderAt('/-bad-/repo')
    expect(await screen.findByRole('heading', { name: 'Not a repository address' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('remembers analyzed repositories and can clear them', async () => {
    mockFetch(repoRoutes())
    const { unmount } = renderAt('/tahseenx-alt/RepoLens')
    await screen.findByText(repo.description)
    unmount()

    renderAt('/')
    const user = userEvent.setup()
    const recent = screen.getByRole('region', { name: /recently analyzed/i })
    expect(within(recent).getByRole('link', { name: /tahseenx-alt\/RepoLens/ })).toHaveAttribute(
      'href',
      '/tahseenx-alt/RepoLens',
    )
    await user.click(within(recent).getByRole('button', { name: /clear history/i }))
    expect(screen.queryByRole('region', { name: /recently analyzed/i })).not.toBeInTheDocument()
  })
})

describe('theme', () => {
  it('follows the system theme on the first visit', () => {
    setMediaQuery('(prefers-color-scheme: light)', true)
    renderAt('/')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument()
  })

  it('switches immediately and remembers the choice', async () => {
    setMediaQuery('(prefers-color-scheme: light)', true)
    const { unmount } = renderAt('/')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(window.localStorage.getItem('repolens:theme')).toBe('dark')
    unmount()

    // After a reload the saved choice wins over the system setting.
    renderAt('/')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument()
  })
})
