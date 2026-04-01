export interface Fixture {
  id: number
  gameweek: number
  kickoff_time: string | null
  home_team_short: string
  away_team_short: string
  home_score: number | null
  away_score: number | null
  home_difficulty: number
  away_difficulty: number
  finished: boolean
}
