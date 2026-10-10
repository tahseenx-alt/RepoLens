import { useEffect, useState } from 'react'
import { getRateLimit, onRateLimitChange } from '../api/github.js'

// The latest GitHub rate-limit numbers: { limit, remaining, resetAt } or null.
export function useRateLimit() {
  const [rateLimit, setRateLimit] = useState(getRateLimit)

  useEffect(() => onRateLimitChange(setRateLimit), [])

  return rateLimit
}
