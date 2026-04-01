"""FPL API proxy router — bypasses CORS for browser clients."""

import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from database import get_connection
from services.fpl_client import (
    fetch_bootstrap,
    fetch_fixtures,
    fetch_element_summary,
    fetch_live,
    fetch_dream_team,
    fetch_set_piece_notes,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/fpl", tags=["fpl-proxy"])


def _cached_response(conn, key: str):
    row = conn.execute(
        "SELECT data FROM api_cache WHERE key = ?", (key,)
    ).fetchone()
    if row and row["data"]:
        try:
            return json.loads(row["data"])
        except json.JSONDecodeError:
            return None
    return None


def _cache_response(conn, key: str, data) -> None:
    conn.execute(
        "INSERT OR REPLACE INTO api_cache (key, data, fetched_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
        (key, json.dumps(data)),
    )
    conn.commit()


@router.get("/bootstrap")
async def proxy_bootstrap():
    """Proxy FPL bootstrap-static (cached)."""
    conn = get_connection()
    try:
        cached = _cached_response(conn, "bootstrap")
        if cached:
            return JSONResponse(content=cached)

        data = await fetch_bootstrap()
        if data is None:
            raise HTTPException(status_code=503, detail="FPL API unavailable")

        _cache_response(conn, "bootstrap", data)
        return JSONResponse(content=data)
    finally:
        conn.close()


@router.get("/fixtures")
async def proxy_fixtures(gw: Optional[int] = Query(None)):
    """Proxy FPL fixtures endpoint."""
    cache_key = f"fixtures_gw_{gw}" if gw else "fixtures_all"
    conn = get_connection()
    try:
        cached = _cached_response(conn, cache_key)
        if cached:
            return JSONResponse(content=cached)

        data = await fetch_fixtures(gw)
        if data is None:
            raise HTTPException(status_code=503, detail="FPL API unavailable")

        _cache_response(conn, cache_key, data)
        return JSONResponse(content=data)
    finally:
        conn.close()


@router.get("/player/{player_id}/history")
async def proxy_player_history(player_id: int):
    """Proxy FPL element-summary for a player."""
    import os
    from pathlib import Path
    from config import settings

    cache_dir = Path(settings.raw_data_dir) / "element_summaries"
    cache_dir.mkdir(parents=True, exist_ok=True)
    cache_file = cache_dir / f"{player_id}.json"

    if cache_file.exists():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                return JSONResponse(content=json.load(f))
        except Exception:
            pass

    data = await fetch_element_summary(player_id)
    if data is None:
        raise HTTPException(status_code=503, detail="FPL API unavailable")

    try:
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception:
        pass

    return JSONResponse(content=data)


@router.get("/live/{gw_id}")
async def proxy_live(gw_id: int):
    """Proxy FPL live GW scores."""
    cache_key = f"live_{gw_id}"
    conn = get_connection()
    try:
        cached = _cached_response(conn, cache_key)
        if cached:
            return JSONResponse(content=cached)

        data = await fetch_live(gw_id)
        if data is None:
            raise HTTPException(status_code=503, detail="FPL API unavailable")

        _cache_response(conn, cache_key, data)
        return JSONResponse(content=data)
    finally:
        conn.close()


@router.get("/dream-team/{gw_id}")
async def proxy_dream_team(gw_id: int):
    """Proxy FPL dream team for a GW."""
    cache_key = f"dream_team_{gw_id}"
    conn = get_connection()
    try:
        cached = _cached_response(conn, cache_key)
        if cached:
            return JSONResponse(content=cached)

        data = await fetch_dream_team(gw_id)
        if data is None:
            raise HTTPException(status_code=503, detail="FPL API unavailable")

        _cache_response(conn, cache_key, data)
        return JSONResponse(content=data)
    finally:
        conn.close()


@router.get("/set-piece-notes")
async def proxy_set_piece_notes():
    """Proxy FPL set piece notes."""
    conn = get_connection()
    try:
        cached = _cached_response(conn, "set_piece_notes")
        if cached:
            return JSONResponse(content=cached)

        data = await fetch_set_piece_notes()
        if data is None:
            raise HTTPException(status_code=503, detail="FPL API unavailable")

        _cache_response(conn, "set_piece_notes", data)
        return JSONResponse(content=data)
    finally:
        conn.close()
