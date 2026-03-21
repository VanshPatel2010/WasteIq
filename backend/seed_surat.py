import os
import sys
from sqlalchemy.orm import Session
from database import engine, SessionLocal
from app.models.zone import Zone, ZoneType, FillLevelSource
from app.models.truck import Truck, TruckStatus
from app.models.user import User, UserRole
from app.auth import get_password_hash

ZONES = [
    {"name": "Adajan", "lat": 21.1959, "lng": 72.7933, "type": ZoneType.residential},
    {"name": "Piplod", "lat": 21.1553, "lng": 72.7663, "type": ZoneType.commercial},
    {"name": "Katargam", "lat": 21.2291, "lng": 72.8251, "type": ZoneType.residential},
    {"name": "Vesu", "lat": 21.1444, "lng": 72.7753, "type": ZoneType.commercial},
    {"name": "Varacha", "lat": 21.2144, "lng": 72.8596, "type": ZoneType.market},
    {"name": "Udhna", "lat": 21.1663, "lng": 72.8443, "type": ZoneType.industrial},
    {"name": "Sachin", "lat": 21.0886, "lng": 72.8837, "type": ZoneType.industrial},
    {"name": "Sarthana", "lat": 21.2334, "lng": 72.8817, "type": ZoneType.residential},
    {"name": "Kamrej", "lat": 21.2778, "lng": 72.9647, "type": ZoneType.residential},
    {"name": "Pandesara", "lat": 21.1481, "lng": 72.8273, "type": ZoneType.industrial},
    {"name": "Althan", "lat": 21.1614, "lng": 72.7937, "type": ZoneType.residential},
    {"name": "Athwa", "lat": 21.1824, "lng": 72.8055, "type": ZoneType.commercial},
    {"name": "Kadodra", "lat": 21.1542, "lng": 72.9669, "type": ZoneType.industrial},
    {"name": "Amroli", "lat": 21.2405, "lng": 72.8465, "type": ZoneType.residential},
]

def seed_surat():
    db = SessionLocal()
    print("Clearing old zones and trucks...")
    db.query(Zone).delete()
    db.query(Truck).delete()
    
    # Also clear drivers to avoid unique constraint issues
    db.query(User).filter(User.role == UserRole.driver).delete()
    db.commit()

    print("Adding 14 Surat Zones...")
    for i, z in enumerate(ZONES):
        db.add(Zone(
            id=i+1,
            name=z["name"],
            zone_type=z["type"],
            lat=z["lat"],
            lng=z["lng"],
            current_fill_level=20.0,
            fill_level_source=FillLevelSource.predicted,
        ))

    print("Adding 15 Truck Drivers and Trucks...")
    for i in range(1, 16):
        driver = User(
            email=f"driver{i}@surat.gov.in",
            password_hash=get_password_hash("password123"),
            name=f"Driver {i}",
            role=UserRole.driver,
        )
        db.add(driver)
        db.commit()
        db.refresh(driver)
        
        truck = Truck(
            vehicle_number=f"GJ-05-AB-{1000+i}",
            capacity_kg=2000.0, # 2 tons
            driver_id=driver.id,
            status=TruckStatus.idle,
            is_active=True,
            current_lat=21.1702, # Default SMC office
            current_lng=72.8311
        )
        db.add(truck)
        
    db.commit()
    print("Seeding Complete. 14 Zones, 15 Trucks created.")
    db.close()

if __name__ == "__main__":
    seed_surat()
