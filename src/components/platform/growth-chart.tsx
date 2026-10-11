'use client';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
export function GrowthChart({ points }: { points: { date: string; count: number }[] }) {
  const label = (value: string) =>
    new Intl.DateTimeFormat('en', { timeZone: 'UTC', month: 'short', day: 'numeric' }).format(
      new Date(value + 'T00:00:00Z'),
    );
  return (
    <div
      className="h-56 w-full px-3 pb-2 pt-5"
      role="img"
      aria-label={`Daily organization registrations in UTC. ${points.reduce((sum, p) => sum + p.count, 0)} registrations across ${points.length} days.`}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={points}
          margin={{ top: 5, right: 15, bottom: 5, left: -20 }}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} stroke="#e8ede6" />
          <XAxis
            dataKey="date"
            tickFormatter={label}
            tick={{ fontSize: 10, fill: '#60716b' }}
            axisLine={false}
            tickLine={false}
            minTickGap={45}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, (maximum: number) => Math.max(1, maximum)]}
            tick={{ fontSize: 10, fill: '#60716b' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            labelFormatter={(v) => label(String(v))}
            formatter={(v) => [v, 'Organizations created']}
            contentStyle={{ borderRadius: 10, borderColor: '#d6ddd7', fontSize: 12 }}
            cursor={{ fill: '#eef1ed' }}
          />
          <Bar
            dataKey="count"
            fill="#175e50"
            radius={[3, 3, 0, 0]}
            maxBarSize={22}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
