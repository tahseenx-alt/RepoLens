import { useMemo } from 'react'
import { toLanguageList } from '../../utils/languages.js'
import LanguageBreakdown from '../charts/LanguageBreakdown.jsx'
import Panel from '../ui/Panel.jsx'
import { AsyncContent, EmptyState } from '../ui/States.jsx'

function LanguagesContent({ languages }) {
  const list = useMemo(() => toLanguageList(languages), [languages])
  if (list.length === 0) {
    return <EmptyState>GitHub detected no programming languages in this repository.</EmptyState>
  }
  return <LanguageBreakdown languages={list} />
}

function LanguagesPanel({ state }) {
  return (
    <Panel
      id="languages"
      title="Languages"
      description="Bytes of code per language, as detected by GitHub."
      footer={
        <p className="note">
          GitHub measures languages in file bytes, not lines of code, and skips vendored,
          generated and documentation files. Treat the shares as approximate.
        </p>
      }
    >
      <AsyncContent state={state} loadingLabel="Loading languages…" lines={4}>
        {(languages) => <LanguagesContent languages={languages} />}
      </AsyncContent>
    </Panel>
  )
}

export default LanguagesPanel
