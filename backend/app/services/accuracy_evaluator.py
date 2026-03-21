"""Accuracy evaluator — nightly evaluation of prediction accuracy."""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.zone import Zone
from app.models.surge_prediction import SurgePrediction
from app.models.waste_worker_report import WasteWorkerReport
from app.models.pickup import Pickup
from app.models.prediction_accuracy_log import PredictionAccuracyLog, ErrorDirection, GroundTruthSource
from app.models.model_drift_alert import ModelDriftAlert, DriftAlertType, BiasDirection


def run_accuracy_evaluation(db: Session):
    """Run the nightly accuracy evaluation."""
    now = datetime.utcnow()
    yesterday = now - timedelta(hours=24)
    
    predictions = db.query(SurgePrediction).filter(SurgePrediction.predicted_at >= yesterday).all()
    evaluated = 0
    
    for pred in predictions:
        # Find worker report within 2 hours of prediction target
        window_start = pred.prediction_for_datetime - timedelta(hours=2)
        window_end = pred.prediction_for_datetime + timedelta(hours=2)
        
        worker_report = db.query(WasteWorkerReport).filter(
            WasteWorkerReport.zone_id == pred.zone_id,
            WasteWorkerReport.reported_at.between(window_start, window_end)
        ).first()
        
        actual = None
        source = None
        
        if worker_report:
            actual = worker_report.reported_fill_level
            source = GroundTruthSource.worker_report
        else:
            pickup = db.query(Pickup).filter(
                Pickup.zone_id == pred.zone_id,
                Pickup.completed_at.between(window_start, window_end)
            ).first()
            if pickup and pickup.fill_level_found:
                actual = pickup.fill_level_found
                source = GroundTruthSource.driver_report
        
        if actual is not None:
            error = abs(pred.predicted_fill_level - actual)
            if pred.predicted_fill_level > actual + 5:
                direction = ErrorDirection.over_predicted
            elif pred.predicted_fill_level < actual - 5:
                direction = ErrorDirection.under_predicted
            else:
                direction = ErrorDirection.accurate
            
            log = PredictionAccuracyLog(
                zone_id=pred.zone_id, prediction_id=pred.id,
                predicted_fill_level=pred.predicted_fill_level,
                actual_fill_level=actual, error_magnitude=error,
                error_direction=direction, ground_truth_source=source,
            )
            db.add(log)
            evaluated += 1
    
    db.commit()
    
    # Run drift detection
    drift_results = _detect_drift(db)
    
    return {"evaluated": evaluated, "drift_alerts": drift_results}


def _detect_drift(db: Session):
    """Detect model drift per zone and create alerts."""
    zones = db.query(Zone).all()
    alerts_created = 0
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    
    for zone in zones:
        avg_7d = db.query(func.avg(PredictionAccuracyLog.error_magnitude)).filter(
            PredictionAccuracyLog.zone_id == zone.id,
            PredictionAccuracyLog.evaluated_at >= seven_days_ago
        ).scalar() or 0
        
        avg_30d = db.query(func.avg(PredictionAccuracyLog.error_magnitude)).filter(
            PredictionAccuracyLog.zone_id == zone.id,
            PredictionAccuracyLog.evaluated_at >= thirty_days_ago
        ).scalar() or 0
        
        # Update ML trust score
        if avg_7d < 10:
            zone.ml_trust_score = 0.95
        elif avg_7d < 20:
            zone.ml_trust_score = 0.80
        elif avg_7d < 30:
            zone.ml_trust_score = 0.60
        elif avg_7d < 40:
            zone.ml_trust_score = 0.40
        else:
            zone.ml_trust_score = 0.20
        
        # Check for drift
        drift = False
        alert_type = None
        bias = None
        
        if avg_7d > 20:
            drift = True
            alert_type = DriftAlertType.high_error_rate
        if avg_30d > 0 and avg_7d > avg_30d * 1.5:
            drift = True
            alert_type = DriftAlertType.pattern_change
        
        # Check bias direction
        bias_query = db.query(PredictionAccuracyLog.error_direction, func.count()).filter(
            PredictionAccuracyLog.zone_id == zone.id,
            PredictionAccuracyLog.evaluated_at >= seven_days_ago
        ).group_by(PredictionAccuracyLog.error_direction).order_by(func.count().desc()).first()
        
        if bias_query and bias_query[0] != ErrorDirection.accurate:
            if bias_query[0] == ErrorDirection.over_predicted:
                bias = BiasDirection.over
            else:
                bias = BiasDirection.under
            
            # Apply correction factor
            if bias == BiasDirection.over:
                zone.correction_factor = min(0.3, zone.correction_factor + 0.05)
            else:
                zone.correction_factor = max(-0.3, zone.correction_factor - 0.05)
        
        if drift:
            existing = db.query(ModelDriftAlert).filter(
                ModelDriftAlert.zone_id == zone.id,
                ModelDriftAlert.resolved_at.is_(None)
            ).first()
            
            if not existing:
                alert = ModelDriftAlert(
                    zone_id=zone.id, alert_type=alert_type or DriftAlertType.high_error_rate,
                    avg_error_last_7d=avg_7d, avg_error_last_30d=avg_30d,
                    bias_direction=bias,
                    action_taken=f"Auto-correction factor: {zone.correction_factor}"
                )
                db.add(alert)
                alerts_created += 1
    
    db.commit()
    return alerts_created
