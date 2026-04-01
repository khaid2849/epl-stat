import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPlayer, getPlayerPrediction } from '../api'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import PlayerAvatar from '../components/PlayerAvatar'
import TeamCrest from '../components/TeamCrest'
import PositionBadge from '../components/PositionBadge'
import ConfidenceBadge from '../components/ConfidenceBadge'
import FeatureBreakdown from '../components/predictions/FeatureBreakdown'
import PlayerRadarChart from '../components/players/PlayerRadarChart'
import Skeleton from '../components/Skeleton'
import { formatCost, formatNum } from '../lib/utils'

export default function PlayerDetail() {
  const { id } = useParams<{ id: string }>()
  const playerId = parseInt(id ?? '0')

  const { data: player, isLoading, error } = useQuery({
    queryKey: ['player', playerId],
    queryFn: () => getPlayer(playerId),
    enabled: !!playerId
  })

  const { data: prediction } = useQuery({
    queryKey: ['player-prediction', playerId],
    queryFn: () => getPlayerPrediction(playerId),
    enabled: !!playerId,
    retry: false
  })

  if (isLoading) return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-24" />
      <Skeleton className="h-48" />
    </div>
  )

  if (error || !player) return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-center">
      <div className="text-[#ef4444] text-lg">Player not found.</div>
      <Link to="/players" className="text-[#999] hover:text-white mt-2 inline-block">← Back to Players</Link>
    </div>
  )

  const gwHistory = (player.gw_history ?? []).slice(-10)
  const statCards = [
    { label: 'Goals', value: player.goals_scored },
    { label: 'Assists', value: player.assists },
    { label: 'Clean Sheets', value: player.clean_sheets },
    { label: 'Bonus', value: player.bonus },
    { label: 'Total Pts', value: player.total_points },
    { label: 'Minutes', value: player.minutes },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <Link to="/players" className="text-[#666] hover:text-white text-sm mb-4 inline-block">← Back to Players</Link>

      {/* Header */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5 mb-5 flex items-start gap-5 flex-wrap">
        <PlayerAvatar optaCode={player.opta_code} webName={player.web_name} position={player.position} size={80} />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-2xl font-bold text-white">{player.full_name || player.web_name}</h1>
            <PositionBadge position={player.position} />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <TeamCrest teamCode={player.team_code} teamShort={player.team_short} size={20} />
            <Link to={`/teams/${encodeURIComponent(player.team_short)}`} className="text-[#999] hover:text-white">{player.team_short}</Link>
          </div>
          <div className="flex gap-4 flex-wrap text-sm">
            <div><span className="text-[#666]">Price: </span><span className="text-white font-semibold">{formatCost(player.now_cost)}</span></div>
            <div><span className="text-[#666]">Ownership: </span><span className="text-white font-semibold">{formatNum(player.selected_by_percent, 1)}%</span></div>
            <div><span className="text-[#666]">Form: </span><span className="text-white font-semibold">{formatNum(player.form, 1)}</span></div>
            <div><span className="text-[#666]">PPG: </span><span className="text-white font-semibold">{formatNum(player.points_per_game, 1)}</span></div>
          </div>
          {player.news && <div className="mt-2 text-sm text-yellow-400">{player.news}</div>}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-5">
        {statCards.map(s => (
          <div key={s.label} className="bg-[#111] border border-[#1e1e1e] rounded-lg p-3 text-center">
            <div className="text-xs text-[#666] mb-1">{s.label}</div>
            <div className="text-xl font-bold text-white">{s.value ?? 0}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-5">
        {/* GW History Chart */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[#666] mb-3">Gameweek Points (Last 10)</h2>
          {gwHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={gwHistory} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" />
                <XAxis dataKey="gameweek" tick={{ fill: '#555', fontSize: 10 }} />
                <YAxis tick={{ fill: '#555', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: 6 }}
                  labelStyle={{ color: '#e5e5e5' }}
                  labelFormatter={v => `GW ${v}`}
                />
                <Bar dataKey="points" fill="#37003C" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-[#555] text-sm text-center py-12">No gameweek history available</div>
          )}
        </div>

        {/* Radar Chart */}
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4">
          <h2 className="text-sm font-semibold text-[#666] mb-3">Player Profile</h2>
          <PlayerRadarChart player={player} />
        </div>
      </div>

      {/* Prediction */}
      {prediction && (
        <div className="bg-[#111] border border-[#1e1e1e] rounded-xl p-5">
          <h2 className="text-lg font-bold text-white mb-4">Next GW Prediction</h2>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <div>
              <div className="text-[#666] text-sm">Predicted Points</div>
              <div className="text-3xl font-bold text-white">{formatNum(prediction.predicted_points, 1)}</div>
            </div>
            <div>
              <div className="text-[#666] text-sm">Confidence</div>
              <div className="mt-1"><ConfidenceBadge confidence={prediction.confidence} /></div>
            </div>
          </div>
          {prediction.features_breakdown?.length > 0 && (
            <FeatureBreakdown breakdown={prediction.features_breakdown} />
          )}
        </div>
      )}
    </div>
  )
}
