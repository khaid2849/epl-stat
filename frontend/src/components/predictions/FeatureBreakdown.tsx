import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'

interface Props { breakdown: Array<{ feature: string; contribution: number }> }

export default function FeatureBreakdown({ breakdown }: Props) {
  const data = [...breakdown]
    .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
    .slice(0, 5)
    .map(d => ({
      ...d,
      feature: d.feature.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }))

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-400 mb-2">Why this score?</h3>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ left: 0, right: 20 }}>
          <XAxis type="number" tick={{ fill: '#8B949E', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="feature" tick={{ fill: '#E6EDF3', fontSize: 11 }} width={130} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 6 }}
            labelStyle={{ color: '#E6EDF3' }}
            formatter={(v) => [Number(v).toFixed(2) + ' pts', 'Contribution']}
          />
          <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.contribution >= 0 ? '#22c55e' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
