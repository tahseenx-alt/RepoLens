import { commitTitle, formatDate, safeExternalUrl } from '../../utils/format.js'
import { commitDate } from '../../utils/commitActivity.js'

// One commit: title (linked to GitHub), author, date and short SHA.
function CommitRow({ item }) {
  const title = commitTitle(item.commit?.message)
  // `item.author` is the GitHub account. It's missing when the commit's
  // email isn't linked to an account, so fall back to the name in Git.
  const authorName = item.author?.login || item.commit?.author?.name || 'Unknown author'
  const date = commitDate(item)
  const url = safeExternalUrl(item.html_url)
  const shortSha = item.sha?.slice(0, 7)

  return (
    <li className="commit-row">
      <div className="commit-main">
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="commit-title" title={title}>
            {title}
          </a>
        ) : (
          <span className="commit-title" title={title}>
            {title}
          </span>
        )}
        <div className="commit-meta">
          {item.author?.avatar_url && (
            <img src={item.author.avatar_url} alt="" width="16" height="16" loading="lazy" />
          )}
          <span>{authorName}</span>
          <span aria-hidden="true">·</span>
          {date ? <time dateTime={date.toISOString()}>{formatDate(date)}</time> : <span>Unknown date</span>}
        </div>
      </div>
      {shortSha && (
        <code className="commit-sha" aria-label={`Commit ${shortSha}`}>
          {shortSha}
        </code>
      )}
    </li>
  )
}

export default CommitRow
