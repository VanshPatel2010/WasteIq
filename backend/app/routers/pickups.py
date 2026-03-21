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

    # Mark the stop as completed in the route's zone_sequence
    from app.models.route import Route, RouteStatus
    today = datetime.utcnow().strftime("%Y-%m-%d")
    route = db.query(Route).filter(
        Route.truck_id == req.truck_id,
        Route.date == today,
        Route.status.in_([RouteStatus.pending, RouteStatus.active]),
    ).first()
    if route and route.zone_sequence:
        updated = False
        for stop in route.zone_sequence:
            if stop.get("zone_id") == req.zone_id and not stop.get("completed"):
                stop["completed"] = True
                updated = True
                break
        if updated:
            # Force SQLAlchemy to detect the JSON mutation
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(route, "zone_sequence")
            # Check if all stops are now completed
            all_done = all(s.get("completed") for s in route.zone_sequence)
            if all_done:
                route.status = RouteStatus.completed
                route.completed_at = datetime.utcnow()
    # --- Worker accuracy comparison, penalty & rewards ---
    worker_comparison = None
    four_hours_ago = datetime.utcnow() - timedelta(hours=4)
    recent_worker = (
        db.query(WasteWorkerReport)
        .filter(
            WasteWorkerReport.zone_id == req.zone_id,
            WasteWorkerReport.reported_at >= four_hours_ago,
        )
        .order_by(WasteWorkerReport.reported_at.desc())
        .first()
    )
    if recent_worker:
        diff = abs(req.fill_level_found - recent_worker.reported_fill_level)
        is_accurate = diff <= 20
        worker_comparison = {
            "worker_reported": round(recent_worker.reported_fill_level, 1),
            "driver_found": round(req.fill_level_found, 1),
            "difference": round(diff, 1),
            "accurate": is_accurate,
            "worker_name": None,
            "reward_awarded": None,
        }
        # Penalize the worker if inaccurate, reward if accurate
        worker_user = db.query(User).filter(User.id == recent_worker.worker_id).first()
        if worker_user:
            worker_comparison["worker_name"] = worker_user.name
            if not is_accurate:
                worker_user.penalty_count = (worker_user.penalty_count or 0) + 1
                worker_user.accuracy_score = max(0, (worker_user.accuracy_score or 100) - 5)
            else:
                # Award reward points
                from app.models.reward import Reward
                points = 10  # Base reward for accurate report
                reason = "Accurate report verified by driver"
                if diff <= 5:
                    points += 5  # Bonus for high accuracy
                    reason = "Highly accurate report verified by driver"
                worker_user.reward_points = (worker_user.reward_points or 0) + points
                reward = Reward(
                    worker_id=worker_user.id,
                    report_id=recent_worker.id,
                    pickup_id=pickup.id,
                    points=points,
                    reason=reason,
                    fill_level_reported=recent_worker.reported_fill_level,
                    fill_level_found=req.fill_level_found,
                    difference=round(diff, 1),
                )
                db.add(reward)
                worker_comparison["reward_awarded"] = {
                    "points": points,
                    "reason": reason,
                    "total_points": (worker_user.reward_points or 0),
                }

    db.commit()

    return {
        "pickup_id": pickup.id,
        "status": "completed",
        "worker_comparison": worker_comparison,
    }


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
