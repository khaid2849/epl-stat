import api from './client'
import type { Team, StandingsResponse } from '../types/team'
export const fetchTeams = () => api.get<Team[]>('/teams').then(r => r.data)
export const fetchTeam = (teamShort: string) => api.get<Team>(`/teams/${encodeURIComponent(teamShort)}`).then(r => r.data)
export const fetchStandings = (gw?: number) => api.get<StandingsResponse>('/standings', { params: gw ? { gw } : {} }).then(r => r.data)
export const fetchStandingsHistory = () => api.get<number[]>('/standings/history').then(r => r.data)
