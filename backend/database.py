import sqlite3
import logging
from pathlib import Path
from config import settings

logger = logging.getLogger(__name__)

DDL = """
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY,
    web_name TEXT NOT NULL,
    full_name TEXT,
    team_short TEXT NOT NULL,
    team_code INTEGER,
    position TEXT NOT NULL,
    opta_code TEXT,
    status TEXT DEFAULT 'a',
    news TEXT,
    now_cost INTEGER,
    total_points INTEGER,
    form REAL,
    ep_next REAL,
    ep_this REAL,
    event_points INTEGER,
    selected_by_percent REAL,
    ict_index REAL,
    minutes INTEGER,
    goals_scored INTEGER,
    assists INTEGER,
    clean_sheets INTEGER,
    saves INTEGER,
    bonus INTEGER,
    bps INTEGER,
    expected_goals REAL,
    expected_assists REAL,
    expected_goal_involvements REAL,
    goals_conceded INTEGER,
    points_per_game REAL,
    starts INTEGER,
    transfers_in_event INTEGER,
    transfers_out_event INTEGER,
    chance_of_playing_next_round REAL,
    chance_of_playing_this_round REAL,
    influence REAL,
    creativity REAL,
    threat REAL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS player_gw_history (
    player_id INTEGER NOT NULL,
    gameweek INTEGER NOT NULL,
    points INTEGER,
    minutes INTEGER,
    goals_scored INTEGER,
    assists INTEGER,
    clean_sheets INTEGER,
    bonus INTEGER,
    bps INTEGER,
    xg REAL,
    xa REAL,
    saves INTEGER,
    goals_conceded INTEGER,
    was_home INTEGER,
    opponent_team TEXT,
    fixture_id INTEGER,
    PRIMARY KEY (player_id, gameweek)
);

CREATE TABLE IF NOT EXISTS team_gw_stats (
    team_short TEXT NOT NULL,
    gameweek INTEGER NOT NULL,
    played INTEGER,
    won INTEGER,
    drawn INTEGER,
    lost INTEGER,
    goals_for INTEGER,
    goals_against INTEGER,
    goal_difference INTEGER,
    points INTEGER,
    form TEXT,
    PRIMARY KEY (team_short, gameweek)
);

CREATE TABLE IF NOT EXISTS fixtures (
    id INTEGER PRIMARY KEY,
    gameweek INTEGER,
    kickoff_time TEXT,
    home_team_short TEXT,
    away_team_short TEXT,
    home_score INTEGER,
    away_score INTEGER,
    home_difficulty INTEGER,
    away_difficulty INTEGER,
    finished INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS predictions (
    player_id INTEGER NOT NULL,
    gameweek INTEGER NOT NULL,
    predicted_points REAL,
    confidence REAL,
    model_version TEXT,
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (player_id, gameweek)
);

CREATE TABLE IF NOT EXISTS api_cache (
    key TEXT PRIMARY KEY,
    data TEXT,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_player_gw_player ON player_gw_history(player_id);
CREATE INDEX IF NOT EXISTS idx_player_gw_gw ON player_gw_history(gameweek);
CREATE INDEX IF NOT EXISTS idx_fixtures_gw ON fixtures(gameweek);
CREATE INDEX IF NOT EXISTS idx_predictions_gw ON predictions(gameweek);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_short);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
"""


def get_connection() -> sqlite3.Connection:
    """Return a synchronous SQLite connection."""
    db_path = Path(settings.db_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Create all tables if they don't exist."""
    conn = get_connection()
    try:
        conn.executescript(DDL)
        conn.commit()
        logger.info("Database initialised at %s", settings.db_path)
    finally:
        conn.close()


def is_seeded() -> bool:
    """Return True if the players table has at least one row."""
    conn = get_connection()
    try:
        row = conn.execute("SELECT COUNT(*) FROM players").fetchone()
        return row[0] > 0
    except Exception:
        return False
    finally:
        conn.close()
