import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTeam } from '../api'
import TeamCrest from '../components/TeamCrest'
import FormBadges from '../components/FormBadges'
import PlayerTable from '../components/players/PlayerTable'
import Skeleton from '../components/Skeleton'

export default function TeamDetail() {
  const { teamShort } = useParams<{ teamShort: string }>()
  const decoded = decodeURIComponent(teamShort ?? '')
  const { data: team, isLoading, error } = useQuery({
    queryKey: ['team', decoded],
    queryFn: () => getTeam(decoded),
    enabled: !!decoded
  })

  if (isLoading) return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Skeleton className="h-40 mb-4" />
      <Skeleton className="h-64" />
    </div>
  )

  if (error || !team) return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-center">
      <div className="text-red-400">Team not found.</div>
      <Link to="/standings" className="block mt-2 text-gold hover:underline">← Standings</Link>
    </div>
  )

  const stats = [
    { label: 'Goals For', value: team.goals_for },
    { label: 'Goals Against', value: team.goals_against },
    { label: 'Goal Diff', value: team.goal_difference > 0 ? `+${team.goal_difference}` : team.goal_difference },
    { label: 'Points', value: team.points, highlight: true },
    { label: 'Wins', value: team.won },
    { label: 'Draws', value: team.drawn },
    { label: 'Losses', value: team.lost },
    { label: 'Played', value: team.played },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link to="/standings" className="text-gray-400 hover:text-white text-sm mb-4 inline-block">← Standings</Link>
      {/* Header */}
      <div className="bg-navy-light border border-navy-border rounded-xl p-6 mb-5 flex items-center gap-5 flex-wrap">
        <TeamCrest teamCode={team.team_code} teamShort={team.team_short} size={72} />
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">{team.team_short}</h1>
          <div className="text-gray-400 text-sm mb-2">#{team.position} · {team.won}W {team.drawn}D {team.lost}L</div>
          <FormBadges form={team.form ?? ''} />
        </div>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-4 md:grid-cols-8 gap-3 mb-5">
        {stats.map(s => (
          <div key={s.label} className="bg-navy-light border border-navy-border rounded-lg p-3 text-center">
            <div className="text-xs text-gray-400 mb-1">{s.label}</div>
            <div className={`text-lg font-bold ${s.highlight ? 'text-gold' : 'text-white'}`}>{s.value}</div>
          </div>
        ))}
      </div>
      {/* Players */}
      {team.players && team.players.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-white mb-3">Squad</h2>
          <PlayerTable players={team.players} />
        </div>
      )}
    </div>
  )
}
