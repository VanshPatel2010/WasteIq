"""Routes router — VRP optimization and route management."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User, UserRole
from app.models.route import Route, RouteStatus
from app.models.truck import Truck
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/routes", tags=["routes"])


@router.get("/")
def get_routes(
    date: str | None = None,
    truck_id: int | None = None,
    all: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Route)
    if date:
        query = query.filter(Route.date == date)
    if truck_id:
        query = query.filter(Route.truck_id == truck_id)

    # If driver, only show their routes unless all=True is requested
    if current_user.role == UserRole.driver and not all:
        truck = db.query(Truck).filter(Truck.driver_id == current_user.id).first()
        if truck:
            query = query.filter(Route.truck_id == truck.id)

    routes = query.order_by(Route.date.desc()).limit(50).all()
    return [
        {
            "id": r.id,
            "truck_id": r.truck_id,
            "date": r.date,
            "status": r.status.value,
            "zone_sequence": r.zone_sequence,
            "total_distance_km": r.total_distance_km,
            "estimated_duration_mins": r.estimated_duration_mins,
            "optimized_at": r.optimized_at.isoformat() if r.optimized_at else None,
            "completed_at": r.completed_at.isoformat() if r.completed_at else None,
            "reoptimized_count": r.reoptimized_count,
        }
        for r in routes
    ]


@router.post("/optimize")
def optimize_routes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.admin)),
):
    """Trigger route optimization for today. Uses the route optimizer service."""
    from app.services.route_optimizer import optimize_all_routes
    result = optimize_all_routes(db)
    return result


@router.post("/re-optimize")
def re_optimize_routes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Re-optimize active routes based on new fill level data (e.g., worker report)."""
    from app.services.route_optimizer import re_optimize_active_routes
    result = re_optimize_active_routes(db)
    return result


@router.put("/{route_id}/complete")
def complete_route(
    route_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    route.status = RouteStatus.completed
    route.completed_at = datetime.utcnow()
    db.commit()
    return {"status": "completed"}
