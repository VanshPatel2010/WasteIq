"""Route optimizer — VRP with blended fill levels and priority scoring."""
import math
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.zone import Zone, FillLevelSource
from app.models.truck import Truck, TruckStatus
from app.models.route import Route, RouteStatus
from app.models.waste_worker_report import WasteWorkerReport


def optimize_all_routes(db: Session):
    """Optimize routes for all available trucks today."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    trucks = db.query(Truck).filter(Truck.status != TruckStatus.completed).all()
    zones = db.query(Zone).all()
    
    zone_priorities = _compute_zone_priorities(db, zones)
    sorted_zones = sorted(zone_priorities, key=lambda x: x["priority_score"], reverse=True)
    
    routes_created = 0
    zones_per_truck = max(1, len(sorted_zones) // max(1, len(trucks)))
    
    for i, truck in enumerate(trucks):
        start = i * zones_per_truck
        end = start + zones_per_truck if i < len(trucks) - 1 else len(sorted_zones)
        assigned = sorted_zones[start:end]
        
        if not assigned:
            continue
        
        # Simple nearest-neighbor ordering
        ordered = _nearest_neighbor_order(assigned, truck)
        
        zone_sequence = [{"zone_id": z["zone_id"], "zone_name": z["zone_name"], "order": idx + 1, "completed": False, "priority_score": z["priority_score"], "data_confidence": z["data_confidence"], "fill_level": z["effective_fill_level"]} for idx, z in enumerate(ordered)]
        
        existing = db.query(Route).filter(Route.truck_id == truck.id, Route.date == today).first()
        if existing:
            existing.zone_sequence = zone_sequence
            existing.optimized_at = datetime.utcnow()
            existing.reoptimized_count += 1
        else:
            route = Route(truck_id=truck.id, date=today, status=RouteStatus.pending, zone_sequence=zone_sequence, total_distance_km=round(len(ordered) * 3.5, 1), estimated_duration_mins=round(len(ordered) * 25, 0), reoptimized_count=0)
            db.add(route)
        routes_created += 1
    
    db.commit()
    return {"routes_created": routes_created, "zones_assigned": len(sorted_zones)}


def re_optimize_active_routes(db: Session):
    """Re-optimize only active/pending routes with updated fill levels."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    routes = db.query(Route).filter(Route.date == today, Route.status.in_([RouteStatus.pending, RouteStatus.active])).all()
    zones = db.query(Zone).all()
    zone_priorities = {z["zone_id"]: z for z in _compute_zone_priorities(db, zones)}
    
    reoptimized = 0
    for route in routes:
        sequence = route.zone_sequence or []
        remaining = [s for s in sequence if not s.get("completed", False)]
        completed = [s for s in sequence if s.get("completed", False)]
        
        # Update priorities for remaining stops
        for stop in remaining:
            zp = zone_priorities.get(stop["zone_id"])
            if zp:
                stop["priority_score"] = zp["priority_score"]
                stop["fill_level"] = zp["effective_fill_level"]
                stop["data_confidence"] = zp["data_confidence"]
        
        remaining.sort(key=lambda x: x.get("priority_score", 0), reverse=True)
        for idx, stop in enumerate(remaining):
            stop["order"] = len(completed) + idx + 1
        
        route.zone_sequence = completed + remaining
        route.reoptimized_count += 1
        route.optimized_at = datetime.utcnow()
        reoptimized += 1
    
    db.commit()
    return {"reoptimized": reoptimized}


def _compute_zone_priorities(db: Session, zones):
    """Compute effective fill level and priority score per zone."""
    now = datetime.utcnow()
    two_hours_ago = now - timedelta(hours=2)
    four_hours_ago = now - timedelta(hours=4)
    result = []
    
    for zone in zones:
        # Data priority hierarchy
        worker_report = db.query(WasteWorkerReport).filter(WasteWorkerReport.zone_id == zone.id, WasteWorkerReport.reported_at >= two_hours_ago).order_by(WasteWorkerReport.reported_at.desc()).first()
        
        if worker_report:
            eff = worker_report.reported_fill_level
            confidence = 1.0
        elif zone.fill_level_source == FillLevelSource.driver_reported:
            eff = zone.current_fill_level
            confidence = 0.9
        else:
            eff = zone.current_fill_level
            confidence = zone.ml_trust_score
        
        priority = eff * confidence
        result.append({"zone_id": zone.id, "zone_name": zone.name, "effective_fill_level": round(eff, 1), "data_confidence": confidence, "priority_score": round(priority, 2), "lat": zone.lat, "lng": zone.lng})
    
    return result


def _nearest_neighbor_order(zones, truck):
    """Simple nearest-neighbor ordering from truck position."""
    if not zones:
        return []
    
    current_lat = truck.current_lat or 21.17
    current_lng = truck.current_lng or 72.83
    remaining = list(zones)
    ordered = []
    
    while remaining:
        nearest = min(remaining, key=lambda z: math.sqrt((z["lat"] - current_lat)**2 + (z["lng"] - current_lng)**2))
        ordered.append(nearest)
        current_lat, current_lng = nearest["lat"], nearest["lng"]
        remaining.remove(nearest)
    
    return ordered
