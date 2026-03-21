"""PredictionAccuracyLog model — tracks ML prediction vs actual."""
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Float, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class ErrorDirection(str, enum.Enum):
    over_predicted = "over_predicted"
    under_predicted = "under_predicted"
    accurate = "accurate"


class GroundTruthSource(str, enum.Enum):
    worker_report = "worker_report"
    driver_report = "driver_report"


class PredictionAccuracyLog(Base):
    __tablename__ = "prediction_accuracy_logs"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    prediction_id = Column(Integer, ForeignKey("surge_predictions.id"), nullable=True)
    predicted_fill_level = Column(Float, nullable=False)
    actual_fill_level = Column(Float, nullable=False)
    error_magnitude = Column(Float, nullable=False)
    error_direction = Column(Enum(ErrorDirection), nullable=False)
    ground_truth_source = Column(Enum(GroundTruthSource), nullable=False)
    evaluated_at = Column(DateTime, default=datetime.utcnow)

    zone = relationship("Zone", back_populates="prediction_accuracy_logs")
