"""Reward model — tracks reward points earned by waste workers for accurate reporting."""
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Reward(Base):
    __tablename__ = "rewards"

    id = Column(Integer, primary_key=True, index=True)
    worker_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    report_id = Column(Integer, ForeignKey("waste_worker_reports.id"), nullable=False)
    pickup_id = Column(Integer, ForeignKey("pickups.id"), nullable=False)
    points = Column(Integer, nullable=False)
    reason = Column(String, nullable=False)
    fill_level_reported = Column(Float, nullable=False)
    fill_level_found = Column(Float, nullable=False)
    difference = Column(Float, nullable=False)
    awarded_at = Column(DateTime, default=datetime.utcnow)

    worker = relationship("User", back_populates="rewards")
    report = relationship("WasteWorkerReport")
