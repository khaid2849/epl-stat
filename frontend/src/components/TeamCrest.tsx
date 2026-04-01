import { useState } from 'react'
import { TEAM_CREST } from '../lib/constants'

interface Props { teamCode?: number; teamShort: string; size?: number }

export default function TeamCrest({ teamCode, teamShort, size = 32 }: Props) {
  const [err, setErr] = useState(false)
  const abbr = teamShort.slice(0, 3).toUpperCase()
  if (!teamCode || err) {
    return (
      <div
        className="rounded-full bg-pl-purple flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.3 }}
      >
        {abbr}
      </div>
    )
  }
  return (
    <img
      src={TEAM_CREST(teamCode)}
      width={size}
      height={size}
      onError={() => setErr(true)}
      alt={teamShort}
      className="flex-shrink-0 object-contain"
    />
  )
}
