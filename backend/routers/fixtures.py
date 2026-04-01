"""Fixtures router."""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from database import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/fixtures", tags=["fixtures"])


class Fixture(BaseModel):
    id: int
    gameweek: Optional[int] = None
    kickoff_time: Optional[str] = None
    home_team_short: Optional[str] = None
    away_team_short: Optional[str] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    home_difficulty: Optional[int] = None
    away_difficulty: Optional[int] = None
    finished: int = 0


def _row_to_fixture(row) -> Fixture:
    return Fixture(
        id=row["id"],
        gameweek=row["gameweek"],
        kickoff_time=row["kickoff_time"],
        home_team_short=row["home_team_short"],
        away_team_short=row["away_team_short"],
        home_score=row["home_score"],
        away_score=row["away_score"],
        home_difficulty=row["home_difficulty"],
        away_difficulty=row["away_difficulty"],
        finished=row["finished"] or 0,
    )


@router.get("", response_model=list[Fixture])
async def get_fixtures(gw: Optional[int] = Query(None, description="Gameweek number")):
    """Get fixtures, optionally filtered by gameweek."""
    conn = get_connection()
    try:
        if gw is not None:
            rows = conn.execute(
                "SELECT * FROM fixtures WHERE gameweek = ? ORDER BY kickoff_time",
                (gw,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM fixtures ORDER BY gameweek, kickoff_time"
            ).fetchall()

        return [_row_to_fixture(r) for r in rows]
    finally:
        conn.close()


@router.get("/current", response_model=list[Fixture])
async def get_current_fixtures():
    """Get fixtures for the current or next upcoming gameweek."""
    conn = get_connection()
    try:
        # Next unfinished GW
        row = conn.execute(
            """
            SELECT MIN(gameweek) as gw FROM fixtures
            WHERE finished = 0 AND gameweek IS NOT NULL
            """
        ).fetchone()

        if row and row["gw"]:
            gw = row["gw"]
        else:
            # Fall back to latest known GW
            gw_row = conn.execute("SELECT MAX(gameweek) as gw FROM fixtures").fetchone()
            gw = gw_row["gw"] if gw_row else None

        if gw is None:
            return []

        rows = conn.execute(
            "SELECT * FROM fixtures WHERE gameweek = ? ORDER BY kickoff_time",
            (gw,),
        ).fetchall()

        return [_row_to_fixture(r) for r in rows]
    finally:
        conn.close()
