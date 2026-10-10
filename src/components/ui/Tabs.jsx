import { useRef } from 'react'

// Accessible tabs (WAI-ARIA tabs pattern). Arrow keys, Home and End move
// between tabs. `tabs` is [{ id, label, badge?, badgeHint? }]. Only the active panel
// is rendered, so switching tabs never reloads data.
// `badgeHint` is read out after the badge by screen readers, e.g. "warnings".
export function TabList({ tabs, activeId, onChange, label, idPrefix }) {
  const buttonsRef = useRef({})

  function handleKeyDown(event) {
    // Move from the tab that has focus, not from `activeId`: the route update
    // that changes `activeId` can land after a fast second key press.
    const focused = tabs.findIndex((tab) => buttonsRef.current[tab.id] === event.target)
    const index = focused === -1 ? tabs.findIndex((tab) => tab.id === activeId) : focused
    const moves = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index - 1 + tabs.length) % tabs.length,
      Home: 0,
      End: tabs.length - 1,
    }
    if (!(event.key in moves)) {
      return
    }
    event.preventDefault()
    const next = tabs[moves[event.key]]
    onChange(next.id)
    buttonsRef.current[next.id]?.focus()
  }

  return (
    <div className="tab-list" role="tablist" aria-label={label} onKeyDown={handleKeyDown}>
      {tabs.map((tab) => {
        const selected = tab.id === activeId
        return (
          <button
            key={tab.id}
            ref={(element) => {
              buttonsRef.current[tab.id] = element
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            // Only the active tab is in the Tab order; arrows move between tabs.
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className="tab"
          >
            {tab.label}
            {tab.badge != null && (
              <span className="tab-badge">
                {tab.badge}
                {tab.badgeHint && <span className="sr-only"> {tab.badgeHint}</span>}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({ id, idPrefix, children }) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel-${id}`}
      aria-labelledby={`${idPrefix}-tab-${id}`}
      // The panel itself can be focused, so keyboard users can scroll it.
      tabIndex={0}
      className="tab-panel"
    >
      {/* key restarts the fade-in each time the tab changes. */}
      <div key={id} className="tab-panel-inner fade-in">
        {children}
      </div>
    </div>
  )
}
