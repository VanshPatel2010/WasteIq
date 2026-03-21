"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import dynamic from "next/dynamic";

const ZoneMap = dynamic(() => import("@/components/ZoneMap"), { ssr: false });

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleReroute = async () => {
    try {
      setIsOptimizing(true);
      await api.optimizeRoutes();
      alert("Routes optimized successfully! Truck paths have been updated.");
      
      // Refresh UI data
      Promise.all([api.dashboardStats(), api.getZones(), api.getSurgeAlerts(), api.getTrucks()])
        .then(([s, z, a, t]) => { setStats(s); setZones(z); setAlerts(a); setTrucks(t); })
        .catch(console.error);
    } catch (err: any) {
      alert("Failed to optimize routes: " + err.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  useEffect(() => {
    const fetchAll = () => {
      Promise.all([api.dashboardStats(), api.getZones(), api.getSurgeAlerts(), api.getTrucks()])
        .then(([s, z, a, t]) => { setStats(s); setZones(z); setAlerts(a); setTrucks(t); })
        .catch(console.error);
    };
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const metricCards = stats ? [
    { label: "Total Zones", value: stats.total_zones, sub: `${stats.overdue_zones} overdue`, color: "text-[#534AB7]", bg: "bg-[#534AB7]/10" },
    { label: "Active Trucks", value: `${stats.active_trucks}/${stats.total_trucks}`, sub: "on route", color: "text-[#0F6E56]", bg: "bg-[#0F6E56]/10" },
    { label: "Surge Alerts", value: stats.surge_alerts, sub: stats.surge_alerts > 0 ? "requires attention" : "all clear", color: stats.surge_alerts > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]", bg: stats.surge_alerts > 0 ? "bg-[#A32D2D]/10" : "bg-[#0F6E56]/10" },
    { label: "Surplus Matches", value: stats.surplus_matches_today, sub: "today", color: "text-[#854F0B]", bg: "bg-[#854F0B]/10" },
    { label: "Worker Reports", value: stats.worker_reports_today, sub: `${stats.zones_covered_today} zones covered`, color: "text-[#0F6E56]", bg: "bg-[#0F6E56]/10" },
  ] : [];

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "worker_reported": return <span className="badge badge-worker">👷 Worker</span>;
      case "driver_reported": return <span className="badge badge-driver">🚛 Driver</span>;
      default: return <span className="badge badge-ml">🤖 ML</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-[#8A8887] text-sm">Municipal Intelligence Overview</p>
        </div>
        <div className="text-xs text-[#8A8887] bg-[#22222E] px-3 py-2 rounded-lg">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-5 gap-4">
        {metricCards.map((card, i) => (
          <div key={i} className="metric-card">
            <div className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}>
              <span className={`text-xl font-bold ${card.color}`}>{typeof card.value === "number" ? card.value : ""}</span>
            </div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-sm text-[#8A8887]">{card.label}</div>
            <div className="text-xs text-[#5F5E5A]">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Map + Alerts */}
      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 card" style={{ minHeight: 480 }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">🗺️ Zone Map <span className="text-xs text-[#8A8887]">({zones.length} zones)</span></h3>
          <ZoneMap zones={zones} trucks={trucks} />
        </div>

        <div className="col-span-2 space-y-4">
          <div className="card max-h-[300px] overflow-y-auto">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">⚠️ Surge Alerts <span className="badge bg-[#A32D2D]/20 text-[#E04848]">{alerts.length}</span></h3>
            {alerts.length === 0 && <p className="text-[#5F5E5A] text-sm py-4">No active surge alerts</p>}
            {alerts.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 py-3 border-b border-[#2A2A36] last:border-0">
                <div className={`w-3 h-3 rounded-full ${a.surge_score >= 8 ? "bg-[#E04848] animate-pulse" : a.surge_score >= 6 ? "bg-[#C05621]" : "bg-[#D4A017]"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{a.zone_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#8A8887]">Fill: {a.predicted_fill_level}%</span>
                    <span className="text-xs text-[#8A8887]">Score: {a.surge_score}</span>
                    {getSourceBadge(a.fill_level_source)}
                  </div>
                </div>
                <button className="text-xs btn-primary py-1.5 px-3" onClick={handleReroute} disabled={isOptimizing}>
                  {isOptimizing ? "Routing..." : "Reroute"}
                </button>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 className="text-sm font-semibold mb-3">🚛 Route Progress</h3>
            {trucks.map((t: any) => (
              <div key={t.id} className="py-2 border-b border-[#2A2A36] last:border-0">
                <div className="flex justify-between text-sm">
                  <span>{t.vehicle_number}</span>
                  <span className={`badge ${t.status === "on_route" ? "badge-worker" : t.status === "completed" ? "fill-green" : "badge-driver"}`}>{t.status}</span>
                </div>
                {t.driver_name && <p className="text-xs text-[#8A8887] mt-1">{t.driver_name}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
