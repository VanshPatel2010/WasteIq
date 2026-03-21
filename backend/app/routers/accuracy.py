"""Accuracy router — prediction accuracy tracking and drift detection."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from app.models.user import User, UserRole
from app.models.prediction_accuracy_log import PredictionAccuracyLog
from app.models.model_drift_alert import ModelDriftAlert
from app.models.zone import Zone
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/accuracy", tags=["accuracy"])


@router.get("/summary")
def get_accuracy_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Overall accuracy metrics for the Model Health dashboard."""
    seven_days_ago = datetime.utcnow() - timedelta(days=7)

    # Overall avg error (7 days)
    avg_error_7d = (
        db.query(func.avg(PredictionAccuracyLog.error_magnitude))
        .filter(PredictionAccuracyLog.evaluated_at >= seven_days_ago)
        .scalar()
    ) or 0

    # Zones with active drift alerts
    active_drift_count = (
        db.query(ModelDriftAlert)
        .filter(ModelDriftAlert.resolved_at.is_(None))
        .count()
    )

    # Auto-corrections applied this week
    zones_with_correction = (
        db.query(Zone)
        .filter(Zone.correction_factor > 0)
        .count()
    )

    # Total predictions evaluated
    total_evaluated = (
        db.query(PredictionAccuracyLog)
        .filter(PredictionAccuracyLog.evaluated_at >= seven_days_ago)
        .count()
    )

    return {
        "avg_error_7d": round(avg_error_7d, 2),
        "active_drift_alerts": active_drift_count,
        "auto_corrections_applied": zones_with_correction,
        "total_evaluated_7d": total_evaluated,
    }


@router.get("/zones")
def get_zone_accuracy(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Per-zone accuracy table for Model Health screen."""
    zones = db.query(Zone).all()
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    result = []
    for zone in zones:
        # 7-day error
        avg_error_7d = (
            db.query(func.avg(PredictionAccuracyLog.error_magnitude))
            .filter(
                PredictionAccuracyLog.zone_id == zone.id,
                PredictionAccuracyLog.evaluated_at >= seven_days_ago,
            )
            .scalar()
        ) or 0

        # 30-day error
        avg_error_30d = (
            db.query(func.avg(PredictionAccuracyLog.error_magnitude))
            .filter(
                PredictionAccuracyLog.zone_id == zone.id,
                PredictionAccuracyLog.evaluated_at >= thirty_days_ago,
            )
            .scalar()
        ) or 0

        # Bias direction (most common error direction in 7 days)
        from app.models.prediction_accuracy_log import ErrorDirection
        bias_query = (
            db.query(PredictionAccuracyLog.error_direction, func.count())
            .filter(
                PredictionAccuracyLog.zone_id == zone.id,
                PredictionAccuracyLog.evaluated_at >= seven_days_ago,
            )
            .group_by(PredictionAccuracyLog.error_direction)
            .order_by(func.count().desc())
            .first()
        )
        bias_direction = bias_query[0].value if bias_query else "accurate"

        # Status
        if avg_error_7d < 10:
            status = "healthy"
        elif avg_error_7d < 20:
            status = "watch"
        elif avg_error_7d < 30:
            status = "drifting"
        else:
            status = "unreliable"

        result.append({
            "zone_id": zone.id,
            "zone_name": zone.name,
            "avg_error_7d": round(avg_error_7d, 2),
            "avg_error_30d": round(avg_error_30d, 2),
            "bias_direction": bias_direction,
            "ml_trust_score": zone.ml_trust_score,
            "correction_factor": zone.correction_factor,
            "status": status,
        })

    return result


@router.get("/zones/{zone_id}/history")
def get_zone_accuracy_history(
    zone_id: int,
    days: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """30-day prediction vs actual data for a specific zone."""
    since = datetime.utcnow() - timedelta(days=days)
    logs = (
        db.query(PredictionAccuracyLog)
        .filter(
            PredictionAccuracyLog.zone_id == zone_id,
            PredictionAccuracyLog.evaluated_at >= since,
        )
        .order_by(PredictionAccuracyLog.evaluated_at.asc())
        .all()
    )
    return [
        {
            "id": log.id,
            "predicted_fill_level": log.predicted_fill_level,
            "actual_fill_level": log.actual_fill_level,
            "error_magnitude": log.error_magnitude,
            "error_direction": log.error_direction.value,
            "ground_truth_source": log.ground_truth_source.value,
            "evaluated_at": log.evaluated_at.isoformat(),
        }
        for log in logs
    ]


@router.get("/drift-alerts")
def get_drift_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all active ModelDriftAlerts."""
    alerts = (
        db.query(ModelDriftAlert)
        .filter(ModelDriftAlert.resolved_at.is_(None))
        .order_by(ModelDriftAlert.alert_created_at.desc())
        .all()
    )
    return [
        {
            "id": a.id,
            "zone_id": a.zone_id,
            "zone_name": a.zone.name if a.zone else None,
            "alert_type": a.alert_type.value,
            "avg_error_last_7d": a.avg_error_last_7d,
            "avg_error_last_30d": a.avg_error_last_30d,
            "bias_direction": a.bias_direction.value if a.bias_direction else None,
            "alert_created_at": a.alert_created_at.isoformat(),
            "action_taken": a.action_taken,
        }
        for a in alerts
    ]


@router.post("/run-evaluation")
def run_evaluation(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """Manually trigger accuracy evaluation (for demo purposes)."""
    from app.services.accuracy_evaluator import run_accuracy_evaluation
    result = run_accuracy_evaluation(db)
    return result
