import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPredictions, getBestXI, getTopPicks, getTeams } from '../api'
import PredictionTable from '../components/predictions/PredictionTable'
import BestXIPitch from '../components/predictions/BestXIPitch'
import PlayerAvatar from '../components/PlayerAvatar'
import ConfidenceBadge from '../components/ConfidenceBadge'
import Skeleton from '../components/Skeleton'
import { formatCost, formatNum } from '../lib/utils'
import { POSITION_COLORS } from '../lib/constants'

const positions = ['All', 'GKP', 'DEF', 'MID', 'FWD'] as const

export default function Predictions() {
  const [pos, setPos] = useState('All')
  const [team, setTeam] = useState('')
  const [topTab, setTopTab] = useState<'GKP' | 'DEF' | 'MID' | 'FWD'>('MID')

  const params: Record<string, string | number | undefined> = {
    ...(pos !== 'All' && { position: pos }),
    ...(team && { team }),
  }

  const { data: predictions = [], isLoading: loadP, error: errP } = useQuery({
    queryKey: ['predictions', params],
    queryFn: () => getPredictions(params)
  })
  const { data: bestXI, isLoading: loadXI } = useQuery({
    queryKey: ['best-xi'],
    queryFn: () => getBestXI(),
    retry: false
  })
  const { data: topPicks } = useQuery({ queryKey: ['top-picks'], queryFn: getTopPicks })
  const { data: teamsData } = useQuery({ queryKey: ['teams'], queryFn: getTeams })
  const teamNames = teamsData?.map(t => t.team_short).sort() ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-black text-white mb-6 tracking-tight">FPL Predictions</h1>

      {/* Filters */}
      <div className="bg-[#111] border border-[#1e1e1e] rounded-lg p-4 mb-5">
        <div className="flex gap-2 flex-wrap mb-3">
          {positions.map(p => (
            <button
              key={p}
              onClick={() => setPos(p)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${pos === p ? 'text-black' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#666] hover:text-white'}`}
              style={pos === p ? { backgroundColor: p === 'All' ? '#e5e5e5' : POSITION_COLORS[p] } : {}}
            >
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="text-xs text-[#666] block mb-1">Team</label>
            <select
              value={team} onChange={e => setTeam(e.target.value)}
              className="bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded px-2 py-1.5 text-sm focus:outline-none"
            >
              <option value="">All Teams</option>
              {teamNames.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Prediction table */}
      {loadP && <div className="space-y-2">{Array.from({length:10}).map((_,i) => <Skeleton key={i} className="h-12" />)}</div>}
      {errP && (
        <div className="text-[#ef4444] text-center py-6">
          Failed to load predictions. Train ML models first: <code className="text-[#999]">python -m backend.ml.train</code>
        </div>
      )}
      {!loadP && !errP && predictions.length === 0 && (
        <div className="text-center py-12 text-[#555]">
          <div className="font-semibold text-white mb-1">No predictions yet</div>
          <div className="text-sm">Run <code className="text-[#999]">python -m backend.ml.train</code> to generate predictions</div>
        </div>
      )}
      {predictions.length > 0 && <PredictionTable predictions={predictions} />}

      {/* Best XI */}
      <div className="mt-8">
        <h2 className="text-lg font-bold text-white mb-4">Best XI</h2>
        {loadXI && <Skeleton className="h-80" />}
        {!loadXI && !bestXI && (
          <div className="text-center py-8 text-[#555] border border-[#1e1e1e] rounded-lg">
            Best XI not available — train ML models first.
          </div>
        )}
        {bestXI && <BestXIPitch data={bestXI} />}
      </div>

      {/* Top picks by position */}
      {topPicks && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-white mb-4">Top Picks</h2>
          <div className="flex gap-2 mb-4">
            {(['GKP', 'DEF', 'MID', 'FWD'] as const).map(p => (
              <button
                key={p}
                onClick={() => setTopTab(p)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${topTab === p ? 'text-black' : 'bg-[#1a1a1a] border border-[#2a2a2a] text-[#666] hover:text-white'}`}
                style={topTab === p ? { backgroundColor: POSITION_COLORS[p] } : {}}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {(topPicks[topTab] ?? []).map((pick, i) => (
              <div key={pick.player_id} className="bg-[#111] border border-[#1e1e1e] rounded-xl p-4 flex gap-3 items-center">
                <span className="text-2xl font-bold text-[#2a2a2a]">#{i+1}</span>
                <PlayerAvatar optaCode={pick.opta_code} webName={pick.web_name} position={pick.position} size={48} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{pick.web_name}</div>
                  <div className="text-sm text-[#666]">{pick.team_short} · {formatCost(pick.now_cost)}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-white font-bold">{formatNum(pick.predicted_points, 1)} <span className="text-[#666] font-normal text-xs">pts</span></span>
                    <ConfidenceBadge confidence={pick.confidence} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
