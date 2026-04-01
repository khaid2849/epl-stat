"""APScheduler background jobs."""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def _refresh_standings() -> None:
    """Scrape latest standings from OneFootball and update the DB."""
    try:
        import json
        from database import get_connection
        from services.fpl_client import fetch_bootstrap
        from services.data_loader import process_bootstrap, scrape_and_store_standings

        bootstrap = await fetch_bootstrap()
        current_gw = 1
        if bootstrap:
            events = bootstrap.get("events", [])
            current_event = next((e for e in events if e.get("is_current")), None)
            if not current_event:
                current_event = next((e for e in events if e.get("is_next")), None)
            if current_event:
                current_gw = current_event.get("id", 1)

        conn = get_connection()
        try:
            scrape_and_store_standings(conn, current_gw)
        finally:
            conn.close()

        logger.info("Scheduler: standings refreshed for GW %d.", current_gw)
    except Exception as exc:
        logger.error("Scheduler: standings refresh failed: %s", exc)


async def _refresh_fixtures() -> None:
    """Refresh fixtures and bootstrap from FPL API."""
    try:
        import json
        from database import get_connection
        from services.fpl_client import fetch_bootstrap, fetch_fixtures
        from services.data_loader import process_bootstrap, store_fixtures, update_player_team_codes

        bootstrap = await fetch_bootstrap()
        if not bootstrap:
            logger.warning("Scheduler: FPL API unreachable during fixture refresh.")
            return

        _, team_id_to_short, _ = process_bootstrap(bootstrap)

        conn = get_connection()
        try:
            conn.execute(
                "INSERT OR REPLACE INTO api_cache (key, data, fetched_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                ("bootstrap", json.dumps(bootstrap)),
            )
            conn.commit()

            fixtures_data = await fetch_fixtures()
            if fixtures_data:
                store_fixtures(conn, fixtures_data, team_id_to_short)
        finally:
            conn.close()

        logger.info("Scheduler: fixtures refreshed.")
    except Exception as exc:
        logger.error("Scheduler: fixture refresh failed: %s", exc)


async def _refresh_predictions() -> None:
    """Retrain and cache predictions (runs once per day)."""
    try:
        import asyncio
        from ml.predict import generate_all_predictions

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, generate_all_predictions)
        logger.info("Scheduler: predictions refreshed.")
    except Exception as exc:
        logger.error("Scheduler: prediction refresh failed: %s", exc)


def start_scheduler() -> None:
    """Register jobs and start the scheduler."""
    # Refresh live standings every 3 hours
    scheduler.add_job(
        _refresh_standings,
        trigger=CronTrigger(minute=0, hour="*/3"),
        id="refresh_standings",
        replace_existing=True,
    )
    # Refresh fixtures every hour
    scheduler.add_job(
        _refresh_fixtures,
        trigger=CronTrigger(minute=0),
        id="refresh_fixtures",
        replace_existing=True,
    )
    # Refresh predictions once per day at 3 AM
    scheduler.add_job(
        _refresh_predictions,
        trigger=CronTrigger(hour=3, minute=0),
        id="refresh_predictions",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started.")


def stop_scheduler() -> None:
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped.")
