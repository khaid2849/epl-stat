import type { Fixture } from '../../types'
import TeamCrest from '../TeamCrest'
import { formatDate } from '../../lib/utils'

interface Props { fixture: Fixture; teamCodes?: Record<string, number> }

export default function FixtureCard({ fixture, teamCodes = {} }: Props) {
  const { home_team_short: home, away_team_short: away, home_score, away_score, finished, kickoff_time } = fixture
  return (
    <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4 hover:border-[#2a2a2a] transition-colors">
      {/* Date / status */}
      <p className="text-[#555] text-[10px] font-medium uppercase tracking-wider mb-3">
        {finished ? 'Full Time' : formatDate(kickoff_time)}
      </p>

      {/* Teams + score */}
      <div className="flex flex-col gap-2">
        {/* Home */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TeamCrest teamCode={teamCodes[home]} teamShort={home} size={20} />
            <span className="text-[#e5e5e5] text-sm font-medium">{home}</span>
          </div>
          {finished && (
            <span className={`text-sm font-bold ${home_score! > away_score! ? 'text-white' : 'text-[#555]'}`}>
              {home_score}
            </span>
          )}
        </div>

        {/* Away */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TeamCrest teamCode={teamCodes[away]} teamShort={away} size={20} />
            <span className="text-[#e5e5e5] text-sm font-medium">{away}</span>
          </div>
          {finished && (
            <span className={`text-sm font-bold ${away_score! > home_score! ? 'text-white' : 'text-[#555]'}`}>
              {away_score}
            </span>
          )}
        </div>
      </div>

      {/* Upcoming kick-off time pill */}
      {!finished && kickoff_time && (
        <div className="mt-3 pt-3 border-t border-[#1e1e1e]">
          <span className="text-[#555] text-[10px]">
            {new Date(kickoff_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}
    </div>
  )
}
