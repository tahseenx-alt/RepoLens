// jsdom has no window.matchMedia, so tests use this small fake.
// setMediaQuery('(prefers-color-scheme: light)', true) simulates a system setting.
const mediaState = new Map()

export function setMediaQuery(query, matches) {
  mediaState.set(query, matches)
}

export function resetMediaQueries() {
  mediaState.clear()
}

export function installMatchMedia() {
  window.matchMedia = (query) => ({
    matches: mediaState.get(query) ?? false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })
}
