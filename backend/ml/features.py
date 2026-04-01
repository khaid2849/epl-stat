"""Feature engineering for FPL point prediction."""

import logging
from typing import Optional

import numpy as np
import pandas as pd

from database import get_connection

logger = logging.getLogger(__name__)

SEASON_FEATURES = [
    "form",
    "total_points",
    "points_per_game",
    "ep_next",
    "expected_goals",
    "expected_assists",
    "expected_goal_involvements",
    "ict_index",
    "influence",
    "creativity",
    "threat",
    "goals_scored",
    "assists",
    "clean_sheets",
    "bonus",
    "saves",
    "minutes",
    "starts",
    "selected_by_percent",
    "transfers_in_event",
    "transfers_out_event",
    "now_cost",
    "chance_of_playing_next_round",
]

ROLLING_FEATURES = [
    "pts_last_3gw",
    "pts_last_5gw",
    "pts_variance_last_5gw",
    "minutes_last_3gw",
    "goals_last_3gw",
    "assists_last_3gw",
    "xg_last_3gw",
    "xa_last_3gw",
    "bonus_last_3gw",
    "clean_sheets_last_3gw",
    "saves_last_3gw",
]

FIXTURE_FEATURES = [
    "fixture_difficulty",
    "opponent_goals_conceded_avg_last5",
    "is_home",
    "is_double_gameweek",
    "is_blank_gameweek",
]

TEAM_FEATURES = [
    "team_goals_for_avg_last5",
    "team_clean_sheet_rate_last5",
]

ALL_FEATURES = SEASON_FEATURES + ROLLING_FEATURES + FIXTURE_FEATURES + TEAM_FEATURES


def _rolling_player_stats(conn, player_id: int, up_to_gw: int) -> dict:
    """Compute rolling stats for a player up to (not including) a GW."""
    rows = conn.execute(
        """
        SELECT gameweek, points, minutes, goals_scored, assists,
               xg, xa, bonus, clean_sheets, saves
        FROM player_gw_history
        WHERE player_id = ? AND gameweek < ?
        ORDER BY gameweek DESC
        LIMIT 5
        """,
        (player_id, up_to_gw),
    ).fetchall()

    if not rows:
        return {f: 0.0 for f in ROLLING_FEATURES}

    pts = [r["points"] or 0 for r in rows]
    mins = [r["minutes"] or 0 for r in rows]
    goals = [r["goals_scored"] or 0 for r in rows]
    assists = [r["assists"] or 0 for r in rows]
    xg = [r["xg"] or 0.0 for r in rows]
    xa = [r["xa"] or 0.0 for r in rows]
    bonus = [r["bonus"] or 0 for r in rows]
    cs = [r["clean_sheets"] or 0 for r in rows]
    saves = [r["saves"] or 0 for r in rows]

    def _avg(lst, n):
        subset = lst[:n]
        return float(np.mean(subset)) if subset else 0.0

    return {
        "pts_last_3gw": _avg(pts, 3),
        "pts_last_5gw": _avg(pts, 5),
        "pts_variance_last_5gw": float(np.var(pts[:5])) if len(pts) >= 2 else 0.0,
        "minutes_last_3gw": _avg(mins, 3),
        "goals_last_3gw": _avg(goals, 3),
        "assists_last_3gw": _avg(assists, 3),
        "xg_last_3gw": _avg(xg, 3),
        "xa_last_3gw": _avg(xa, 3),
        "bonus_last_3gw": _avg(bonus, 3),
        "clean_sheets_last_3gw": _avg(cs, 3),
        "saves_last_3gw": _avg(saves, 3),
    }


def _team_rolling_stats(conn, team_short: str, up_to_gw: int) -> dict:
    """Compute rolling team stats."""
    rows = conn.execute(
        """
        SELECT gameweek, goals_for, goals_against, won
        FROM team_gw_stats
        WHERE team_short = ? AND gameweek < ?
        ORDER BY gameweek DESC
        LIMIT 5
        """,
        (team_short, up_to_gw),
    ).fetchall()

    if not rows:
        return {"team_goals_for_avg_last5": 1.0, "team_clean_sheet_rate_last5": 0.2}

    gf = [r["goals_for"] or 0 for r in rows]
    ga = [r["goals_against"] or 0 for r in rows]
    cs_flag = [1 if (r["goals_against"] or 0) == 0 else 0 for r in rows]

    return {
        "team_goals_for_avg_last5": float(np.mean(gf)) if gf else 0.0,
        "team_clean_sheet_rate_last5": float(np.mean(cs_flag)) if cs_flag else 0.0,
    }


def _fixture_features(conn, player_id: int, target_gw: int, team_short: str) -> dict:
    """Get fixture difficulty and context for upcoming GW."""
    fixture = conn.execute(
        """
        SELECT home_team_short, away_team_short, home_difficulty, away_difficulty
        FROM fixtures
        WHERE (home_team_short = ? OR away_team_short = ?)
          AND gameweek = ?
        LIMIT 1
        """,
        (team_short, team_short, target_gw),
    ).fetchone()

    # Count fixtures for double/blank gameweek
    fixture_count = conn.execute(
        """
        SELECT COUNT(*) as cnt FROM fixtures
        WHERE (home_team_short = ? OR away_team_short = ?)
          AND gameweek = ?
        """,
        (team_short, team_short, target_gw),
    ).fetchone()
    count = fixture_count["cnt"] if fixture_count else 0

    if fixture is None:
        return {
            "fixture_difficulty": 3.0,
            "opponent_goals_conceded_avg_last5": 1.2,
            "is_home": 0,
            "is_double_gameweek": 0,
            "is_blank_gameweek": 1 if count == 0 else 0,
        }

    is_home = 1 if fixture["home_team_short"] == team_short else 0
    difficulty = fixture["home_difficulty"] if is_home else fixture["away_difficulty"]
    opponent = fixture["away_team_short"] if is_home else fixture["home_team_short"]

    # Opponent's goals conceded in last 5 GWs
    opp_rows = conn.execute(
        """
        SELECT goals_against FROM team_gw_stats
        WHERE team_short = ? AND gameweek < ?
        ORDER BY gameweek DESC LIMIT 5
        """,
        (opponent, target_gw),
    ).fetchall()
    opp_gc = [r["goals_against"] or 0 for r in opp_rows]
    opp_gc_avg = float(np.mean(opp_gc)) if opp_gc else 1.2

    return {
        "fixture_difficulty": float(difficulty or 3),
        "opponent_goals_conceded_avg_last5": opp_gc_avg,
        "is_home": is_home,
        "is_double_gameweek": 1 if count >= 2 else 0,
        "is_blank_gameweek": 1 if count == 0 else 0,
    }


def build_feature_row(player_row: dict, target_gw: int, conn=None) -> dict:
    """Build a full feature dictionary for a single player."""
    close_conn = False
    if conn is None:
        conn = get_connection()
        close_conn = True

    try:
        player_id = player_row["id"]
        team_short = player_row["team_short"]

        # Season-level features from players table
        season = {f: (player_row.get(f) or 0.0) for f in SEASON_FEATURES}
        for f in SEASON_FEATURES:
            if season[f] is None:
                season[f] = 0.0

        # Rolling
        rolling = _rolling_player_stats(conn, player_id, target_gw)

        # Fixture
        fixture = _fixture_features(conn, player_id, target_gw, team_short)

        # Team
        team = _team_rolling_stats(conn, team_short, target_gw)

        return {**season, **rolling, **fixture, **team}
    finally:
        if close_conn:
            conn.close()


def build_feature_matrix(position: str, target_gw: int) -> tuple[pd.DataFrame, list[int]]:
    """
    Build feature matrix for all active players of a given position.

    Returns (X DataFrame, player_ids list).
    """
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT * FROM players
            WHERE position = ? AND status IN ('a', 'd')
            """,
            (position,),
        ).fetchall()

        if not rows:
            return pd.DataFrame(columns=ALL_FEATURES), []

        records = []
        player_ids = []
        for row in rows:
            row_dict = dict(row)
            feat = build_feature_row(row_dict, target_gw, conn)
            records.append(feat)
            player_ids.append(row_dict["id"])

        df = pd.DataFrame(records, columns=ALL_FEATURES)
        df = df.fillna(0.0)
        return df, player_ids
    finally:
        conn.close()


def build_training_data(position: str) -> tuple[pd.DataFrame, pd.Series]:
    """
    Build training dataset from historical player_gw_history.

    Returns (X, y) where y is actual points for that GW.
    """
    conn = get_connection()
    try:
        # Get all gameweeks with history
        gws = conn.execute(
            "SELECT DISTINCT gameweek FROM player_gw_history ORDER BY gameweek"
        ).fetchall()
        gw_list = [r["gameweek"] for r in gws]

        if len(gw_list) < 2:
            logger.warning("Insufficient GW history for training (position=%s)", position)
            return pd.DataFrame(columns=ALL_FEATURES), pd.Series(dtype=float)

        # Get players of this position
        players = conn.execute(
            "SELECT * FROM players WHERE position = ?", (position,)
        ).fetchall()
        player_map = {p["id"]: dict(p) for p in players}

        records = []
        targets = []

        for i, gw in enumerate(gw_list[:-1]):  # train on gw, predict gw+1
            target_gw = gw_list[i + 1]

            # Get actual points for target_gw
            actual_rows = conn.execute(
                """
                SELECT player_id, points FROM player_gw_history
                WHERE gameweek = ?
                """,
                (target_gw,),
            ).fetchall()

            for ar in actual_rows:
                pid = ar["player_id"]
                if pid not in player_map:
                    continue
                player_row = player_map[pid]
                feat = build_feature_row(player_row, target_gw, conn)
                records.append(feat)
                targets.append(float(ar["points"] or 0))

        if not records:
            return pd.DataFrame(columns=ALL_FEATURES), pd.Series(dtype=float)

        X = pd.DataFrame(records, columns=ALL_FEATURES).fillna(0.0)
        y = pd.Series(targets, name="points")
        return X, y
    finally:
        conn.close()
