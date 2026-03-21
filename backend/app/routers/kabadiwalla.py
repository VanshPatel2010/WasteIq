"""Kabadiwalla router — offline-capable pickup logging."""
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from app.models.user import User, UserRole
from app.models.kabadiwala_log import KabadiwalaLog, QuantityEstimate
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/kabadiwalla", tags=["kabadiwalla"])

class LogRequest(BaseModel):
    material_type: str
    quantity_estimate: QuantityEstimate
    weight_kg: float | None = None
    lat: float | None = None
    lng: float | None = None
    logged_at: str | None = None

class BulkSyncRequest(BaseModel):
    logs: list[LogRequest]

@router.post("/logs")
def create_log(req: LogRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.kabadiwalla))):
    log = KabadiwalaLog(worker_id=current_user.id, material_type=req.material_type, quantity_estimate=req.quantity_estimate, weight_kg=req.weight_kg, lat=req.lat, lng=req.lng, logged_at=datetime.fromisoformat(req.logged_at) if req.logged_at else datetime.utcnow(), synced=True, sync_at=datetime.utcnow())
    db.add(log)
    db.commit()
    db.refresh(log)
    return {"log_id": log.id, "synced": True}

@router.post("/sync")
def sync_logs(req: BulkSyncRequest, db: Session = Depends(get_db), current_user: User = Depends(require_role(UserRole.kabadiwalla))):
    created = []
    for r in req.logs:
        log = KabadiwalaLog(worker_id=current_user.id, material_type=r.material_type, quantity_estimate=r.quantity_estimate, weight_kg=r.weight_kg, lat=r.lat, lng=r.lng, logged_at=datetime.fromisoformat(r.logged_at) if r.logged_at else datetime.utcnow(), synced=True, sync_at=datetime.utcnow())
        db.add(log)
        created.append(log)
    db.commit()
    return {"synced_count": len(created)}

@router.get("/logs")
def get_logs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    query = db.query(KabadiwalaLog)
    if current_user.role == UserRole.kabadiwalla:
        query = query.filter(KabadiwalaLog.worker_id == current_user.id)
    logs = query.order_by(KabadiwalaLog.logged_at.desc()).limit(100).all()
    return [{"id": l.id, "material_type": l.material_type, "quantity_estimate": l.quantity_estimate.value, "weight_kg": l.weight_kg, "lat": l.lat, "lng": l.lng, "logged_at": l.logged_at.isoformat(), "synced": l.synced} for l in logs]
