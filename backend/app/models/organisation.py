"""Organisation model."""
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Enum, DateTime
from sqlalchemy.orm import relationship
from database import Base


class OrgType(str, enum.Enum):
    municipality = "municipality"
    hotel = "hotel"
    factory = "factory"
    ngo = "ngo"
    biogas = "biogas"
    recycler = "recycler"
    agricultural = "agricultural"
    restaurant = "restaurant"


class Organisation(Base):
    __tablename__ = "organisations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    type = Column(Enum(OrgType), nullable=False)
    address = Column(String, nullable=True)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    contact_email = Column(String, nullable=True)
    contact_phone = Column(String, nullable=True)
    sustainability_score = Column(Float, default=0.0)
    diversion_rate = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="organisation")
    sustainability_scores = relationship("SustainabilityScore", back_populates="organisation")
    surplus_listings = relationship("SurplusListing", back_populates="organisation")
