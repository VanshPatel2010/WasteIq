"""Pickup model."""
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base


class Pickup(Base):
    __tablename__ = "pickups"

    id = Column(Integer, primary_key=True, index=True)
    truck_id = Column(Integer, ForeignKey("trucks.id"), nullable=False)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    scheduled_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    fill_level_found = Column(Float, nullable=True)
    weight_collected_kg = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    synced = Column(Boolean, default=True)

    truck = relationship("Truck", back_populates="pickups")
    zone = relationship("Zone", back_populates="pickups")
    driver = relationship("User", back_populates="pickups")
