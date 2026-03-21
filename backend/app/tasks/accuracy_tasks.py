"""Accuracy Celery tasks."""
from celery_app import celery_app
from database import SessionLocal


@celery_app.task(name="app.tasks.accuracy_tasks.run_nightly_accuracy_evaluation")
def run_nightly_accuracy_evaluation():
    from app.services.accuracy_evaluator import run_accuracy_evaluation
    db = SessionLocal()
    try:
        return run_accuracy_evaluation(db)
    finally:
        db.close()
