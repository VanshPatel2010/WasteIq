"""Celery application configuration."""
import os

from celery import Celery
from celery.schedules import crontab

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "wasteiq",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["app.tasks.prediction_tasks", "app.tasks.accuracy_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="Asia/Kolkata",
    enable_utc=True,
)

# Periodic task schedule
celery_app.conf.beat_schedule = {
    "nightly-accuracy-evaluation": {
        "task": "app.tasks.accuracy_tasks.run_nightly_accuracy_evaluation",
        "schedule": crontab(hour=0, minute=0),  # Midnight IST
    },
    "hourly-surge-prediction": {
        "task": "app.tasks.prediction_tasks.run_surge_predictions",
        "schedule": crontab(minute=0),  # Every hour
    },
}
