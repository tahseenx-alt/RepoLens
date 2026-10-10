import { useCallback, useState } from 'react'
import { addToHistory, clearHistory, loadHistory } from '../utils/history.js'

// The list of recently analyzed repositories, plus functions to change it.
export function useRepoHistory() {
  const [history, setHistory] = useState(loadHistory)

  const add = useCallback((owner, repo) => setHistory(addToHistory(owner, repo)), [])
  const clear = useCallback(() => setHistory(clearHistory()), [])

  return { history, add, clear }
}
