import { useState } from 'react'
import { PLAYER_PHOTO, POSITION_COLORS } from '../lib/constants'

interface Props { optaCode?: string; webName: string; position?: string; size?: number }

export default function PlayerAvatar({ optaCode, webName, position = 'MID', size = 40 }: Props) {
  const [err, setErr] = useState(false)
  const initials = webName.slice(0, 2).toUpperCase()
  const bg = POSITION_COLORS[position] ?? '#6B7280'
  if (!optaCode || err) {
    return (
      <div
        className="rounded-full flex items-center justify-center font-bold text-black flex-shrink-0"
        style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.35 }}
      >
        {initials}
      </div>
    )
  }
  return (
    <img
      src={PLAYER_PHOTO(optaCode)}
      width={size}
      height={size}
      onError={() => setErr(true)}
      alt={webName}
      className="rounded-full flex-shrink-0 object-cover bg-navy-light"
    />
  )
}
