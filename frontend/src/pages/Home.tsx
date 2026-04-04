import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getFixtures, getStandings } from '../api'
import FixtureCard from '../components/fixtures/FixtureCard'
import TeamCrest from '../components/TeamCrest'
import Skeleton from '../components/Skeleton'
import { TEAM_FULL_NAMES } from '../lib/constants'
import type { Fixture } from '../types'

const TABS = ['Fixtures', 'Results', 'Table'] as const
type Tab = typeof TABS[number]

function groupByGameweek(fixtures: Fixture[]): Record<number, Fixture[]> {
  return fixtures.reduce((acc, f) => {
    const gw = Number(f.gameweek)
    if (!gw || isNaN(gw)) return acc
    if (!acc[gw]) acc[gw] = []
    acc[gw].push(f)
    return acc
  }, {} as Record<number, Fixture[]>)
}

const heroTexture = `
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
`

export default function Home() {
  const [tab, setTab] = useState<Tab>('Fixtures')

  const { data: allFixtures = [], isLoading: loadingFixtures } = useQuery({
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
  const results = fixtureList.filter(f => f.finished)

  const upcomingGrouped = groupByGameweek(upcoming)
  const resultsGrouped = groupByGameweek(results)

  const upcomingGws = Object.keys(upcomingGrouped).map(Number).sort((a, b) => a - b)
  const resultsGws = Object.keys(resultsGrouped).map(Number).sort((a, b) => b - a)

  return (
    <div className="min-h-screen bg-black">
      {/* Hero banner */}
      <div className="relative bg-[#111] overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: heroTexture }} />
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

        {/* Tabs */}
        <div className="relative border-b border-[#2a2a2a]">
          <div className="max-w-screen-xl mx-auto px-6 flex items-end gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors -mb-px flex-shrink-0 ${
                  tab === t
                    ? 'text-white border-white'
                    : 'text-[#888] border-transparent hover:text-[#ccc]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="max-w-screen-xl mx-auto px-6 py-8">

        {/* FIXTURES TAB */}
        {tab === 'Fixtures' && (
          <div>
            <h2 className="text-white text-xl font-bold mb-6">Season schedule</h2>

            {loadingFixtures && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            )}

            {!loadingFixtures && upcomingGws.length === 0 && (
              <p className="text-[#666] text-center py-16">No upcoming fixtures.</p>
            )}

            {!loadingFixtures && upcomingGws.map(gw => (
              <div key={gw} className="mb-10">
                <h3 className="text-white text-base font-semibold mb-4">Matchday {gw}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(upcomingGrouped[gw] ?? []).map(f => (
                    <FixtureCard key={f.id} fixture={f} teamCodes={teamCodes} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RESULTS TAB */}
        {tab === 'Results' && (
          <div>
            <h2 className="text-white text-xl font-bold mb-6">Results of the latest matches</h2>

            {loadingFixtures && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
              </div>
            )}

            {!loadingFixtures && resultsGws.length === 0 && (
              <p className="text-[#666] text-center py-16">No results yet.</p>
            )}

            {!loadingFixtures && resultsGws.map(gw => (
              <div key={gw} className="mb-10">
                <h3 className="text-white text-base font-semibold mb-4">Matchday {gw}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(resultsGrouped[gw] ?? []).map(f => (
                    <FixtureCard key={f.id} fixture={f} teamCodes={teamCodes} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TABLE TAB */}
        {tab === 'Table' && (
          <div>
            <h2 className="text-white text-xl font-bold mb-8">Standings</h2>

            {!standings?.table ? (
              <div className="flex flex-col gap-1">
                {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr>
                      {/* spacer for pos + dot + crest + name */}
                      <th colSpan={3} className="pb-3" />
                      <th className="pb-3 px-4 text-right text-sm text-[#666] font-medium">PL</th>
                      <th className="pb-3 px-4 text-right text-sm text-[#666] font-medium">W</th>
                      <th className="pb-3 px-4 text-right text-sm text-[#666] font-medium">D</th>
                      <th className="pb-3 px-4 text-right text-sm text-[#666] font-medium">L</th>
                      <th className="pb-3 px-4 text-right text-sm text-[#666] font-medium">GD</th>
                      <th className="pb-3 px-4 text-right text-sm text-[#666] font-semibold">PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.table.map(team => (
                      <tr key={team.team_short} className="border-b border-[#111] hover:bg-[#0d0d0d] transition-colors">
                        {/* Position */}
                        <td className="py-4 pl-2 pr-3 text-white text-sm w-8 tabular-nums">
                          {team.position}
                        </td>
                        {/* Follow dot */}
                        <td className="py-4 pr-3 w-5">
                          <div className="w-4 h-4 rounded-full border border-[#444] flex-shrink-0" />
                        </td>
                        {/* Crest + Name */}
                        <td className="py-4 pr-6">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                              <TeamCrest teamCode={team.team_code} teamShort={team.team_short} size={26} />
                            </div>
                            <span className="text-white font-medium text-sm whitespace-nowrap">
                              {TEAM_FULL_NAMES[team.team_short] ?? team.team_short}
                            </span>
                          </div>
                        </td>
                        {/* Stats */}
                        <td className="py-4 px-4 text-right text-[#ccc] text-sm tabular-nums">{team.played}</td>
                        <td className="py-4 px-4 text-right text-[#ccc] text-sm tabular-nums">{team.won}</td>
                        <td className="py-4 px-4 text-right text-[#ccc] text-sm tabular-nums">{team.drawn}</td>
                        <td className="py-4 px-4 text-right text-[#ccc] text-sm tabular-nums">{team.lost}</td>
                        <td className="py-4 px-4 text-right text-[#ccc] text-sm tabular-nums">{team.goal_difference}</td>
                        <td className="py-4 px-4 text-right text-white font-bold text-sm tabular-nums">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
