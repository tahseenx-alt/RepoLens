import { useEffect, useState } from 'react'

// setTimeout can't wait longer than about 24.8 days; a longer wait would
// fire straight away. Longer waits are split into steps of this size.
const LONGEST_WAIT = 2 ** 31 - 1

// True once `date` has passed (or when there is no date). The component
// re-renders at that moment, e.g. to turn a "Try again" button back on
// when GitHub's rate limit resets.
export function useTimeReached(date) {
  const time = date instanceof Date ? date.getTime() : null
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (time === null || time <= now) {
      return undefined
    }
    // A little extra, so the moment has really passed when this runs.
    const wait = Math.min(time - Date.now() + 250, LONGEST_WAIT)
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, wait))
    return () => clearTimeout(timer)
  }, [time, now])

  return time === null || time <= now
}
