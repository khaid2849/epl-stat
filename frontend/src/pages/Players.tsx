import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getPlayers, getTeams } from '../api'
import PlayerFilters from '../components/players/PlayerFilters'
import PlayerTable from '../components/players/PlayerTable'
import Skeleton from '../components/Skeleton'

const DEFAULT_FILTERS = { position: 'All', team: '', minCost: '', maxCost: '', minMinutes: '' }

export default function Players() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [page, setPage] = useState(1)

  const params: Record<string, string | number | undefined> = {
    page,
    limit: 50,
    ...(filters.position !== 'All' && { position: filters.position }),
    ...(filters.team && { team: filters.team }),
    ...(filters.minCost && { min_cost: Math.round(parseFloat(filters.minCost) * 10) }),
    ...(filters.maxCost && { max_cost: Math.round(parseFloat(filters.maxCost) * 10) }),
    ...(filters.minMinutes && { min_minutes: parseInt(filters.minMinutes) }),
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['players', params],
    queryFn: () => getPlayers(params),
    placeholderData: (prev) => prev,
  })

  const { data: teamsData } = useQuery({ queryKey: ['teams'], queryFn: getTeams })
  const teamNames = teamsData?.map(t => t.team_short).sort() ?? []

  const reset = useCallback(() => { setFilters(DEFAULT_FILTERS); setPage(1) }, [])
  const handleFiltersChange = (f: typeof filters) => { setFilters(f); setPage(1) }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">Players</h1>
      <PlayerFilters filters={filters} teams={teamNames} onChange={handleFiltersChange} onReset={reset} />
      {isLoading && <div className="space-y-2">{Array.from({length:10}).map((_,i) => <Skeleton key={i} className="h-12" />)}</div>}
      {error && <div className="text-red-400 text-center py-8">Failed to load players. Is the backend running?</div>}
      {data && (
        <>
          <div className="text-sm text-gray-400 mb-3">{data.meta.total} players</div>
          <PlayerTable players={data.players} />
          {data.meta.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-4 py-2 bg-navy-light border border-navy-border text-white rounded disabled:opacity-40 hover:bg-navy transition-colors text-sm"
              >← Prev</button>
              <span className="text-gray-400 text-sm">Page {page} of {data.meta.pages}</span>
              <button
                disabled={page >= data.meta.pages}
                onClick={() => setPage(p => p + 1)}
                className="px-4 py-2 bg-navy-light border border-navy-border text-white rounded disabled:opacity-40 hover:bg-navy transition-colors text-sm"
              >Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
