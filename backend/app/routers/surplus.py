"""Surplus router — listings and matches for generators and receivers."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from app.models.user import User, UserRole
from app.models.surplus_listing import SurplusListing, MaterialType, ListingStatus
from app.models.surplus_match import SurplusMatch, MatchStatus
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/surplus", tags=["surplus"])


class ListingRequest(BaseModel):
    material_type: MaterialType
    quantity_kg: float
    description: str | None = None
    expires_at: str
    location_lat: float | None = None
    location_lng: float | None = None


@router.post("/listings")
def create_listing(
    req: ListingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(UserRole.generator)),
):
    listing = SurplusListing(
        generator_id=current_user.id,
        organisation_id=current_user.organisation_id or 0,
        material_type=req.material_type,
        quantity_kg=req.quantity_kg,
        description=req.description,
        expires_at=datetime.fromisoformat(req.expires_at),
        location_lat=req.location_lat,
        location_lng=req.location_lng,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)

    # Auto-match
    from app.services.matching_engine import find_matches
    matches = find_matches(db, listing)

    return {"listing_id": listing.id, "matches_found": len(matches)}


@router.get("/listings")
def get_listings(
    status: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(SurplusListing)
    if current_user.role == UserRole.generator:
        query = query.filter(SurplusListing.generator_id == current_user.id)
    if status:
        query = query.filter(SurplusListing.status == status)

    listings = query.order_by(SurplusListing.created_at.desc()).limit(50).all()
    return [
        {
            "id": l.id,
            "material_type": l.material_type.value,
            "quantity_kg": l.quantity_kg,
            "description": l.description,
            "status": l.status.value,
            "available_from": l.available_from.isoformat() if l.available_from else None,
            "expires_at": l.expires_at.isoformat(),
            "created_at": l.created_at.isoformat(),
        }
        for l in listings
    ]


@router.get("/matches")
def get_matches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(SurplusMatch)
    if current_user.role == UserRole.receiver:
        query = query.filter(SurplusMatch.receiver_id == current_user.id)
    elif current_user.role == UserRole.generator:
        query = query.join(SurplusListing).filter(SurplusListing.generator_id == current_user.id)

    matches = query.order_by(SurplusMatch.matched_at.desc()).limit(50).all()
    return [
        {
            "id": m.id,
            "listing_id": m.listing_id,
            "receiver_id": m.receiver_id,
            "status": m.status.value,
            "matched_at": m.matched_at.isoformat(),
            "collection_confirmed_at": m.collection_confirmed_at.isoformat() if m.collection_confirmed_at else None,
            "listing": {
                "material_type": m.listing.material_type.value if m.listing else None,
                "quantity_kg": m.listing.quantity_kg if m.listing else None,
                "description": m.listing.description if m.listing else None,
            } if m.listing else None,
        }
        for m in matches
    ]


class MatchActionRequest(BaseModel):
    action: str  # accept, decline, complete


@router.put("/matches/{match_id}")
def update_match(
    match_id: int,
    req: MatchActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    match = db.query(SurplusMatch).filter(SurplusMatch.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    if req.action == "accept":
        match.status = MatchStatus.accepted
    elif req.action == "decline":
        match.status = MatchStatus.declined
    elif req.action == "complete":
        match.status = MatchStatus.completed
        match.collection_confirmed_at = datetime.utcnow()
        # Update listing status
        if match.listing:
            match.listing.status = ListingStatus.completed
    db.commit()
    return {"status": match.status.value}
