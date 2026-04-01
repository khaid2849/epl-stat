import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Player } from '../../types'
import PlayerAvatar from '../PlayerAvatar'
import PositionBadge from '../PositionBadge'
import { formatCost, formatNum } from '../../lib/utils'

type Col = 'web_name' | 'now_cost' | 'total_points' | 'form' | 'expected_goals' | 'expected_assists' | 'ict_index' | 'selected_by_percent'

interface Props { players: Player[] }

export default function PlayerTable({ players }: Props) {
  const navigate = useNavigate()
  const [sortCol, setSortCol] = useState<Col>('total_points')
  const [asc, setAsc] = useState(false)

  const sorted = [...players].sort((a, b) => {
    const av = a[sortCol] as number | string
    const bv = b[sortCol] as number | string
    const diff = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number)
    return asc ? diff : -diff
  })

  const handleColClick = (col: Col) => {
    if (sortCol === col) {
      setAsc(v => !v)
    } else {
      setSortCol(col)
      setAsc(false)
    }
  }

  const Th = ({ label, col }: { label: string; col?: Col }) => (
    <th
      className={`px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right whitespace-nowrap ${col ? 'cursor-pointer hover:text-white' : ''}`}
      onClick={col ? () => handleColClick(col) : undefined}
    >
      {label} {col && sortCol === col && (asc ? '↑' : '↓')}
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
            <Th label="Price" col="now_cost" />
            <Th label="Pts" col="total_points" />
            <Th label="Form" col="form" />
            <Th label="xG" col="expected_goals" />
            <Th label="xA" col="expected_assists" />
            <Th label="ICT" col="ict_index" />
            <Th label="Sel%" col="selected_by_percent" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <tr
              key={p.id}
              className="border-t border-navy-border hover:bg-navy-light cursor-pointer transition-colors"
              onClick={() => navigate(`/players/${p.id}`)}
            >
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <PlayerAvatar optaCode={p.opta_code} webName={p.web_name} position={p.position} size={32} />
                  <div>
                    <div className="font-medium text-white">{p.web_name}</div>
                    {p.status !== 'a' && (
                      <div className={`text-xs ${p.status === 'd' ? 'text-yellow-400' : 'text-red-400'}`}>
                        {p.status === 'd' ? 'Doubt' : p.status === 'i' ? 'Injured' : p.status === 's' ? 'Suspended' : p.status}
                      </div>
                    )}
                  </div>
                </div>
              </td>
              <td className="px-3 py-2.5 text-gray-300">{p.team_short}</td>
              <td className="px-3 py-2.5 text-center"><PositionBadge position={p.position} /></td>
              <td className="px-3 py-2.5 text-right text-gray-300">{formatCost(p.now_cost)}</td>
              <td className="px-3 py-2.5 text-right font-semibold text-white">{p.total_points}</td>
              <td className="px-3 py-2.5 text-right text-gray-300">{formatNum(p.form, 1)}</td>
              <td className="px-3 py-2.5 text-right text-gray-300">{formatNum(p.expected_goals)}</td>
              <td className="px-3 py-2.5 text-right text-gray-300">{formatNum(p.expected_assists)}</td>
              <td className="px-3 py-2.5 text-right text-gray-300">{formatNum(p.ict_index, 1)}</td>
              <td className="px-3 py-2.5 text-right text-gray-300">{formatNum(p.selected_by_percent, 1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
