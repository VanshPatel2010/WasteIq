"""Prediction Celery tasks."""
from celery_app import celery_app
from database import SessionLocal


@celery_app.task(name="app.tasks.prediction_tasks.run_surge_predictions")
def run_surge_predictions():
    from app.services.surge_predictor import run_predictions_for_all_zones
    db = SessionLocal()
    try:
        return run_predictions_for_all_zones(db)
    finally:
        db.close()
