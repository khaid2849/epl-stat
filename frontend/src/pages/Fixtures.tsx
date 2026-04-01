import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getFixtures, getStandings } from '../api'
import FixtureCard from '../components/fixtures/FixtureCard'
import GameweekSelector from '../components/fixtures/GameweekSelector'
import Skeleton from '../components/Skeleton'

export default function Fixtures() {
  const [gw, setGw] = useState<number>(27)
  const gws = Array.from({ length: 38 }, (_, i) => i + 1)
  const { data: fixtures = [], isLoading, error } = useQuery({
    queryKey: ['fixtures', gw],
    queryFn: () => getFixtures(gw)
  })
  const { data: standings } = useQuery({ queryKey: ['standings'], queryFn: () => getStandings() })
  const teamCodes = Object.fromEntries(standings?.table?.map(t => [t.team_short, t.team_code]) ?? [])

  const grouped = fixtures.reduce<Record<string, typeof fixtures>>((acc, f) => {
    const date = f.kickoff_time ? new Date(f.kickoff_time).toDateString() : 'TBC'
    ;(acc[date] = acc[date] ?? []).push(f)
    return acc
  }, {})

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white">Fixtures</h1>
        <GameweekSelector gws={gws} selected={gw} onChange={setGw} />
      </div>
      {isLoading && <div className="grid md:grid-cols-2 gap-3">{Array.from({length:5}).map((_,i) => <Skeleton key={i} className="h-24" />)}</div>}
      {error && <div className="text-red-400 text-center py-8">Failed to load fixtures.</div>}
      {Object.entries(grouped).map(([date, fxs]) => (
        <div key={date} className="mb-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">{date}</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {fxs.map(f => <FixtureCard key={f.id} fixture={f} teamCodes={teamCodes} />)}
          </div>
        </div>
      ))}
      {!isLoading && fixtures.length === 0 && (
        <div className="text-gray-400 text-center py-12">No fixtures for Gameweek {gw}</div>
      )}
    </div>
  )
}
