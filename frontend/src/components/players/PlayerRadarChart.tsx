import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import type { Player } from '../../types'

interface Props { player: Player }

export default function PlayerRadarChart({ player }: Props) {
  const norm = (val: number, max: number) => Math.min(10, (val / max) * 10)
  const data = [
    { axis: 'Form', value: norm(player.form ?? 0, 10) },
    { axis: 'xG', value: norm(player.expected_goals ?? 0, 15) },
    { axis: 'xA', value: norm(player.expected_assists ?? 0, 10) },
    { axis: 'ICT', value: norm(player.ict_index ?? 0, 100) },
    { axis: 'Bonus', value: norm(player.bonus ?? 0, 30) },
    { axis: 'Clean Sheets', value: norm(player.clean_sheets ?? 0, 20) },
  ]

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
        <PolarGrid stroke="#21262D" />
        <PolarAngleAxis dataKey="axis" tick={{ fill: '#8B949E', fontSize: 11 }} />
        <Radar dataKey="value" stroke="#FFD700" fill="#37003C" fillOpacity={0.6} />
        <Tooltip
          contentStyle={{ background: '#161B22', border: '1px solid #21262D', borderRadius: 6 }}
          formatter={(v) => [Number(v).toFixed(1), 'Score']}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}
