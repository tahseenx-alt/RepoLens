const SHOW = 8

const dateFormat = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
})

function RecentCommits({ commits }) {
  if (commits.length === 0) {
    return <p className="analytics-empty">This repository has no commits yet.</p>
  }

  return (
    <ul className="commit-list">
      {commits.slice(0, SHOW).map((item) => {
        // Only the first line of a commit message is its title.
        const title = item.commit.message.split('\n')[0]
        // `item.author` is the GitHub account; it is missing when the
        // commit's email isn't linked to an account.
        const authorName = item.author?.login || item.commit.author.name

        return (
          <li key={item.sha}>
            <a href={item.html_url} target="_blank" rel="noreferrer" className="commit-title">
              {title}
            </a>
            <div className="commit-meta">
              {item.author?.avatar_url && (
                <img src={item.author.avatar_url} alt="" width="18" height="18" loading="lazy" />
              )}
              <span>{authorName}</span>
              <span aria-hidden="true">·</span>
              <time dateTime={item.commit.author.date}>
                {dateFormat.format(new Date(item.commit.author.date))}
              </time>
              <code>{item.sha.slice(0, 7)}</code>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export default RecentCommits
