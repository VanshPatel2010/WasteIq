"""KabadiwalaLog model."""
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class QuantityEstimate(str, enum.Enum):
    small = "small"
    medium = "medium"
    large = "large"


class KabadiwalaLog(Base):
    __tablename__ = "kabadiwala_logs"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    material_type = Column(String, nullable=False)
    quantity_estimate = Column(Enum(QuantityEstimate), nullable=False)
    weight_kg = Column(Float, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    logged_at = Column(DateTime, default=datetime.utcnow)
    synced = Column(Boolean, default=False)
    sync_at = Column(DateTime, nullable=True)

    worker = relationship("User", back_populates="kabadiwala_logs")
