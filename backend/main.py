"""FastAPI application entry point."""

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# ── ensure the backend package is importable when run directly ────────────────
_backend_dir = Path(__file__).parent
if str(_backend_dir) not in sys.path:
    sys.path.insert(0, str(_backend_dir))

from database import init_db, is_seeded
from services.fpl_client import close_client
from services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle handler."""
    # ── Startup ───────────────────────────────────────────────────────────────
    logger.info("Initialising database...")
    init_db()

    if not is_seeded():
        logger.info("Database not seeded — seeding from CSV and FPL API...")
        try:
            from services.data_loader import seed_database
            await seed_database()
        except Exception as exc:
            logger.error("Database seeding failed: %s", exc)
    else:
        logger.info("Database already seeded — skipping CSV load.")

    # Load ML models (non-blocking — warns if not trained yet)
    try:
        from ml.predict import load_models
        loaded = load_models()
        if loaded:
            logger.info("ML models loaded successfully.")
        else:
            logger.warning(
                "No ML models found. Run: python -m backend.ml.train  to train models."
            )
    except Exception as exc:
        logger.warning("Could not load ML models: %s", exc)

    # Start background scheduler
    try:
        start_scheduler()
    except Exception as exc:
        logger.warning("Scheduler failed to start: %s", exc)

    yield

    # ── Shutdown ──────────────────────────────────────────────────────────────
    stop_scheduler()
    await close_client()
    logger.info("Application shutdown complete.")


app = FastAPI(
    title="EPL Stat — Premier League & FPL Prediction API",
    description="Backend for Premier League standings, FPL player stats, and ML-powered predictions.",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
from routers.teams import router as teams_router, standings_router
from routers.players import router as players_router
from routers.fixtures import router as fixtures_router
from routers.predictions import router as predictions_router
from routers.fpl_proxy import router as fpl_proxy_router

app.include_router(teams_router, prefix="/api")
app.include_router(standings_router, prefix="/api")
app.include_router(players_router, prefix="/api")
app.include_router(fixtures_router, prefix="/api")
app.include_router(predictions_router, prefix="/api")
app.include_router(fpl_proxy_router, prefix="/api")


@app.get("/", tags=["health"])
async def root():
    return {"status": "ok", "message": "EPL Stat API is running"}


@app.get("/health", tags=["health"])
async def health():
    from ml.predict import models_ready
    from database import is_seeded
    return {
        "status": "ok",
        "db_seeded": is_seeded(),
        "models_ready": models_ready(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[str(_backend_dir)],
    )
