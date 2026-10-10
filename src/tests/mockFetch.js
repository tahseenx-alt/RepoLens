// A fake `fetch` for tests, so they never call the real GitHub API.
// `routes` is a list of [pattern, response] pairs. The pattern is matched
// against the path after https://api.github.com. A response is
// { status, body, headers } or a function that returns one.
import { vi } from 'vitest'

export function jsonResponse(body, { status = 200, headers = {} } = {}) {
  return new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'x-ratelimit-limit': '60',
      'x-ratelimit-remaining': '55',
      'x-ratelimit-reset': '1900000000',
      ...headers,
    },
  })
}

export function mockFetch(routes) {
  const fetchMock = vi.fn(async (url) => {
    const path = String(url).replace('https://api.github.com', '')
    const match = routes.find(([pattern]) =>
      pattern instanceof RegExp ? pattern.test(path) : path === pattern,
    )
    if (!match) {
      return jsonResponse({ message: 'Not Found' }, { status: 404 })
    }
    const response = typeof match[1] === 'function' ? match[1](path) : match[1]
    if (response instanceof Error) {
      throw response
    }
    return jsonResponse(response.body, response)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
