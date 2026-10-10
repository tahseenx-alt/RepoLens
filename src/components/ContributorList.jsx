const countFormat = new Intl.NumberFormat('en')

function ContributorList({ contributors }) {
  if (contributors.length === 0) {
    return <p className="analytics-empty">No contributors yet.</p>
  }

  // The top contributor fills the whole bar; everyone else is compared to them.
  const most = contributors[0].contributions

  return (
    <ol className="contributor-list">
      {contributors.map((person) => (
        <li key={person.id ?? person.login}>
          <img src={person.avatar_url} alt="" width="32" height="32" loading="lazy" />
          <div className="contributor-info">
            <div className="contributor-row">
              <a href={person.html_url} target="_blank" rel="noreferrer">
                {person.login}
              </a>
              <span>
                {countFormat.format(person.contributions)}{' '}
                {person.contributions === 1 ? 'commit' : 'commits'}
              </span>
            </div>
            <div className="contributor-bar">
              <span style={{ width: `${(person.contributions / most) * 100}%` }} />
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}

export default ContributorList
