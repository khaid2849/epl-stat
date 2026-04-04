export const FDR_COLORS: Record<number, string> = { 1: '#00FF85', 2: '#A3E635', 3: '#6B7280', 4: '#FF7043', 5: '#FF1744' }
export const FORM_COLORS: Record<string, string> = { W: '#22c55e', D: '#eab308', L: '#ef4444' }
export const POSITION_COLORS: Record<string, string> = { GKP: '#EAB308', DEF: '#22C55E', MID: '#3B82F6', FWD: '#EF4444' }
export const POSITIONS = ['All', 'GKP', 'DEF', 'MID', 'FWD'] as const
export const PLAYER_PHOTO_URL = (code: string) => `https://resources.premierleague.com/premierleague/photos/players/110x140/${code}.png`
export const TEAM_CREST_URL = (code: number) => `https://resources.premierleague.com/premierleague/badges/t${code}.png`
export const PLAYER_PHOTO = (code: string) => `https://resources.premierleague.com/premierleague/photos/players/110x140/${code}.png`
export const TEAM_CREST = (code: number) => `https://resources.premierleague.com/premierleague/badges/t${code}.png`

export const TEAM_FULL_NAMES: Record<string, string> = {
  ARS: 'Arsenal',
  AVL: 'Aston Villa',
  BOU: 'AFC Bournemouth',
  BRE: 'Brentford',
  BHA: 'Brighton & Hove Albion',
  BUR: 'Burnley',
  CHE: 'Chelsea',
  CRY: 'Crystal Palace',
  EVE: 'Everton',
  FUL: 'Fulham',
  IPS: 'Ipswich Town',
  LEE: 'Leeds United',
  LEI: 'Leicester City',
  LIV: 'Liverpool FC',
  MCI: 'Manchester City',
  MUN: 'Manchester United',
  NEW: 'Newcastle United',
  NFO: 'Nottingham Forest',
  SOU: 'Southampton',
  SUN: 'Sunderland',
  TOT: 'Tottenham Hotspur',
  WHU: 'West Ham United',
  WOL: 'Wolverhampton Wanderers',
}