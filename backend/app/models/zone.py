"""Zone model with fill level tracking, ML trust score, and correction factor."""
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class ZoneType(str, enum.Enum):
    residential = "residential"
    commercial = "commercial"
    industrial = "industrial"
    market = "market"


class FillLevelSource(str, enum.Enum):
    predicted = "predicted"
    worker_reported = "worker_reported"
    driver_reported = "driver_reported"


class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    city = Column(String, nullable=False, default="Surat")
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    area_sqkm = Column(Float, nullable=True)
    zone_type = Column(Enum(ZoneType), nullable=False, default=ZoneType.residential)
    current_fill_level = Column(Float, default=0.0)
    fill_level_source = Column(Enum(FillLevelSource), default=FillLevelSource.predicted)
    fill_level_updated_at = Column(DateTime, default=datetime.utcnow)
    last_collected_at = Column(DateTime, nullable=True)
    assigned_waste_worker_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    municipality_id = Column(Integer, ForeignKey("organisations.id"), nullable=True)

    # ML trust and correction fields
    ml_trust_score = Column(Float, default=0.8)
    correction_factor = Column(Float, default=0.0)
    bin_count = Column(Integer, default=10)

    assigned_waste_worker = relationship("User", back_populates="assigned_zones", foreign_keys=[assigned_waste_worker_id])
    waste_worker_reports = relationship("WasteWorkerReport", back_populates="zone")
    fill_level_logs = relationship("ZoneFillLevelLog", back_populates="zone")
    prediction_accuracy_logs = relationship("PredictionAccuracyLog", back_populates="zone")
    drift_alerts = relationship("ModelDriftAlert", back_populates="zone")
    surge_predictions = relationship("SurgePrediction", back_populates="zone")
    pickups = relationship("Pickup", back_populates="zone")
