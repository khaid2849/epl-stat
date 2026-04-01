"""Predictions router."""

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel

from database import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/predictions", tags=["predictions"])


class PlayerPrediction(BaseModel):
    player_id: int
    web_name: str
    team_short: str
    position: str
    now_cost: Optional[float] = None
    status: Optional[str] = None
    gameweek: int
    predicted_points: float
    confidence: float
    model_version: Optional[str] = None
    photo_url: Optional[str] = None


class PlayerPredictionDetail(PlayerPrediction):
    feature_breakdown: list[dict] = []


class BestXI(BaseModel):
    formation: str
    total_predicted_points: float
    total_cost: float
    players: list[PlayerPrediction]


class TransferSuggestion(BaseModel):
    transfer_out: PlayerPrediction
    transfer_in: PlayerPrediction
    points_gain: float


def _get_next_gw(conn) -> int:
    row = conn.execute(
        "SELECT MIN(gameweek) as gw FROM fixtures WHERE finished = 0 AND gameweek IS NOT NULL"
    ).fetchone()
    if row and row["gw"]:
        return row["gw"]
    row2 = conn.execute("SELECT MAX(gameweek) as gw FROM team_gw_stats").fetchone()
    return (row2["gw"] or 26) + 1


def _enrich_prediction(pred_row, player_row) -> PlayerPrediction:
    now_cost_raw = player_row.get("now_cost") or player_row["now_cost"] if "now_cost" in player_row.keys() else None
    now_cost = round(now_cost_raw / 10, 1) if now_cost_raw else None

    opta_code = player_row["opta_code"] if "opta_code" in player_row.keys() else None
    photo_url = f"https://resources.premierleague.com/premierleague/photos/players/110x140/{opta_code}.png" if opta_code else None

    return PlayerPrediction(
        player_id=player_row["id"],
        web_name=player_row["web_name"],
        team_short=player_row["team_short"],
        position=player_row["position"],
        now_cost=now_cost,
        status=player_row["status"] if "status" in player_row.keys() else None,
        gameweek=pred_row["gameweek"],
        predicted_points=pred_row["predicted_points"],
        confidence=pred_row["confidence"] or 0.0,
        model_version=pred_row["model_version"],
        photo_url=photo_url,
    )


@router.get("/next-gw", response_model=list[PlayerPrediction])
async def get_next_gw_predictions(
    position: Optional[str] = Query(None),
    team: Optional[str] = Query(None),
    min_cost: Optional[int] = Query(None),
    max_cost: Optional[int] = Query(None),
    sort_by: str = Query("predicted_points"),
    limit: int = Query(50, ge=1, le=200),
):
    """Get predictions for the next gameweek with optional filters."""
    conn = get_connection()
    try:
        target_gw = _get_next_gw(conn)

        # Check if predictions exist
        count_row = conn.execute(
            "SELECT COUNT(*) FROM predictions WHERE gameweek = ?", (target_gw,)
        ).fetchone()

        if count_row[0] == 0:
            # Try to generate predictions inline
            from ml.predict import models_ready, generate_all_predictions
            if not models_ready():
                raise HTTPException(
                    status_code=503,
                    detail="Prediction models not trained yet. Run: python -m backend.ml.train",
                )
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, generate_all_predictions)

        conditions = [
            "pr.gameweek = ?",
            "p.status = 'a'",
        ]
        params: list = [target_gw]

        if position:
            conditions.append("p.position = ?")
            params.append(position.upper())
        if team:
            conditions.append("p.team_short = ?")
            params.append(team)
        if min_cost is not None:
            conditions.append("p.now_cost >= ?")
            params.append(min_cost)
        if max_cost is not None:
            conditions.append("p.now_cost <= ?")
            params.append(max_cost)

        sort_map = {
            "predicted_points": "pr.predicted_points",
            "confidence": "pr.confidence",
            "now_cost": "p.now_cost",
            "form": "p.form",
        }
        sort_col = sort_map.get(sort_by, "pr.predicted_points")
        where = " AND ".join(conditions)

        rows = conn.execute(
            f"""
            SELECT pr.*, p.*
            FROM predictions pr
            JOIN players p ON pr.player_id = p.id
            WHERE {where}
            ORDER BY {sort_col} DESC
            LIMIT ?
            """,
            params + [limit],
        ).fetchall()

        results = []
        for r in rows:
            results.append(PlayerPrediction(
                player_id=r["player_id"],
                web_name=r["web_name"],
                team_short=r["team_short"],
                position=r["position"],
                now_cost=round(r["now_cost"] / 10, 1) if r["now_cost"] else None,
                status=r["status"],
                gameweek=r["gameweek"],
                predicted_points=r["predicted_points"],
                confidence=r["confidence"] or 0.0,
                model_version=r["model_version"],
                photo_url=f"https://resources.premierleague.com/premierleague/photos/players/110x140/{r['opta_code']}.png" if r["opta_code"] else None,
            ))
        return results
    finally:
        conn.close()


@router.get("/player/{player_id}", response_model=PlayerPredictionDetail)
async def get_player_prediction(player_id: int, gw: Optional[int] = Query(None)):
    """Single player prediction with feature breakdown."""
    from ml.predict import get_player_prediction as _get_pred, models_ready

    if not models_ready():
        raise HTTPException(
            status_code=503,
            detail="Prediction models not trained yet.",
        )

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, _get_pred, player_id, gw)

    if result is None:
        raise HTTPException(status_code=404, detail=f"No prediction available for player {player_id}")

    conn = get_connection()
    try:
        player = conn.execute("SELECT * FROM players WHERE id = ?", (player_id,)).fetchone()
        if not player:
            raise HTTPException(status_code=404, detail=f"Player {player_id} not found")

        opta_code = player["opta_code"]
        return PlayerPredictionDetail(
            player_id=player_id,
            web_name=player["web_name"],
            team_short=player["team_short"],
            position=player["position"],
            now_cost=round(player["now_cost"] / 10, 1) if player["now_cost"] else None,
            status=player["status"],
            gameweek=result["gameweek"],
            predicted_points=result["predicted_points"],
            confidence=result["confidence"],
            model_version=result["model_version"],
            photo_url=f"https://resources.premierleague.com/premierleague/photos/players/110x140/{opta_code}.png" if opta_code else None,
            feature_breakdown=result.get("feature_breakdown", []),
        )
    finally:
        conn.close()


@router.get("/top-picks", response_model=dict)
async def get_top_picks(gw: Optional[int] = Query(None)):
    """Top 3 picks per position for the next GW."""
    conn = get_connection()
    try:
        target_gw = gw or _get_next_gw(conn)

        result = {}
        for pos in ("GKP", "DEF", "MID", "FWD"):
            rows = conn.execute(
                """
                SELECT pr.*, p.*
                FROM predictions pr
                JOIN players p ON pr.player_id = p.id
                WHERE pr.gameweek = ? AND p.position = ? AND p.status = 'a'
                ORDER BY pr.predicted_points DESC
                LIMIT 3
                """,
                (target_gw, pos),
            ).fetchall()

            picks = []
            for r in rows:
                picks.append(PlayerPrediction(
                    player_id=r["player_id"],
                    web_name=r["web_name"],
                    team_short=r["team_short"],
                    position=r["position"],
                    now_cost=round(r["now_cost"] / 10, 1) if r["now_cost"] else None,
                    status=r["status"],
                    gameweek=r["gameweek"],
                    predicted_points=r["predicted_points"],
                    confidence=r["confidence"] or 0.0,
                    model_version=r["model_version"],
                    photo_url=f"https://resources.premierleague.com/premierleague/photos/players/110x140/{r['opta_code']}.png" if r["opta_code"] else None,
                ))
            result[pos] = picks

        return result
    finally:
        conn.close()


@router.get("/best-xi", response_model=BestXI)
async def get_best_xi(
    budget: int = Query(1000, description="Budget in tenths of millions (1000 = £100M)"),
    formation: str = Query("4-3-3", description="Formation e.g. 4-3-3, 3-4-3, 4-4-2, 5-3-2"),
    locked_ids: Optional[str] = Query(None, description="Comma-separated player IDs to lock in"),
):
    """Build best XI within budget and formation constraints using greedy knapsack."""
    conn = get_connection()
    try:
        target_gw = _get_next_gw(conn)

        # Parse formation
        try:
            parts = [int(x) for x in formation.split("-")]
            if len(parts) != 3 or sum(parts) != 10:
                raise ValueError
            n_def, n_mid, n_fwd = parts
        except ValueError:
            n_def, n_mid, n_fwd = 4, 3, 3

        n_gkp = 1
        quotas = {"GKP": n_gkp, "DEF": n_def, "MID": n_mid, "FWD": n_fwd}

        # Parse locked IDs
        locked_id_set: set[int] = set()
        if locked_ids:
            try:
                locked_id_set = {int(x.strip()) for x in locked_ids.split(",") if x.strip()}
            except ValueError:
                pass

        # Get all candidates ranked by predicted_points
        all_rows = conn.execute(
            """
            SELECT pr.*, p.*
            FROM predictions pr
            JOIN players p ON pr.player_id = p.id
            WHERE pr.gameweek = ? AND p.status = 'a' AND p.now_cost IS NOT NULL
            ORDER BY pr.predicted_points DESC
            """,
            (target_gw,),
        ).fetchall()

        selected: list[dict] = []
        used_ids: set[int] = set()
        remaining_budget = budget
        position_counts = {"GKP": 0, "DEF": 0, "MID": 0, "FWD": 0}

        # First, add locked players
        for r in all_rows:
            if r["player_id"] in locked_id_set:
                pos = r["position"]
                cost = r["now_cost"] or 0
                if position_counts.get(pos, 0) < quotas.get(pos, 0) and remaining_budget >= cost:
                    selected.append(dict(r))
                    used_ids.add(r["player_id"])
                    position_counts[pos] = position_counts.get(pos, 0) + 1
                    remaining_budget -= cost

        # Greedy fill remaining spots
        for r in all_rows:
            if r["player_id"] in used_ids:
                continue
            pos = r["position"]
            cost = r["now_cost"] or 0
            if pos not in quotas:
                continue
            if position_counts.get(pos, 0) >= quotas[pos]:
                continue
            if remaining_budget < cost:
                continue
            selected.append(dict(r))
            used_ids.add(r["player_id"])
            position_counts[pos] = position_counts.get(pos, 0) + 1
            remaining_budget -= cost

            if sum(position_counts.values()) == 11:
                break

        total_pts = sum(s["predicted_points"] for s in selected)
        total_cost = round((budget - remaining_budget) / 10, 1)

        players_out = []
        for s in selected:
            players_out.append(PlayerPrediction(
                player_id=s["player_id"],
                web_name=s["web_name"],
                team_short=s["team_short"],
                position=s["position"],
                now_cost=round(s["now_cost"] / 10, 1) if s["now_cost"] else None,
                status=s["status"],
                gameweek=s["gameweek"],
                predicted_points=s["predicted_points"],
                confidence=s["confidence"] or 0.0,
                model_version=s["model_version"],
                photo_url=f"https://resources.premierleague.com/premierleague/photos/players/110x140/{s['opta_code']}.png" if s.get("opta_code") else None,
            ))

        return BestXI(
            formation=formation,
            total_predicted_points=round(total_pts, 2),
            total_cost=total_cost,
            players=players_out,
        )
    finally:
        conn.close()


class TransferRequest(BaseModel):
    squad: list[int]


@router.post("/transfer-suggest", response_model=list[TransferSuggestion])
async def suggest_transfers(body: TransferRequest = Body(...)):
    """Suggest transfer improvements for a given squad."""
    conn = get_connection()
    try:
        target_gw = _get_next_gw(conn)

        if not body.squad:
            raise HTTPException(status_code=400, detail="Squad list cannot be empty")

        # Get squad players with predictions
        squad_rows = conn.execute(
            f"""
            SELECT pr.*, p.*
            FROM predictions pr
            JOIN players p ON pr.player_id = p.id
            WHERE pr.gameweek = ? AND pr.player_id IN ({','.join('?' * len(body.squad))})
            ORDER BY pr.predicted_points ASC
            """,
            [target_gw] + list(body.squad),
        ).fetchall()

        if not squad_rows:
            raise HTTPException(status_code=404, detail="No predictions found for squad players")

        # Worst performing squad player = transfer out candidate
        transfer_out_row = squad_rows[0]  # sorted ASC so lowest first
        out_position = transfer_out_row["position"]
        out_cost = transfer_out_row["now_cost"] or 0

        # Best available player of same position within budget
        in_row = conn.execute(
            """
            SELECT pr.*, p.*
            FROM predictions pr
            JOIN players p ON pr.player_id = p.id
            WHERE pr.gameweek = ?
              AND p.position = ?
              AND p.status = 'a'
              AND p.now_cost <= ?
              AND pr.player_id NOT IN ({placeholders})
            ORDER BY pr.predicted_points DESC
            LIMIT 1
            """.format(placeholders=','.join('?' * len(body.squad))),
            [target_gw, out_position, out_cost] + list(body.squad),
        ).fetchone()

        suggestions = []
        if in_row:
            def _make_pred(r) -> PlayerPrediction:
                return PlayerPrediction(
                    player_id=r["player_id"],
                    web_name=r["web_name"],
                    team_short=r["team_short"],
                    position=r["position"],
                    now_cost=round(r["now_cost"] / 10, 1) if r["now_cost"] else None,
                    status=r["status"],
                    gameweek=r["gameweek"],
                    predicted_points=r["predicted_points"],
                    confidence=r["confidence"] or 0.0,
                    model_version=r["model_version"],
                    photo_url=f"https://resources.premierleague.com/premierleague/photos/players/110x140/{r['opta_code']}.png" if r["opta_code"] else None,
                )

            points_gain = in_row["predicted_points"] - transfer_out_row["predicted_points"]
            suggestions.append(TransferSuggestion(
                transfer_out=_make_pred(dict(transfer_out_row)),
                transfer_in=_make_pred(dict(in_row)),
                points_gain=round(points_gain, 3),
            ))

        return suggestions
    finally:
        conn.close()
