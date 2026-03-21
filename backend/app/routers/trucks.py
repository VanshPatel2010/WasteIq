"""Trucks router."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User, UserRole
from app.models.truck import Truck, TruckStatus
from app.auth import get_current_user

router = APIRouter(prefix="/api/trucks", tags=["trucks"])


@router.get("/")
def get_trucks(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trucks = db.query(Truck).all()
    return [
        {
            "id": t.id,
            "vehicle_number": t.vehicle_number,
            "capacity_kg": t.capacity_kg,
            "current_lat": t.current_lat,
            "current_lng": t.current_lng,
            "driver_id": t.driver_id,
            "driver_name": t.driver.name if t.driver else None,
            "status": t.status.value,
        }
        for t in trucks
    ]


class UpdateTruckPosition(BaseModel):
    lat: float
    lng: float


@router.put("/{truck_id}/position")
def update_position(
    truck_id: int,
    req: UpdateTruckPosition,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    truck = db.query(Truck).filter(Truck.id == truck_id).first()
    if not truck:
        raise HTTPException(status_code=404, detail="Truck not found")
    truck.current_lat = req.lat
    truck.current_lng = req.lng
    db.commit()
    return {"status": "updated"}
