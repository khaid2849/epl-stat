interface Props { gws: number[]; selected: number; onChange: (gw: number) => void }
export default function GameweekSelector({ gws, selected, onChange }: Props) {
  return (
    <select
      value={selected}
      onChange={e => onChange(Number(e.target.value))}
      className="bg-navy-light border border-navy-border text-white rounded px-3 py-1.5 text-sm focus:outline-none focus:border-pl-purple"
    >
      {gws.map(gw => <option key={gw} value={gw}>Gameweek {gw}</option>)}
    </select>
  )
}
