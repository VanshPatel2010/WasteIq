"""User model with 6 roles."""
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Enum, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    driver = "driver"
    waste_worker = "waste_worker"
    kabadiwalla = "kabadiwalla"
    generator = "generator"
    receiver = "receiver"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    penalty_count = Column(Integer, default=0)
    accuracy_score = Column(Float, default=100.0)

    organisation = relationship("Organisation", back_populates="users")
    waste_worker_reports = relationship("WasteWorkerReport", back_populates="worker")
    assigned_zones = relationship("Zone", back_populates="assigned_waste_worker", foreign_keys="Zone.assigned_waste_worker_id")
    truck = relationship("Truck", back_populates="driver", uselist=False)
    pickups = relationship("Pickup", back_populates="driver")
    kabadiwala_logs = relationship("KabadiwalaLog", back_populates="worker")
