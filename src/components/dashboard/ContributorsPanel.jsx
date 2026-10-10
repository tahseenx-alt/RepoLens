import { CONTRIBUTORS_LIMIT } from '../../api/github.js'
import { formatNumber, safeExternalUrl } from '../../utils/format.js'
import Panel from '../ui/Panel.jsx'
import { AsyncContent, EmptyState } from '../ui/States.jsx'

function ContributorName({ person }) {
  // Anonymous contributors are commits whose email isn't linked to a
  // GitHub account. They have a name from Git but no profile.
  if (person.type === 'Anonymous' || !person.login) {
    return (
      <span>
        {person.name || 'Unknown'} <span className="muted">(no GitHub account linked)</span>
      </span>
    )
  }
  const url = safeExternalUrl(person.html_url)
  return url ? (
    <a href={url} target="_blank" rel="noreferrer">
      {person.login}
    </a>
  ) : (
    <span>{person.login}</span>
  )
}

function ContributorTable({ contributors }) {
  if (contributors.length === 0) {
    return <EmptyState>GitHub returned no contributors for this repository.</EmptyState>
  }

  // The top contributor fills the whole bar; everyone else is compared to them.
  const most = Math.max(...contributors.map((person) => person.contributions || 0), 1)

  return (
    <div className="table-scroll">
      <table className="data-table contributor-table">
        <thead>
          <tr>
            <th scope="col" className="num">#</th>
            <th scope="col">Contributor</th>
            <th scope="col" className="num">Commits</th>
          </tr>
        </thead>
        <tbody>
          {contributors.map((person, index) => (
            <tr key={person.id ?? `${person.name}-${index}`}>
              <td className="num muted">{index + 1}</td>
              <td>
                <div className="contributor-cell">
                  {person.avatar_url ? (
                    <img src={person.avatar_url} alt="" width="24" height="24" loading="lazy" />
                  ) : (
                    <span className="avatar-placeholder" aria-hidden="true" />
                  )}
                  <ContributorName person={person} />
                </div>
              </td>
              <td className="num">
                <span className="mono">{formatNumber(person.contributions)}</span>
                <span className="contribution-bar" aria-hidden="true">
                  <span style={{ width: `${((person.contributions || 0) / most) * 100}%` }} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ContributorsPanel({ state }) {
  return (
    <Panel
      id="contributors"
      title="Contributors"
      description={`Top ${CONTRIBUTORS_LIMIT} by commits on the default branch.`}
      footer={
        <p className="note">
          Commit counts show participation, not the value or quality of anyone&apos;s work. Reviews,
          issues, design and docs aren&apos;t counted.
        </p>
      }
    >
      <AsyncContent state={state} loadingLabel="Loading contributors…" lines={6}>
        {(contributors) => <ContributorTable contributors={contributors} />}
      </AsyncContent>
    </Panel>
  )
}

export default ContributorsPanel
