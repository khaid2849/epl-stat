"""CSV ingestion and FPL API data seeding."""

import json
import logging
import re
import shutil
import sqlite3
from pathlib import Path
from typing import Any, Optional

import pandas as pd

from config import settings
from database import get_connection
from services.team_normalizer import normalize

logger = logging.getLogger(__name__)

# ─── Kaggle dataset download ──────────────────────────────────────────────────

KAGGLE_DATASETS = {
    "fpl_players": "meraxes10/fantasy-premier-league-dataset-2025-2026",
}


def download_kaggle_datasets(force: bool = False) -> bool:
    """
    Download the two Kaggle datasets using kagglehub and sync files into
    the project data directories.

    Requires ~/.kaggle/kaggle.json (or KAGGLE_USERNAME + KAGGLE_KEY env vars).

    Args:
        force: Re-download even if local files already exist.

    Returns:
        True if download succeeded, False if skipped or failed.
    """
    try:
        import kagglehub
    except ImportError:
        logger.warning("kagglehub not installed — run `pip install kagglehub` to enable auto-download.")
        return False

    # Apply credentials from .env if provided (overrides ~/.kaggle/kaggle.json)
    if settings.kaggle_username and settings.kaggle_key:
        import os
        os.environ.setdefault("KAGGLE_USERNAME", settings.kaggle_username)
        os.environ.setdefault("KAGGLE_KEY", settings.kaggle_key)
        logger.info("Using Kaggle credentials from .env")

    fpl_path = Path(settings.fpl_dataset_path)

    # Skip if file already present and not forcing
    if not force and fpl_path.exists():
        logger.info("FPL players CSV already present — skipping download (use --force-download to refresh).")
        return True

    fpl_path.parent.mkdir(parents=True, exist_ok=True)

    success = True

    # ── FPL players dataset ──────────────────────────────────────────────────
    logger.info("Downloading FPL players dataset from Kaggle...")
    try:
        cached_path = Path(kagglehub.dataset_download(KAGGLE_DATASETS["fpl_players"]))
        logger.info("FPL players downloaded to: %s", cached_path)

        # Look for players.csv first, then any CSV
        players_csv = cached_path / "players.csv"
        if not players_csv.exists():
            candidates = list(cached_path.rglob("players.csv"))
            if candidates:
                players_csv = candidates[0]
            else:
                # Fall back to the first CSV found
                candidates = list(cached_path.rglob("*.csv"))
                if candidates:
                    players_csv = candidates[0]
                    logger.warning("No players.csv found — using %s", players_csv.name)

        if players_csv.exists():
            shutil.copy2(players_csv, fpl_path)
            logger.info("Copied %s → %s", players_csv.name, fpl_path)
        else:
            logger.error("No CSV files found in FPL dataset download at %s", cached_path)
            success = False
    except Exception as exc:
        logger.error("Failed to download FPL players dataset: %s", exc)
        logger.error("Ensure ~/.kaggle/kaggle.json exists with valid credentials.")
        success = False

    return success

# ─── helpers ──────────────────────────────────────────────────────────────────

def _safe_float(val: Any, default: Optional[float] = None) -> Optional[float]:
    try:
        f = float(val)
        return None if pd.isna(f) else f
    except (TypeError, ValueError):
        return default


def _safe_int(val: Any, default: Optional[int] = None) -> Optional[int]:
    try:
        f = float(val)
        return None if pd.isna(f) else int(f)
    except (TypeError, ValueError):
        return default


# ─── EPL table CSVs ───────────────────────────────────────────────────────────

def load_epl_tables(conn: sqlite3.Connection) -> None:
    """Load all premier_league_table_XX.csv files into team_gw_stats."""
    tables_dir = Path(settings.epl_tables_dir)
    csv_files = sorted(tables_dir.glob("premier_league_table_*.csv"))
    if not csv_files:
        logger.warning("No EPL table CSVs found in %s", tables_dir)
        return

    rows_inserted = 0
    for csv_path in csv_files:
        match = re.search(r"premier_league_table_(\d+)\.csv$", csv_path.name)
        if not match:
            continue
        gw = int(match.group(1))

        try:
            df = pd.read_csv(csv_path)
        except Exception as exc:
            logger.warning("Failed to read %s: %s", csv_path, exc)
            continue

        # Normalise column names
        df.columns = [c.strip() for c in df.columns]

        for _, row in df.iterrows():
            team_raw = str(row.get("Team", "")).strip()
            team_short = normalize(team_raw)
            form_val = str(row.get("Form", "")) if "Form" in df.columns else None

            conn.execute(
                """
                INSERT OR REPLACE INTO team_gw_stats
                    (team_short, gameweek, played, won, drawn, lost,
                     goals_for, goals_against, goal_difference, points, form)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    team_short,
                    gw,
                    _safe_int(row.get("Played")),
                    _safe_int(row.get("Won")),
                    _safe_int(row.get("Drawn")),
                    _safe_int(row.get("Lost")),
                    _safe_int(row.get("Goals For")),
                    _safe_int(row.get("Goals Against")),
                    _safe_int(row.get("Goal Difference")),
                    _safe_int(row.get("Points")),
                    form_val if form_val and form_val not in ("nan", "None", "") else None,
                ),
            )
            rows_inserted += 1

    conn.commit()
    logger.info("Loaded %d team-GW stat rows from EPL CSVs", rows_inserted)


# ─── Live standings scraper ───────────────────────────────────────────────────

def scrape_and_store_standings(conn: sqlite3.Connection, current_gw: int) -> bool:
    """
    Scrape live standings from OneFootball and store them in team_gw_stats
    for the given gameweek.

    Returns True if at least one row was stored, False otherwise.
    """
    from services.scraper import scrape_standings

    rows = scrape_standings()
    if not rows:
        logger.warning("Standings scrape returned no data — DB not updated.")
        return False

    # Remove any existing rows for this GW before inserting fresh data
    conn.execute("DELETE FROM team_gw_stats WHERE gameweek = ?", (current_gw,))

    stored = 0
    for entry in rows:
        conn.execute(
            """
            INSERT INTO team_gw_stats
                (team_short, gameweek, played, won, drawn, lost,
                 goals_for, goals_against, goal_difference, points, form)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                entry["team_short"],
                current_gw,
                entry["played"],
                entry["won"],
                entry["drawn"],
                entry["lost"],
                entry["goals_for"],
                entry["goals_against"],
                entry["goal_difference"],
                entry["points"],
                None,  # form not available from scraper
            ),
        )
        stored += 1

    conn.commit()
    logger.info("Stored scraped standings for GW %d (%d teams).", current_gw, stored)
    return stored > 0


# ─── FPL players CSV ──────────────────────────────────────────────────────────

def load_fpl_players(conn: sqlite3.Connection, team_code_map: dict[str, int]) -> None:
    """Load fpl_dataset/players.csv into the players table."""
    csv_path = Path(settings.fpl_dataset_path)
    if not csv_path.exists():
        logger.warning("FPL players CSV not found at %s", csv_path)
        return

    try:
        df = pd.read_csv(csv_path, low_memory=False)
    except Exception as exc:
        logger.error("Failed to read FPL players CSV: %s", exc)
        return

    df.columns = [c.strip() for c in df.columns]

    rows_inserted = 0
    for _, row in df.iterrows():
        # Status filter: skip 'u' (unselectable) from the perspective of insertion
        # (we still store them but mark them correctly)
        status = str(row.get("status", "a")).strip()

        player_id = _safe_int(row.get("id"))
        if player_id is None:
            continue

        team_raw = str(row.get("team", "")).strip()
        team_short = normalize(team_raw)
        team_code = team_code_map.get(team_short)

        # Handle selected_by_percent which may appear as string
        selected_by = _safe_float(row.get("selected_by_percent"))

        position_raw = str(row.get("position", "")).strip().upper()
        # Normalise position codes: GKP/DEF/MID/FWD
        pos_map = {"GK": "GKP", "GKP": "GKP", "DEF": "DEF", "MID": "MID", "FWD": "FWD", "ATT": "FWD"}
        position = pos_map.get(position_raw, position_raw)

        web_name = str(row.get("web_name", row.get("name", ""))).strip()
        full_name = str(row.get("name", "")).strip()

        news = row.get("news", None)
        if pd.isna(news) if isinstance(news, float) else False:
            news = None

        conn.execute(
            """
            INSERT OR REPLACE INTO players (
                id, web_name, full_name, team_short, team_code, position,
                opta_code, status, news, now_cost, total_points, form,
                ep_next, ep_this, event_points, selected_by_percent, ict_index,
                minutes, goals_scored, assists, clean_sheets, saves, bonus, bps,
                expected_goals, expected_assists, expected_goal_involvements,
                goals_conceded, points_per_game, starts, transfers_in_event,
                transfers_out_event, chance_of_playing_next_round,
                chance_of_playing_this_round, influence, creativity, threat,
                updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?,
                ?, ?, ?, ?,
                CURRENT_TIMESTAMP
            )
            """,
            (
                player_id,
                web_name,
                full_name,
                team_short,
                team_code,
                position,
                str(row.get("opta_code", "")).strip() or None,
                status,
                str(news) if news is not None else None,
                _safe_int(row.get("now_cost")),
                _safe_int(row.get("total_points")),
                _safe_float(row.get("form")),
                _safe_float(row.get("ep_next")),
                _safe_float(row.get("ep_this")),
                _safe_int(row.get("event_points")),
                selected_by,
                _safe_float(row.get("ict_index")),
                _safe_int(row.get("minutes")),
                _safe_int(row.get("goals_scored")),
                _safe_int(row.get("assists")),
                _safe_int(row.get("clean_sheets")),
                _safe_int(row.get("saves")),
                _safe_int(row.get("bonus")),
                _safe_int(row.get("bps")),
                _safe_float(row.get("expected_goals")),
                _safe_float(row.get("expected_assists")),
                _safe_float(row.get("expected_goal_involvements")),
                _safe_int(row.get("goals_conceded")),
                _safe_float(row.get("points_per_game")),
                _safe_int(row.get("starts")),
                _safe_int(row.get("transfers_in_event")),
                _safe_int(row.get("transfers_out_event")),
                _safe_float(row.get("chance_of_playing_next_round")),
                _safe_float(row.get("chance_of_playing_this_round")),
                _safe_float(row.get("influence")),
                _safe_float(row.get("creativity")),
                _safe_float(row.get("threat")),
            ),
        )
        rows_inserted += 1

    conn.commit()
    logger.info("Loaded %d players from FPL CSV", rows_inserted)


# ─── FPL fixtures from API ────────────────────────────────────────────────────

def store_fixtures(conn: sqlite3.Connection, fixtures_data: list[dict[str, Any]], team_id_to_short: dict[int, str]) -> None:
    """Persist fixture list to DB."""
    rows = 0
    for f in fixtures_data:
        fixture_id = f.get("id")
        if fixture_id is None:
            continue

        home_id = f.get("team_h")
        away_id = f.get("team_a")
        home_short = team_id_to_short.get(home_id, str(home_id)) if home_id else None
        away_short = team_id_to_short.get(away_id, str(away_id)) if away_id else None

        conn.execute(
            """
            INSERT OR REPLACE INTO fixtures
                (id, gameweek, kickoff_time, home_team_short, away_team_short,
                 home_score, away_score, home_difficulty, away_difficulty, finished)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                fixture_id,
                f.get("event"),
                f.get("kickoff_time"),
                home_short,
                away_short,
                f.get("team_h_score"),
                f.get("team_a_score"),
                f.get("team_h_difficulty"),
                f.get("team_a_difficulty"),
                1 if f.get("finished") else 0,
            ),
        )
        rows += 1
    conn.commit()
    logger.info("Stored %d fixtures", rows)


def store_player_gw_history(conn: sqlite3.Connection, player_id: int, history: list[dict[str, Any]], team_id_to_short: dict[int, str]) -> None:
    """Store element-summary history rows for a player."""
    for h in history:
        gw = h.get("round")
        if gw is None:
            continue
        opp_id = h.get("opponent_team")
        opp_short = team_id_to_short.get(opp_id, str(opp_id)) if opp_id else None

        conn.execute(
            """
            INSERT OR REPLACE INTO player_gw_history
                (player_id, gameweek, points, minutes, goals_scored, assists,
                 clean_sheets, bonus, bps, xg, xa, saves, goals_conceded,
                 was_home, opponent_team, fixture_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                player_id,
                gw,
                h.get("total_points"),
                h.get("minutes"),
                h.get("goals_scored"),
                h.get("assists"),
                h.get("clean_sheets"),
                h.get("bonus"),
                h.get("bps"),
                _safe_float(h.get("expected_goals")),
                _safe_float(h.get("expected_assists")),
                h.get("saves"),
                h.get("goals_conceded"),
                1 if h.get("was_home") else 0,
                opp_short,
                h.get("fixture"),
            ),
        )
    conn.commit()


# ─── Bootstrap processing ─────────────────────────────────────────────────────

def process_bootstrap(bootstrap: dict[str, Any]) -> tuple[dict[str, int], dict[int, str], dict[str, int]]:
    """
    Extract team mappings from bootstrap-static.

    Returns:
        team_short_to_code: {short_name: team_code}
        team_id_to_short:   {fpl_team_id: short_name}
        team_short_to_id:   {short_name: fpl_team_id}
    """
    team_short_to_code: dict[str, int] = {}
    team_id_to_short: dict[int, str] = {}
    team_short_to_id: dict[str, int] = {}

    teams = bootstrap.get("teams", [])
    for t in teams:
        fpl_id = t.get("id")
        short_name = t.get("short_name", "")
        code = t.get("code")
        team_id_to_short[fpl_id] = short_name
        team_short_to_code[short_name] = code
        team_short_to_id[short_name] = fpl_id

    return team_short_to_code, team_id_to_short, team_short_to_id


# ─── Update team_codes in players table ───────────────────────────────────────

def update_player_team_codes(conn: sqlite3.Connection, team_short_to_code: dict[str, int]) -> None:
    """Backfill team_code on players table using bootstrap data."""
    for short, code in team_short_to_code.items():
        conn.execute(
            "UPDATE players SET team_code = ? WHERE team_short = ? AND team_code IS NULL",
            (code, short),
        )
    conn.commit()


# ─── CLI: bulk fetch player histories ────────────────────────────────────────

async def bulk_fetch_player_histories(limit: Optional[int] = None) -> None:
    """
    Fetch element-summary for all players in DB and store GW history.
    Run via: python -m backend.services.data_loader
    WARNING: this makes ~825 HTTP requests and may take 10+ minutes.
    """
    import asyncio
    from services.fpl_client import fetch_element_summary, fetch_bootstrap

    bootstrap = await fetch_bootstrap()
    if bootstrap is None:
        logger.error("Cannot fetch bootstrap — aborting bulk history fetch.")
        return

    _, team_id_to_short, _ = process_bootstrap(bootstrap)

    conn = get_connection()
    rows = conn.execute("SELECT id FROM players WHERE status != 'u'").fetchall()
    player_ids = [r[0] for r in rows]
    if limit:
        player_ids = player_ids[:limit]

    logger.info("Fetching histories for %d players...", len(player_ids))
    for i, pid in enumerate(player_ids):
        data = await fetch_element_summary(pid)
        if data:
            history = data.get("history", [])
            store_player_gw_history(conn, pid, history, team_id_to_short)
        if (i + 1) % 50 == 0:
            logger.info("  ... %d / %d done", i + 1, len(player_ids))
        await asyncio.sleep(0.3)  # be polite to the API

    conn.close()
    logger.info("Bulk history fetch complete.")


# ─── Main seeding entry point ─────────────────────────────────────────────────

async def seed_database(download: bool = True, force_download: bool = False) -> None:
    """
    Seed the database from CSVs and optionally from FPL API.
    Skips gracefully if FPL API is unreachable.

    Args:
        download: Attempt to download/refresh Kaggle datasets before seeding.
        force_download: Re-download even if local files already exist.
    """
    from services.fpl_client import fetch_bootstrap, fetch_fixtures

    # 0. Download Kaggle datasets if requested
    if download:
        download_kaggle_datasets(force=force_download)

    conn = get_connection()
    try:
        # 1. Try bootstrap to get team codes + fixtures
        bootstrap = await fetch_bootstrap()
        team_short_to_code: dict[str, int] = {}
        team_id_to_short: dict[int, str] = {}

        if bootstrap:
            team_short_to_code, team_id_to_short, _ = process_bootstrap(bootstrap)
            logger.info("Bootstrap fetched: %d teams", len(team_short_to_code))

            # Store bootstrap in cache
            conn.execute(
                "INSERT OR REPLACE INTO api_cache (key, data, fetched_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                ("bootstrap", json.dumps(bootstrap)),
            )
            conn.commit()
        else:
            logger.warning("FPL API unreachable — loading CSV data only (no team codes).")

        # 2. Scrape live standings from OneFootball — always refresh, wipe old data first
        current_gw = 1
        if bootstrap:
            events = bootstrap.get("events", [])
            current_event = next((e for e in events if e.get("is_current")), None)
            if not current_event:
                current_event = next((e for e in events if e.get("is_next")), None)
            if current_event:
                current_gw = current_event.get("id", 1)
        conn.execute("DELETE FROM team_gw_stats")
        conn.commit()
        scrape_and_store_standings(conn, current_gw)

        # 3. Load FPL players CSV
        load_fpl_players(conn, team_short_to_code)

        # 4. Backfill team_code on players if bootstrap available
        if team_short_to_code:
            update_player_team_codes(conn, team_short_to_code)

        # 5. Load fixtures from API
        if bootstrap:
            fixtures_data = await fetch_fixtures()
            if fixtures_data:
                store_fixtures(conn, fixtures_data, team_id_to_short)

        logger.info("Database seeding complete.")
    finally:
        conn.close()


if __name__ == "__main__":
    import asyncio
    import sys

    logging.basicConfig(level=logging.INFO)

    args = sys.argv[1:]

    if "--download-only" in args:
        # Just download datasets, don't seed DB
        force = "--force-download" in args
        download_kaggle_datasets(force=force)
    elif "--bulk-history" in args:
        limit_arg = None
        for arg in args:
            if arg.startswith("--limit="):
                limit_arg = int(arg.split("=", 1)[1])
        asyncio.run(bulk_fetch_player_histories(limit=limit_arg))
    else:
        force = "--force-download" in args
        no_download = "--no-download" in args
        asyncio.run(seed_database(download=not no_download, force_download=force))
