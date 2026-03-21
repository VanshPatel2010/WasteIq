"""SurplusMatch model."""
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class MatchStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    declined = "declined"
    completed = "completed"


class SurplusMatch(Base):
    __tablename__ = "surplus_matches"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("surplus_listings.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_org_id = Column(Integer, ForeignKey("organisations.id"), nullable=True)
    matched_at = Column(DateTime, default=datetime.utcnow)
    status = Column(Enum(MatchStatus), default=MatchStatus.pending)
    collection_confirmed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    listing = relationship("SurplusListing", back_populates="matches")
