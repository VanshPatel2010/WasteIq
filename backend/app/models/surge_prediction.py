"""SurgePrediction model."""
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base


class SurgePrediction(Base):
    __tablename__ = "surge_predictions"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    predicted_at = Column(DateTime, default=datetime.utcnow)
    prediction_for_datetime = Column(DateTime, nullable=False)
    predicted_fill_level = Column(Float, nullable=False)
    surge_score = Column(Float, default=0.0)  # 0-10
    confidence = Column(Float, default=0.8)  # 0-1
    model_version = Column(String, default="v1.0")
    features_used = Column(JSON, default=dict)
    overridden_by_worker = Column(Boolean, default=False)
    override_report_id = Column(Integer, ForeignKey("waste_worker_reports.id"), nullable=True)

    zone = relationship("Zone", back_populates="surge_predictions")
