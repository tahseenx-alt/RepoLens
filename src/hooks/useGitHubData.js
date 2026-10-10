import { useEffect, useState } from 'react'

// Runs `load` when the component appears and tracks its progress.
// Returns { status: 'loading' | 'success' | 'error', data, error }.
// `load` receives an AbortSignal so the request is cancelled if the
// component disappears (for example, when a new search starts).
export function useGitHubData(load) {
  const [state, setState] = useState({ status: 'loading', data: null, error: '' })

  useEffect(() => {
    const controller = new AbortController()

    load(controller.signal).then(
      (data) => setState({ status: 'success', data, error: '' }),
      (error) => {
        if (error.name === 'AbortError') {
          return
        }
        setState({
          status: 'error',
          data: null,
          error: error.message || 'Something went wrong. Please try again.',
        })
      },
    )

    return () => controller.abort()
  }, [load])

  return state
}
