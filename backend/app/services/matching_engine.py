"""Matching engine — surplus generator to receiver matching."""
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.surplus_listing import SurplusListing, ListingStatus
from app.models.surplus_match import SurplusMatch, MatchStatus
from app.models.user import User, UserRole


def find_matches(db: Session, listing: SurplusListing):
    """Find matching receivers for a surplus listing."""
    if listing.expires_at and listing.expires_at < datetime.utcnow():
        return []
    
    # Find receivers (users with receiver role)
    receivers = db.query(User).filter(User.role == UserRole.receiver, User.is_active == True).all()
    
    matches_created = []
    for receiver in receivers:
        match = SurplusMatch(
            listing_id=listing.id,
            receiver_id=receiver.id,
            receiver_org_id=receiver.organisation_id,
            status=MatchStatus.pending,
        )
        db.add(match)
        matches_created.append(match)
        
        # Update listing status
        listing.status = ListingStatus.matched
    
    db.commit()
    return matches_created
