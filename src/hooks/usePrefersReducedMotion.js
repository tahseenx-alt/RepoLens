import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange) {
  try {
    const media = window.matchMedia(QUERY)
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  } catch {
    return () => {}
  }
}

function getSnapshot() {
  try {
    return window.matchMedia(QUERY).matches
  } catch {
    return false
  }
}

// True when the user asked their system for less motion. CSS handles most
// animations; this is for the chart library, which animates in JavaScript.
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
