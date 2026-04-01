import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Prediction } from '../../types'
import PlayerAvatar from '../PlayerAvatar'
import PositionBadge from '../PositionBadge'
import ConfidenceBadge from '../ConfidenceBadge'
import FDRBadge from '../FDRBadge'
import { formatCost, formatNum } from '../../lib/utils'

type SortCol = 'predicted_points' | 'now_cost' | 'form' | 'fixture_difficulty' | 'ep_next' | 'confidence'
interface Props { predictions: Prediction[] }

export default function PredictionTable({ predictions }: Props) {
  const navigate = useNavigate()
  const [col, setCol] = useState<SortCol>('predicted_points')
  const [asc, setAsc] = useState(false)

  const sorted = [...predictions].sort((a, b) => {
    const diff = (a[col] as number) - (b[col] as number)
    return asc ? diff : -diff
  })

  const handleColClick = (c: SortCol) => {
    if (col === c) {
      setAsc(v => !v)
    } else {
      setCol(c)
      setAsc(false)
    }
  }

  const Th = ({ label, c }: { label: string; c: SortCol }) => (
    <th
      className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap cursor-pointer hover:text-white"
      onClick={() => handleColClick(c)}
    >
      {label} {col === c && (asc ? '↑' : '↓')}
    </th>
  )

  return (
    <div className="overflow-x-auto rounded-lg border border-navy-border">
      <table className="w-full text-sm">
        <thead className="bg-navy-light">
          <tr>
            <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-left">Player</th>
            <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-left">Team</th>
            <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Pos</th>
            <Th label="Price" c="now_cost" />
            <Th label="Pred Pts" c="predicted_points" />
            <Th label="Confidence" c="confidence" />
            <Th label="Form" c="form" />
            <Th label="FDR" c="fixture_difficulty" />
            <Th label="FPL Pred" c="ep_next" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <tr
              key={p.player_id}
              className="border-t border-navy-border hover:bg-navy-light cursor-pointer transition-colors"
              onClick={() => navigate(`/players/${p.player_id}`)}
            >
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <PlayerAvatar optaCode={p.opta_code} webName={p.web_name} position={p.position} size={32} />
                  <span className="font-medium text-white">{p.web_name}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-gray-300">{p.team_short}</td>
              <td className="px-3 py-2.5 text-center"><PositionBadge position={p.position} /></td>
              <td className="px-3 py-2.5 text-right text-gray-300">{formatCost(p.now_cost)}</td>
              <td className="px-3 py-2.5 text-right font-bold text-gold">{formatNum(p.predicted_points, 1)}</td>
              <td className="px-3 py-2.5 text-center"><ConfidenceBadge confidence={p.confidence} /></td>
              <td className="px-3 py-2.5 text-right text-gray-300">{formatNum(p.form, 1)}</td>
              <td className="px-3 py-2.5 text-center"><FDRBadge difficulty={p.fixture_difficulty} /></td>
              <td className="px-3 py-2.5 text-right text-gray-400">{formatNum(p.ep_next, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
