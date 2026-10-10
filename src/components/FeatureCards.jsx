import { ChartIcon, CommitIcon, HeartPulseIcon, UsersIcon } from './Icons.jsx'

// The content for each card lives in this list.
// To add a card, add another object here.
const features = [
  {
    title: 'Repository Analytics',
    description:
      'Stars, forks, watchers, languages and size, summarized in one overview.',
    Icon: ChartIcon,
    accent: 'blue',
  },
  {
    title: 'Contributors',
    description:
      'See who builds the project and how the work is shared across the team.',
    Icon: UsersIcon,
    accent: 'purple',
  },
  {
    title: 'Commit Activity',
    description:
      'Follow recent development activity and spot busy or quiet periods.',
    Icon: CommitIcon,
    accent: 'green',
  },
  {
    title: 'Project Health',
    description:
      'Check for a README, license and other signs of a well-kept project.',
    Icon: HeartPulseIcon,
    accent: 'pink',
  },
]

function FeatureCards() {
  return (
    <section className="features" id="features">
      <div className="container">
        <div className="section-heading">
          <h2>Everything you need to know about a repo</h2>
          <p>Four views that turn raw GitHub data into useful insight.</p>
        </div>

        <div className="feature-grid">
          {features.map(({ title, description, Icon, accent }) => (
            <article key={title} className={`feature-card accent-${accent}`}>
              <div className="feature-icon">
                <Icon size={22} />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default FeatureCards
