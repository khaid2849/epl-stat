import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getStandings, getCurrentFixtures, getTopPicks } from '../api'
import TeamCrest from '../components/TeamCrest'
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
        <div className="w-16 h-16 rounded-full bg-[#37003C] flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-white font-black text-lg">PL</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">PREMIER LEAGUE</h1>
        <p className="text-[#666] text-sm">Live standings, fixtures, player stats & FPL predictions</p>
        <div className="flex gap-3 justify-center mt-5">
          <Link to="/predictions" className="px-5 py-2 bg-white text-black font-bold rounded-full hover:bg-[#e5e5e5] transition-colors text-sm">
            FPL Predictions
          </Link>
          <Link to="/players" className="px-5 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white font-medium rounded-full hover:bg-[#242424] transition-colors text-sm">
            Browse Players
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top 6 standings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white">Standings</h2>
            <Link to="/standings" className="text-xs text-[#666] hover:text-white transition-colors">View all →</Link>
          </div>
          <div className="bg-[#111] border border-[#1e1e1e] rounded-lg overflow-hidden">
            {loadingS
              ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 m-2" />)
              : top6.map(team => (
                <Link
                  key={team.team_short}
                  to={`/teams/${encodeURIComponent(team.team_short)}`}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-[#1e1e1e] last:border-0 hover:bg-[#181818] transition-colors"
                >
                  <span className="text-[#555] w-4 text-right text-xs">{team.position}</span>
                  <TeamCrest teamCode={team.team_code} teamShort={team.team_short} size={22} />
                  <span className="flex-1 text-[#e5e5e5] text-sm font-medium">{team.team_short}</span>
                  <span className="font-bold text-white text-sm">{team.points}</span>
                </Link>
              ))
            }
          </div>
        </div>

        {/* Upcoming fixtures */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white">Upcoming Fixtures</h2>
            <Link to="/fixtures" className="text-xs text-[#666] hover:text-white transition-colors">View all →</Link>
          </div>
          {loadingF
            ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 mb-3" />)
            : next3.length > 0
              ? <div className="flex flex-col gap-3">{next3.map(f => <FixtureCard key={f.id} fixture={f} teamCodes={teamCodes} />)}</div>
              : <div className="text-[#555] text-sm text-center py-8">No upcoming fixtures</div>
          }
        </div>
      </div>

      {/* Top picks */}
      {topPicks && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white">Top FPL Picks</h2>
            <Link to="/predictions" className="text-xs text-[#666] hover:text-white transition-colors">All predictions →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(['GKP', 'DEF', 'MID', 'FWD'] as const).map(pos => {
              const pick = topPicks[pos]?.[0]
              if (!pick) return null
              return (
                <Link key={pos} to={`/players/${pick.player_id}`} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4 hover:border-[#2a2a2a] transition-colors">
                  <div className="text-[10px] text-[#555] font-semibold uppercase tracking-wider mb-1">{pos}</div>
                  <div className="font-bold text-white text-sm">{pick.web_name}</div>
                  <div className="text-xs text-[#666] mt-0.5">{pick.team_short}</div>
                  <div className="text-white font-bold text-lg mt-2">{pick.predicted_points?.toFixed(1)} <span className="text-xs text-[#666] font-normal">pts</span></div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
