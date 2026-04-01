export interface Team {
  team_short: string
  team_code: number
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  goal_difference: number
  points: number
  form: string
  players?: import('./player').Player[]
}

export interface StandingsResponse {
  gameweek: number
  table: Team[]
}
