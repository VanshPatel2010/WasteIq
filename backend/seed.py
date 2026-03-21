import os
import sys

# Ensure backend directory is in path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base, SessionLocal
from app.models.user import User, UserRole
from app.models.organisation import Organisation, OrgType
from app.models.zone import Zone, ZoneType, FillLevelSource
from app.models.truck import Truck, TruckStatus
from app.models.pickup import Pickup
from app.models.surplus_listing import SurplusListing, MaterialType, ListingStatus
from app.models.route import Route
from app.models.reward import Reward
from app.models.waste_worker_report import WasteWorkerReport
from app.auth import pwd_context
from datetime import datetime, timedelta

def seed_database():
    print("Creating tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()

    password = "password123"
    hashed_password = pwd_context.hash(password)
    
    print("Seeding Organisations...")
    smc = Organisation(name="Surat Municipal Corporation", type=OrgType.municipality, address="Surat, Gujarat", lat=21.1702, lng=72.8311, sustainability_score=85.0, diversion_rate=45.0)
    hotel = Organisation(name="Grand Surat Hotel", type=OrgType.hotel, address="Ring Road, Surat", lat=21.1850, lng=72.8250, sustainability_score=90.0, diversion_rate=60.0)
    ngo = Organisation(name="Green Earth NGO", type=OrgType.ngo, address="Adajan, Surat", lat=21.1950, lng=72.7950, sustainability_score=95.0, diversion_rate=80.0)
    
    db.add_all([smc, hotel, ngo])
    db.commit()
    db.refresh(smc)
    db.refresh(hotel)
    db.refresh(ngo)

    print("Seeding Users...")
    admin_user = User(email="admin@wasteiq.com", password_hash=hashed_password, role=UserRole.admin, name="SMC Admin", phone="9876543210", organisation_id=smc.id)
    driver_user = User(email="driver1@surat.gov.in", password_hash=hashed_password, role=UserRole.driver, name="Ramesh Bhai", phone="9876543211", organisation_id=smc.id)
    worker_user = User(email="worker1@wasteiq.com", password_hash=hashed_password, role=UserRole.waste_worker, name="Suresh Waste Worker", phone="9876543212")
    kabadi_user = User(email="kabadi@wasteiq.com", password_hash=hashed_password, role=UserRole.kabadiwalla, name="Ramu Kabadi", phone="9876543213")
    gen_user = User(email="generator@wasteiq.com", password_hash=hashed_password, role=UserRole.generator, name="Hotel Manager", phone="9876543214", organisation_id=hotel.id)
    rec_user = User(email="receiver@wasteiq.com", password_hash=hashed_password, role=UserRole.receiver, name="NGO Coordinator", phone="9876543215", organisation_id=ngo.id)
    
    db.add_all([admin_user, driver_user, worker_user, kabadi_user, gen_user, rec_user])
    db.commit()
    db.refresh(driver_user)
    db.refresh(worker_user)
    db.refresh(gen_user)

    print("Seeding Zones...")
    zone1 = Zone(name="Adajan Residential", city="Surat", lat=21.1959, lng=72.7933, area_sqkm=5.2, zone_type=ZoneType.residential, current_fill_level=75.5, fill_level_source=FillLevelSource.predicted, assigned_waste_worker_id=worker_user.id, municipality_id=smc.id, ml_trust_score=0.92, bin_count=45)
    zone2 = Zone(name="Ring Road Commercial", city="Surat", lat=21.1856, lng=72.8251, area_sqkm=3.1, zone_type=ZoneType.commercial, current_fill_level=90.0, fill_level_source=FillLevelSource.worker_reported, municipality_id=smc.id, ml_trust_score=0.88, bin_count=30)
    
    db.add_all([zone1, zone2])
    db.commit()
    db.refresh(zone1)

    print("Seeding Trucks...")
    truck1 = Truck(vehicle_number="GJ-05-AB-1234", capacity_kg=5000.0, current_lat=21.1702, current_lng=72.8311, driver_id=driver_user.id, status=TruckStatus.on_route, municipality_id=smc.id)
    db.add(truck1)
    db.commit()
    db.refresh(truck1)

    print("Seeding Pickups...")
    pickup1 = Pickup(truck_id=truck1.id, zone_id=zone1.id, driver_id=driver_user.id, scheduled_at=datetime.utcnow() - timedelta(hours=1), completed_at=datetime.utcnow(), fill_level_found=80.0, weight_collected_kg=1200.5, notes="Bins were overflowing slightly.")
    pickup2 = Pickup(truck_id=truck1.id, zone_id=zone2.id, driver_id=driver_user.id, scheduled_at=datetime.utcnow() + timedelta(hours=1)) # Future schedule
    db.add_all([pickup1, pickup2])
    
    print("Seeding Surplus Listings...")
    listing1 = SurplusListing(generator_id=gen_user.id, organisation_id=hotel.id, material_type=MaterialType.food, quantity_kg=50.0, description="Fresh leftover buffet food", expires_at=datetime.utcnow() + timedelta(hours=5), status=ListingStatus.active, location_lat=21.1850, location_lng=72.8250)
    listing2 = SurplusListing(generator_id=gen_user.id, organisation_id=hotel.id, material_type=MaterialType.plastic, quantity_kg=20.0, description="Clean plastic bottles", expires_at=datetime.utcnow() + timedelta(days=2), status=ListingStatus.active, location_lat=21.1850, location_lng=72.8250)
    db.add_all([listing1, listing2])

    db.commit()
    print("Successfully seeded the database with rich dummy data!")
    
    db.close()

if __name__ == "__main__":
    seed_database()
