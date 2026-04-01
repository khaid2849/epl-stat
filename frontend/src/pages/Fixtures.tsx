import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getFixtures, getStandings } from '../api'
import FixtureCard from '../components/fixtures/FixtureCard'
import Skeleton from '../components/Skeleton'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const TABS = ['Fixtures', 'Results'] as const
type Tab = typeof TABS[number]

export default function Fixtures() {
  const [gw, setGw] = useState<number>(31)
  const [tab, setTab] = useState<Tab>('Fixtures')

  const { data: fixtures = [], isLoading, error } = useQuery({
    queryKey: ['fixtures', gw],
    queryFn: () => getFixtures(gw),
  })

  const { data: standings } = useQuery({ queryKey: ['standings'], queryFn: () => getStandings() })
  const teamCodes = Object.fromEntries(standings?.table?.map(t => [t.team_short, t.team_code]) ?? [])

  const upcoming = fixtures.filter(f => !f.finished)
  const results = fixtures.filter(f => f.finished)
  const list = tab === 'Fixtures' ? upcoming : results

  return (
    <div>
      {/* Hero banner */}
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
        {/* Matchday navigator */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setGw(g => Math.max(1, g - 1))}
            disabled={gw <= 1}
            className="p-1.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#999] hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-white text-sm font-semibold min-w-[90px] text-center">Matchday {gw}</span>
          <button
            onClick={() => setGw(g => Math.min(38, g + 1))}
            disabled={gw >= 38}
            className="p-1.5 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#999] hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {isLoading && (
          <div className="grid md:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        )}
        {error && <div className="text-[#ef4444] text-center py-8">Failed to load fixtures.</div>}

        {!isLoading && !error && (
          list.length === 0 ? (
            <p className="text-[#666] text-center py-12">No {tab.toLowerCase()} for Matchday {gw}.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-3">
              {list.map(f => <FixtureCard key={f.id} fixture={f} teamCodes={teamCodes} />)}
            </div>
          )
        )}
      </div>
    </div>
  )
}
