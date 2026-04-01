import axios from 'axios'
import type {
  PlayersResponse, Player, Team, StandingsResponse,
  Fixture, Prediction, BestXIResponse, TopPicksResponse, PlayerPrediction
} from '../types'

const api = axios.create({ baseURL: '/api', timeout: 15000 })

export const getTeams = () => api.get<Team[]>('/teams').then(r => r.data)
export const getTeam = (s: string) => api.get<Team>(`/teams/${encodeURIComponent(s)}`).then(r => r.data)
export const getStandings = () => api.get<StandingsResponse>('/standings').then(r => r.data)
export const getPlayers = (params: Record<string, string | number | undefined>) =>
  api.get<PlayersResponse>('/players', { params }).then(r => r.data)
export const getPlayer = (id: number) => api.get<Player>(`/players/${id}`).then(r => r.data)
export const searchPlayers = (q: string) =>
  api.get<PlayersResponse>('/players/search', { params: { q } }).then(r => r.data)
export const getFixtures = (gw?: number) =>
  api.get<Fixture[]>('/fixtures', { params: gw ? { gw } : {} }).then(r => r.data)
export const getCurrentFixtures = () => api.get<Fixture[]>('/fixtures/current').then(r => r.data)
export const getPredictions = (params?: Record<string, string | number | undefined>) =>
  api.get<Prediction[]>('/predictions/next-gw', { params }).then(r => r.data)
export const getPlayerPrediction = (id: number) =>
  api.get<PlayerPrediction>(`/predictions/player/${id}`).then(r => r.data)
export const getTopPicks = () => api.get<TopPicksResponse>('/predictions/top-picks').then(r => r.data)
export const getBestXI = (budget = 1000, formation = '4-3-3') =>
  api.get<BestXIResponse>('/predictions/best-xi', { params: { budget, formation } }).then(r => r.data)
