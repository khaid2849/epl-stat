import { useState } from 'react'

// Maps any known team identifier (3-letter code OR FPL short name) → SVG filename
const TEAM_TO_SVG: Record<string, string> = {
  // 3-letter codes (used in fixtures)
  ARS: 'ARS', AVL: 'AVL', BHA: 'BHA', BOU: 'BOU', BRE: 'BRE',
  BUR: 'BUR', CHE: 'CHE', CRY: 'CRY', EVE: 'EVE', FUL: 'FUL',
  LEE: 'LEE', LEI: 'LEI', LIV: 'LIV', MCI: 'MCI', MUN: 'MUN',
  NEW: 'NEW', NFO: 'NFO', SOU: 'SOU', SUN: 'SUN', TOT: 'TOT',
  WHU: 'WHU', WOL: 'WOL',
  // FPL short names (used in players table)
  Arsenal:        'ARS',
  'Aston Villa':  'AVL',
  Brighton:       'BHA',
  Bournemouth:    'BOU',
  Brentford:      'BRE',
  Burnley:        'BUR',
  Chelsea:        'CHE',
  'Crystal Palace': 'CRY',
  Everton:        'EVE',
  Fulham:         'FUL',
  Leeds:          'LEE',
  Leicester:      'LEI',
  Liverpool:      'LIV',
  'Man City':     'MCI',
  'Man Utd':      'MUN',
  Newcastle:      'NEW',
  "Nott'm Forest": 'NFO',
  Southampton:    'SOU',
  Sunderland:     'SUN',
  Spurs:          'TOT',
  'West Ham':     'WHU',
  Wolves:         'WOL',
}

interface Props { teamShort: string; size?: number; teamCode?: number }

export default function TeamCrest({ teamShort, size = 32 }: Props) {
  const [err, setErr] = useState(false)
  const svgCode = TEAM_TO_SVG[teamShort] ?? teamShort.slice(0, 3).toUpperCase()

  if (err) {
    return (
      <div
        className="rounded-full bg-pl-purple flex items-center justify-center text-white font-bold flex-shrink-0"
        style={{ width: size, height: size, fontSize: size * 0.3 }}
      >
        {svgCode.slice(0, 3)}
      </div>
    )
  }

  return (
    <img
      src={`/logos/teams/${svgCode}.svg`}
      width={size}
      height={size}
      onError={() => setErr(true)}
      alt={teamShort}
      className="flex-shrink-0 object-contain"
    />
  )
}
