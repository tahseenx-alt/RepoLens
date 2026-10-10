import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion.js'
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
