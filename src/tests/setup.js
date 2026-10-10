// Runs before every test file.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { installMatchMedia, resetMediaQueries } from './mockMatchMedia.js'

installMatchMedia()

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  resetMediaQueries()
  delete document.documentElement.dataset.theme
})

// jsdom doesn't implement ResizeObserver, which the chart library uses.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
