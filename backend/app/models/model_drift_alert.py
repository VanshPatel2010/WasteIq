"""ModelDriftAlert model — tracks ML accuracy drift per zone."""
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Text, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class DriftAlertType(str, enum.Enum):
    high_error_rate = "high_error_rate"
    consistent_bias = "consistent_bias"
    pattern_change = "pattern_change"
    retraining_triggered = "retraining_triggered"


class BiasDirection(str, enum.Enum):
    over = "over"
    under = "under"


class ModelDriftAlert(Base):
    __tablename__ = "model_drift_alerts"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    alert_type = Column(Enum(DriftAlertType), nullable=False)
    avg_error_last_7d = Column(Float, nullable=True)
    avg_error_last_30d = Column(Float, nullable=True)
    bias_direction = Column(Enum(BiasDirection), nullable=True)
    alert_created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    action_taken = Column(Text, nullable=True)

    zone = relationship("Zone", back_populates="drift_alerts")
