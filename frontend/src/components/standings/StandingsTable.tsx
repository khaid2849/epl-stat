import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Team } from '../../types'
import TeamCrest from '../TeamCrest'
import FormBadges from '../FormBadges'

type SortKey = 'position' | 'points' | 'goals_for' | 'goals_against' | 'goal_difference' | 'won' | 'drawn' | 'lost' | 'played'

interface Props { table: Team[] }

export default function StandingsTable({ table }: Props) {
  const navigate = useNavigate()
  const [sortKey, setSortKey] = useState<SortKey>('position')
  const [sortAsc, setSortAsc] = useState(true)

  const sorted = [...table].sort((a, b) => {
    const diff = (a[sortKey] as number) - (b[sortKey] as number)
    return sortAsc ? diff : -diff
  })

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(v => !v)
    else { setSortKey(key); setSortAsc(false) }
  }

  const getZoneColor = (pos: number) => {
    if (pos <= 4) return 'border-l-4 border-l-blue-500'
    if (pos <= 6) return 'border-l-4 border-l-orange-500'
    if (pos >= 18) return 'border-l-4 border-l-red-600'
    return 'border-l-4 border-l-transparent'
  }

  const Th = ({ label, k }: { label: string; k?: SortKey }) => (
    <th
      className={`px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-right ${k ? 'cursor-pointer hover:text-white' : ''}`}
      onClick={k ? () => handleSort(k) : undefined}
    >
      {label} {k && sortKey === k && (sortAsc ? '↑' : '↓')}
    </th>
  )

  return (
    <div className="overflow-x-auto rounded-lg border border-navy-border">
      <table className="w-full text-sm">
        <thead className="bg-navy-light">
          <tr>
            <Th label="#" k="position" />
            <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider text-left">Team</th>
            <Th label="P" k="played" />
            <Th label="W" k="won" />
            <Th label="D" k="drawn" />
            <Th label="L" k="lost" />
            <Th label="GF" k="goals_for" />
            <Th label="GA" k="goals_against" />
            <Th label="GD" k="goal_difference" />
            <Th label="Pts" k="points" />
            <th className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Form</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((team) => (
            <tr
              key={team.team_short}
              className={`border-t border-navy-border hover:bg-navy-light cursor-pointer transition-colors ${getZoneColor(team.position)}`}
              onClick={() => navigate(`/teams/${encodeURIComponent(team.team_short)}`)}
            >
              <td className="px-3 py-2.5 text-right text-gray-400 w-8">{team.position}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <TeamCrest teamCode={team.team_code} teamShort={team.team_short} size={24} />
                  <span className="font-medium text-white">{team.team_short}</span>
                </div>
              </td>
              <td className="px-3 py-2.5 text-right text-gray-300">{team.played}</td>
              <td className="px-3 py-2.5 text-right text-gray-300">{team.won}</td>
              <td className="px-3 py-2.5 text-right text-gray-300">{team.drawn}</td>
              <td className="px-3 py-2.5 text-right text-gray-300">{team.lost}</td>
              <td className="px-3 py-2.5 text-right text-gray-300">{team.goals_for}</td>
              <td className="px-3 py-2.5 text-right text-gray-300">{team.goals_against}</td>
              <td className="px-3 py-2.5 text-right text-gray-300">{team.goal_difference > 0 ? `+${team.goal_difference}` : team.goal_difference}</td>
              <td className="px-3 py-2.5 text-right font-bold text-white">{team.points}</td>
              <td className="px-3 py-2.5"><FormBadges form={team.form ?? ''} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
