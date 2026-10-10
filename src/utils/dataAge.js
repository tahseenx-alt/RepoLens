// Works out how old the GitHub data on the dashboard is, so the page can
// say so honestly, e.g. "Data from 9:41 AM", and warn when some of it is an
// older saved copy shown because GitHub couldn't answer.
import { getDataInfo } from '../api/github.js'

// `sections` is a list of { label, state }, where `state` is a
// { status, data } object from useGitHubData. Returns null while nothing
// has loaded, otherwise:
//   oldest:   Date of the oldest data shown
//   sections: [{ label, savedAt }] for every loaded section
//   stale:    null, or { labels, since, reason, retryAt } when some sections
//             show expired saved data
export function summarizeDataAge(sections) {
  const loaded = sections
    .filter(({ state }) => state.status === 'success')
    .map(({ label, state }) => ({ label, info: getDataInfo(state.data) }))
    .filter(({ info }) => info)

  if (loaded.length === 0) {
    return null
  }

  const oldest = new Date(Math.min(...loaded.map(({ info }) => info.savedAt.getTime())))
  const staleSections = loaded.filter(({ info }) => info.stale)
  let stale = null
  if (staleSections.length > 0) {
    const retryTimes = staleSections.map(({ info }) => info.stale.retryAt).filter(Boolean)
    stale = {
      labels: staleSections.map(({ label }) => label),
      since: new Date(Math.min(...staleSections.map(({ info }) => info.savedAt.getTime()))),
      reason: staleSections[0].info.stale.reason,
      retryAt: retryTimes.length ? new Date(Math.max(...retryTimes.map((date) => date.getTime()))) : null,
    }
  }

  return {
    oldest,
    sections: loaded.map(({ label, info }) => ({ label, savedAt: info.savedAt })),
    stale,
  }
}
