import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Team } from '../../types'
import TeamCrest from '../TeamCrest'

type SortKey = 'position' | 'points' | 'goal_difference' | 'won' | 'drawn' | 'lost' | 'played'

interface Props { table: Team[] }

const ZONE_DOT: Record<number, string> = {
  1: '#4ade80', 2: '#4ade80', 3: '#4ade80', 4: '#4ade80', // CL — green
  5: '#fb923c', 6: '#fb923c',                              // Europa — orange
}
const RELEGATION_START = 18

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

  const Th = ({ label, k, right = true }: { label: string; k?: SortKey; right?: boolean }) => (
    <th
      className={`py-2.5 px-2 text-xs font-semibold text-[#555] uppercase tracking-wider ${right ? 'text-right' : 'text-left'} ${k ? 'cursor-pointer hover:text-[#aaa] select-none' : ''}`}
      onClick={k ? () => handleSort(k) : undefined}
    >
      {label}{k && sortKey === k ? (sortAsc ? ' ↑' : ' ↓') : ''}
    </th>
  )

  return (
    <div className="overflow-x-auto">
      {/* Zone legend */}
      <div className="flex gap-5 mb-4 text-xs text-[#555]">
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#4ade80] inline-block" />Champions League</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#fb923c] inline-block" />Europa League</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#ef4444] inline-block" />Relegation</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2a2a2a]">
            <th className="py-2.5 px-2 w-8 text-xs font-semibold text-[#555] text-center">#</th>
            <Th label="Team" right={false} />
            <Th label="PL" k="played" />
            <Th label="W" k="won" />
            <Th label="D" k="drawn" />
            <Th label="L" k="lost" />
            <Th label="GD" k="goal_difference" />
            <Th label="PTS" k="points" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((team) => {
            const zoneDot = ZONE_DOT[team.position]
            const isRelegation = team.position >= RELEGATION_START
            return (
              <tr
                key={team.team_short}
                className="border-b border-[#1e1e1e] hover:bg-[#181818] cursor-pointer transition-colors group"
                onClick={() => navigate(`/teams/${encodeURIComponent(team.team_short)}`)}
              >
                {/* Position + zone dot */}
                <td className="py-3 px-2 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    {(zoneDot || isRelegation) && (
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: isRelegation ? '#ef4444' : zoneDot }}
                      />
                    )}
                    <span className="text-[#666] text-xs w-4 text-center">{team.position}</span>
                  </div>
                </td>

                {/* Team */}
                <td className="py-3 px-2">
                  <div className="flex items-center gap-3">
                    <TeamCrest teamCode={team.team_code} teamShort={team.team_short} size={22} />
                    <span className="text-[#e5e5e5] font-medium text-sm group-hover:text-white transition-colors">
                      {team.team_short}
                    </span>
                  </div>
                </td>

                {/* Stats */}
                <td className="py-3 px-2 text-right text-[#666] text-xs">{team.played}</td>
                <td className="py-3 px-2 text-right text-[#666] text-xs">{team.won}</td>
                <td className="py-3 px-2 text-right text-[#666] text-xs">{team.drawn}</td>
                <td className="py-3 px-2 text-right text-[#666] text-xs">{team.lost}</td>
                <td className="py-3 px-2 text-right text-[#666] text-xs">
                  {team.goal_difference != null
                    ? (team.goal_difference > 0 ? `+${team.goal_difference}` : team.goal_difference)
                    : '-'}
                </td>

                {/* Points — highlighted */}
                <td className="py-3 px-2 text-right">
                  <span className="text-white font-bold text-sm">{team.points}</span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
