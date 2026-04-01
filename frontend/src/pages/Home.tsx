import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getStandings, getCurrentFixtures, getTopPicks } from '../api'
import TeamCrest from '../components/TeamCrest'
import FormBadges from '../components/FormBadges'
import FixtureCard from '../components/fixtures/FixtureCard'
import Skeleton from '../components/Skeleton'

export default function Home() {
  const { data: standings, isLoading: loadingS } = useQuery({ queryKey: ['standings'], queryFn: () => getStandings() })
  const { data: fixtures, isLoading: loadingF } = useQuery({ queryKey: ['fixtures-current'], queryFn: getCurrentFixtures })
  const { data: topPicks } = useQuery({ queryKey: ['top-picks'], queryFn: getTopPicks })

  const top6 = standings?.table?.slice(0, 6) ?? []
  const teamCodes = Object.fromEntries(standings?.table?.map(t => [t.team_short, t.team_code]) ?? [])
  const next3 = (fixtures ?? []).filter(f => !f.finished).slice(0, 3)

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">⚽</div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Premier League 2025/26</h1>
        <p className="text-gray-400">Live standings, fixtures, player stats & FPL predictions</p>
        <div className="flex gap-3 justify-center mt-5">
          <Link to="/predictions" className="px-5 py-2 bg-gold text-black font-bold rounded-lg hover:bg-yellow-400 transition-colors text-sm">
            FPL Predictions
          </Link>
          <Link to="/players" className="px-5 py-2 bg-pl-purple text-white font-bold rounded-lg hover:bg-pl-purple-light transition-colors text-sm border border-pl-purple-light">
            Browse Players
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top 6 standings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Standings</h2>
            <Link to="/standings" className="text-sm text-gold hover:underline">View all →</Link>
          </div>
          <div className="bg-navy-light border border-navy-border rounded-lg overflow-hidden">
            {loadingS
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 m-2" />)
              : top6.map(team => (
                <Link
                  key={team.team_short}
                  to={`/teams/${encodeURIComponent(team.team_short)}`}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-navy-border last:border-0 hover:bg-navy transition-colors"
                >
                  <span className="text-gray-400 w-5 text-right text-sm">{team.position}</span>
                  <TeamCrest teamCode={team.team_code} teamShort={team.team_short} size={24} />
                  <span className="flex-1 text-white text-sm font-medium">{team.team_short}</span>
                  <span className="font-bold text-white">{team.points}</span>
                  <FormBadges form={team.form ?? ''} />
                </Link>
              ))
            }
          </div>
        </div>

        {/* Upcoming fixtures */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Upcoming Fixtures</h2>
            <Link to="/fixtures" className="text-sm text-gold hover:underline">View all →</Link>
          </div>
          {loadingF
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 mb-3" />)
            : next3.length > 0
              ? next3.map(f => <div key={f.id} className="mb-3"><FixtureCard fixture={f} teamCodes={teamCodes} /></div>)
              : <div className="text-gray-400 text-sm text-center py-8">No upcoming fixtures</div>
          }
        </div>
      </div>

      {/* Top picks */}
      {topPicks && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">Top FPL Picks</h2>
            <Link to="/predictions" className="text-sm text-gold hover:underline">All predictions →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['GKP', 'DEF', 'MID', 'FWD'] as const).map(pos => {
              const pick = topPicks[pos]?.[0]
              if (!pick) return null
              return (
                <Link key={pos} to={`/players/${pick.player_id}`} className="bg-navy-light border border-navy-border rounded-lg p-4 hover:border-gold transition-colors">
                  <div className="text-xs text-gray-400 mb-1">{pos}</div>
                  <div className="font-bold text-white">{pick.web_name}</div>
                  <div className="text-sm text-gray-400">{pick.team_short}</div>
                  <div className="text-gold font-bold text-lg mt-1">{pick.predicted_points?.toFixed(1)} pts</div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
