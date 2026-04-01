"""Teams router — standings and team detail."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from database import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/teams", tags=["teams"])


class TeamStanding(BaseModel):
    team_short: str
    gameweek: int
    position: int = 0
    team_code: Optional[int] = None
    played: Optional[int] = None
    won: Optional[int] = None
    drawn: Optional[int] = None
    lost: Optional[int] = None
    goals_for: Optional[int] = None
    goals_against: Optional[int] = None
    goal_difference: Optional[int] = None
    points: Optional[int] = None
    form: Optional[str] = None
    crest_url: Optional[str] = None


class StandingsResponse(BaseModel):
    gameweek: int
    table: list[TeamStanding]


class TeamDetail(BaseModel):
    team_short: str
    latest_standing: Optional[TeamStanding] = None
    history: list[TeamStanding] = []
    player_count: int = 0


def _build_crest_url(team_code: Optional[int]) -> Optional[str]:
    if team_code is None:
        return None
    return f"https://resources.premierleague.com/premierleague/badges/t{team_code}.png"


def _row_to_standing(row, team_code: Optional[int] = None, position: int = 0) -> TeamStanding:
    return TeamStanding(
        team_short=row["team_short"],
        gameweek=row["gameweek"],
        position=position,
        team_code=team_code,
        played=row["played"],
        won=row["won"],
        drawn=row["drawn"],
        lost=row["lost"],
        goals_for=row["goals_for"],
        goals_against=row["goals_against"],
        goal_difference=row["goal_difference"],
        points=row["points"],
        form=row["form"],
        crest_url=_build_crest_url(team_code),
    )


def _get_team_code_map(conn) -> dict[str, int]:
    rows = conn.execute(
        "SELECT DISTINCT team_short, team_code FROM players WHERE team_code IS NOT NULL"
    ).fetchall()
    return {r["team_short"]: r["team_code"] for r in rows}


@router.get("", response_model=list[TeamStanding])
async def get_all_teams():
    """Return all 20 teams with their latest standings."""
    conn = get_connection()
    try:
        code_map = _get_team_code_map(conn)

        rows = conn.execute(
            """
            SELECT t1.*
            FROM team_gw_stats t1
            INNER JOIN (
                SELECT team_short, MAX(gameweek) as max_gw
                FROM team_gw_stats
                GROUP BY team_short
            ) t2 ON t1.team_short = t2.team_short AND t1.gameweek = t2.max_gw
            ORDER BY t1.points DESC, t1.goal_difference DESC
            """
        ).fetchall()

        return [
            _row_to_standing(r, code_map.get(r["team_short"]), position=i + 1)
            for i, r in enumerate(rows)
        ]
    finally:
        conn.close()


@router.get("/history", response_model=list[int])
async def get_available_gameweeks():
    """Return list of available gameweek numbers (from CSV data)."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT DISTINCT gameweek FROM team_gw_stats ORDER BY gameweek"
        ).fetchall()
        return [r["gameweek"] for r in rows]
    finally:
        conn.close()


@router.get("/{team_short}", response_model=TeamDetail)
async def get_team_detail(team_short: str):
    """Return team detail including full historical standings."""
    conn = get_connection()
    try:
        code_map = _get_team_code_map(conn)

        rows = conn.execute(
            "SELECT * FROM team_gw_stats WHERE team_short = ? ORDER BY gameweek",
            (team_short,),
        ).fetchall()

        if not rows:
            raise HTTPException(status_code=404, detail=f"Team '{team_short}' not found")

        team_code = code_map.get(team_short)
        history = [_row_to_standing(r, team_code) for r in rows]
        latest = history[-1] if history else None

        player_count = conn.execute(
            "SELECT COUNT(*) FROM players WHERE team_short = ? AND status != 'u'",
            (team_short,),
        ).fetchone()[0]

        return TeamDetail(
            team_short=team_short,
            latest_standing=latest,
            history=history,
            player_count=player_count,
        )
    finally:
        conn.close()


# ─── Standings router (separate prefix) ───────────────────────────────────────

standings_router = APIRouter(prefix="/standings", tags=["standings"])


@standings_router.get("", response_model=StandingsResponse)
async def get_standings():
    """Current Premier League standings (latest scraped data)."""
    conn = get_connection()
    try:
        code_map = _get_team_code_map(conn)

        gw_row = conn.execute("SELECT MAX(gameweek) as gw FROM team_gw_stats").fetchone()
        gw = gw_row["gw"] if gw_row and gw_row["gw"] else 0

        rows = conn.execute(
            """
            SELECT * FROM team_gw_stats WHERE gameweek = ?
            ORDER BY points DESC, goal_difference DESC
            """,
            (gw,),
        ).fetchall()

        if not rows:
            raise HTTPException(status_code=404, detail="No standings data available yet.")

        table = [
            _row_to_standing(r, code_map.get(r["team_short"]), position=i + 1)
            for i, r in enumerate(rows)
        ]
        return StandingsResponse(gameweek=gw, table=table)
    finally:
        conn.close()
