import { useEffect } from 'react'
import { Link } from 'react-router'
import { Activity, Code, GitPullRequest, HeartPulse, Users } from 'lucide-react'
import RepoSearchForm from '../components/search/RepoSearchForm.jsx'
import RecentRepos from '../components/search/RecentRepos.jsx'
import { useRepoHistory } from '../hooks/useRepoHistory.js'

// What the dashboard shows. Each item matches a real tab or panel.
const SECTIONS = [
  { Icon: Activity, title: 'Commit activity', text: 'Recent commits on the default branch, by date.' },
  { Icon: Code, title: 'Languages', text: 'Byte counts and shares per language.' },
  { Icon: Users, title: 'Contributors', text: 'Top contributors by commit count.' },
  { Icon: GitPullRequest, title: 'Issues & PRs', text: 'Recently updated, labeled by type and state.' },
  { Icon: HeartPulse, title: 'Health checks', text: 'README, license, activity and more.' },
]

const EXAMPLES = ['facebook/react', 'vitejs/vite', 'tahseenx-alt/RepoLens']

// The start view: search, examples and recent history on one screen.
function HomePage() {
  const { history, clear } = useRepoHistory()

  useEffect(() => {
    document.title = 'RepoLens · GitHub repository dashboard'
  }, [])

  return (
    <main id="main" className="home container fade-in">
      <section className="home-search-area" aria-labelledby="home-title">
        <h1 id="home-title">Analyze a public GitHub repository</h1>
        <p className="home-lead">
          Live data from the GitHub API: activity, languages, contributors, issues and basic
          health checks. No sign-in needed.
        </p>
        <RepoSearchForm autoFocus />
        <p className="home-examples">
          Try{' '}
          {EXAMPLES.map((name, index) => (
            <span key={name}>
              {index > 0 && ', '}
              <Link to={`/${name}`}>{name}</Link>
            </span>
          ))}
        </p>
      </section>

      <div className="home-side">
        <RecentRepos history={history} onClear={clear} />

        <section className="home-sections" aria-labelledby="sections-title">
          <h2 id="sections-title">What the dashboard shows</h2>
          <ul>
            {SECTIONS.map(({ Icon, title, text }) => (
              <li key={title}>
                <Icon size={15} aria-hidden="true" />
                <span>
                  <strong>{title}.</strong> {text}
                </span>
              </li>
            ))}
          </ul>
          <p className="home-note">
            Uses GitHub&apos;s public API without a token: about 60 requests per hour from your
            network, and one repository takes about 5. Answers are saved in this browser, so
            opening a repository again soon costs nothing.
          </p>
        </section>
      </div>
    </main>
  )
}

export default HomePage
