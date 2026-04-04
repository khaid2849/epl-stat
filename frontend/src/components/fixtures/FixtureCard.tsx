import type { Fixture } from '../../types'
import TeamCrest from '../TeamCrest'
import { TEAM_FULL_NAMES } from '../../lib/constants'

interface Props { fixture: Fixture; teamCodes?: Record<string, number> }

function formatFixtureDate(iso: string | null): string {
  if (!iso) return 'TBC'
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function formatKickoffTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export default function FixtureCard({ fixture, teamCodes = {} }: Props) {
  const { home_team_short: home, away_team_short: away, home_score, away_score, finished, kickoff_time } = fixture
  const homeName = TEAM_FULL_NAMES[home] ?? home
  const awayName = TEAM_FULL_NAMES[away] ?? away

  return (
    <div className="bg-[#1e1e1e] rounded-lg px-4 py-4 flex items-center gap-3 hover:bg-[#252525] transition-colors cursor-pointer">
      {/* Teams column */}
      <div className="flex-1 flex flex-col gap-2.5 min-w-0">
        {/* Home row */}
        <div className="flex items-center gap-2.5">
          <TeamCrest teamCode={teamCodes[home]} teamShort={home} size={24} />
          <span className="text-white text-sm font-medium flex-1 truncate">{homeName}</span>
          {finished && (
            <span className={`text-sm font-bold flex-shrink-0 min-w-[14px] text-right ${
              home_score! > away_score! ? 'text-white' : 'text-[#888]'
            }`}>
              {home_score}
            </span>
          )}
        </div>
        {/* Away row */}
        <div className="flex items-center gap-2.5">
          <TeamCrest teamCode={teamCodes[away]} teamShort={away} size={24} />
          <span className="text-white text-sm font-medium flex-1 truncate">{awayName}</span>
          {finished && (
            <span className={`text-sm font-bold flex-shrink-0 min-w-[14px] text-right ${
              away_score! > home_score! ? 'text-white' : 'text-[#888]'
            }`}>
              {away_score}
            </span>
          )}
        </div>
      </div>

      {/* Date / status column */}
      <div className="flex-shrink-0 text-right min-w-[110px]">
        <div className="text-white text-sm font-semibold">{formatFixtureDate(kickoff_time)}</div>
        <div className="text-[#999] text-sm mt-0.5">
          {finished ? 'Full time' : formatKickoffTime(kickoff_time)}
        </div>
      </div>
    </div>
  )
}
