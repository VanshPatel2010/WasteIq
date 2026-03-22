"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { api } from "@/lib/api";
import dynamic from "next/dynamic";

const DriverRouteMap = dynamic(() => import("@/components/DriverRouteMap"), { ssr: false });

export default function DriverPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [routes, setRoutes] = useState<any[]>([]);
  const [pickups, setPickups] = useState<any[]>([]);
  const [completing, setCompleting] = useState<any>(null);
  const [fillFound, setFillFound] = useState(50);
  const [fillFoundLabel, setFillFoundLabel] = useState<"low" | "medium" | "high">("medium");
  const fillLevelMap = { low: 25, medium: 50, high: 85 };
  const getFillLabel = (val: number) => val <= 35 ? "Low" : val <= 65 ? "Medium" : "High";
  const getFillLabelColor = (label: string) => label === "High" || label === "high" ? "#B91C1C" : label === "Medium" || label === "medium" ? "#D97706" : "#15803D";
  const [weight, setWeight] = useState("");
  const [toast, setToast] = useState("");
  const [comparison, setComparison] = useState<any>(null);
  const [simStatus, setSimStatus] = useState<any>(null);
  const [simDate, setSimDate] = useState<string>("");

  useEffect(() => { if (!loading && user?.role !== "driver") router.push("/"); }, [user, loading, router]);
  useEffect(() => {
    if (!user) return;
    const fetchData = () => {
      api.getRoutes({}).then(setRoutes);
      api.getPickups().then(setPickups);
      api.getSimulationStatus().then((sim) => {
        setSimStatus(sim);
        if (!simDate && sim.current_time) setSimDate(sim.current_time.substring(0, 16));
      });
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user, simDate]);

  const setSimulation = async (dateStr: string | null) => {
    try {
      if (dateStr) {
        await api.setSimulationDate(new Date(dateStr).toISOString());
      } else {
        await api.setSimulationDate(null);
        setSimDate("");
      }
      // Force refresh data
      const sim = await api.getSimulationStatus();
      setSimStatus(sim);
      api.getRoutes({}).then(setRoutes);
    } catch (err: any) {
      alert("Simulation failed: " + err.message);
    }
  };

  const handleComplete = async () => {
    if (!completing) return;
    try {
      const result = await api.completePickup({ zone_id: completing.zone_id, truck_id: 1, fill_level_found: fillFound, weight_collected_kg: weight ? parseFloat(weight) : null });
      setCompleting(null);
      api.getRoutes({}).then(setRoutes);
      api.getPickups().then(setPickups);

      // Show worker comparison if available
      if (result.worker_comparison) {
        setComparison(result.worker_comparison);
      } else {
        setToast("Pickup completed!");
        setTimeout(() => setToast(""), 3000);
      }
    } catch (e: any) {
      setToast("Error: " + e.message);
      setTimeout(() => setToast(""), 3000);
    }
  };

  if (loading || !user) return null;

  const todayRoute = routes[0];
  const sequence = todayRoute?.zone_sequence || [];

  // --- Comparison card after pickup ---
  if (comparison) return (
    <div className="min-h-screen bg-[#F5F5F0] p-4 text-[#1F2937]">
      <h2 className="text-xl font-bold mb-6 text-center">Pickup Report</h2>
      <div className="card mb-4 p-6 shadow-sm border border-[#D6D3C8] bg-white">
        <div className="text-center text-4xl mb-4">{comparison.accurate ? "✅" : "⚠️"}</div>
        <h3 className="text-lg font-semibold text-center mb-4">
          {comparison.accurate ? "Worker Report Matches!" : "Worker Report Mismatch!"}
        </h3>
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center p-3 rounded-lg bg-[#F5F5F0] border border-[#D6D3C8]/50">
            <span className="text-[#6B7280] font-medium">👷 Worker reported</span>
            <span className="font-bold text-lg" style={{ color: getFillLabelColor(getFillLabel(comparison.worker_reported)) }}>{getFillLabel(comparison.worker_reported)}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-[#F5F5F0] border border-[#D6D3C8]/50">
            <span className="text-[#6B7280] font-medium">🚛 You found</span>
            <span className="font-bold text-lg" style={{ color: getFillLabelColor(getFillLabel(comparison.driver_found)) }}>{getFillLabel(comparison.driver_found)}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg border" style={{ background: comparison.accurate ? "rgba(21,128,61,0.05)" : "rgba(185,28,28,0.05)", borderColor: comparison.accurate ? "rgba(21,128,61,0.2)" : "rgba(185,28,28,0.2)" }}>
            <span className="text-[#6B7280] font-medium">Match</span>
            <span className="font-bold text-lg" style={{ color: comparison.accurate ? "#15803D" : "#B91C1C" }}>
              {comparison.accurate ? "✓ Match" : "✗ Mismatch"}
            </span>
          </div>
        </div>
        {!comparison.accurate && (
          <p className="text-xs text-[#B91C1C] font-semibold text-center mb-4 bg-red-50 p-2 rounded-lg">
            ⚠️ Worker {comparison.worker_name || "Unknown"} has been penalized for inaccurate reporting.
          </p>
        )}
        {comparison.accurate && comparison.reward_awarded && (
          <div className="rounded-lg p-4 mb-4 border border-[#D6D3C8]" style={{ background: "linear-gradient(135deg, rgba(217,119,6,0.1) 0%, rgba(21,128,61,0.1) 100%)" }}>
            <div className="text-center">
              <p className="text-3xl mb-2 drop-shadow-sm">{comparison.reward_awarded.points >= 15 ? "🌟" : "🎉"}</p>
              <p className="text-sm font-bold text-[#15803D]">
                Worker {comparison.worker_name || "Unknown"} earned +{comparison.reward_awarded.points} reward points!
              </p>
              {comparison.reward_awarded.points >= 15 && (
                <p className="text-xs font-bold text-[#D97706] mt-1 tracking-wide uppercase">⭐ Bonus points for high accuracy!</p>
              )}
              <p className="text-xs font-semibold text-[#6B7280] mt-2 bg-white/50 py-1 rounded inline-block px-3">
                Total points: {comparison.reward_awarded.total_points}
              </p>
            </div>
          </div>
        )}
        {comparison.accurate && !comparison.reward_awarded && (
          <p className="text-xs text-[#15803D] font-semibold text-center mb-4 bg-green-50 p-2 rounded-lg border border-green-100">
            ✅ Worker {comparison.worker_name || "Unknown"}&apos;s report is within acceptable range.
          </p>
        )}
      </div>
      <button onClick={() => { setComparison(null); setToast("Pickup completed!"); setTimeout(() => setToast(""), 3000); }} className="btn-primary w-full py-4 text-lg font-bold shadow-md">
        Continue →
      </button>
    </div>
  );

  // --- Completing a pickup ---
  if (completing) return (
    <div className="min-h-screen bg-[#F5F5F0] p-4 text-[#1F2937]">
      <button onClick={() => setCompleting(null)} className="text-[#6B7280] font-bold mb-4 hover:text-[#1F2937]">← Back</button>
      <h2 className="text-xl font-bold mb-6 text-[#1F2937]">Complete Pickup: {completing.zone_name}</h2>
      <div className="card mb-4 bg-white border border-[#D6D3C8] shadow-sm">
        <label className="text-xs font-bold uppercase tracking-widest text-[#6B7280] mb-3 block">Fill level found</label>
        <div className="grid grid-cols-3 gap-3">
          {(["low", "medium", "high"] as const).map(level => (
            <button
              key={level}
              onClick={() => { setFillFoundLabel(level); setFillFound(fillLevelMap[level]); }}
              className={`py-5 px-3 rounded-xl text-center shadow-sm transition-all border ${
                fillFoundLabel === level
                  ? level === "low" ? "border-[#15803D] bg-[#15803D]/5" : level === "medium" ? "border-[#D97706] bg-[#D97706]/5" : "border-[#B91C1C] bg-[#B91C1C]/5"
                  : "border-[#D6D3C8] bg-[#F5F5F0] hover:bg-[#F0EDE6]"
              }`}
            >
              <div className="text-3xl mb-2 drop-shadow-sm">{level === "low" ? "🟢" : level === "medium" ? "🟡" : "🔴"}</div>
              <p className="text-sm font-bold capitalize" style={{ color: level === "low" ? "#15803D" : level === "medium" ? "#D97706" : "#B91C1C" }}>{level}</p>
              <p className="text-xs font-semibold text-[#6B7280] mt-1">{level === "low" ? "Nearly empty" : level === "medium" ? "Half full" : "Almost full"}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="card mb-6 bg-white border border-[#D6D3C8] shadow-sm">
        <label className="text-xs font-bold uppercase tracking-widest text-[#6B7280] mb-3 block">Weight collected (kg)</label>
        <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="input w-full bg-[#F5F5F0] border border-[#D6D3C8] text-[#1F2937] shadow-inner" placeholder="Optional" />
      </div>
      <button onClick={handleComplete} className="btn-primary w-full py-4 text-lg font-bold shadow-md tracking-wider">✓ MARK COMPLETED</button>
    </div>
  );

  // --- Main driver view ---
  return (
    <div className="min-h-screen bg-[#F5F5F0] pwa-container text-[#1F2937]">
      <div className="bg-white border-b border-[#D6D3C8] p-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div><h1 className="text-lg font-bold text-[#1F2937]">{user.name}</h1><p className="text-sm font-medium text-[#6B7280]">Driver</p></div>
          <div className="flex gap-3 items-center"><div className="badge badge-worker border border-[#1B7A4A]/20">● Online</div><button onClick={logout} className="text-xs font-bold text-[#6B7280] hover:text-[#B91C1C] transition-colors">Logout</button></div>
        </div>
      </div>
      
      {/* TIME MACHINE UI */}
      <div className="p-4 border-b border-[#D6D3C8] bg-[#F0EDE6] shadow-inner flex flex-col gap-2">
        <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest">⏳ {simStatus?.is_simulated ? "Time Machine (Active)" : "Live Mode"}</h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input 
              type="datetime-local" 
              className="bg-white font-medium flex-1 text-sm border border-[#D6D3C8] shadow-inner text-[#1F2937] rounded-lg px-3 py-2 outline-none focus:border-[#1B7A4A]"
              value={simDate}
              onChange={(e) => setSimDate(e.target.value)}
            />
            <button className="btn-primary py-2.5 px-4 text-sm font-bold shadow-md whitespace-nowrap" onClick={() => setSimulation(simDate)}>Simulate</button>
            {simStatus?.is_simulated && (
              <button className="bg-white border border-[#D6D3C8] hover:bg-[#F5F5F0] text-[#B91C1C] font-bold shadow-sm py-2.5 px-3 rounded-xl text-sm transition" onClick={() => setSimulation(null)}>Reset</button>
            )}
          </div>
          <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
            <button className="whitespace-nowrap badge border border-[#D6D3C8] bg-white text-[#1F2937] shadow-sm cursor-pointer hover:bg-[#F5F5F0]" onClick={() => { setSimDate("2023-10-18T21:00"); setSimulation("2023-10-18T21:00"); }}>🥁 Navratri Night</button>
            <button className="whitespace-nowrap badge border border-red-200 bg-red-50 text-[#B91C1C] shadow-sm cursor-pointer hover:bg-red-100" onClick={() => { setSimDate("2023-11-12T08:00"); setSimulation("2023-11-12T08:00"); }}>🪔 Diwali Morning</button>
            <button className="whitespace-nowrap badge border border-green-200 bg-green-50 text-[#15803D] shadow-sm cursor-pointer hover:bg-green-100" onClick={() => { setSimDate("2024-01-14T14:00"); setSimulation("2024-01-14T14:00"); }}>🪁 Uttarayan</button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Route Map */}
        <h2 className="text-xs font-bold text-[#6B7280] mt-2 tracking-widest uppercase">📍 Route Map</h2>
        <div className="card mb-4 p-0 overflow-hidden shadow-sm border border-[#D6D3C8]">
          <Suspense fallback={<div className="h-[250px] flex items-center justify-center text-[#9CA3AF] font-medium bg-[#F5F5F0]">Loading map...</div>}>
            <DriverRouteMap stops={sequence} />
          </Suspense>
        </div>

        <h2 className="text-xs font-bold text-[#6B7280] tracking-widest uppercase mt-6 mb-2">Today&apos;s Route</h2>
        {sequence.length === 0 && <p className="text-[#9CA3AF] font-medium text-center py-8 bg-white border border-[#D6D3C8] border-dashed rounded-xl">No route assigned yet</p>}
        {sequence.map((stop: any, i: number) => (
          <div key={i} className={`card mb-3 shadow-sm border border-[#D6D3C8] transition-opacity ${stop.completed ? "opacity-60 bg-white/50" : "bg-white hover:border-[#1B7A4A]/30"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shadow-inner ${stop.completed ? "bg-[#15803D]/10 text-[#15803D]" : "bg-[#1B7A4A] text-white"}`}>{stop.order}</div>
              <div className="flex-1">
                <p className="font-bold text-[#1F2937]">{stop.zone_name || `Zone ${stop.zone_id}`}</p>
                <p className="text-xs font-medium text-[#6B7280] mt-0.5">Fill: {getFillLabel(stop.fill_level || 0)} {stop.distance_km ? `• ${stop.distance_km}km away` : ""}</p>
              </div>
              {!stop.completed && (
                <button 
                  onClick={() => setCompleting(stop)} 
                  disabled={simStatus?.is_simulated && new Date(simDate) > new Date()}
                  className={`btn-primary py-2 px-4 shadow-sm text-sm font-bold ${(simStatus?.is_simulated && new Date(simDate) > new Date()) ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {(simStatus?.is_simulated && new Date(simDate) > new Date()) ? "Future" : "Complete"}
                </button>
              )}
              {stop.completed && <span className="badge fill-green shadow-sm px-3 py-1 text-xs">Done ✓</span>}
            </div>
          </div>
        ))}

        <h2 className="text-xs font-bold text-[#6B7280] mt-8 tracking-widest uppercase">Recent Pickups</h2>
        {pickups.slice(0, 5).map(p => (
          <div key={p.id} className="card card-hover mb-3 py-3 shadow-sm border border-[#D6D3C8] bg-white">
            <div className="flex justify-between items-center"><span className="text-sm font-bold text-[#1F2937]">{p.zone_name}</span><span className="text-xs font-bold text-[#6B7280] bg-[#F5F5F0] border border-[#D6D3C8] px-2 py-1 rounded-md">{getFillLabel(p.fill_level_found)} • {p.weight_collected_kg || "—"}kg</span></div>
          </div>
        ))}
      </div>
      {toast && <div className="fixed bottom-4 left-4 right-4 bg-[#1B7A4A] text-white p-4 rounded-xl text-sm font-bold shadow-2xl text-center animate-bounce">{toast}</div>}
    </div>
  );
}
