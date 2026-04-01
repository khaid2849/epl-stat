export interface Player {
  id: number
  web_name: string
  full_name: string
  team_short: string
  team_code: number
  position: string
  opta_code: string
  status: string
  news: string
  now_cost: number
  total_points: number
  form: number
  ep_next: number
  selected_by_percent: number
  ict_index: number
  minutes: number
  goals_scored: number
  assists: number
  clean_sheets: number
  saves: number
  bonus: number
  expected_goals: number
  expected_assists: number
  points_per_game: number
  starts: number
  transfers_in_event: number
  transfers_out_event: number
  chance_of_playing_next_round: number
  gw_history?: GWHistory[]
}

export interface GWHistory {
  gameweek: number
  points: number
  minutes: number
  goals_scored: number
  assists: number
  clean_sheets: number
  bonus: number
  xg: number
  xa: number
  saves: number
  was_home: boolean
  opponent_team: string
}

export interface PlayerMeta {
  total: number
  page: number
  pages: number
  limit: number
}

export interface PlayersResponse {
  players: Player[]
  meta: PlayerMeta
}
