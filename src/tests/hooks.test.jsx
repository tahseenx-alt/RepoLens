import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'
import { useTimeReached } from '../hooks/useTimeReached.js'
import { useRateLimit } from '../hooks/useRateLimit.js'
import { clearAllCache, fetchRepository } from '../api/github.js'
import { mockFetch } from './mockFetch.js'
import { getInitialTheme } from '../theme/theme.js'
import { setMediaQuery } from './mockMatchMedia.js'

describe('usePrefersReducedMotion', () => {
  it('is false by default', () => {
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(false)
  })

  it('is true when the system asks for less motion', () => {
    setMediaQuery('(prefers-reduced-motion: reduce)', true)
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(true)
  })
})

describe('getInitialTheme', () => {
  it('uses dark when nothing is saved and the system has no light preference', () => {
    expect(getInitialTheme()).toBe('dark')
  })

  it('ignores invalid saved values', () => {
    window.localStorage.setItem('repolens:theme', 'purple')
    setMediaQuery('(prefers-color-scheme: light)', true)
    expect(getInitialTheme()).toBe('light')
  })
})

describe('useTimeReached', () => {
  afterEach(() => vi.useRealTimers())

  it('turns true when the time arrives', () => {
    vi.useFakeTimers()
    const at = new Date(Date.now() + 5000)
    const { result } = renderHook(() => useTimeReached(at))
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(5500))
    expect(result.current).toBe(true)
  })

  it('waits correctly for times further away than setTimeout allows', () => {
    vi.useFakeTimers()
    const day = 24 * 60 * 60 * 1000
    const at = new Date(Date.now() + 30 * day)
    const timeout = vi.spyOn(globalThis, 'setTimeout')
    const { result } = renderHook(() => useTimeReached(at))
    act(() => vi.advanceTimersByTime(25 * day))
    expect(result.current).toBe(false)
    act(() => vi.advanceTimersByTime(5 * day + 1000))
    expect(result.current).toBe(true)
    // Real browsers fire a longer timeout straight away.
    const longest = Math.max(...timeout.mock.calls.map(([, delay]) => delay ?? 0))
    expect(longest).toBeLessThanOrEqual(2 ** 31 - 1)
    timeout.mockRestore()
  })

  it('is true without a time', () => {
    const { result } = renderHook(() => useTimeReached(null))
    expect(result.current).toBe(true)
  })
})

describe('useRateLimit', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    clearAllCache()
  })

  it('drops the numbers once the hour has restarted', async () => {
    clearAllCache()
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
    const resetAt = Math.floor(Date.now() / 1000) + 60
    mockFetch([
      [
        '/repos/a/b',
        { body: { id: 1 }, headers: { 'x-ratelimit-remaining': '12', 'x-ratelimit-reset': String(resetAt) } },
      ],
    ])
    const { result } = renderHook(() => useRateLimit())
    await act(() => fetchRepository('a', 'b'))
    expect(result.current).toMatchObject({ remaining: 12, limit: 60 })

    // Showing "12 left" after the reset would be out of date.
    act(() => vi.advanceTimersByTime(61 * 1000))
    expect(result.current).toBeNull()
  })
})
