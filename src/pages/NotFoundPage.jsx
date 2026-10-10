import { useEffect } from 'react'
import { Link } from 'react-router'
import RepoSearchForm from '../components/search/RepoSearchForm.jsx'

function NotFoundPage({ title = 'Page not found', message }) {
  useEffect(() => {
    document.title = `${title} · RepoLens`
  }, [title])

  return (
    <main id="main" className="container narrow-page">
      <h1>{title}</h1>
      <p className="muted">
        {message || "This address doesn't match a page in RepoLens. Search for a repository instead."}
      </p>
      <RepoSearchForm />
      <p>
        <Link to="/">Back to the start page</Link>
      </p>
    </main>
  )
}

export default NotFoundPage
