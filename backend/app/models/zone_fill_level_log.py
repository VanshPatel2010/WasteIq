"""ZoneFillLevelLog model — tracks every fill level change with source."""
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Float, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class FillLevelChangeSource(str, enum.Enum):
    ml_prediction = "ml_prediction"
    worker_report = "worker_report"
    driver_report = "driver_report"
    manual = "manual"


class ZoneFillLevelLog(Base):
    __tablename__ = "zone_fill_level_logs"

    id = Column(Integer, primary_key=True, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    fill_level = Column(Float, nullable=False)
    source = Column(Enum(FillLevelChangeSource), nullable=False)
    source_id = Column(Integer, nullable=True)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    zone = relationship("Zone", back_populates="fill_level_logs")
