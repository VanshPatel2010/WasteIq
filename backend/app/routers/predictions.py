"""Predictions router — surge predictions."""
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User
from app.models.surge_prediction import SurgePrediction
from app.auth import get_current_user

router = APIRouter(prefix="/api/predictions", tags=["predictions"])


@router.get("/")
def get_predictions(
    zone_id: int | None = None,
    hours: int = Query(default=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(hours=hours)
    query = db.query(SurgePrediction).filter(SurgePrediction.predicted_at >= since)
    if zone_id:
        query = query.filter(SurgePrediction.zone_id == zone_id)

    preds = query.order_by(SurgePrediction.predicted_at.desc()).limit(100).all()
    return [
        {
            "id": p.id,
            "zone_id": p.zone_id,
            "zone_name": p.zone.name if p.zone else None,
            "predicted_fill_level": p.predicted_fill_level,
            "surge_score": p.surge_score,
            "confidence": p.confidence,
            "predicted_at": p.predicted_at.isoformat(),
            "prediction_for_datetime": p.prediction_for_datetime.isoformat(),
            "model_version": p.model_version,
            "overridden_by_worker": p.overridden_by_worker,
        }
        for p in preds
    ]


@router.get("/surge-alerts")
def get_surge_alerts(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get predictions with high surge scores (active alerts)."""
    alerts = (
        db.query(SurgePrediction)
        .filter(
            SurgePrediction.surge_score >= 6.0,
            SurgePrediction.overridden_by_worker == False,
        )
        .order_by(SurgePrediction.surge_score.desc())
        .limit(50)
        .all()
    )
    return [
        {
            "id": p.id,
            "zone_id": p.zone_id,
            "zone_name": p.zone.name if p.zone else None,
            "predicted_fill_level": p.predicted_fill_level,
            "surge_score": p.surge_score,
            "confidence": p.confidence,
            "predicted_at": p.predicted_at.isoformat(),
            "fill_level_source": p.zone.fill_level_source.value if p.zone else "predicted",
            "overridden_by_worker": p.overridden_by_worker,
        }
        for p in alerts
    ]
