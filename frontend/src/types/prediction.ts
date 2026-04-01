export interface Prediction {
  player_id: number
  web_name: string
  team_short: string
  position: string
  now_cost: number
  predicted_points: number
  confidence: number
  form: number
  fixture_difficulty: number
  ep_next: number
  opta_code: string
}

export interface BestXIResponse {
  players: (Prediction & { id: number; team_code: number })[]
  total_predicted_points: number
  total_cost: number
  formation: string
}

export interface TopPicksResponse {
  GKP: Prediction[]
  DEF: Prediction[]
  MID: Prediction[]
  FWD: Prediction[]
}

export interface FeatureBreakdown {
  feature: string
  contribution: number
}

export interface PlayerPrediction {
  player_id: number
  predicted_points: number
  confidence: number
  features_breakdown: FeatureBreakdown[]
}
