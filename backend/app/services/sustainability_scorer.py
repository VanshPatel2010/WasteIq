"""Sustainability scorer — computes organisation diversion scores."""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.organisation import Organisation
from app.models.sustainability_score import SustainabilityScore, ScoreTrend
from app.models.surplus_listing import SurplusListing, ListingStatus
from app.models.surplus_match import SurplusMatch, MatchStatus


def compute_scores(db: Session):
    """Compute sustainability scores for all organisations."""
    orgs = db.query(Organisation).all()
    today = datetime.utcnow().strftime("%Y-%m-%d")
    
    for org in orgs:
        completed_matches = db.query(SurplusMatch).join(SurplusListing).filter(
            SurplusListing.organisation_id == org.id,
            SurplusMatch.status == MatchStatus.completed
        ).count()
        
        total_diverted = completed_matches * 50  # Estimated kg per match
        total_generated = max(total_diverted * 1.5, 100)
        diversion_rate = (total_diverted / total_generated * 100) if total_generated > 0 else 0
        score = min(100, diversion_rate * 1.2)
        
        # Check previous score for trend
        prev = db.query(SustainabilityScore).filter(
            SustainabilityScore.organisation_id == org.id
        ).order_by(SustainabilityScore.score_date.desc()).first()
        
        if prev:
            trend = ScoreTrend.up if score > prev.score else ScoreTrend.down if score < prev.score else ScoreTrend.stable
        else:
            trend = ScoreTrend.stable
        
        new_score = SustainabilityScore(
            organisation_id=org.id, score_date=today,
            diversion_rate=round(diversion_rate, 2),
            total_waste_generated_kg=total_generated,
            total_diverted_kg=total_diverted,
            score=round(score, 1), trend=trend
        )
        db.add(new_score)
        
        org.sustainability_score = round(score, 1)
        org.diversion_rate = round(diversion_rate, 2)
    
    db.commit()
    return {"organisations_scored": len(orgs)}
