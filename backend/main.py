"""WasteIQ Backend — FastAPI Application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from app.routers import auth, zones, waste_worker, trucks, routes, pickups, predictions, accuracy, surplus, kabadiwalla, organisations

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="WasteIQ API", description="Predictive Waste Intelligence Platform", version="1.0.0")


@app.on_event("startup")
def startup_event():
    from app.services.realtime_scheduler import start_scheduler
    start_scheduler()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(zones.router)
app.include_router(waste_worker.router)
app.include_router(trucks.router)
app.include_router(routes.router)
app.include_router(pickups.router)
app.include_router(predictions.router)
app.include_router(accuracy.router)
app.include_router(surplus.router)
app.include_router(kabadiwalla.router)
app.include_router(organisations.router)


@app.get("/")
def root():
    return {"app": "WasteIQ", "version": "1.0.0", "tagline": "From reactive to predictive — ground truth first."}


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.get("/api/dashboard/stats")
def dashboard_stats():
    """Quick stats for the admin dashboard."""
    from database import SessionLocal
    from app.models.zone import Zone
    from app.models.truck import Truck, TruckStatus
    from app.models.surge_prediction import SurgePrediction
    from app.models.surplus_match import SurplusMatch
    from app.models.waste_worker_report import WasteWorkerReport
    from datetime import datetime, timedelta

    db = SessionLocal()
    try:
        now = datetime.utcnow()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

        total_zones = db.query(Zone).count()
        overdue = db.query(Zone).filter(Zone.current_fill_level > 75).count()
        active_trucks = db.query(Truck).filter(Truck.status == TruckStatus.on_route).count()
        total_trucks = db.query(Truck).count()
        surge_alerts = db.query(SurgePrediction).filter(SurgePrediction.surge_score >= 6, SurgePrediction.overridden_by_worker == False).count()
        surplus_today = db.query(SurplusMatch).filter(SurplusMatch.matched_at >= today_start).count()
        worker_reports_today = db.query(WasteWorkerReport).filter(WasteWorkerReport.reported_at >= today_start).count()
        zones_covered = db.query(WasteWorkerReport.zone_id).filter(WasteWorkerReport.reported_at >= today_start).distinct().count()

        return {
            "total_zones": total_zones, "overdue_zones": overdue,
            "active_trucks": active_trucks, "total_trucks": total_trucks,
            "surge_alerts": surge_alerts, "surplus_matches_today": surplus_today,
            "worker_reports_today": worker_reports_today, "zones_covered_today": zones_covered,
        }
    finally:
        db.close()


@app.get("/api/workers")
def get_workers():
    """Get all waste workers with penalty and accuracy data."""
    from database import SessionLocal
    from app.models.user import User, UserRole
    from app.models.zone import Zone
    db = SessionLocal()
    try:
        workers = db.query(User).filter(User.role == UserRole.waste_worker).all()
        result = []
        for w in workers:
            zones = db.query(Zone).filter(Zone.assigned_waste_worker_id == w.id).all()
            result.append({
                "id": w.id,
                "name": w.name,
                "email": w.email,
                "phone": w.phone,
                "zones": [z.name for z in zones],
                "penalty_count": w.penalty_count or 0,
                "accuracy_score": round(w.accuracy_score or 100, 1),
                "reward_points": w.reward_points or 0,
                "is_active": w.is_active,
            })
        return result
    finally:
        db.close()
