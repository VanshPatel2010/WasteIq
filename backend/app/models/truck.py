"""Truck model."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import enum


class TruckStatus(str, enum.Enum):
    idle = "idle"
    on_route = "on_route"
    completed = "completed"


class Truck(Base):
    __tablename__ = "trucks"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_number = Column(String, unique=True, nullable=False)
    capacity_kg = Column(Float, default=5000.0)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(TruckStatus), default=TruckStatus.idle)
    municipality_id = Column(Integer, ForeignKey("organisations.id"), nullable=True)

    driver = relationship("User", back_populates="truck")
    routes = relationship("Route", back_populates="truck")
    pickups = relationship("Pickup", back_populates="truck")
