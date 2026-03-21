"""Zones router — CRUD + fill level log."""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User, UserRole
from app.models.zone import Zone, FillLevelSource
from app.models.zone_fill_level_log import ZoneFillLevelLog
from app.models.waste_worker_report import WasteWorkerReport
from app.models.surge_prediction import SurgePrediction
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/zones", tags=["zones"])


class ZoneResponse(BaseModel):
    id: int
    name: str
    city: str
    lat: float
    lng: float
    area_sqkm: float | None
    zone_type: str
    current_fill_level: float
    fill_level_source: str
    fill_level_updated_at: str | None
    last_collected_at: str | None
    assigned_waste_worker_id: int | None
    ml_trust_score: float
    correction_factor: float
    bin_count: int


class ZoneDetailResponse(ZoneResponse):
    worker_name: str | None = None
    latest_prediction: dict | None = None
    latest_worker_report: dict | None = None


@router.get("/", response_model=list[ZoneResponse])
def get_zones(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    zones = db.query(Zone).all()
    return [
        ZoneResponse(
            id=z.id, name=z.name, city=z.city, lat=z.lat, lng=z.lng,
            area_sqkm=z.area_sqkm, zone_type=z.zone_type.value,
            current_fill_level=z.current_fill_level,
            fill_level_source=z.fill_level_source.value if z.fill_level_source else "predicted",
            fill_level_updated_at=z.fill_level_updated_at.isoformat() if z.fill_level_updated_at else None,
            last_collected_at=z.last_collected_at.isoformat() if z.last_collected_at else None,
            assigned_waste_worker_id=z.assigned_waste_worker_id,
            ml_trust_score=z.ml_trust_score,
            correction_factor=z.correction_factor,
            bin_count=z.bin_count,
        )
        for z in zones
    ]


@router.get("/{zone_id}", response_model=ZoneDetailResponse)
def get_zone(zone_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    zone = db.query(Zone).filter(Zone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    worker_name = None
    if zone.assigned_waste_worker:
        worker_name = zone.assigned_waste_worker.name

    # Latest prediction
    latest_pred = (
        db.query(SurgePrediction)
        .filter(SurgePrediction.zone_id == zone_id)
        .order_by(SurgePrediction.predicted_at.desc())
        .first()
    )
    pred_dict = None
    if latest_pred:
        pred_dict = {
            "id": latest_pred.id,
            "predicted_fill_level": latest_pred.predicted_fill_level,
            "surge_score": latest_pred.surge_score,
            "confidence": latest_pred.confidence,
            "predicted_at": latest_pred.predicted_at.isoformat(),
            "overridden_by_worker": latest_pred.overridden_by_worker,
        }

    # Latest worker report
    latest_report = (
        db.query(WasteWorkerReport)
        .filter(WasteWorkerReport.zone_id == zone_id)
        .order_by(WasteWorkerReport.reported_at.desc())
        .first()
    )
    report_dict = None
    if latest_report:
        report_dict = {
            "id": latest_report.id,
            "reported_fill_level": latest_report.reported_fill_level,
            "reported_at": latest_report.reported_at.isoformat(),
            "overflow_detected": latest_report.overflow_detected,
            "worker_name": latest_report.worker.name if latest_report.worker else None,
        }

    return ZoneDetailResponse(
        id=zone.id, name=zone.name, city=zone.city, lat=zone.lat, lng=zone.lng,
        area_sqkm=zone.area_sqkm, zone_type=zone.zone_type.value,
        current_fill_level=zone.current_fill_level,
        fill_level_source=zone.fill_level_source.value if zone.fill_level_source else "predicted",
        fill_level_updated_at=zone.fill_level_updated_at.isoformat() if zone.fill_level_updated_at else None,
        last_collected_at=zone.last_collected_at.isoformat() if zone.last_collected_at else None,
        assigned_waste_worker_id=zone.assigned_waste_worker_id,
        ml_trust_score=zone.ml_trust_score,
        correction_factor=zone.correction_factor,
        bin_count=zone.bin_count,
        worker_name=worker_name,
        latest_prediction=pred_dict,
        latest_worker_report=report_dict,
    )


@router.get("/{zone_id}/fill-log")
def get_zone_fill_log(
    zone_id: int,
    days: int = Query(default=7),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)
    logs = (
        db.query(ZoneFillLevelLog)
        .filter(ZoneFillLevelLog.zone_id == zone_id, ZoneFillLevelLog.recorded_at >= since)
        .order_by(ZoneFillLevelLog.recorded_at.desc())
        .all()
    )
    return [
        {
            "id": log.id,
            "fill_level": log.fill_level,
            "source": log.source.value,
            "source_id": log.source_id,
            "recorded_at": log.recorded_at.isoformat(),
        }
        for log in logs
    ]
