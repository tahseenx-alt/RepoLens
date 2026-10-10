import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

// Chart colors match the CSS variables in styles/base.css.
const COLORS = {
  bar: '#5b8def',
  grid: '#1f2735',
  axis: '#2b3546',
  tick: '#8b95a7',
}

const UNIT_PREFIX = { day: '', week: 'Week of ', month: '' }

// The box that appears when you hover over or focus a bar.
function ChartTooltip({ active, payload, unit }) {
  if (!active || !payload?.length) {
    return null
  }
  const bucket = payload[0].payload
  return (
    <div className="chart-tooltip">
      <span>
        {UNIT_PREFIX[unit]}
        {bucket.label}
      </span>
      <strong>
        {bucket.count} {bucket.count === 1 ? 'commit' : 'commits'}
      </strong>
    </div>
  )
}

// A bar chart of commits per day, week or month.
// `buckets` comes from buildCommitActivity() in utils/commitActivity.js.
function CommitActivityChart({ buckets, unit }) {
  return (
    <div className="activity-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={COLORS.grid} />
          <XAxis
            dataKey="label"
            tick={{ fill: COLORS.tick, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: COLORS.axis }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: COLORS.tick, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            content={<ChartTooltip unit={unit} />}
            cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
          />
          <Bar dataKey="count" name="Commits" fill={COLORS.bar} radius={[2, 2, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default CommitActivityChart
