import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const WEEKS = 12
const DAY = 24 * 60 * 60 * 1000

const labelFormat = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' })

// Counts commits in each of the last 12 weeks (oldest week first).
function countCommitsPerWeek(commits) {
  const now = Date.now()
  const weeks = Array.from({ length: WEEKS }, (_, index) => {
    const start = now - (WEEKS - index) * 7 * DAY
    return { start, label: labelFormat.format(start), commits: 0 }
  })

  for (const commit of commits) {
    const time = new Date(commit.commit.author.date).getTime()
    const index = Math.floor((time - weeks[0].start) / (7 * DAY))
    if (index >= 0 && index < WEEKS) {
      weeks[index].commits += 1
    }
  }

  return weeks
}

// The box that appears when you hover over a bar.
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) {
    return null
  }
  const week = payload[0].payload
  return (
    <div className="chart-tooltip">
      <span>Week of {week.label}</span>
      <strong>
        {week.commits} {week.commits === 1 ? 'commit' : 'commits'}
      </strong>
    </div>
  )
}

function CommitActivityChart({ commits }) {
  const weeks = countCommitsPerWeek(commits)
  const total = weeks.reduce((sum, week) => sum + week.commits, 0)

  // We only download the latest 100 commits. If all 100 are inside the
  // 12 weeks, older weeks may be missing some commits.
  const oldest = commits.at(-1)
  const isPartial =
    commits.length === 100 && new Date(oldest.commit.author.date).getTime() > weeks[0].start

  return (
    <div>
      <p className="activity-summary">
        <strong>{total}</strong> {total === 1 ? 'commit' : 'commits'} in the last {WEEKS} weeks
      </p>

      {total > 0 && (
        <div className="activity-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeks} margin={{ top: 8, right: 4, bottom: 0, left: -12 }}>
              <CartesianGrid vertical={false} stroke="#252a36" />
              <XAxis
                dataKey="label"
                tick={{ fill: '#6b7285', fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#343b4b' }}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#6b7285', fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }} />
              <Bar dataKey="commits" fill="#3987e5" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {isPartial && (
        <p className="analytics-note">
          Based on the latest 100 commits, so earlier weeks may show fewer commits than actually
          happened.
        </p>
      )}
    </div>
  )
}

export default CommitActivityChart
