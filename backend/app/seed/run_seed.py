"""Seed data script — creates demo data with 30-day history."""
import random
from datetime import datetime, timedelta
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from database import engine, SessionLocal, Base
from app.models.user import User, UserRole
from app.models.organisation import Organisation, OrgType
from app.models.zone import Zone, ZoneType, FillLevelSource
from app.models.waste_worker_report import WasteWorkerReport
from app.models.surge_prediction import SurgePrediction
from app.models.prediction_accuracy_log import PredictionAccuracyLog, ErrorDirection, GroundTruthSource
from app.models.model_drift_alert import ModelDriftAlert, DriftAlertType, BiasDirection
from app.models.zone_fill_level_log import ZoneFillLevelLog, FillLevelChangeSource
from app.models.truck import Truck, TruckStatus
from app.models.route import Route, RouteStatus
from app.models.kabadiwala_log import KabadiwalaLog, QuantityEstimate
from app.models.sustainability_score import SustainabilityScore, ScoreTrend
from app.models.surplus_listing import SurplusListing, MaterialType, ListingStatus
from app.models.surplus_match import SurplusMatch, MatchStatus
from app.models.pickup import Pickup
from app.auth import get_password_hash


def run_seed():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # --- Organisations ---
        municipality = Organisation(name="Surat Municipal Corporation", type=OrgType.municipality, address="Surat, Gujarat", lat=21.1702, lng=72.8311, contact_email="admin@smc.gov.in")
        hotel = Organisation(name="Taj Gateway Hotel", type=OrgType.hotel, address="Athwa, Surat", lat=21.1855, lng=72.8003, contact_email="surplus@tajsurat.com")
        ngo = Organisation(name="Surat Food Bank", type=OrgType.ngo, address="Adajan, Surat", lat=21.2010, lng=72.7910, contact_email="collect@suratfoodbank.org")
        factory = Organisation(name="Diamond Processing Unit", type=OrgType.factory, address="Katargam, Surat", lat=21.2150, lng=72.8450)
        biogas = Organisation(name="Green Energy Biogas", type=OrgType.biogas, address="Udhna, Surat", lat=21.1650, lng=72.8490)
        db.add_all([municipality, hotel, ngo, factory, biogas])
        db.flush()

        # --- Users (6 roles) ---
        admin = User(email="admin@wasteiq.com", password_hash=get_password_hash("password123"), role=UserRole.admin, name="Rajesh Kumar", phone="9876543210", organisation_id=municipality.id)
        driver1 = User(email="driver@wasteiq.com", password_hash=get_password_hash("password123"), role=UserRole.driver, name="Suresh Patel", phone="9876543211", organisation_id=municipality.id)
        driver2 = User(email="driver2@wasteiq.com", password_hash=get_password_hash("password123"), role=UserRole.driver, name="Ramesh Chauhan", phone="9876543218", organisation_id=municipality.id)
        driver3 = User(email="driver3@wasteiq.com", password_hash=get_password_hash("password123"), role=UserRole.driver, name="Dinesh Vora", phone="9876543219", organisation_id=municipality.id)
        worker1 = User(email="worker1@wasteiq.com", password_hash=get_password_hash("password123"), role=UserRole.waste_worker, name="Priya Patel", phone="9876543212", organisation_id=municipality.id)
        worker2 = User(email="worker2@wasteiq.com", password_hash=get_password_hash("password123"), role=UserRole.waste_worker, name="Manoj Shah", phone="9876543213", organisation_id=municipality.id)
        kabadi = User(email="kabadi@wasteiq.com", password_hash=get_password_hash("password123"), role=UserRole.kabadiwalla, name="Ramesh Kabadi", phone="9876543214")
        generator = User(email="generator@wasteiq.com", password_hash=get_password_hash("password123"), role=UserRole.generator, name="Hotel Manager", phone="9876543215", organisation_id=hotel.id)
        receiver = User(email="receiver@wasteiq.com", password_hash=get_password_hash("password123"), role=UserRole.receiver, name="NGO Coordinator", phone="9876543216", organisation_id=ngo.id)
        db.add_all([admin, driver1, driver2, driver3, worker1, worker2, kabadi, generator, receiver])
        db.flush()

        # --- Zones (15 zones across Surat) ---
        zones_data = [
            # Zone name,           lat,     lng,    type,                    area,  bins
            # Route 1 - West Surat (Truck 1)
            ("Adajan",           21.2010, 72.7910, ZoneType.residential,     4.2,   12),
            ("Vesu",             21.1580, 72.7700, ZoneType.residential,     3.8,   10),
            ("Piplod",           21.1720, 72.7820, ZoneType.residential,     3.2,    9),
            ("Pal",              21.1850, 72.7730, ZoneType.residential,     2.9,    8),
            ("Althan",           21.1660, 72.7980, ZoneType.residential,     3.5,   10),
            # Route 2 - Central Surat (Truck 2)
            ("Ring Road",        21.1900, 72.8200, ZoneType.commercial,      5.1,   15),
            ("Athwa Lines",      21.1880, 72.8010, ZoneType.commercial,      4.8,   14),
            ("Nanpura",          21.1940, 72.8300, ZoneType.commercial,      3.6,   12),
            ("Ghod Dod Road",    21.2050, 72.8160, ZoneType.commercial,      4.1,   13),
            ("Majura Gate",      21.2000, 72.8360, ZoneType.market,          3.3,   11),
            # Route 3 - East Surat (Truck 3)
            ("Udhna",            21.1650, 72.8490, ZoneType.industrial,      6.3,   18),
            ("Katargam",         21.2150, 72.8450, ZoneType.market,          3.5,   14),
            ("Varachha",         21.2090, 72.8770, ZoneType.residential,     4.7,   11),
            ("Limbayat",         21.1790, 72.8680, ZoneType.industrial,      5.2,   16),
            ("Sachin",           21.0890, 72.8700, ZoneType.industrial,      7.1,   20),
        ]
        zones = []
        for name, lat, lng, ztype, area, bins in zones_data:
            z = Zone(name=name, city="Surat", lat=lat, lng=lng, zone_type=ztype, area_sqkm=area, bin_count=bins, municipality_id=municipality.id, current_fill_level=random.uniform(30, 75))
            zones.append(z)
            db.add(z)
        db.flush()

        # Assign workers to zones (split evenly)
        for z in zones[:8]:
            z.assigned_waste_worker_id = worker1.id
        for z in zones[8:]:
            z.assigned_waste_worker_id = worker2.id

        # Udhna (index 10): drift zone with correction factor
        zones[10].correction_factor = 0.15
        zones[10].ml_trust_score = 0.60

        # --- 3 Trucks ---
        truck1 = Truck(vehicle_number="GJ-05-AB-1234", capacity_kg=5000, current_lat=21.20, current_lng=72.79, driver_id=driver1.id, status=TruckStatus.on_route, municipality_id=municipality.id)
        truck2 = Truck(vehicle_number="GJ-05-CD-5678", capacity_kg=4500, current_lat=21.19, current_lng=72.82, driver_id=driver2.id, status=TruckStatus.on_route, municipality_id=municipality.id)
        truck3 = Truck(vehicle_number="GJ-05-EF-9012", capacity_kg=6000, current_lat=21.16, current_lng=72.85, driver_id=driver3.id, status=TruckStatus.on_route, municipality_id=municipality.id)
        db.add_all([truck1, truck2, truck3])
        db.flush()

        # --- 30 days of seed data ---
        now = datetime.utcnow()
        for day_offset in range(30, 0, -1):
            day = now - timedelta(days=day_offset)
            
            for zone in zones:
                # 2-3 worker reports per zone per day
                reports_per_day = random.randint(2, 3)
                for r in range(reports_per_day):
                    hour = random.choice([7, 8, 9, 12, 13, 14, 17, 18])
                    report_time = day.replace(hour=hour, minute=random.randint(0, 59))
                    
                    # Zone-specific patterns
                    if zone.name == "Adajan":
                        fill = random.uniform(25, 55)  # Well-calibrated
                    elif zone.name == "Udhna":
                        fill = random.uniform(30, 65)  # ML over-predicts
                    elif zone.name == "Katargam":
                        fill = random.uniform(20, 90)  # High variance
                    else:
                        fill = random.uniform(30, 70)
                    
                    worker_id = worker1.id if zone in zones[:3] else worker2.id
                    report = WasteWorkerReport(
                        worker_id=worker_id, zone_id=zone.id,
                        reported_fill_level=round(fill, 1),
                        bin_count_checked=random.randint(5, zone.bin_count),
                        overflow_detected=fill > 85, reported_at=report_time, synced=True
                    )
                    db.add(report)

                # 1 prediction per zone per day
                pred_fill = 0
                if zone.name == "Adajan":
                    pred_fill = random.uniform(25, 55)  # Accurate
                elif zone.name == "Udhna":
                    pred_fill = random.uniform(55, 90)  # Over-predicts
                elif zone.name == "Katargam":
                    pred_fill = random.uniform(50, 95)  # High error
                else:
                    pred_fill = random.uniform(30, 70)
                
                pred = SurgePrediction(
                    zone_id=zone.id,
                    predicted_at=day.replace(hour=6),
                    prediction_for_datetime=day.replace(hour=10),
                    predicted_fill_level=round(pred_fill, 1),
                    surge_score=round(pred_fill * 0.1, 1),
                    confidence=round(random.uniform(0.6, 0.9), 2),
                    model_version="v1.0-synthetic",
                )
                db.add(pred)
                db.flush()

                # Accuracy log
                actual_fill = fill  # Use last worker report
                error = abs(pred_fill - actual_fill)
                if pred_fill > actual_fill + 5:
                    direction = ErrorDirection.over_predicted
                elif pred_fill < actual_fill - 5:
                    direction = ErrorDirection.under_predicted
                else:
                    direction = ErrorDirection.accurate
                
                acc = PredictionAccuracyLog(
                    zone_id=zone.id, prediction_id=pred.id,
                    predicted_fill_level=round(pred_fill, 1),
                    actual_fill_level=round(actual_fill, 1),
                    error_magnitude=round(error, 1),
                    error_direction=direction,
                    ground_truth_source=GroundTruthSource.worker_report,
                    evaluated_at=day.replace(hour=23, minute=59)
                )
                db.add(acc)

        # --- Active drift alert for Udhna ---
        drift_alert = ModelDriftAlert(
            zone_id=zones[3].id,
            alert_type=DriftAlertType.consistent_bias,
            avg_error_last_7d=25.3,
            avg_error_last_30d=22.1,
            bias_direction=BiasDirection.over,
            action_taken="Auto-correction factor applied: 0.15"
        )
        db.add(drift_alert)

        # --- 3 Today's Routes (one per truck) ---
        today_str = now.strftime("%Y-%m-%d")
        route1_zones = zones[:5]   # West Surat — Truck 1
        route2_zones = zones[5:10] # Central Surat — Truck 2
        route3_zones = zones[10:]  # East Surat — Truck 3

        route1 = Route(
            truck_id=truck1.id, date=today_str,
            status=RouteStatus.active,
            zone_sequence=[{"zone_id": z.id, "zone_name": z.name, "order": i+1, "completed": i < 2, "fill_level": z.current_fill_level, "distance_km": round(random.uniform(1.2, 4.5), 1)} for i, z in enumerate(route1_zones)],
            total_distance_km=18.3, estimated_duration_mins=130
        )
        route2 = Route(
            truck_id=truck2.id, date=today_str,
            status=RouteStatus.active,
            zone_sequence=[{"zone_id": z.id, "zone_name": z.name, "order": i+1, "completed": i < 1, "fill_level": z.current_fill_level, "distance_km": round(random.uniform(1.0, 3.8), 1)} for i, z in enumerate(route2_zones)],
            total_distance_km=14.7, estimated_duration_mins=115
        )
        route3 = Route(
            truck_id=truck3.id, date=today_str,
            status=RouteStatus.pending,
            zone_sequence=[{"zone_id": z.id, "zone_name": z.name, "order": i+1, "completed": False, "fill_level": z.current_fill_level, "distance_km": round(random.uniform(2.0, 6.5), 1)} for i, z in enumerate(route3_zones)],
            total_distance_km=26.2, estimated_duration_mins=180
        )
        db.add_all([route1, route2, route3])

        # --- Surplus listing ---
        listing = SurplusListing(
            generator_id=generator.id, organisation_id=hotel.id,
            material_type=MaterialType.food, quantity_kg=50,
            description="Leftover buffet food, still fresh",
            expires_at=now + timedelta(hours=6),
            location_lat=21.1855, location_lng=72.8003
        )
        db.add(listing)
        db.flush()

        match = SurplusMatch(
            listing_id=listing.id, receiver_id=receiver.id,
            receiver_org_id=ngo.id, status=MatchStatus.pending
        )
        db.add(match)

        # --- Sustainability scores ---
        for org in [municipality, hotel, ngo]:
            score = SustainabilityScore(
                organisation_id=org.id, score_date=today_str,
                diversion_rate=random.uniform(30, 70),
                total_waste_generated_kg=random.uniform(500, 2000),
                total_diverted_kg=random.uniform(200, 800),
                score=random.uniform(40, 85), trend=ScoreTrend.up
            )
            db.add(score)

        db.commit()
        print("Seed data created successfully!")
        print(f"  Organisations: 5")
        print(f"  Users: 9 (admin, 3 drivers, 2 workers, kabadi, generator, receiver)")
        print(f"  Zones: 15 across Surat")
        print(f"  Trucks: 3 (each with today's active route)")
        print(f"  30-day history: reports, predictions, accuracy logs")
        print(f"  Active drift alert: Udhna zone")
        print(f"  Correction factor: Udhna = 0.15")
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
