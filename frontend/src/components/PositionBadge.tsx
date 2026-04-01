import { POSITION_COLORS } from '../lib/constants'

export default function PositionBadge({ position }: { position: string }) {
  const color = POSITION_COLORS[position] ?? '#6B7280'
  return (
    <span
      className="px-1.5 py-0.5 rounded text-xs font-bold text-black"
      style={{ backgroundColor: color }}
    >
      {position}
    </span>
  )
}
