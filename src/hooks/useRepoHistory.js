import { useCallback, useState } from 'react'
import { clearSavedResponses } from '../api/github.js'
import { addToHistory, clearHistory, loadHistory } from '../utils/history.js'

// The list of recently analyzed repositories, plus functions to change it.
export function useRepoHistory() {
  const [history, setHistory] = useState(loadHistory)

  const add = useCallback((owner, repo) => setHistory(addToHistory(owner, repo)), [])
  // Clearing the history also removes the GitHub data saved for those
  // repositories, so nothing about them is left in this browser.
  const clear = useCallback(() => {
    clearSavedResponses()
    setHistory(clearHistory())
  }, [])

  return { history, add, clear }
}
