import { useCallback, useEffect, useMemo, useState } from 'react'

const LOADING = { status: 'loading', data: null, error: null }

// Runs `load` when the component appears (and again when `load` changes)
// and tracks its progress. Returns:
//   { status: 'loading' | 'success' | 'error', data, error, retry }
// `load` receives an AbortSignal so the request is cancelled if the
// component disappears (for example, when another repository is opened).
// Wrap `load` in useCallback, otherwise it would run on every render.
export function useGitHubData(load) {
  // Bumping this number runs the effect again (used by "Try again").
  const [attempt, setAttempt] = useState(0)
  // The result also remembers which `load` and attempt it belongs to.
  const [result, setResult] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setResult({ load, attempt, status: 'success', data, error: null })
        }
      },
      (error) => {
        if (error?.name === 'AbortError' || controller.signal.aborted) {
          return
        }
        setResult({ load, attempt, status: 'error', data: null, error })
      },
    )

    return () => controller.abort()
  }, [load, attempt])

  const retry = useCallback(() => setAttempt((count) => count + 1), [])

  // A result for an older `load` or attempt is out of date, so the
  // new request is still loading.
  const isCurrent = result && result.load === load && result.attempt === attempt
  const { status, data, error } = isCurrent ? result : LOADING
  // The same object is returned until something changes, so components
  // that receive it don't re-render (or recalculate) for no reason.
  return useMemo(() => ({ status, data, error, retry }), [status, data, error, retry])
}
