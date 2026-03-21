import math
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.truck import Truck, TruckStatus
from app.models.zone import Zone
from app.services.surge_predictor import get_model
from app.services.simulation_state import get_current_time
import pandas as pd

def calculate_and_allocate_fleet(db: Session, target_date: datetime = None) -> dict:
    """Dynamically activates/deactivates trucks based on ML waste predictions."""
    model = get_model()
    if not model:
        return {"error": "ML Model not loaded"}
        
    now = target_date or get_current_time()
    zones = db.query(Zone).all()
    
    hour = now.hour
    day_of_week = now.weekday()
    month = now.month
    is_weekend = 1 if day_of_week >= 5 else 0
    
    if month in [11, 12, 1, 2]: season = 0
    elif month in [3, 4, 5, 6]: season = 1
    else: season = 2
    
    festival = 0
    if month == 10 or (month == 11 and now.day <= 5):
        if now.day >= 15 and month == 10: festival = 1
        if (month == 10 and now.day >= 24) or (month == 11 and now.day <= 2): festival = 2
    elif month == 1 and 14 <= now.day <= 15:
        festival = 3
        
    type_map = {"residential": 0, "commercial": 1, "industrial": 2, "market": 3}
    
    records = []
    for z in zones:
        z_type = type_map.get(z.zone_type.value, 0)
        records.append({
            "zone_id": z.id, "zone_type_encoded": z_type, "hour": hour,
            "day_of_week": day_of_week, "month": month, "is_weekend": is_weekend,
            "season": season, "festival": festival
        })
        
    df = pd.DataFrame(records)
    predictions = model.predict(df)
    
    # Assume the prediction is per-hour. We estimate a 4-hour peak window.
    total_shift_waste_kg = float(predictions.sum()) * 4.0
    
    # Extrapolate for all 365 days, a single truck can do ~2000kg in a shift
    AVG_TRUCK_CAPACITY = 2000.0
    
    # 10% buffer
    trucks_needed = math.ceil((total_shift_waste_kg / AVG_TRUCK_CAPACITY) * 1.1)
    
    all_trucks = db.query(Truck).all()
    max_trucks = len(all_trucks)
    
    # Minimum 4 trucks always active
    target_active_count = max(4, min(trucks_needed, max_trucks))
    
    active_trucks = [t for t in all_trucks if t.is_active]
    inactive_trucks = [t for t in all_trucks if not t.is_active]
    
    current_active = len(active_trucks)
    activated = 0
    deactivated = 0
    
    if current_active < target_active_count:
        to_activate = target_active_count - current_active
        for i in range(to_activate):
            if i < len(inactive_trucks):
                inactive_trucks[i].is_active = True
                inactive_trucks[i].status = TruckStatus.idle
                activated += 1
    elif current_active > target_active_count:
        to_deactivate = current_active - target_active_count
        count = 0
        # Try to deactivate idle trucks first
        for t in active_trucks:
            if t.status in [TruckStatus.idle, TruckStatus.off_duty]:
                t.is_active = False
                t.status = TruckStatus.off_duty
                deactivated += 1
                count += 1
                if count >= to_deactivate:
                    break
                    
    db.commit()
    
    return {
        "scenario_date": now.isoformat(),
        "is_festival": festival > 0,
        "predicted_shift_waste_kg": round(total_shift_waste_kg, 1),
        "target_trucks": target_active_count,
        "activated": activated,
        "deactivated": deactivated,
        "total_active_now": current_active + activated - deactivated
    }
