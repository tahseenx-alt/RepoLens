import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import App from '../App.jsx'
import { clearAllCache } from '../api/github.js'
import { mockFetch } from './mockFetch.js'
import repo from './fixtures/repo.json'
import languages from './fixtures/languages.json'
import commits from './fixtures/commits.json'
import contributors from './fixtures/contributors.json'
import issues from './fixtures/issues.json'
import readme from './fixtures/readme.json'
import community from './fixtures/community.json'

// Responses recorded from the real API for tahseenx-alt/RepoLens.
const BASE = '/repos/tahseenx-alt/RepoLens'
function fixtureRoutes(overrides = {}) {
  const routes = {
    repo: [BASE, { body: repo }],
    languages: [`${BASE}/languages`, { body: languages }],
    commits: [/\/commits\?/, { body: commits }],
    contributors: [/\/contributors\?/, { body: contributors }],
    issues: [/\/issues\?/, { body: issues }],
    readme: [`${BASE}/readme`, { body: readme }],
    community: [`${BASE}/community/profile`, { body: community }],
  }
  for (const [name, response] of Object.entries(overrides)) {
    routes[name] = [routes[name][0], response]
  }
  return Object.values(routes)
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => clearAllCache())
afterEach(() => vi.unstubAllGlobals())

describe('search on the start page', () => {
  it('shows a validation error without calling GitHub', async () => {
    const fetchMock = mockFetch(fixtureRoutes())
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
    const fetchMock = mockFetch(fixtureRoutes())
    renderAt('/')
    const user = userEvent.setup()

    await user.type(
      screen.getByLabelText('Repository'),
      'https://github.com/tahseenx-alt/RepoLens{Enter}',
    )

    expect(await screen.findByRole('heading', { level: 1, name: /tahseenx-alt.*RepoLens/ })).toBeInTheDocument()
    // The repository was requested once: the dashboard reused the cached answer.
    const repoCalls = fetchMock.mock.calls.filter(([url]) => String(url).endsWith(BASE))
    expect(repoCalls).toHaveLength(1)
  })
})

describe('repository dashboard', () => {
  it('shows every section with real data', async () => {
    mockFetch(fixtureRoutes())
    renderAt('/tahseenx-alt/RepoLens')

    expect(await screen.findByText(repo.description)).toBeInTheDocument()

    const languagesPanel = screen.getByRole('region', { name: 'Languages' })
    expect(await within(languagesPanel).findByText('JavaScript')).toBeInTheDocument()

    const commitsPanel = screen.getByRole('region', { name: 'Recent commits' })
    expect(await within(commitsPanel).findByText(commits[0].sha.slice(0, 7))).toBeInTheDocument()

    const contributorsPanel = screen.getByRole('region', { name: 'Contributors' })
    expect(await within(contributorsPanel).findByRole('link', { name: 'tahseenx-alt' })).toHaveAttribute(
      'href',
      'https://github.com/tahseenx-alt',
    )

    const issuesPanel = screen.getByRole('region', { name: 'Issues and pull requests' })
    expect(await within(issuesPanel).findByText(issues[0].title)).toBeInTheDocument()
    expect(within(issuesPanel).getAllByText('Pull request')).toHaveLength(issues.length)

    const activityPanel = screen.getByRole('region', { name: 'Commit activity' })
    expect(await within(activityPanel).findByText(`${commits.length} commits`)).toBeInTheDocument()

    const healthPanel = screen.getByRole('region', { name: 'Health checks' })
    await waitFor(() => expect(within(healthPanel).queryByText('Checking')).not.toBeInTheDocument())
    expect(within(healthPanel).getByText(/Found README\.md/)).toBeInTheDocument()
    expect(within(healthPanel).getByText(/didn't detect a license/i)).toBeInTheDocument()
  })

  it('keeps the rest of the dashboard usable when one request fails, and retries it', async () => {
    let languageCalls = 0
    mockFetch(
      fixtureRoutes({
        languages: () =>
          ++languageCalls === 1 ? { status: 500, body: { message: 'Server Error' } } : { body: languages },
      }),
    )
    renderAt('/tahseenx-alt/RepoLens')
    const user = userEvent.setup()

    const languagesPanel = await screen.findByRole('region', { name: 'Languages' })
    expect(await within(languagesPanel).findByText(/couldn't provide this: Server Error/i)).toBeInTheDocument()
    // Other sections still load.
    expect(await screen.findByText(commits[0].sha.slice(0, 7))).toBeInTheDocument()

    await user.click(within(languagesPanel).getByRole('button', { name: /try again/i }))
    expect(await within(languagesPanel).findByText('JavaScript')).toBeInTheDocument()
  })

  it('shows empty states for an empty repository', async () => {
    mockFetch(
      fixtureRoutes({
        languages: { body: {} },
        commits: { status: 409, body: { message: 'Git Repository is empty.' } },
        contributors: { status: 204 },
        issues: { body: [] },
        readme: { status: 404, body: { message: 'Not Found' } },
      }),
    )
    renderAt('/tahseenx-alt/RepoLens')

    expect(await screen.findByText(/no programming languages/i)).toBeInTheDocument()
    expect(await screen.findByText(/no commits were found on the default branch\./i)).toBeInTheDocument()
    expect(await screen.findByText(/this repository has no commits yet/i)).toBeInTheDocument()
    expect(await screen.findByText(/returned no contributors/i)).toBeInTheDocument()
    expect(await screen.findByText(/no issues or pull requests yet/i)).toBeInTheDocument()
    expect(await screen.findByText(/found no README/i)).toBeInTheDocument()
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

  it('validates the address before calling GitHub', async () => {
    const fetchMock = mockFetch(fixtureRoutes())
    renderAt('/-bad-/repo')
    expect(await screen.findByRole('heading', { name: 'Not a repository address' })).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('remembers analyzed repositories and can clear them', async () => {
    mockFetch(fixtureRoutes())
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
