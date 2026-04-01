import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStandings, getStandingsHistory } from '../api'
import StandingsTable from '../components/standings/StandingsTable'
import GameweekSelector from '../components/fixtures/GameweekSelector'
import Skeleton from '../components/Skeleton'

export default function Standings() {
  const { data: history = [] } = useQuery({ queryKey: ['standings-history'], queryFn: getStandingsHistory })
  const [gw, setGw] = useState<number | undefined>(undefined)
  const selectedGw = gw ?? (history.length > 0 ? history[history.length - 1] : undefined)
  const { data, isLoading, error } = useQuery({
    queryKey: ['standings', selectedGw],
    queryFn: () => getStandings(selectedGw),
    enabled: true
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">League Standings</h1>
        {history.length > 0 && selectedGw && (
          <GameweekSelector gws={history} selected={selectedGw} onChange={setGw} />
        )}
      </div>
      {/* Zone legend */}
      <div className="flex gap-4 mb-4 text-xs text-gray-400 flex-wrap">
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500" /> Champions League</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500" /> Europa League</div>
        <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-600" /> Relegation</div>
      </div>
      {isLoading && <div className="space-y-2">{Array.from({length:20}).map((_,i) => <Skeleton key={i} className="h-12" />)}</div>}
      {error && <div className="text-red-400 text-center py-8">Failed to load standings. Is the backend running?</div>}
      {data && <StandingsTable table={data.table} />}
    </div>
  )
}
