import pandas as pd
import joblib
import os
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.zone import Zone, FillLevelSource
from app.models.surge_prediction import SurgePrediction
from app.models.waste_worker_report import WasteWorkerReport
from app.models.zone_fill_level_log import ZoneFillLevelLog, FillLevelChangeSource
from app.services.simulation_state import get_current_time

MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'models', 'waste_model.joblib')
_model = None

def get_model():
    global _model
    if _model is None and os.path.exists(MODEL_PATH):
        _model = joblib.load(MODEL_PATH)
    return _model

def run_predictions_for_all_zones(db: Session):
    """Run surge predictions for all zones using XGBoost ML Model."""
    zones = db.query(Zone).all()
    predictions_created = 0
    skipped = 0
    now = get_current_time()
    two_hours_ago = now - timedelta(hours=2)
    
    for zone in zones:
        # Check if worker report exists in last 2 hours
        recent_report = db.query(WasteWorkerReport).filter(
            WasteWorkerReport.zone_id == zone.id,
            WasteWorkerReport.reported_at >= two_hours_ago
        ).first()
        
        if recent_report:
            skipped += 1
            continue
        
        # Generate prediction using ML model
        predicted_fill = _generate_prediction(zone, now)
        
        # Apply correction factor
        if zone.correction_factor != 0:
            predicted_fill = predicted_fill * (1 - zone.correction_factor)
        predicted_fill = max(0, min(100, predicted_fill))
        
        # Calculate confidence with trust score
        base_confidence = 0.85
        final_confidence = base_confidence * zone.ml_trust_score
        
        # Calculate surge score
        surge_score = _calculate_surge_score(predicted_fill)
        
        prediction = SurgePrediction(
            zone_id=zone.id,
            prediction_for_datetime=now + timedelta(hours=4),
            predicted_fill_level=round(predicted_fill, 1),
            surge_score=round(surge_score, 1),
            confidence=round(final_confidence, 2),
            model_version="v2.0-xgboost",
            features_used={"day_of_week": now.weekday(), "hour": now.hour, "zone_type": zone.zone_type.value},
        )
        db.add(prediction)
        
        # Update zone if no higher-priority data
        if zone.fill_level_source == FillLevelSource.predicted:
            zone.current_fill_level = round(predicted_fill, 1)
            zone.fill_level_updated_at = now
            
            fill_log = ZoneFillLevelLog(
                zone_id=zone.id, fill_level=round(predicted_fill, 1),
                source=FillLevelChangeSource.ml_prediction,
            )
            db.add(fill_log)
        
        predictions_created += 1
    
    db.commit()
    return {"predictions_created": predictions_created, "skipped_worker_reported": skipped}


def _generate_prediction(zone: Zone, now: datetime) -> float:
    """Predict waste kg from XGBoost and convert to fill level % (assuming 100kg = 100%)."""
    model = get_model()
    if not model:
        # Fallback if model not loaded
        return zone.current_fill_level if zone.current_fill_level > 0 else 30.0
        
    hour = now.hour
    day_of_week = now.weekday()
    month = now.month
    is_weekend = 1 if day_of_week >= 5 else 0
    
    # season
    if month in [11, 12, 1, 2]: season = 0
    elif month in [3, 4, 5, 6]: season = 1
    else: season = 2
    
    # festival (approx dates for demo UI)
    festival = 0
    if month == 10 or (month == 11 and now.day <= 5):
        if now.day >= 15 and month == 10: festival = 1  # Navratri approx
        if (month == 10 and now.day >= 24) or (month == 11 and now.day <= 2): festival = 2 # Diwali
    elif month == 1 and 14 <= now.day <= 15:
        festival = 3
        
    type_map = {"residential": 0, "commercial": 1, "industrial": 2, "market": 3}
    z_type = type_map.get(zone.zone_type.value, 0)
    
    df = pd.DataFrame([{
        "zone_id": zone.id,
        "zone_type_encoded": z_type,
        "hour": hour,
        "day_of_week": day_of_week,
        "month": month,
        "is_weekend": is_weekend,
        "season": season,
        "festival": festival
    }])
    
    pred_kg = float(model.predict(df)[0])
    # Assume max capacity of a single zone is roughly 120kg for this demo
    fill_percent = (pred_kg / 120.0) * 100
    return max(0, min(100, fill_percent))


def _calculate_surge_score(fill_level: float) -> float:
    """Calculate surge score (0-10) from fill level."""
    if fill_level >= 90:
        return 8.0 + (fill_level - 90) * 0.2
    elif fill_level >= 75:
        return 6.0 + (fill_level - 75) * 0.133
    elif fill_level >= 50:
        return 3.0 + (fill_level - 50) * 0.12
    else:
        return fill_level * 0.06

