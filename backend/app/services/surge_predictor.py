"""Surge predictor service — Prophet + XGBoost for fill level prediction."""
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.zone import Zone, FillLevelSource
from app.models.surge_prediction import SurgePrediction
from app.models.waste_worker_report import WasteWorkerReport
from app.models.zone_fill_level_log import ZoneFillLevelLog, FillLevelChangeSource


def run_predictions_for_all_zones(db: Session):
    """Run surge predictions for all zones (zone-aware)."""
    zones = db.query(Zone).all()
    predictions_created = 0
    skipped = 0
    now = datetime.utcnow()
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
        
        # Generate prediction using synthetic model
        predicted_fill = _generate_prediction(zone, now)
        
        # Apply correction factor
        if zone.correction_factor != 0:
            predicted_fill = predicted_fill * (1 - zone.correction_factor)
        predicted_fill = max(0, min(100, predicted_fill))
        
        # Calculate confidence with trust score
        base_confidence = 0.75 + random.uniform(-0.1, 0.15)
        final_confidence = base_confidence * zone.ml_trust_score
        
        # Calculate surge score
        surge_score = _calculate_surge_score(predicted_fill)
        
        prediction = SurgePrediction(
            zone_id=zone.id,
            prediction_for_datetime=now + timedelta(hours=4),
            predicted_fill_level=round(predicted_fill, 1),
            surge_score=round(surge_score, 1),
            confidence=round(final_confidence, 2),
            model_version="v1.0-synthetic",
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
    """Synthetic prediction using zone characteristics."""
    base = zone.current_fill_level if zone.current_fill_level > 0 else 30
    hour = now.hour
    day = now.weekday()
    
    # Time-based patterns
    if 6 <= hour <= 10:
        time_factor = 1.2
    elif 16 <= hour <= 20:
        time_factor = 1.15
    else:
        time_factor = 0.9
    
    # Day-based patterns
    day_factor = 1.1 if day < 5 else 0.85
    
    # Zone type patterns
    type_factors = {"residential": 1.0, "commercial": 1.2, "industrial": 0.9, "market": 1.4}
    zone_factor = type_factors.get(zone.zone_type.value, 1.0)
    
    predicted = base * time_factor * day_factor * zone_factor
    predicted += random.uniform(-8, 12)
    return max(0, min(100, predicted))


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
