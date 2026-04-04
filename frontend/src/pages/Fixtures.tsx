import { useQuery } from '@tanstack/react-query'
import { getFixtures, getStandings } from '../api'
import FixtureCard from '../components/fixtures/FixtureCard'
import Skeleton from '../components/Skeleton'
import type { Fixture } from '../types'

function groupByGameweek(fixtures: Fixture[]): Record<number, Fixture[]> {
  return fixtures.reduce((acc, f) => {
    const gw = Number(f.gameweek)
    if (!gw || isNaN(gw)) return acc
    if (!acc[gw]) acc[gw] = []
    acc[gw].push(f)
    return acc
  }, {} as Record<number, Fixture[]>)
}

export default function Fixtures() {
  const { data: allFixtures = [], isLoading } = useQuery({
    queryKey: ['fixtures-all'],
    queryFn: () => getFixtures(),
  })

  const { data: standings } = useQuery({
    queryKey: ['standings'],
    queryFn: () => getStandings(),
  })

  const teamCodes = Object.fromEntries(standings?.table?.map(t => [t.team_short, t.team_code]) ?? [])

  const fixtureList = Array.isArray(allFixtures) ? allFixtures : []
  const upcoming = fixtureList.filter(f => !f.finished)
  const grouped = groupByGameweek(upcoming)
  const sortedGws = Object.keys(grouped).map(Number).sort((a, b) => a - b)

  return (
    <div className="min-h-screen bg-black">
      {/* Hero banner */}
      <div className="relative bg-[#111] overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              repeating-linear-gradient(
                -45deg,
                transparent,
                transparent 60px,
                rgba(255,255,255,0.018) 60px,
                rgba(255,255,255,0.018) 61px
              ),
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 60px,
                rgba(255,255,255,0.012) 60px,
                rgba(255,255,255,0.012) 61px
              )
            `,
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{ background: 'linear-gradient(135deg, transparent 30%, rgba(30,30,30,0.8) 70%)' }}
        />

        {/* PL logo + title */}
        <div className="relative max-w-screen-xl mx-auto px-6 pb-8 pt-6 flex items-center gap-6">
          <img
            src="/logos/epl_icon.png"
            alt="Premier League"
            className="w-20 h-20 md:w-24 md:h-24 object-contain flex-shrink-0"
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
          <h1 className="text-white font-black text-4xl md:text-6xl tracking-tight uppercase">
            Premier League
          </h1>
        </div>

        {/* Tab strip */}
        <div className="relative border-b border-[#2a2a2a]">
          <div className="max-w-screen-xl mx-auto px-6 flex items-end gap-1 overflow-x-auto">
            {['Fixtures', 'Results', 'Table'].map(t => (
              <div
                key={t}
                className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px flex-shrink-0 ${
                  t === 'Fixtures'
                    ? 'text-white border-white'
                    : 'text-[#888] border-transparent'
                }`}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-screen-xl mx-auto px-6 py-8">
        <h2 className="text-white text-xl font-bold mb-6">Season schedule</h2>

        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
          </div>
        )}

        {!isLoading && sortedGws.length === 0 && (
          <p className="text-[#666] text-center py-16">No upcoming fixtures.</p>
        )}

        {!isLoading && sortedGws.map(gw => (
          <div key={gw} className="mb-10">
            <h3 className="text-white text-base font-semibold mb-4">Matchday {gw}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(grouped[gw] ?? []).map(f => (
                <FixtureCard key={f.id} fixture={f} teamCodes={teamCodes} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
