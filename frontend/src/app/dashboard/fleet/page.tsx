"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function FleetPage() {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  useEffect(() => {
    const fetchData = () => {
      api.getTrucks().then(setTrucks);
      api.getRoutes({}).then(setRoutes);
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🚛 Fleet Tracker</h1>
      <div className="grid grid-cols-3 gap-4">
        {trucks.map(t => (
          <div key={t.id} className="card card-hover">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">{t.vehicle_number}</h3>
              <span className={`badge ${t.status === "on_route" ? "badge-worker" : t.status === "completed" ? "fill-green" : "badge-driver"}`}>{t.status.replace("_", " ")}</span>
            </div>
            <p className="text-sm text-[#8A8887]">Driver: {t.driver_name || "Unassigned"}</p>
            <p className="text-sm text-[#8A8887]">Capacity: {t.capacity_kg}kg</p>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 className="text-sm font-semibold mb-3">Today&apos;s Routes</h3>
        {routes.map((r: any) => (
          <div key={r.id} className="py-3 border-b border-[#2A2A36]">
            <div className="flex justify-between"><span className="font-medium">Route #{r.id}</span><span className={`badge ${r.status === "completed" ? "fill-green" : r.status === "active" ? "badge-worker" : "badge-ml"}`}>{r.status}</span></div>
            <p className="text-xs text-[#8A8887] mt-1">{r.total_distance_km}km • {r.estimated_duration_mins}min • {r.reoptimized_count} re-optimizations</p>
            <div className="flex gap-1 mt-2 flex-wrap">{(r.zone_sequence || []).map((z: any, i: number) => <span key={i} className={`text-xs px-2 py-1 rounded ${z.completed ? "bg-green-500/20 text-green-400" : "bg-[#22222E] text-[#8A8887]"}`}>{z.zone_name || `Zone ${z.zone_id}`}</span>)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
