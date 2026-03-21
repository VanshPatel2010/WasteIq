import os
import sys
import pandas as pd
import numpy as np
import joblib
from datetime import datetime
import matplotlib.pyplot as plt
import seaborn as sns
from geopy.distance import geodesic

# Add backend directory to path to import models if needed
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def calculate_distance(z1, z2):
    return geodesic((z1['lat'], z1['lng']), (z2['lat'], z2['lng'])).kilometers

def generate_comparison():
    print("--- Loading ML Model and Environment ---")
    model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "waste_model.joblib")
    if not os.path.exists(model_path):
        print("Error: Model not found.")
        return
    model = joblib.load(model_path)
    
    # 1. Setup Surat Zones
    zones_data = [
        {"id": 1, "name": "Adajan", "lat": 21.1959, "lng": 72.7933},
        {"id": 2, "name": "Piplod", "lat": 21.1578, "lng": 72.7755},
        {"id": 3, "name": "Katargam", "lat": 21.2290, "lng": 72.8250},
        {"id": 4, "name": "Vesu", "lat": 21.1418, "lng": 72.7712},
        {"id": 5, "name": "Varacha", "lat": 21.2132, "lng": 72.8687},
        {"id": 6, "name": "Udhna", "lat": 21.1611, "lng": 72.8465},
        {"id": 7, "name": "Sachin", "lat": 21.0875, "lng": 72.8715},
        {"id": 8, "name": "Sarthana", "lat": 21.2388, "lng": 72.9095},
        {"id": 9, "name": "Kamrej", "lat": 21.2721, "lng": 72.9734},
        {"id": 10, "name": "Pandesara", "lat": 21.1398, "lng": 72.8263},
        {"id": 11, "name": "Althan", "lat": 21.1511, "lng": 72.7951},
        {"id": 12, "name": "Athwa", "lat": 21.1788, "lng": 72.7942},
        {"id": 13, "name": "Kadodara", "lat": 21.1711, "lng": 72.9691},
        {"id": 14, "name": "Amroli", "lat": 21.2427, "lng": 72.8336},
    ]
    zones_df = pd.DataFrame(zones_data)
    
    # Simulate a High Surge Day (e.g., Diwali Morning)
    print("Simulating a High Surge Festival Day (Diwali)...")
    # Features (X): ["zone_id", "zone_type_encoded", "hour", "day_of_week", "month", "is_weekend", "season", "festival"]
    # We assign fixed mock inputs for the features to simulate Diwali at 8 AM.
    # We must predict waste amount for each zone.
    
    # Simple zone type mapper
    zone_type_map = {1:2, 2:1, 3:3, 4:2, 5:3, 6:3, 7:3, 8:2, 9:2, 10:3, 11:2, 12:1, 13:3, 14:2}
    
    test_features = []
    for z in zones_df['id']:
        test_features.append({
            "zone_id": z,
            "zone_type_encoded": zone_type_map[z],
            "hour": 8, # 8 AM
            "day_of_week": 5, # Saturday
            "month": 10, # October
            "is_weekend": 1,
            "season": 2, # Winter/Post-Monsoon
            "festival": 2 # Diwali
        })
    X_target = pd.DataFrame(test_features)
    predicted_waste = model.predict(X_target)
    
    zones_df['waste_kg'] = predicted_waste
    zones_df['urgency'] = zones_df['waste_kg'] / 500.0 # Assuming 500kg is capacity limit
    
    depot = {"lat": 21.1702, "lng": 72.8311} # Surat SMC Center
    num_trucks = 3
    
    # -------------------------------------------------------------
    # Algorithm 1: Baseline (A* / Pure Shortest Distance TSP)
    # Ignores ML urgency, just finds the closest next node geographically
    # -------------------------------------------------------------
    print("\n--- Running Algorithm 1: Distance-Only Baseline (A* TSP) ---")
    unvisited_baseline = zones_df.copy()
    truck_routes_baseline = {i: [] for i in range(num_trucks)}
    truck_distances_baseline = {i: 0.0 for i in range(num_trucks)}
    truck_time_baseline = {i: 0.0 for i in range(num_trucks)}
    truck_overflow_penalty_base = 0.0
    
    positions = {i: depot for i in range(num_trucks)}
    
    t_idx = 0
    while not unvisited_baseline.empty:
        curr_pos = positions[t_idx]
        
        # A* Distance Heuristic (Closest neighbor)
        unvisited_baseline['dist'] = unvisited_baseline.apply(lambda r: calculate_distance(curr_pos, r), axis=1)
        next_node = unvisited_baseline.loc[unvisited_baseline['dist'].idxmin()]
        
        dist = next_node['dist']
        travel_time = dist / 25.0 * 60.0 # 25km/h in mins
        
        # Accumulate overflow penalty while truck travels
        truck_time_baseline[t_idx] += travel_time + 15.0 # 15 mins to collect
        
        # Calculate penalty: if a high urgency node waits a long time, it overflows
        # Penalty = Waiting Time * Waste Amount
        truck_overflow_penalty_base += truck_time_baseline[t_idx] * next_node['waste_kg']
        
        truck_routes_baseline[t_idx].append(next_node['name'])
        truck_distances_baseline[t_idx] += dist
        positions[t_idx] = {"lat": next_node['lat'], "lng": next_node['lng']}
        
        unvisited_baseline = unvisited_baseline.drop(next_node.name)
        t_idx = (t_idx + 1) % num_trucks

    # -------------------------------------------------------------
    # Algorithm 2: Intelligent ML Fleet Optimizer
    # Uses ML waste predictions + Distance to prioritize full bins
    # -------------------------------------------------------------
    print("--- Running Algorithm 2: ML-Powered Dynamic Optimization ---")
    unvisited_ml = zones_df.copy()
    truck_routes_ml = {i: [] for i in range(num_trucks)}
    truck_distances_ml = {i: 0.0 for i in range(num_trucks)}
    truck_time_ml = {i: 0.0 for i in range(num_trucks)}
    truck_overflow_penalty_ml = 0.0
    
    positions_ml = {i: depot for i in range(num_trucks)}
    
    t_idx = 0
    while not unvisited_ml.empty:
        curr_pos = positions_ml[t_idx]
        
        # ML Urgency Heuristic: Maximize (Urgency^2 / Distance)
        unvisited_ml['dist'] = unvisited_ml.apply(lambda r: max(calculate_distance(curr_pos, r), 0.5), axis=1)
        unvisited_ml['score'] = (unvisited_ml['urgency'] ** 2) / unvisited_ml['dist']
        next_node = unvisited_ml.loc[unvisited_ml['score'].idxmax()]
        
        dist = next_node['dist']
        travel_time = dist / 25.0 * 60.0
        
        truck_time_ml[t_idx] += travel_time + 15.0
        
        # Penalty calculation
        truck_overflow_penalty_ml += truck_time_ml[t_idx] * next_node['waste_kg']
        
        truck_routes_ml[t_idx].append(next_node['name'])
        truck_distances_ml[t_idx] += dist
        positions_ml[t_idx] = {"lat": next_node['lat'], "lng": next_node['lng']}
        
        unvisited_ml = unvisited_ml.drop(next_node.name)
        t_idx = (t_idx + 1) % num_trucks
        
    # --- Output Comparison ---
    report_lines = []
    report_lines.append("================ COMPARISON RESULTS ================")
    report_lines.append("Metric: Overflow Penalty Score (Lower is better)")
    report_lines.append("This measures how long highly filled bins sit waiting for a truck.")
    report_lines.append("----------------------------------------------------")
    report_lines.append(f"Algorithm 1 (A* / Pure Distance Baseline): {truck_overflow_penalty_base:,.0f} points")
    report_lines.append(f"Algorithm 2 (Our ML Prediction Optimization): {truck_overflow_penalty_ml:,.0f} points")
    
    improvement = ((truck_overflow_penalty_base - truck_overflow_penalty_ml) / truck_overflow_penalty_base) * 100
    report_lines.append(f"\n=> ML Model performed {improvement:.1f}% BETTER than standard A* routing!")
    
    report_lines.append("\n--- Route Strategy Differences ---")
    report_lines.append(f"ML Track 1: {', '.join(truck_routes_ml[0])}")
    report_lines.append(f"A* Track 1: {', '.join(truck_routes_baseline[0])}")
    report_lines.append(f"ML Track 2: {', '.join(truck_routes_ml[1])}")
    report_lines.append(f"A* Track 2: {', '.join(truck_routes_baseline[1])}")
    report_lines.append(f"ML Track 3: {', '.join(truck_routes_ml[2])}")
    report_lines.append(f"A* Track 3: {', '.join(truck_routes_baseline[2])}")
    
    report_text = "\n".join(report_lines)
    print(report_text)
    
    # Save text report
    report_path = os.path.join(os.path.dirname(__file__), "routing_comparison_report.txt")
    with open(report_path, "w") as f:
        f.write(report_text)
    print(f"\nText report saved to {report_path}")
    
    # Save CSV Data for transparent review
    csv_path = os.path.join(os.path.dirname(__file__), "routing_comparison_node_data.csv")
    zones_df.to_csv(csv_path, index=False)
    print(f"Node simulation data saved to {csv_path}")
    
    # Save a comparison chart
    labels = ['Baseline A* (Distance Only)', 'Our ML Algorithm (Urgency + Distance)']
    penalties = [truck_overflow_penalty_base, truck_overflow_penalty_ml]
    
    plt.figure(figsize=(10, 6))
    sns.set_theme(style="whitegrid")
    
    # Custom color palette prioritizing our ML component
    colors = ['#E04848', '#14A37F'] 
    
    bars = plt.bar(labels, penalties, color=colors, width=0.6)
    plt.ylabel('Overflow Penalty Score (Lower is Better)')
    plt.title(f'Routing Algorithm Comparison (Simulating 3 Trucks during Diwali Surge)', fontsize=14, fontweight='bold', pad=20)
    
    # Add data labels
    for bar in bars:
        yval = bar.get_height()
        plt.text(bar.get_x() + bar.get_width()/2.0, yval - (yval*0.05), f"{int(yval):,}", ha='center', va='top', color='white', fontweight='bold', fontsize=12)
        
    plt.text(1, penalties[1] + (penalties[0]-penalties[1])*0.5, f"{improvement:.1f}% Reduction in\nWaste Overflows!", 
             ha='center', va='center', bbox=dict(boxstyle="round,pad=0.3", fc="#14A37F", ec="none", alpha=0.1), color="#0e755a", fontweight="bold")
    
    out_path = os.path.join(os.path.dirname(__file__), "algorithm_comparison.png")
    plt.savefig(out_path, dpi=300, bbox_inches='tight')
    print(f"Comparison chart saved to {out_path}")
    
if __name__ == "__main__":
    generate_comparison()
