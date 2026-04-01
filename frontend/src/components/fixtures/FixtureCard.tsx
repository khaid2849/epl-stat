import type { Fixture } from '../../types'
import TeamCrest from '../TeamCrest'
import FDRBadge from '../FDRBadge'
import { formatDate } from '../../lib/utils'

interface Props { fixture: Fixture; teamCodes?: Record<string, number> }

export default function FixtureCard({ fixture, teamCodes = {} }: Props) {
  const { home_team_short: home, away_team_short: away, home_score, away_score, finished, kickoff_time, home_difficulty, away_difficulty } = fixture
  return (
    <div className="bg-navy-light border border-navy-border rounded-lg p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Home */}
        <div className="flex items-center gap-2 flex-1">
          <TeamCrest teamCode={teamCodes[home]} teamShort={home} size={32} />
          <span className="font-medium text-white text-sm">{home}</span>
        </div>
        {/* Score / time */}
        <div className="text-center min-w-[60px]">
          {finished ? (
            <span className="text-xl font-bold text-white">{home_score} - {away_score}</span>
          ) : (
            <span className="text-xs text-gray-400">{formatDate(kickoff_time)}</span>
          )}
        </div>
        {/* Away */}
        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="font-medium text-white text-sm">{away}</span>
          <TeamCrest teamCode={teamCodes[away]} teamShort={away} size={32} />
        </div>
      </div>
      <div className="flex justify-between mt-2">
        <FDRBadge difficulty={home_difficulty} size="sm" />
        <FDRBadge difficulty={away_difficulty} size="sm" />
      </div>
    </div>
  )
}
