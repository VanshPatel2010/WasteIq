"""Route model with VRP optimization tracking."""
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Enum, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base


class RouteStatus(str, enum.Enum):
    pending = "pending"
    active = "active"
    completed = "completed"


class Route(Base):
    __tablename__ = "routes"

    id = Column(Integer, primary_key=True, index=True)
    truck_id = Column(Integer, ForeignKey("trucks.id"), nullable=False)
    date = Column(String, nullable=False)  # YYYY-MM-DD
    status = Column(Enum(RouteStatus), default=RouteStatus.pending)
    zone_sequence = Column(JSON, default=list)  # [{zone_id, order, completed}]
    total_distance_km = Column(Float, default=0.0)
    estimated_duration_mins = Column(Float, default=0.0)
    optimized_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    reoptimized_count = Column(Integer, default=0)

    truck = relationship("Truck", back_populates="routes")
