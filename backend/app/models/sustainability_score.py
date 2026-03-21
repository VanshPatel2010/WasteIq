"""SustainabilityScore model."""
import enum
from datetime import datetime
from sqlalchemy import Column, Integer, Float, String, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class ScoreTrend(str, enum.Enum):
    up = "up"
    down = "down"
    stable = "stable"


class SustainabilityScore(Base):
    __tablename__ = "sustainability_scores"

    id = Column(Integer, primary_key=True, index=True)
    organisation_id = Column(Integer, ForeignKey("organisations.id"), nullable=False)
    score_date = Column(String, nullable=False)  # YYYY-MM-DD
    diversion_rate = Column(Float, default=0.0)
    total_waste_generated_kg = Column(Float, default=0.0)
    total_diverted_kg = Column(Float, default=0.0)
    score = Column(Float, default=0.0)  # 0-100
    trend = Column(Enum(ScoreTrend), default=ScoreTrend.stable)

    organisation = relationship("Organisation", back_populates="sustainability_scores")
