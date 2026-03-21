"""Organisations router."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from app.models.user import User
from app.models.organisation import Organisation
from app.models.sustainability_score import SustainabilityScore
from app.auth import get_current_user

router = APIRouter(prefix="/api/organisations", tags=["organisations"])

@router.get("/")
def get_organisations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    orgs = db.query(Organisation).all()
    return [{"id": o.id, "name": o.name, "type": o.type.value, "address": o.address, "lat": o.lat, "lng": o.lng, "contact_email": o.contact_email, "sustainability_score": o.sustainability_score, "diversion_rate": o.diversion_rate} for o in orgs]

@router.get("/{org_id}")
def get_organisation(org_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    org = db.query(Organisation).filter(Organisation.id == org_id).first()
    if not org:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Organisation not found")
    scores = db.query(SustainabilityScore).filter(SustainabilityScore.organisation_id == org_id).order_by(SustainabilityScore.score_date.desc()).limit(30).all()
    return {"id": org.id, "name": org.name, "type": org.type.value, "address": org.address, "sustainability_score": org.sustainability_score, "diversion_rate": org.diversion_rate, "score_history": [{"date": s.score_date, "score": s.score, "trend": s.trend.value} for s in scores]}
