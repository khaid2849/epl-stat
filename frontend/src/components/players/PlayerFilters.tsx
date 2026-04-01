interface Filters {
  position: string
  team: string
  minCost: string
  maxCost: string
  minMinutes: string
}
interface Props {
  filters: Filters
  teams: string[]
  onChange: (f: Filters) => void
  onReset: () => void
}
const positions = ['All', 'GKP', 'DEF', 'MID', 'FWD']
const POSITION_COLORS: Record<string, string> = { GKP: '#EAB308', DEF: '#22C55E', MID: '#3B82F6', FWD: '#EF4444' }

export default function PlayerFilters({ filters, teams, onChange, onReset }: Props) {
  const set = (k: keyof Filters) => (v: string) => onChange({ ...filters, [k]: v })
  return (
    <div className="bg-navy-light border border-navy-border rounded-lg p-4 mb-4">
      {/* Position tabs */}
      <div className="flex gap-2 flex-wrap mb-3">
        {positions.map(pos => (
          <button
            key={pos}
            onClick={() => set('position')(pos)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filters.position === pos ? 'text-black' : 'bg-navy border border-navy-border text-gray-400 hover:text-white'}`}
            style={filters.position === pos ? { backgroundColor: pos === 'All' ? '#FFD700' : POSITION_COLORS[pos] } : {}}
          >
            {pos}
          </button>
        ))}
      </div>
      {/* Other filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Team</label>
          <select
            value={filters.team}
            onChange={e => set('team')(e.target.value)}
            className="bg-navy border border-navy-border text-white rounded px-2 py-1.5 text-sm focus:outline-none"
          >
            <option value="">All Teams</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Min Price (£m)</label>
          <input
            type="number" min="4" max="15" step="0.5" value={filters.minCost}
            onChange={e => set('minCost')(e.target.value)}
            className="bg-navy border border-navy-border text-white rounded px-2 py-1.5 text-sm w-20 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Max Price (£m)</label>
          <input
            type="number" min="4" max="20" step="0.5" value={filters.maxCost}
            onChange={e => set('maxCost')(e.target.value)}
            className="bg-navy border border-navy-border text-white rounded px-2 py-1.5 text-sm w-20 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Min Minutes</label>
          <input
            type="number" min="0" step="90" value={filters.minMinutes}
            onChange={e => set('minMinutes')(e.target.value)}
            className="bg-navy border border-navy-border text-white rounded px-2 py-1.5 text-sm w-24 focus:outline-none"
          />
        </div>
        <button
          onClick={onReset}
          className="px-3 py-1.5 bg-navy border border-navy-border text-gray-400 hover:text-white rounded text-sm transition-colors"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
