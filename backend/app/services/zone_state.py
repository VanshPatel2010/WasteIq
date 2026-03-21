"""Shared zone-state helpers that enforce the WasteIQ data priority hierarchy."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.models.pickup import Pickup
from app.models.surge_prediction import SurgePrediction
from app.models.waste_worker_report import WasteWorkerReport
from app.models.zone import FillLevelSource, Zone

WORKER_REPORT_WINDOW_HOURS = 2
DRIVER_REPORT_WINDOW_HOURS = 4
PREDICTION_LOOKAHEAD_HOURS = 6


def clamp_fill_level(value: float | None) -> float:
    if value is None:
        return 0.0
    return round(max(0.0, min(100.0, float(value))), 1)


def apply_correction_factor(raw_prediction: float, correction_factor: float | None) -> float:
    factor = correction_factor or 0.0
    return clamp_fill_level(raw_prediction * (1 - factor))


def compute_trust_weight(avg_error_7d: float) -> float:
    if avg_error_7d < 10:
        return 0.95
    if avg_error_7d < 20:
        return 0.80
    if avg_error_7d < 30:
        return 0.60
    if avg_error_7d < 40:
        return 0.40
    return 0.20


def get_recent_worker_report(db: Session, zone_id: int, now: datetime | None = None) -> WasteWorkerReport | None:
    current_time = now or datetime.utcnow()
    return (
        db.query(WasteWorkerReport)
        .filter(
            WasteWorkerReport.zone_id == zone_id,
            WasteWorkerReport.reported_at >= current_time - timedelta(hours=WORKER_REPORT_WINDOW_HOURS),
        )
        .order_by(WasteWorkerReport.reported_at.desc())
        .first()
    )


def get_recent_driver_pickup(db: Session, zone_id: int, now: datetime | None = None) -> Pickup | None:
    current_time = now or datetime.utcnow()
    return (
        db.query(Pickup)
        .filter(
            Pickup.zone_id == zone_id,
            Pickup.completed_at.isnot(None),
            Pickup.completed_at >= current_time - timedelta(hours=DRIVER_REPORT_WINDOW_HOURS),
        )
        .order_by(Pickup.completed_at.desc())
        .first()
    )


def get_latest_prediction(db: Session, zone_id: int, now: datetime | None = None) -> SurgePrediction | None:
    current_time = now or datetime.utcnow()
    lookahead = current_time + timedelta(hours=PREDICTION_LOOKAHEAD_HOURS)
    prediction = (
        db.query(SurgePrediction)
        .filter(
            SurgePrediction.zone_id == zone_id,
            SurgePrediction.prediction_for_datetime <= lookahead,
        )
        .order_by(SurgePrediction.prediction_for_datetime.desc(), SurgePrediction.predicted_at.desc())
        .first()
    )
    if prediction:
        return prediction
    return (
        db.query(SurgePrediction)
        .filter(SurgePrediction.zone_id == zone_id)
        .order_by(SurgePrediction.predicted_at.desc())
        .first()
    )


def _serialize_prediction(zone: Zone, prediction: SurgePrediction | None) -> dict[str, Any] | None:
    if not prediction:
        return None
    corrected_fill = apply_correction_factor(prediction.predicted_fill_level, zone.correction_factor)
    final_confidence = round((prediction.confidence or 0.0) * (zone.ml_trust_score or 0.0), 2)
    low_confidence = final_confidence < 0.4
    return {
        "id": prediction.id,
        "predicted_fill_level": round(prediction.predicted_fill_level, 1),
        "corrected_fill_level": corrected_fill,
        "surge_score": round(prediction.surge_score or 0.0, 1),
        "confidence": round(prediction.confidence or 0.0, 2),
        "final_confidence": final_confidence,
        "predicted_at": prediction.predicted_at.isoformat() if prediction.predicted_at else None,
        "prediction_for_datetime": prediction.prediction_for_datetime.isoformat() if prediction.prediction_for_datetime else None,
        "model_version": prediction.model_version,
        "overridden_by_worker": prediction.overridden_by_worker,
        "override_report_id": prediction.override_report_id,
        "low_confidence": low_confidence or bool(prediction.low_confidence),
    }


def _serialize_worker_report(report: WasteWorkerReport | None, now: datetime) -> dict[str, Any] | None:
    if not report:
        return None
    age_minutes = max(0, int((now - report.reported_at).total_seconds() // 60))
    return {
        "id": report.id,
        "reported_fill_level": round(report.reported_fill_level, 1),
        "bin_count_checked": report.bin_count_checked,
        "overflow_detected": report.overflow_detected,
        "bins_accessible": report.bins_accessible,
        "unusual_waste_detected": report.unusual_waste_detected,
        "notes": report.notes,
        "photo_url": report.photo_url,
        "lat": report.lat,
        "lng": report.lng,
        "reported_at": report.reported_at.isoformat(),
        "worker_id": report.worker_id,
        "worker_name": report.worker.name if report.worker else None,
        "age_minutes": age_minutes,
        "age_hours": round(age_minutes / 60, 1),
    }


def _serialize_pickup(pickup: Pickup | None, now: datetime) -> dict[str, Any] | None:
    if not pickup or not pickup.completed_at:
        return None
    age_minutes = max(0, int((now - pickup.completed_at).total_seconds() // 60))
    return {
        "id": pickup.id,
        "fill_level_found": round(pickup.fill_level_found or 0.0, 1),
        "weight_collected_kg": pickup.weight_collected_kg,
        "notes": pickup.notes,
        "completed_at": pickup.completed_at.isoformat(),
        "driver_id": pickup.driver_id,
        "driver_name": pickup.driver.name if pickup.driver else None,
        "age_minutes": age_minutes,
        "age_hours": round(age_minutes / 60, 1),
    }


def get_zone_live_snapshot(db: Session, zone: Zone, now: datetime | None = None) -> dict[str, Any]:
    current_time = now or datetime.utcnow()
    worker_report = get_recent_worker_report(db, zone.id, current_time)
    driver_pickup = get_recent_driver_pickup(db, zone.id, current_time)
    latest_prediction = get_latest_prediction(db, zone.id, current_time)
    serialized_prediction = _serialize_prediction(zone, latest_prediction)
    serialized_worker = _serialize_worker_report(worker_report, current_time)
    serialized_pickup = _serialize_pickup(driver_pickup, current_time)

    source = FillLevelSource.predicted
    current_fill_level = zone.current_fill_level
    source_timestamp = zone.fill_level_updated_at
    source_label = "ML estimate"
    data_confidence = zone.ml_trust_score or 0.8

    if worker_report:
        source = FillLevelSource.worker_reported
        current_fill_level = worker_report.reported_fill_level
        source_timestamp = worker_report.reported_at
        source_label = "My report" if zone.assigned_waste_worker_id == worker_report.worker_id else "Worker report"
        data_confidence = 1.0
    elif driver_pickup and driver_pickup.fill_level_found is not None:
        source = FillLevelSource.driver_reported
        current_fill_level = driver_pickup.fill_level_found
        source_timestamp = driver_pickup.completed_at
        source_label = "Driver"
        data_confidence = 0.9
    elif serialized_prediction:
        current_fill_level = serialized_prediction["corrected_fill_level"]
        source_timestamp = latest_prediction.prediction_for_datetime or latest_prediction.predicted_at
        source_label = "ML estimate"
        data_confidence = serialized_prediction["final_confidence"]

    source_age_minutes = None
    if source_timestamp:
        source_age_minutes = max(0, int((current_time - source_timestamp).total_seconds() // 60))

    ml_prediction_comparison = None
    if worker_report and serialized_prediction:
        ml_prediction_comparison = {
            "predicted_fill_level": serialized_prediction["corrected_fill_level"],
            "raw_predicted_fill_level": serialized_prediction["predicted_fill_level"],
            "actual_fill_level": round(worker_report.reported_fill_level, 1),
            "difference": round(abs(serialized_prediction["corrected_fill_level"] - worker_report.reported_fill_level), 1),
        }

    return {
        "id": zone.id,
        "name": zone.name,
        "city": zone.city,
        "lat": zone.lat,
        "lng": zone.lng,
        "area_sqkm": zone.area_sqkm,
        "zone_type": zone.zone_type.value,
        "current_fill_level": clamp_fill_level(current_fill_level),
        "fill_level_source": source.value,
        "fill_level_updated_at": source_timestamp.isoformat() if source_timestamp else None,
        "last_collected_at": zone.last_collected_at.isoformat() if zone.last_collected_at else None,
        "assigned_waste_worker_id": zone.assigned_waste_worker_id,
        "assigned_waste_worker_name": zone.assigned_waste_worker.name if zone.assigned_waste_worker else None,
        "ml_trust_score": round(zone.ml_trust_score or 0.0, 2),
        "correction_factor": round(zone.correction_factor or 0.0, 2),
        "bin_count": zone.bin_count,
        "source_label": source_label,
        "source_age_minutes": source_age_minutes,
        "data_confidence": round(data_confidence or 0.0, 2),
        "latest_prediction": serialized_prediction,
        "latest_worker_report": serialized_worker,
        "latest_driver_report": serialized_pickup,
        "ml_prediction_comparison": ml_prediction_comparison,
        "effective_fill_level": clamp_fill_level(current_fill_level),
        "priority_score": round(clamp_fill_level(current_fill_level) * (data_confidence or 0.0), 2),
    }
