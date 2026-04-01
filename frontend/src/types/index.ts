export interface Player {
  id: number; web_name: string; full_name: string; team_short: string; team_code: number
  position: string; opta_code: string; status: string; news: string
  now_cost: number; total_points: number; form: number; ep_next: number
  selected_by_percent: number; ict_index: number; minutes: number
  goals_scored: number; assists: number; clean_sheets: number; saves: number
  bonus: number; expected_goals: number; expected_assists: number
  points_per_game: number; starts: number; transfers_in_event: number
  transfers_out_event: number; chance_of_playing_next_round: number
  gw_history?: GWHistory[]
}
export interface GWHistory {
  gameweek: number; points: number; minutes: number; goals_scored: number
  assists: number; clean_sheets: number; bonus: number; xg: number; xa: number
  saves: number; was_home: boolean; opponent_team: string
}
export interface PlayersResponse { players: Player[]; meta: { total: number; page: number; pages: number; limit: number } }
export interface Team {
  team_short: string; team_code: number; position: number; played: number
  won: number; drawn: number; lost: number; goals_for: number; goals_against: number
  goal_difference: number; points: number; form: string; players?: Player[]
}
export interface StandingsResponse { gameweek: number; table: Team[] }
export interface Fixture {
  id: number; gameweek: number; kickoff_time: string | null
  home_team_short: string; away_team_short: string
  home_score: number | null; away_score: number | null
  home_difficulty: number; away_difficulty: number; finished: boolean
}
export interface Prediction {
  player_id: number; web_name: string; team_short: string; position: string
  now_cost: number; predicted_points: number; confidence: number
  form: number; fixture_difficulty: number; ep_next: number; opta_code: string
}
export interface BestXIResponse {
  players: (Prediction & { id: number; team_code: number })[]
  total_predicted_points: number; total_cost: number; formation: string
}
export interface TopPicksResponse { GKP: Prediction[]; DEF: Prediction[]; MID: Prediction[]; FWD: Prediction[] }
export interface PlayerPrediction {
  player_id: number; predicted_points: number; confidence: number
  features_breakdown: Array<{ feature: string; contribution: number }>
}
