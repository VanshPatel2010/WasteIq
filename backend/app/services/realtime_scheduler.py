"""Realtime route scheduler — background thread that periodically
re-optimizes active truck routes based on fresh fill-level data.

Runs every 60 seconds so that waste-worker reports, driver pickups,
and ML predictions propagate to drivers in near real-time.
"""
import threading
import time
import logging

from database import SessionLocal
from app.services.route_optimizer import re_optimize_active_routes
from app.services.simulation_state import get_current_time

logger = logging.getLogger("wasteiq.scheduler")

_INTERVAL_SECONDS = 60
_running = False


def _scheduler_loop():
    """Background loop that re-optimizes active routes periodically."""
    global _running
    logger.info("Realtime route scheduler started (interval=%ds)", _INTERVAL_SECONDS)
    while _running:
        try:
            db = SessionLocal()
            result = re_optimize_active_routes(db)
            if result.get("reoptimized", 0) > 0:
                logger.info("Auto re-optimized %d routes", result["reoptimized"])
            db.close()
        except Exception as exc:
            logger.error("Scheduler error: %s", exc)
        time.sleep(_INTERVAL_SECONDS)


def start_scheduler():
    """Start the background scheduler thread (non-blocking)."""
    global _running
    if _running:
        return
    _running = True
    t = threading.Thread(target=_scheduler_loop, daemon=True, name="route-scheduler")
    t.start()
    logger.info("Route scheduler thread launched")


def stop_scheduler():
    """Stop the background scheduler."""
    global _running
    _running = False
