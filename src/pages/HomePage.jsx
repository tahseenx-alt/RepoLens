import { useEffect } from 'react'
import { Link } from 'react-router'
import { Activity, Code, GitPullRequest, HeartPulse, Users } from 'lucide-react'
import RepoSearchForm from '../components/search/RepoSearchForm.jsx'
import RecentRepos from '../components/search/RecentRepos.jsx'
import { useRepoHistory } from '../hooks/useRepoHistory.js'

// What the dashboard shows. Each item matches a real section.
const FEATURES = [
  {
    Icon: Activity,
    title: 'Commit activity',
    text: 'Recent commits on the default branch, grouped by date, with the period clearly stated.',
  },
  {
    Icon: Code,
    title: 'Languages',
    text: 'Byte counts and shares for every language GitHub detects.',
  },
  {
    Icon: Users,
    title: 'Contributors',
    text: 'Top contributors by commit count, linked to their profiles.',
  },
  {
    Icon: GitPullRequest,
    title: 'Issues and pull requests',
    text: 'Recently updated issues and PRs, kept apart and labeled by state.',
  },
  {
    Icon: HeartPulse,
    title: 'Health checks',
    text: 'README, license, contributing guide and activity, each traced to a real check.',
  },
]

const EXAMPLES = ['facebook/react', 'vitejs/vite', 'tahseenx-alt/RepoLens']

function HomePage() {
  const { history, clear } = useRepoHistory()

  useEffect(() => {
    document.title = 'RepoLens · GitHub repository dashboard'
  }, [])

  return (
    <main id="main" className="home">
      <section className="container home-intro" aria-labelledby="home-title">
        <h1 id="home-title">Inspect any public GitHub repository.</h1>
        <p className="home-lead">
          RepoLens pulls live data from the GitHub API and lays out activity, languages,
          contributors, issues and basic health signals on one page. No sign-in needed.
        </p>

        <div className="home-search">
          <RepoSearchForm autoFocus />
          <p className="home-examples">
            Examples:{' '}
            {EXAMPLES.map((name, index) => (
              <span key={name}>
                {index > 0 && ', '}
                <Link to={`/${name}`}>{name}</Link>
              </span>
            ))}
          </p>
        </div>

        <RecentRepos history={history} onClear={clear} />
      </section>

      <section className="container home-features" aria-labelledby="features-title">
        <h2 id="features-title">What you get</h2>
        <ul className="feature-list">
          {FEATURES.map(({ Icon, title, text }) => (
            <li key={title}>
              <Icon size={16} aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="home-note">
          RepoLens uses GitHub&apos;s unauthenticated API, which allows about 60 requests per hour
          from your network. Analyzing one repository uses about 7.
        </p>
      </section>
    </main>
  )
}

export default HomePage
