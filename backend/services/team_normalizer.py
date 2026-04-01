"""Team name normalisation utilities.

FPL short names are used as the canonical internal representation.
"""

# Maps full / long names (as found in epl_tables_dataset CSVs) to FPL short names.
TEAM_NAME_MAP: dict[str, str] = {
    "Manchester City": "Man City",
    "Manchester United": "Man Utd",
    "Tottenham Hotspur": "Spurs",
    "Newcastle United": "Newcastle",
    "Nottingham Forest": "Nott'm Forest",
    "Brighton & Hove Albion": "Brighton",
    "West Ham United": "West Ham",
    "Wolverhampton Wanderers": "Wolves",
    "AFC Bournemouth": "Bournemouth",
    "Leicester City": "Leicester",
    "Ipswich Town": "Ipswich",
    "Leeds United": "Leeds",
    "Sunderland AFC": "Sunderland",
    # OneFootball scraper variants
    "Liverpool FC": "Liverpool",
    "Burnley FC": "Burnley",
    "Brentford FC": "Brentford",
    "Chelsea FC": "Chelsea",
    "Everton FC": "Everton",
    "Fulham FC": "Fulham",
}

# Reverse map: FPL short name -> full name
SHORT_TO_FULL: dict[str, str] = {v: k for k, v in TEAM_NAME_MAP.items()}


def normalize(name: str) -> str:
    """Convert a team name to its FPL short name.

    If the name is already a short/canonical name it is returned unchanged.
    """
    return TEAM_NAME_MAP.get(name, name)


def denormalize(short: str) -> str:
    """Convert an FPL short name back to full name (best effort)."""
    return SHORT_TO_FULL.get(short, short)
