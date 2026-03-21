"""WasteWorkerReport model — ground truth records from field workers."""
from datetime import datetime
from sqlalchemy import Column, Integer, Float, Boolean, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class WasteWorkerReport(Base):
    __tablename__ = "waste_worker_reports"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    reported_fill_level = Column(Float, nullable=False)
    bin_count_checked = Column(Integer, nullable=True)
    overflow_detected = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    photo_url = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    reported_at = Column(DateTime, default=datetime.utcnow)
    synced = Column(Boolean, default=True)

    worker = relationship("User", back_populates="waste_worker_reports")
    zone = relationship("Zone", back_populates="waste_worker_reports")
