"""Async HTTP client for the Fantasy Premier League public API."""

import logging
from typing import Any, Optional

import httpx

from config import settings

logger = logging.getLogger(__name__)

FPL_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-GB,en;q=0.9",
    "Referer": "https://fantasy.premierleague.com/",
}

_client: Optional[httpx.AsyncClient] = None


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=settings.fpl_api_base,
            headers=FPL_HEADERS,
            timeout=30.0,
            follow_redirects=True,
        )
    return _client


async def close_client() -> None:
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None


async def fetch_bootstrap() -> Optional[dict[str, Any]]:
    """Fetch the FPL bootstrap-static endpoint."""
    try:
        client = get_client()
        resp = await client.get("/bootstrap-static/")
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.warning("FPL bootstrap fetch failed: %s", exc)
        return None


async def fetch_fixtures(gw: Optional[int] = None) -> Optional[list[dict[str, Any]]]:
    """Fetch fixtures, optionally filtered by gameweek."""
    try:
        client = get_client()
        params = {}
        if gw is not None:
            params["event"] = gw
        resp = await client.get("/fixtures/", params=params)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.warning("FPL fixtures fetch failed: %s", exc)
        return None


async def fetch_element_summary(player_id: int) -> Optional[dict[str, Any]]:
    """Fetch per-player element-summary (history + fixtures)."""
    try:
        client = get_client()
        resp = await client.get(f"/element-summary/{player_id}/")
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.warning("FPL element-summary fetch failed for player %d: %s", player_id, exc)
        return None


async def fetch_live(gw_id: int) -> Optional[dict[str, Any]]:
    """Fetch live GW scores."""
    try:
        client = get_client()
        resp = await client.get(f"/event/{gw_id}/live/")
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.warning("FPL live fetch failed for GW %d: %s", gw_id, exc)
        return None


async def fetch_dream_team(gw_id: int) -> Optional[dict[str, Any]]:
    """Fetch dream team for a given GW."""
    try:
        client = get_client()
        resp = await client.get(f"/dream-team/{gw_id}/")
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.warning("FPL dream-team fetch failed for GW %d: %s", gw_id, exc)
        return None


async def fetch_set_piece_notes() -> Optional[dict[str, Any]]:
    """Fetch set piece notes."""
    try:
        client = get_client()
        resp = await client.get("/team/set-piece-notes/")
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.warning("FPL set-piece-notes fetch failed: %s", exc)
        return None
