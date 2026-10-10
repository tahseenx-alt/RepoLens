import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CHART_COLORS } from '../../theme/chartColors.js'
import { useTheme } from '../../theme/themeContext.js'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js'

const UNIT_PREFIX = { day: '', week: 'Week of ', month: '' }

// The box that appears when you hover over a bar.
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
  const { theme } = useTheme()
  const colors = CHART_COLORS[theme]
  // The bars grow in briefly when data loads, unless the user asked for less motion.
  const animate = !usePrefersReducedMotion()

  return (
    <div className="activity-chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={buckets} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={colors.grid} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.tick, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: colors.axis }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: colors.tick, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: colors.cursor }} />
          <Bar
            dataKey="count"
            name="Commits"
            fill={colors.bar}
            activeBar={{ fill: colors.barHover }}
            radius={[2, 2, 0, 0]}
            maxBarSize={24}
            isAnimationActive={animate}
            animationDuration={450}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default CommitActivityChart
