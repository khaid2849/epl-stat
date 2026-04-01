import { FDR_COLORS } from '../lib/constants'

interface Props { difficulty: number; label?: string; size?: 'sm' | 'md' }

export default function FDRBadge({ difficulty, label, size = 'sm' }: Props) {
  const color = FDR_COLORS[difficulty] ?? '#6B7280'
  const dark = difficulty <= 2
  return (
    <span
      className={`inline-flex items-center gap-1 rounded font-bold ${size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm'}`}
      style={{ backgroundColor: color, color: dark ? '#000' : '#fff' }}
    >
      {label && <span className="truncate max-w-[80px]">{label}</span>}
      <span>{difficulty}</span>
    </span>
  )
}
