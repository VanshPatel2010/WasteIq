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
  const [routes, setRoutes] = useState<any[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [simStatus, setSimStatus] = useState<any>(null);
  const [simDate, setSimDate] = useState<string>("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", password: "", phone: "", role: "driver" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState("");

  const handleAddPersonnel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name || !addForm.email || !addForm.password) return setAddError("Please fill required fields");
    setAddLoading(true);
    setAddError("");
    setAddSuccess("");
    try {
      await api.register({ ...addForm, organisation_id: 1 });
      setAddSuccess(`Successfully added ${addForm.name}!`);
      setAddForm({ name: "", email: "", password: "", phone: "", role: "driver" });
      setTimeout(() => setShowAddModal(false), 2000);
      fetchAll();
    } catch (err: any) {
      setAddError(err.message || "Failed to add personnel");
    } finally {
      setAddLoading(false);
    }
  };

  const fetchAll = () => {
    Promise.all([
      api.dashboardStats(), api.getZones(), api.getSurgeAlerts(), 
      api.getTrucks(), api.getSimulationStatus(), api.getRoutes()
    ])
    .then(([s, z, a, t, sim, r]) => { 
      setStats(s); setZones(z); setAlerts(a); setTrucks(t); 
      setRoutes(r);
      if (!simDate && sim.current_time) {
        setSimDate(sim.current_time.substring(0, 16));
      }
    })
    .catch(console.error);
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleReroute = async () => {
    try {
      setIsOptimizing(true);
      await api.optimizeRoutes();
      fetchAll();
    } catch (err: any) {
      alert("Failed to optimize routes: " + err.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  const setSimulation = async (dateStr: string | null) => {
    try {
      if (dateStr) {
        // Append Z just to ensure the backend receives a valid ISO
        await api.setSimulationDate(new Date(dateStr).toISOString());
      } else {
        await api.setSimulationDate(null);
        setSimDate("");
      }
      fetchAll();
    } catch (err: any) {
      alert("Simulation failed: " + err.message);
    }
  };

  const metricCards = stats ? [
    { label: "Total Zones", value: stats.total_zones, sub: `${stats.overdue_zones} overdue`, color: "text-[#534AB7]", bg: "bg-[#534AB7]/10" },
    { label: "Active Trucks", value: `${stats.active_trucks}/${stats.total_trucks}`, sub: "on duty", color: "text-[#0F6E56]", bg: "bg-[#0F6E56]/10" },
    { label: "Surge Alerts", value: stats.surge_alerts, sub: stats.surge_alerts > 0 ? "requires attention" : "all clear", color: stats.surge_alerts > 0 ? "text-[#A32D2D]" : "text-[#0F6E56]", bg: stats.surge_alerts > 0 ? "bg-[#A32D2D]/10" : "bg-[#0F6E56]/10" },
    { label: "Surplus Matches", value: stats.surplus_matches_today, sub: "today", color: "text-[#854F0B]", bg: "bg-[#854F0B]/10" },
    { label: "Worker Reports", value: stats.worker_reports_today, sub: `${stats.zones_covered_today} zones covered`, color: "text-[#0F6E56]", bg: "bg-[#0F6E56]/10" },
  ] : [];

  const getSourceBadge = (source: string) => {
    switch (source) {
      case "worker_reported": return <span className="badge badge-worker">👷 Worker</span>;
      case "driver_reported": return <span className="badge badge-driver">🚛 Driver</span>;
      default: return <span className="badge badge-ml">🤖 ML Prediction</span>;
    }
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">Dashboard</h1>
          <p className="text-[#6B7280] text-sm">Municipal Intelligence Overview</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary mt-2 text-xs py-1.5 px-3 shadow-sm font-bold bg-[#1B7A4A]">+ Add Personnel</button>
        </div>
        
        {/* TIME MACHINE UI */}
        <div className={`p-4 rounded-xl border-2 ${simStatus?.is_simulated ? "border-[#534AB7] bg-[#534AB7]/10" : "border-[#D6D3C8] bg-white"} flex items-center gap-4 shadow-sm`}>
          <div>
            <p className="text-xs text-[#6B7280] font-bold tracking-widest uppercase mb-1">
              ⏳ {simStatus?.is_simulated ? "Time Machine (Active)" : "Live Mode"}
            </p>
            <input 
              type="datetime-local" 
              className="bg-[#F9FAFB] text-sm border border-[#D6D3C8] rounded px-3 py-1.5 text-[#1F2937] outline-none focus:border-[#1B7A4A] shadow-inner"
              value={simDate}
              onChange={(e) => setSimDate(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <button className="btn-primary py-1.5 px-4 text-sm font-bold shadow-sm" onClick={() => setSimulation(simDate)}>Simulate</button>
            {simStatus?.is_simulated && (
              <button className="bg-white border border-[#D6D3C8] hover:bg-[#F9FAFB] text-[#B91C1C] font-bold py-1.5 px-4 rounded-xl text-sm transition shadow-sm" onClick={() => setSimulation(null)}>Reset to Live</button>
            )}
          </div>
          
          {/* Quick Presets */}
          <div className="flex gap-2 border-l border-[#D6D3C8] pl-5 ml-2">
            <button className="badge badge-worker border border-[#D6D3C8] cursor-pointer hover:bg-white transition-all shadow-sm" onClick={() => { setSimDate("2023-10-18T21:00"); setSimulation("2023-10-18T21:00"); }}>🥁 Navratri Night</button>
            <button className="badge border border-red-200 bg-red-50 text-[#B91C1C] cursor-pointer hover:bg-red-100 transition-all shadow-sm" onClick={() => { setSimDate("2023-11-12T08:00"); setSimulation("2023-11-12T08:00"); }}>🪔 Diwali Morning</button>
            <button className="badge badge-driver border border-[#D6D3C8] cursor-pointer hover:bg-white transition-all shadow-sm" onClick={() => { setSimDate("2024-01-14T14:00"); setSimulation("2024-01-14T14:00"); }}>🪁 Uttarayan</button>
          </div>
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
            <div className="text-sm text-[#6B7280]">{card.label}</div>
            <div className="text-xs text-[#9CA3AF]">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3 card" style={{ minHeight: 480 }}>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">🗺️ Zone Map <span className="text-xs font-bold text-[#6B7280]/60">({zones.length} zones)</span></h3>
          <ZoneMap zones={zones} trucks={trucks} routes={routes} />
        </div>

        <div className="col-span-2 space-y-4">
          <div className="card max-h-[300px] overflow-y-auto">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[#1F2937]">⚠️ Surge Alerts <span className="badge bg-[#B91C1C]/10 text-[#B91C1C]">{alerts.length}</span></h3>
            {alerts.length === 0 && <p className="text-[#9CA3AF] text-sm py-4">No active surge alerts</p>}
            {alerts.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 py-3 border-b border-[#D6D3C8] last:border-0 hover:bg-[#F0EDE6]/30 px-2 -mx-2 rounded-lg transition-colors">
                <div className={`w-3 h-3 rounded-full ${a.surge_score >= 8 ? "bg-[#B91C1C] animate-pulse" : a.surge_score >= 6 ? "bg-[#D97706]" : "bg-[#C9A84C]"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1F2937]">{a.zone_name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#6B7280]">Fill: {a.predicted_fill_level}%</span>
                    <span className="text-xs text-[#6B7280]">Score: {a.surge_score}</span>
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
            <h3 className="text-sm font-semibold flex justify-between items-center mb-3">
              <span>🚛 Dynamic Fleet</span>
              {simStatus?.is_simulated && <span className="text-xs badge badge-ml">ML Optimized</span>}
            </h3>
            {trucks.map((t: any) => (
              <div key={t.id} className="py-2 border-b border-[#D6D3C8] last:border-0 hover:bg-[#F0EDE6]/50 px-2 -mx-2 rounded-lg transition-colors">
                <div className="flex justify-between text-sm items-center">
                  <span className="font-semibold text-[#1F2937]">{t.vehicle_number}</span>
                  <span className={`badge shadow-sm ${!t.is_active ? "bg-gray-100 text-gray-500 border border-gray-200" : t.status === "on_route" ? "badge-worker" : t.status === "idle" ? "badge-ml" : t.status === "completed" ? "fill-green lg" : "badge-driver"}`}>
                    {!t.is_active ? "Standby" : t.status}
                  </span>
                </div>
                {t.driver_name && t.is_active && <p className="text-xs text-[#6B7280] font-medium mt-0.5">{t.driver_name}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-[#D6D3C8]">
            <h2 className="text-xl font-bold text-[#1F2937] mb-2">Register Personnel</h2>
            <p className="text-sm text-[#6B7280] mb-6">Create new roles for the municipal fleet network.</p>
            <form onSubmit={handleAddPersonnel} className="space-y-4">
              <div className="flex gap-2 p-1 bg-[#F0EDE6] rounded-xl shadow-inner border border-[#D6D3C8]/50">
                <button type="button" onClick={() => setAddForm({...addForm, role: "driver"})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${addForm.role === "driver" ? "bg-white text-[#1B7A4A] shadow-sm transform scale-100" : "text-[#6B7280] hover:text-[#1F2937]"}`}>🚛 Driver</button>
                <button type="button" onClick={() => setAddForm({...addForm, role: "waste_worker"})} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${addForm.role === "waste_worker" ? "bg-white text-[#1B7A4A] shadow-sm transform scale-100" : "text-[#6B7280] hover:text-[#1F2937]"}`}>👷 Waste Worker</button>
              </div>
              <input type="text" value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} className="input w-full bg-[#F5F5F0] border-[#D6D3C8] text-[#1F2937]" placeholder="Full Name" required />
              <input type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} className="input w-full bg-[#F5F5F0] border-[#D6D3C8] text-[#1F2937]" placeholder="Email Address" required />
              <input type="tel" value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} className="input w-full bg-[#F5F5F0] border-[#D6D3C8] text-[#1F2937]" placeholder="Phone Number (Optional)" />
              <input type="password" value={addForm.password} onChange={e => setAddForm({...addForm, password: e.target.value})} className="input w-full bg-[#F5F5F0] border-[#D6D3C8] text-[#1F2937]" placeholder="Temporary Password" required />
              
              {addError && <p className="text-xs text-[#B91C1C] font-bold bg-[#FEF2F2] p-2 rounded-lg text-center">{addError}</p>}
              {addSuccess && <p className="text-xs text-[#15803D] font-bold bg-[#F0FDF4] p-2 rounded-lg text-center">{addSuccess}</p>}
              
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="bg-white border text-sm font-bold border-[#D6D3C8] hover:bg-[#F0EDE6] flex-1 py-2.5 rounded-xl shadow-sm transition-colors text-[#1F2937]">Cancel</button>
                <button type="submit" disabled={addLoading} className="btn-primary flex-1 py-2.5 text-sm font-bold shadow-md">
                  {addLoading ? "Creating..." : `Add ${addForm.role === "driver" ? "Driver" : "Worker"}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
