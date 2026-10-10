import { useEffect, useState } from 'react'
import { getRateLimit, onRateLimitChange } from '../api/github.js'
import { useTimeReached } from './useTimeReached.js'

// The latest GitHub rate-limit numbers:
//   { limit, remaining, resetAt, blockedUntil, seenAt, fromEarlierVisit }
// or null when there is nothing current to show. Once the hour restarts
// the old numbers are dropped, so they are never shown as current.
export function useRateLimit() {
  const [rateLimit, setRateLimit] = useState(getRateLimit)

  useEffect(() => onRateLimitChange(setRateLimit), [])

  const resetAt = rateLimit?.resetAt ?? null
  const blockedUntil = rateLimit?.blockedUntil ?? null
  const resetPassed = useTimeReached(resetAt)
  const blockPassed = useTimeReached(blockedUntil)

  if (!rateLimit) {
    return null
  }
  const activeBlock = blockedUntil && !blockPassed ? blockedUntil : null
  if (resetAt && resetPassed && !activeBlock) {
    return null
  }
  return { ...rateLimit, blockedUntil: activeBlock }
}
