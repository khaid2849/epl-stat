"""Players router."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, computed_field

from database import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/players", tags=["players"])

FPL_PHOTO_BASE = "https://resources.premierleague.com/premierleague/photos/players/110x140"


class GWHistory(BaseModel):
    gameweek: int
    points: Optional[int] = None
    minutes: Optional[int] = None
    goals_scored: Optional[int] = None
    assists: Optional[int] = None
    clean_sheets: Optional[int] = None
    bonus: Optional[int] = None
    bps: Optional[int] = None
    xg: Optional[float] = None
    xa: Optional[float] = None
    saves: Optional[int] = None
    goals_conceded: Optional[int] = None
    was_home: Optional[int] = None
    opponent_team: Optional[str] = None


class PlayerSummary(BaseModel):
    id: int
    web_name: str
    full_name: Optional[str] = None
    team_short: str
    team_code: Optional[int] = None
    position: str
    opta_code: Optional[str] = None
    status: Optional[str] = "a"
    news: Optional[str] = None
    now_cost_raw: Optional[int] = None
    total_points: Optional[int] = None
    form: Optional[float] = None
    ep_next: Optional[float] = None
    ep_this: Optional[float] = None
    event_points: Optional[int] = None
    selected_by_percent: Optional[float] = None
    ict_index: Optional[float] = None
    minutes: Optional[int] = None
    goals_scored: Optional[int] = None
    assists: Optional[int] = None
    clean_sheets: Optional[int] = None
    saves: Optional[int] = None
    bonus: Optional[int] = None
    bps: Optional[int] = None
    expected_goals: Optional[float] = None
    expected_assists: Optional[float] = None
    expected_goal_involvements: Optional[float] = None
    goals_conceded: Optional[int] = None
    points_per_game: Optional[float] = None
    starts: Optional[int] = None
    transfers_in_event: Optional[int] = None
    transfers_out_event: Optional[int] = None
    chance_of_playing_next_round: Optional[float] = None
    chance_of_playing_this_round: Optional[float] = None
    influence: Optional[float] = None
    creativity: Optional[float] = None
    threat: Optional[float] = None

    @computed_field
    @property
    def now_cost(self) -> Optional[float]:
        return round(self.now_cost_raw / 10, 1) if self.now_cost_raw is not None else None

    @computed_field
    @property
    def photo_url(self) -> Optional[str]:
        if self.opta_code:
            return f"{FPL_PHOTO_BASE}/{self.opta_code}.png"
        return None

    @computed_field
    @property
    def crest_url(self) -> Optional[str]:
        if self.team_code:
            return f"https://resources.premierleague.com/premierleague/badges/t{self.team_code}.png"
        return None

    model_config = {"populate_by_name": True}


class PlayerDetail(PlayerSummary):
    gw_history: list[GWHistory] = []


def _row_to_summary(row) -> PlayerSummary:
    d = dict(row)
    return PlayerSummary(
        id=d["id"],
        web_name=d["web_name"],
        full_name=d.get("full_name"),
        team_short=d["team_short"],
        team_code=d.get("team_code"),
        position=d["position"],
        opta_code=d.get("opta_code"),
        status=d.get("status", "a"),
        news=d.get("news"),
        now_cost_raw=d.get("now_cost"),
        total_points=d.get("total_points"),
        form=d.get("form"),
        ep_next=d.get("ep_next"),
        ep_this=d.get("ep_this"),
        event_points=d.get("event_points"),
        selected_by_percent=d.get("selected_by_percent"),
        ict_index=d.get("ict_index"),
        minutes=d.get("minutes"),
        goals_scored=d.get("goals_scored"),
        assists=d.get("assists"),
        clean_sheets=d.get("clean_sheets"),
        saves=d.get("saves"),
        bonus=d.get("bonus"),
        bps=d.get("bps"),
        expected_goals=d.get("expected_goals"),
        expected_assists=d.get("expected_assists"),
        expected_goal_involvements=d.get("expected_goal_involvements"),
        goals_conceded=d.get("goals_conceded"),
        points_per_game=d.get("points_per_game"),
        starts=d.get("starts"),
        transfers_in_event=d.get("transfers_in_event"),
        transfers_out_event=d.get("transfers_out_event"),
        chance_of_playing_next_round=d.get("chance_of_playing_next_round"),
        chance_of_playing_this_round=d.get("chance_of_playing_this_round"),
        influence=d.get("influence"),
        creativity=d.get("creativity"),
        threat=d.get("threat"),
    )


class PaginationMeta(BaseModel):
    total: int
    page: int
    pages: int
    limit: int


class PaginatedPlayers(BaseModel):
    players: list[PlayerSummary]
    meta: PaginationMeta


@router.get("/search", response_model=list[PlayerSummary])
async def search_players(q: str = Query(..., min_length=2)):
    """Search players by name (web_name or full_name)."""
    conn = get_connection()
    try:
        pattern = f"%{q}%"
        rows = conn.execute(
            """
            SELECT * FROM players
            WHERE status != 'u'
              AND (web_name LIKE ? OR full_name LIKE ?)
            ORDER BY total_points DESC
            LIMIT 20
            """,
            (pattern, pattern),
        ).fetchall()
        return [_row_to_summary(r) for r in rows]
    finally:
        conn.close()


@router.get("", response_model=PaginatedPlayers)
async def list_players(
    position: Optional[str] = Query(None, description="GKP, DEF, MID, FWD"),
    team: Optional[str] = Query(None),
    min_cost: Optional[int] = Query(None, description="Cost in tenths (60 = £6M)"),
    max_cost: Optional[int] = Query(None, description="Cost in tenths (100 = £10M)"),
    min_minutes: Optional[int] = Query(None),
    status: Optional[str] = Query(None, description="a, d, i, s"),
    sort_by: str = Query("total_points", description="Field to sort by"),
    order: str = Query("desc", description="asc or desc"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """List players with filtering, sorting, and pagination."""
    conn = get_connection()
    try:
        conditions = ["status != 'u'"]
        params: list = []

        if position:
            conditions.append("position = ?")
            params.append(position.upper())
        if team:
            conditions.append("team_short = ?")
            params.append(team)
        if min_cost is not None:
            conditions.append("now_cost >= ?")
            params.append(min_cost)
        if max_cost is not None:
            conditions.append("now_cost <= ?")
            params.append(max_cost)
        if min_minutes is not None:
            conditions.append("minutes >= ?")
            params.append(min_minutes)
        if status:
            conditions.append("status = ?")
            params.append(status)

        where = " AND ".join(conditions)

        # Validate sort field to prevent SQL injection
        allowed_sort = {
            "total_points", "form", "points_per_game", "now_cost",
            "ict_index", "expected_goals", "expected_assists",
            "expected_goal_involvements", "minutes", "selected_by_percent",
            "ep_next", "ep_this", "transfers_in_event",
        }
        if sort_by not in allowed_sort:
            sort_by = "total_points"
        order_dir = "DESC" if order.lower() == "desc" else "ASC"

        total_row = conn.execute(
            f"SELECT COUNT(*) FROM players WHERE {where}", params
        ).fetchone()
        total = total_row[0]

        offset = (page - 1) * limit
        rows = conn.execute(
            f"""
            SELECT * FROM players
            WHERE {where}
            ORDER BY {sort_by} {order_dir}
            LIMIT ? OFFSET ?
            """,
            params + [limit, offset],
        ).fetchall()

        import math
        pages = math.ceil(total / limit) if limit else 1
        return PaginatedPlayers(
            players=[_row_to_summary(r) for r in rows],
            meta=PaginationMeta(total=total, page=page, pages=pages, limit=limit),
        )
    finally:
        conn.close()


@router.get("/{player_id}", response_model=PlayerDetail)
async def get_player(player_id: int):
    """Full player detail including GW history."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM players WHERE id = ?", (player_id,)
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Player {player_id} not found")

        summary = _row_to_summary(row)

        history_rows = conn.execute(
            """
            SELECT * FROM player_gw_history
            WHERE player_id = ?
            ORDER BY gameweek
            """,
            (player_id,),
        ).fetchall()

        history = [
            GWHistory(
                gameweek=h["gameweek"],
                points=h["points"],
                minutes=h["minutes"],
                goals_scored=h["goals_scored"],
                assists=h["assists"],
                clean_sheets=h["clean_sheets"],
                bonus=h["bonus"],
                bps=h["bps"],
                xg=h["xg"],
                xa=h["xa"],
                saves=h["saves"],
                goals_conceded=h["goals_conceded"],
                was_home=h["was_home"],
                opponent_team=h["opponent_team"],
            )
            for h in history_rows
        ]

        return PlayerDetail(**summary.model_dump(), gw_history=history)
    finally:
        conn.close()
