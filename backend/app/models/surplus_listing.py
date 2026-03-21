"""SurplusListing model."""
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Text, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class MaterialType(str, enum.Enum):
    food = "food"
    organic = "organic"
    plastic = "plastic"
    metal = "metal"
    paper = "paper"
    glass = "glass"
    other = "other"


class ListingStatus(str, enum.Enum):
    active = "active"
    matched = "matched"
    expired = "expired"
    completed = "completed"


class SurplusListing(Base):
    __tablename__ = "surplus_listings"

    id = Column(Integer, primary_key=True, index=True)
    generator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    material_type = Column(Enum(MaterialType), nullable=False)
    quantity_kg = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    available_from = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    status = Column(Enum(ListingStatus), default=ListingStatus.active)
    location_lat = Column(Float, nullable=True)
    location_lng = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    organisation = relationship("Organisation", back_populates="surplus_listings")
    matches = relationship("SurplusMatch", back_populates="listing")
