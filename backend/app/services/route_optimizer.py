"""Route optimizer — Real-time dynamic VRP with composite urgency scoring.

Uses Haversine distance, fill-level confidence weighting, zone-type waste
generation rates, time-decay since last collection, and truck capacity
constraints for intelligent greedy-insertion routing.
"""
import math
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.zone import Zone, ZoneType, FillLevelSource
from app.models.truck import Truck, TruckStatus
from app.models.route import Route, RouteStatus
from app.models.waste_worker_report import WasteWorkerReport
from app.services.simulation_state import get_current_time

# --- Zone-type waste generation rates (kg per bin per hour) ---
ZONE_TYPE_RATES = {
    ZoneType.market: 2.5,
    ZoneType.commercial: 1.8,
    ZoneType.industrial: 1.5,
    ZoneType.residential: 1.0,
}

# Average kg per bin at 100% fill
KG_PER_BIN_FULL = 25.0

# Time decay exponent — how aggressively neglected zones gain urgency
TIME_DECAY_EXPONENT = 1.3


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate the great-circle distance between two points in km."""
    R = 6371.0  # Earth radius in km
    d_lat = math.radians(lat2 - lat1)
    d_lng = math.radians(lng2 - lng1)
    a = (math.sin(d_lat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(d_lng / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _get_effective_fill(db: Session, zone: Zone) -> tuple[float, float]:
    """Return (effective_fill_level, data_confidence) using the data priority hierarchy.

    Priority: worker report (last 2h) > driver report > ML prediction.
    """
    now = get_current_time()
    two_hours_ago = now - timedelta(hours=2)

    worker_report = (
        db.query(WasteWorkerReport)
        .filter(WasteWorkerReport.zone_id == zone.id,
                WasteWorkerReport.reported_at >= two_hours_ago)
        .order_by(WasteWorkerReport.reported_at.desc())
        .first()
    )

    if worker_report:
        return worker_report.reported_fill_level, 1.0
    elif zone.fill_level_source == FillLevelSource.driver_reported:
        return zone.current_fill_level, 0.9
    else:
        # ML prediction — apply correction factor if one exists
        corrected = zone.current_fill_level * (1.0 - zone.correction_factor)
        return corrected, max(0.3, zone.ml_trust_score)


def _estimate_waste_kg(zone: Zone, fill_level: float) -> float:
    """Estimate the total waste weight in the zone based on fill level, bin count, and zone type."""
    rate = ZONE_TYPE_RATES.get(zone.zone_type, 1.0)
    # Scale: more bins + higher fill + higher generation rate = more waste
    return zone.bin_count * (fill_level / 100.0) * KG_PER_BIN_FULL * (rate / 1.0)


def _time_decay_factor(zone: Zone) -> float:
    """Exponential urgency boost for zones not collected recently."""
    if not zone.last_collected_at:
        return 2.0  # Never collected — maximum urgency boost

    hours_since = (datetime.utcnow() - zone.last_collected_at).total_seconds() / 3600.0
    # After 12 hours the factor is ~2.0, after 24h ~3.5
    return 1.0 + (hours_since / 12.0) ** TIME_DECAY_EXPONENT


def _compute_dynamic_urgency(
    db: Session,
    zone: Zone,
    truck_lat: float,
    truck_lng: float,
) -> dict:
    """Compute composite urgency score for a zone relative to a truck.

    urgency = fill_weight × distance_weight × time_decay
    """
    fill_level, confidence = _get_effective_fill(db, zone)
    fill_weight = (fill_level / 100.0) * confidence

    distance_km = _haversine_km(truck_lat, truck_lng, zone.lat, zone.lng)
    # Inverse distance weight — cap minimum distance to avoid division by near-zero
    distance_weight = 1.0 / max(0.3, distance_km)

    decay = _time_decay_factor(zone)
    waste_kg = _estimate_waste_kg(zone, fill_level)

    urgency = fill_weight * distance_weight * decay

    return {
        "zone_id": zone.id,
        "zone_name": zone.name,
        "lat": zone.lat,
        "lng": zone.lng,
        "effective_fill_level": round(fill_level, 1),
        "data_confidence": round(confidence, 2),
        "distance_km": round(distance_km, 2),
        "estimated_waste_kg": round(waste_kg, 1),
        "time_decay": round(decay, 2),
        "urgency_score": round(urgency, 4),
    }


def _greedy_route(scored_zones: list[dict], truck_lat: float, truck_lng: float, capacity_kg: float) -> list[dict]:
    """Build a route using greedy insertion — pick highest-urgency reachable zone, repeat.

    Respects truck capacity. Recalculates distance weight after each hop.
    """
    remaining = list(scored_zones)
    ordered = []
    cur_lat, cur_lng = truck_lat, truck_lng
    remaining_capacity = capacity_kg

    while remaining:
        # Recalculate urgency from current position
        for z in remaining:
            dist = _haversine_km(cur_lat, cur_lng, z["lat"], z["lng"])
            z["live_distance_km"] = dist
            z["live_urgency"] = (z["effective_fill_level"] / 100.0) * z["data_confidence"] * (1.0 / max(0.3, dist)) * z["time_decay"]

        # Sort by live urgency descending
        remaining.sort(key=lambda z: z["live_urgency"], reverse=True)

        # Pick the best zone that fits remaining capacity
        picked = None
        for z in remaining:
            if z["estimated_waste_kg"] <= remaining_capacity:
                picked = z
                break

        if not picked:
            break  # Can't fit any more zones

        ordered.append(picked)
        cur_lat, cur_lng = picked["lat"], picked["lng"]
        remaining_capacity -= picked["estimated_waste_kg"]
        remaining.remove(picked)

    return ordered


def optimize_all_routes(db: Session):
    """Optimize routes for all available trucks today using dynamic urgency."""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    trucks = db.query(Truck).filter(
        Truck.status != TruckStatus.completed,
        Truck.is_active == True
    ).all()
    zones = db.query(Zone).all()

    if not trucks or not zones:
        return {"routes_created": 0, "zones_assigned": 0, "algorithm": "dynamic_urgency"}

    routes_created = 0
    assigned_zone_ids: set[int] = set()

    for truck in trucks:
        truck_lat = truck.current_lat or 21.17
        truck_lng = truck.current_lng or 72.83

        # Score all unassigned zones relative to this truck
        available_zones = [z for z in zones if z.id not in assigned_zone_ids]
        scored = [_compute_dynamic_urgency(db, z, truck_lat, truck_lng) for z in available_zones]

        # Build capacity-aware greedy route
        route_zones = _greedy_route(scored, truck_lat, truck_lng, truck.capacity_kg)

        if not route_zones:
            continue

        # Mark zones as assigned
        for rz in route_zones:
            assigned_zone_ids.add(rz["zone_id"])

        # Calculate real total distance along the route path
        total_km = 0.0
        prev_lat, prev_lng = truck_lat, truck_lng
        for rz in route_zones:
            total_km += _haversine_km(prev_lat, prev_lng, rz["lat"], rz["lng"])
            prev_lat, prev_lng = rz["lat"], rz["lng"]

        zone_sequence = [
            {
                "zone_id": rz["zone_id"],
                "zone_name": rz["zone_name"],
                "order": idx + 1,
                "completed": False,
                "fill_level": rz["effective_fill_level"],
                "priority_score": rz["urgency_score"],
                "data_confidence": rz["data_confidence"],
                "estimated_waste_kg": rz["estimated_waste_kg"],
                "distance_km": rz["live_distance_km"],
                "lat": rz["lat"],
                "lng": rz["lng"],
            }
            for idx, rz in enumerate(route_zones)
        ]

        # Average speed ~20 km/h in city + 10 min per stop for collection
        estimated_mins = round((total_km / 20.0) * 60 + len(route_zones) * 10, 0)

        existing = db.query(Route).filter(Route.truck_id == truck.id, Route.date == today).first()
        if existing:
            # Preserve completed stops from existing route
            completed_stops = [s for s in (existing.zone_sequence or []) if s.get("completed")]
            completed_zone_ids = {s["zone_id"] for s in completed_stops}
            new_stops = [s for s in zone_sequence if s["zone_id"] not in completed_zone_ids]

            # Re-number
            for idx, s in enumerate(new_stops):
                s["order"] = len(completed_stops) + idx + 1

            existing.zone_sequence = completed_stops + new_stops
            existing.total_distance_km = round(total_km, 1)
            existing.estimated_duration_mins = estimated_mins
            existing.optimized_at = datetime.utcnow()
            existing.reoptimized_count += 1

            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(existing, "zone_sequence")
        else:
            route = Route(
                truck_id=truck.id,
                date=today,
                status=RouteStatus.pending,
                zone_sequence=zone_sequence,
                total_distance_km=round(total_km, 1),
                estimated_duration_mins=estimated_mins,
                reoptimized_count=0,
            )
            db.add(route)

        truck.status = TruckStatus.on_route
        routes_created += 1

    db.commit()
    return {
        "routes_created": routes_created,
        "zones_assigned": len(assigned_zone_ids),
        "algorithm": "dynamic_urgency_haversine",
    }


def re_optimize_active_routes(db: Session):
    """Re-optimize only active/pending routes with updated fill levels.

    Called automatically by the realtime scheduler.
    """
    today = datetime.utcnow().strftime("%Y-%m-%d")
    routes = db.query(Route).filter(
        Route.date == today,
        Route.status.in_([RouteStatus.pending, RouteStatus.active]),
    ).all()

    if not routes:
        return {"reoptimized": 0}

    reoptimized = 0
    for route in routes:
        truck = db.query(Truck).filter(Truck.id == route.truck_id).first()
        if not truck:
            continue

        sequence = route.zone_sequence or []
        completed_stops = [s for s in sequence if s.get("completed")]
        remaining_stops = [s for s in sequence if not s.get("completed")]

        if not remaining_stops:
            continue

        # Get the remaining zone objects
        remaining_zone_ids = [s["zone_id"] for s in remaining_stops]
        remaining_zones = db.query(Zone).filter(Zone.id.in_(remaining_zone_ids)).all()

        # Truck's effective position = last completed zone or truck GPS
        if completed_stops:
            last_done_id = completed_stops[-1]["zone_id"]
            last_zone = db.query(Zone).filter(Zone.id == last_done_id).first()
            cur_lat = last_zone.lat if last_zone else (truck.current_lat or 21.17)
            cur_lng = last_zone.lng if last_zone else (truck.current_lng or 72.83)
        else:
            cur_lat = truck.current_lat or 21.17
            cur_lng = truck.current_lng or 72.83

        # Estimate remaining capacity
        collected_kg = sum(s.get("estimated_waste_kg", 0) for s in completed_stops)
        remaining_capacity = max(500, truck.capacity_kg - collected_kg)

        # Re-score remaining zones
        scored = [_compute_dynamic_urgency(db, z, cur_lat, cur_lng) for z in remaining_zones]
        new_order = _greedy_route(scored, cur_lat, cur_lng, remaining_capacity)

        # Rebuild zone_sequence
        new_stops = [
            {
                "zone_id": rz["zone_id"],
                "zone_name": rz["zone_name"],
                "order": len(completed_stops) + idx + 1,
                "completed": False,
                "fill_level": rz["effective_fill_level"],
                "priority_score": rz["urgency_score"],
                "data_confidence": rz["data_confidence"],
                "estimated_waste_kg": rz["estimated_waste_kg"],
                "distance_km": rz.get("live_distance_km", 0),
                "lat": rz["lat"],
                "lng": rz["lng"],
            }
            for idx, rz in enumerate(new_order)
        ]

        route.zone_sequence = completed_stops + new_stops
        route.reoptimized_count += 1
        route.optimized_at = datetime.utcnow()

        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(route, "zone_sequence")
        reoptimized += 1

    db.commit()
    return {"reoptimized": reoptimized}
