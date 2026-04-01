import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getStandings, getCurrentFixtures } from '../api'
import StandingsTable from '../components/standings/StandingsTable'
import FixtureCard from '../components/fixtures/FixtureCard'
import Skeleton from '../components/Skeleton'

const TABS = ['Fixtures', 'Results', 'Table'] as const
type Tab = typeof TABS[number]

export default function Standings() {
  const [tab, setTab] = useState<Tab>('Table')

  const { data, isLoading, error } = useQuery({
    queryKey: ['standings'],
    queryFn: getStandings,
  })

  const { data: fixtures = [], isLoading: loadingFixtures } = useQuery({
    queryKey: ['fixtures-current'],
    queryFn: getCurrentFixtures,
    enabled: tab === 'Fixtures' || tab === 'Results',
  })

  const upcoming = fixtures.filter(f => !f.finished)
  const results = fixtures.filter(f => f.finished)
  const teamCodes = Object.fromEntries(data?.table?.map(t => [t.team_short, t.team_code]) ?? [])

  return (
    <div>
      {/* Competition hero banner */}
      <div className="relative bg-[#111] overflow-hidden">
        <div className="absolute inset-0 bg-hero-texture pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 pt-8 pb-0 flex items-center gap-5">
          <div className="w-14 h-14 rounded-full bg-[#37003C] flex items-center justify-center flex-shrink-0 shadow-lg">
            <span className="text-white font-black text-sm">PL</span>
          </div>
          <div>
            <p className="text-[#666] text-xs font-medium uppercase tracking-widest mb-0.5">Competition</p>
            <h1 className="text-white text-2xl md:text-3xl font-black tracking-tight">PREMIER LEAGUE</h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative max-w-7xl mx-auto px-4 mt-6">
          <div className="flex border-b border-[#2a2a2a]">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                  tab === t
                    ? 'text-white border-white'
                    : 'text-[#666] border-transparent hover:text-[#aaa]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">

        {/* TABLE TAB */}
        {tab === 'Table' && (
          <>
            {isLoading && (
              <div className="space-y-1">
                {Array.from({ length: 20 }).map((_, i) => <Skeleton key={i} className="h-11" />)}
              </div>
            )}
            {error && (
              <p className="text-[#ef4444] text-center py-12">
                Failed to load standings. Is the backend running?
              </p>
            )}
            {data && (
              <>
                <p className="text-[#666] text-xs mb-4">Matchday {data.gameweek}</p>
                <StandingsTable table={data.table} />
              </>
            )}
          </>
        )}

        {/* FIXTURES / RESULTS TABS */}
        {(tab === 'Fixtures' || tab === 'Results') && (
          <>
            {loadingFixtures && (
              <div className="grid md:grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            )}
            {!loadingFixtures && (() => {
              const list = tab === 'Fixtures' ? upcoming : results
              return list.length === 0 ? (
                <p className="text-[#666] text-center py-12">No {tab.toLowerCase()} available.</p>
              ) : (
                <>
                  {data?.gameweek && (
                    <p className="text-[#666] text-sm font-semibold mb-4">Matchday {data.gameweek}</p>
                  )}
                  <div className="grid md:grid-cols-3 gap-3">
                    {list.map(f => (
                      <FixtureCard key={f.id} fixture={f} teamCodes={teamCodes} />
                    ))}
                  </div>
                </>
              )
            })()}
          </>
        )}
      </div>
    </div>
  )
}
