import pandas as pd
import numpy as np
from datetime import datetime
import os

ZONES = [
    {"id": 1, "name": "Adajan", "type": "residential", "base_kg": 40},
    {"id": 2, "name": "Piplod", "type": "commercial", "base_kg": 60},
    {"id": 3, "name": "Katargam", "type": "residential", "base_kg": 50},
    {"id": 4, "name": "Vesu", "type": "commercial", "base_kg": 65},
    {"id": 5, "name": "Varacha", "type": "market", "base_kg": 80},
    {"id": 6, "name": "Udhna", "type": "industrial", "base_kg": 70},
    {"id": 7, "name": "Sachin", "type": "industrial", "base_kg": 85},
    {"id": 8, "name": "Sarthana", "type": "residential", "base_kg": 35},
    {"id": 9, "name": "Kamrej", "type": "residential", "base_kg": 30},
    {"id": 10, "name": "Pandesara", "type": "industrial", "base_kg": 75},
    {"id": 11, "name": "Althan", "type": "residential", "base_kg": 45},
    {"id": 12, "name": "Athwa", "type": "commercial", "base_kg": 55},
    {"id": 13, "name": "Kadodra", "type": "industrial", "base_kg": 60},
    {"id": 14, "name": "Amroli", "type": "residential", "base_kg": 38},
]

def is_navratri(dt: datetime) -> bool:
    # Approx dates for 2022 and 2023
    return (dt.year == 2022 and dt.month == 9 and dt.day >= 26) or \
           (dt.year == 2022 and dt.month == 10 and dt.day <= 4) or \
           (dt.year == 2023 and dt.month == 10 and 15 <= dt.day <= 23)

def is_diwali(dt: datetime) -> bool:
    return (dt.year == 2022 and dt.month == 10 and 22 <= dt.day <= 26) or \
           (dt.year == 2023 and dt.month == 11 and 10 <= dt.day <= 14)

def is_uttarayan(dt: datetime) -> bool:
    return dt.month == 1 and 14 <= dt.day <= 15

def get_season(month: int) -> int:
    # 0 = Winter, 1 = Summer, 2 = Monsoon
    if month in [11, 12, 1, 2]: return 0
    if month in [3, 4, 5, 6]: return 1
    return 2

def generate_data():
    start_date = datetime(2022, 1, 1)
    end_date = datetime(2023, 12, 31, 23, 59)
    date_rng = pd.date_range(start=start_date, end=end_date, freq='h')
    
    records = []
    
    print(f"Generating data for {len(date_rng)} hours...")
    
    for dt in date_rng:
        hour = dt.hour
        month = dt.month
        day_of_week = dt.weekday()
        is_weekend = 1 if day_of_week >= 5 else 0
        season = get_season(month)
        
        festival = 0
        if is_navratri(dt): festival = 1
        elif is_diwali(dt): festival = 2
        elif is_uttarayan(dt): festival = 3
        
        for zone in ZONES:
            base = zone["base_kg"]
            multiplier = 1.0
            
            # Time of day
            if 6 <= hour <= 10: multiplier *= 1.3
            elif 18 <= hour <= 22: multiplier *= 1.4
            elif 0 <= hour <= 5: multiplier *= 0.3
            else: multiplier *= 0.8
            
            # Weekend effect
            if is_weekend:
                multiplier *= 1.2 if zone["type"] in ["commercial", "market"] else 0.8
                
            # Season effect
            if season == 2: # Monsoon
                multiplier *= 1.15 # Wet waste is heavier
                
            # Festival effects
            if festival == 1: # Navratri
                if zone["type"] == "commercial" or zone["id"] in [2, 4]: # Piplod, Vesu
                    multiplier *= 3.0 if 20 <= hour <= 23 or 0 <= hour <= 2 else 1.2
            elif festival == 2: # Diwali
                multiplier *= 2.5 if zone["type"] in ["residential", "market"] else 1.5
            elif festival == 3: # Uttarayan
                if zone["name"] in ["Varacha", "Katargam", "Udhna"]:
                    multiplier *= 2.8 if 10 <= hour <= 20 else 1.5
            
            # Add noise
            noise = np.random.normal(0, 5)
            waste_kg = max(0, (base * multiplier) + noise)
            
            records.append({
                "timestamp": dt,
                "zone_id": zone["id"],
                "zone_type": zone["type"],
                "hour": hour,
                "day_of_week": day_of_week,
                "month": month,
                "is_weekend": is_weekend,
                "season": season,
                "festival": festival,
                "waste_kg": round(waste_kg, 2)
            })

    df = pd.DataFrame(records)
    # Map string types to int categoricals for ML
    type_map = {"residential": 0, "commercial": 1, "industrial": 2, "market": 3}
    df["zone_type_encoded"] = df["zone_type"].map(type_map)
    
    os.makedirs(os.path.dirname(__file__), exist_ok=True)
    out_path = os.path.join(os.path.dirname(__file__), "surat_waste_data.csv")
    df.to_csv(out_path, index=False)
    print(f"Saved {len(df)} records to {out_path}")

if __name__ == "__main__":
    generate_data()
