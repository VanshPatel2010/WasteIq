"""Pickups router — driver pickup completion."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User, UserRole
from app.models.pickup import Pickup
from app.models.zone import Zone, FillLevelSource
from app.models.zone_fill_level_log import ZoneFillLevelLog, FillLevelChangeSource
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/pickups", tags=["pickups"])


class PickupCompleteRequest(BaseModel):
    zone_id: int
    truck_id: int
    fill_level_found: float
    weight_collected_kg: float | None = None
    notes: str | None = None


@router.post("/complete")
def complete_pickup(
    req: PickupCompleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.driver)),
):
    """Driver marks a pickup as completed and reports the fill level found."""
    zone = db.query(Zone).filter(Zone.id == req.zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")

    # Create pickup record
    pickup = Pickup(
        truck_id=req.truck_id,
        zone_id=req.zone_id,
        driver_id=current_user.id,
        scheduled_at=datetime.utcnow(),
        completed_at=datetime.utcnow(),
        fill_level_found=req.fill_level_found,
        weight_collected_kg=req.weight_collected_kg,
        notes=req.notes,
        synced=True,
    )
    db.add(pickup)
    db.flush()

    # Update zone fill level (PRIORITY 2 — driver report)
    # Only update if no worker report in last 2 hours
    from app.models.waste_worker_report import WasteWorkerReport
    from datetime import timedelta
    two_hours_ago = datetime.utcnow() - timedelta(hours=2)
    recent_worker_report = (
        db.query(WasteWorkerReport)
        .filter(
            WasteWorkerReport.zone_id == req.zone_id,
            WasteWorkerReport.reported_at >= two_hours_ago,
        )
        .first()
    )

    if not recent_worker_report:
        # After collection, zone fill level drops significantly
        zone.current_fill_level = max(0, req.fill_level_found - req.fill_level_found * 0.8)
        zone.fill_level_source = FillLevelSource.driver_reported
        zone.fill_level_updated_at = datetime.utcnow()
        zone.last_collected_at = datetime.utcnow()

    # Log to ZoneFillLevelLog
    fill_log = ZoneFillLevelLog(
        zone_id=req.zone_id,
        fill_level=req.fill_level_found,
        source=FillLevelChangeSource.driver_report,
        source_id=pickup.id,
    )
    db.add(fill_log)
    db.commit()

    return {"pickup_id": pickup.id, "status": "completed"}


@router.get("/")
def get_pickups(
    zone_id: int | None = None,
    driver_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Pickup)
    if current_user.role == UserRole.driver:
        query = query.filter(Pickup.driver_id == current_user.id)
    if zone_id:
        query = query.filter(Pickup.zone_id == zone_id)
    if driver_id:
        query = query.filter(Pickup.driver_id == driver_id)

    pickups = query.order_by(Pickup.completed_at.desc()).limit(100).all()
    return [
        {
            "id": p.id,
            "truck_id": p.truck_id,
            "zone_id": p.zone_id,
            "driver_id": p.driver_id,
            "fill_level_found": p.fill_level_found,
            "weight_collected_kg": p.weight_collected_kg,
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
            "zone_name": p.zone.name if p.zone else None,
        }
        for p in pickups
    ]
