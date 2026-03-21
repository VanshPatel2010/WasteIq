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
  const getFillLabelColor = (label: string) => label === "High" || label === "high" ? "#E04848" : label === "Medium" || label === "medium" ? "#D4A017" : "#14A37F";
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
    <div className="min-h-screen bg-[#0F0F12] p-4">
      <h2 className="text-xl font-bold mb-6 text-center">Pickup Report</h2>
      <div className="card mb-4 p-6">
        <div className="text-center text-4xl mb-4">{comparison.accurate ? "✅" : "⚠️"}</div>
        <h3 className="text-lg font-semibold text-center mb-4">
          {comparison.accurate ? "Worker Report Matches!" : "Worker Report Mismatch!"}
        </h3>
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center p-3 rounded-lg bg-[#22222E]">
            <span className="text-[#8A8887]">👷 Worker reported</span>
            <span className="font-bold text-lg" style={{ color: getFillLabelColor(getFillLabel(comparison.worker_reported)) }}>{getFillLabel(comparison.worker_reported)}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-[#22222E]">
            <span className="text-[#8A8887]">🚛 You found</span>
            <span className="font-bold text-lg" style={{ color: getFillLabelColor(getFillLabel(comparison.driver_found)) }}>{getFillLabel(comparison.driver_found)}</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: comparison.accurate ? "rgba(20,163,127,0.15)" : "rgba(224,72,72,0.15)" }}>
            <span className="text-[#8A8887]">Match</span>
            <span className="font-bold text-lg" style={{ color: comparison.accurate ? "#14A37F" : "#E04848" }}>
              {comparison.accurate ? "✓ Match" : "✗ Mismatch"}
            </span>
          </div>
        </div>
        {!comparison.accurate && (
          <p className="text-xs text-[#E04848] text-center mb-4">
            ⚠️ Worker {comparison.worker_name || "Unknown"} has been penalized for inaccurate reporting.
          </p>
        )}
        {comparison.accurate && comparison.reward_awarded && (
          <div className="rounded-lg p-4 mb-4" style={{ background: "linear-gradient(135deg, rgba(212,160,23,0.15) 0%, rgba(20,163,127,0.15) 100%)" }}>
            <div className="text-center">
              <p className="text-2xl mb-1">{comparison.reward_awarded.points >= 15 ? "🌟" : "🎉"}</p>
              <p className="text-sm font-bold text-[#14A37F]">
                Worker {comparison.worker_name || "Unknown"} earned +{comparison.reward_awarded.points} reward points!
              </p>
              {comparison.reward_awarded.points >= 15 && (
                <p className="text-xs text-[#D4A017] mt-1">⭐ Bonus points for high accuracy!</p>
              )}
              <p className="text-xs text-[#8A8887] mt-1">
                Total points: {comparison.reward_awarded.total_points}
              </p>
            </div>
          </div>
        )}
        {comparison.accurate && !comparison.reward_awarded && (
          <p className="text-xs text-[#14A37F] text-center mb-4">
            ✅ Worker {comparison.worker_name || "Unknown"}&apos;s report is within acceptable range.
          </p>
        )}
      </div>
      <button onClick={() => { setComparison(null); setToast("Pickup completed!"); setTimeout(() => setToast(""), 3000); }} className="btn-teal w-full py-4 text-lg font-bold">
        Continue →
      </button>
    </div>
  );

  // --- Completing a pickup ---
  if (completing) return (
    <div className="min-h-screen bg-[#0F0F12] p-4">
      <button onClick={() => setCompleting(null)} className="text-[#8A8887] mb-4">← Back</button>
      <h2 className="text-xl font-bold mb-6">Complete Pickup: {completing.zone_name}</h2>
      <div className="card mb-4">
        <label className="text-sm text-[#8A8887] mb-3 block">Fill level found</label>
        <div className="grid grid-cols-3 gap-3">
          {(["low", "medium", "high"] as const).map(level => (
            <button
              key={level}
              onClick={() => { setFillFoundLabel(level); setFillFound(fillLevelMap[level]); }}
              className={`py-5 px-3 rounded-xl text-center transition-all border-2 ${
                fillFoundLabel === level
                  ? level === "low" ? "border-[#14A37F] bg-[#14A37F]/15" : level === "medium" ? "border-[#D4A017] bg-[#D4A017]/15" : "border-[#E04848] bg-[#E04848]/15"
                  : "border-[#2A2A36] bg-[#22222E]"
              }`}
            >
              <div className="text-3xl mb-2">{level === "low" ? "🟢" : level === "medium" ? "🟡" : "🔴"}</div>
              <p className="text-sm font-bold capitalize" style={{ color: level === "low" ? "#14A37F" : level === "medium" ? "#D4A017" : "#E04848" }}>{level}</p>
              <p className="text-xs text-[#8A8887] mt-1">{level === "low" ? "Nearly empty" : level === "medium" ? "Half full" : "Almost full"}</p>
            </button>
          ))}
        </div>
      </div>
      <div className="card mb-6">
        <label className="text-sm text-[#8A8887] mb-2 block">Weight collected (kg)</label>
        <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="input w-full" placeholder="Optional" />
      </div>
      <button onClick={handleComplete} className="btn-teal w-full py-4 text-lg font-bold">✓ MARK COMPLETED</button>
    </div>
  );

  // --- Main driver view ---
  return (
    <div className="min-h-screen bg-[#0F0F12] pwa-container">
      <div className="bg-[#1A1A22] border-b border-[#2A2A36] p-4">
        <div className="flex items-center justify-between">
          <div><h1 className="text-lg font-bold">{user.name}</h1><p className="text-sm text-[#8A8887]">Driver</p></div>
          <div className="flex gap-2"><div className="badge badge-worker">● Online</div><button onClick={logout} className="text-xs text-[#8A8887]">Logout</button></div>
        </div>
      </div>
      
      {/* TIME MACHINE UI */}
      <div className="p-4 border-b border-[#2A2A36] bg-[#1A1A22]">
        <h2 className="text-sm font-semibold text-[#8A8887] mb-2 uppercase">⏳ {simStatus?.is_simulated ? "Time Machine (Active)" : "Live Mode"}</h2>
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <input 
              type="datetime-local" 
              className="bg-[#1C1C24] flex-1 text-sm border border-[#2A2A36] rounded px-2 py-2"
              value={simDate}
              onChange={(e) => setSimDate(e.target.value)}
            />
            <button className="btn-primary py-2 px-4 text-sm whitespace-nowrap" onClick={() => setSimulation(simDate)}>Simulate</button>
            {simStatus?.is_simulated && (
              <button className="bg-[#2A2A36] hover:bg-[#343442] text-white py-2 px-3 rounded text-sm transition" onClick={() => setSimulation(null)}>Reset</button>
            )}
          </div>
          <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
            <button className="whitespace-nowrap badge badge-worker cursor-pointer" onClick={() => { setSimDate("2023-10-18T21:00"); setSimulation("2023-10-18T21:00"); }}>🥁 Navratri Night</button>
            <button className="whitespace-nowrap badge bg-[#A32D2D]/20 text-[#E04848] cursor-pointer" onClick={() => { setSimDate("2023-11-12T08:00"); setSimulation("2023-11-12T08:00"); }}>🪔 Diwali Morning</button>
            <button className="whitespace-nowrap badge badge-driver cursor-pointer" onClick={() => { setSimDate("2024-01-14T14:00"); setSimulation("2024-01-14T14:00"); }}>🪁 Uttarayan</button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Route Map */}
        <h2 className="text-sm font-semibold text-[#8A8887] mb-3">📍 ROUTE MAP</h2>
        <div className="card mb-4 p-0 overflow-hidden">
          <Suspense fallback={<div className="h-[250px] flex items-center justify-center text-[#5F5E5A]">Loading map...</div>}>
            <DriverRouteMap stops={sequence} />
          </Suspense>
        </div>

        <h2 className="text-sm font-semibold text-[#8A8887] mb-3">TODAY&apos;S ROUTE</h2>
        {sequence.length === 0 && <p className="text-[#5F5E5A] text-center py-8">No route assigned yet</p>}
        {sequence.map((stop: any, i: number) => (
          <div key={i} className={`card mb-2 ${stop.completed ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${stop.completed ? "bg-green-500/20 text-green-400" : "bg-[#534AB7]/20 text-[#534AB7]"}`}>{stop.order}</div>
              <div className="flex-1">
                <p className="font-medium">{stop.zone_name || `Zone ${stop.zone_id}`}</p>
                <p className="text-xs text-[#8A8887]">Fill: {getFillLabel(stop.fill_level || 0)} {stop.distance_km ? `• ${stop.distance_km}km away` : ""}</p>
              </div>
              {!stop.completed && (
                <button 
                  onClick={() => setCompleting(stop)} 
                  disabled={simStatus?.is_simulated && new Date(simDate) > new Date()}
                  className={`btn-primary py-2 px-4 text-sm font-bold shadow-md ${(simStatus?.is_simulated && new Date(simDate) > new Date()) ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {(simStatus?.is_simulated && new Date(simDate) > new Date()) ? "Future Task" : "Complete"}
                </button>
              )}
              {stop.completed && <span className="badge fill-green shadow-sm px-3 py-1 text-xs">Done ✓</span>}
            </div>
          </div>
        ))}

        <h2 className="text-sm font-semibold text-[#8A8887] mt-6 mb-3">RECENT PICKUPS</h2>
        {pickups.slice(0, 5).map(p => (
          <div key={p.id} className="card mb-2 py-3">
            <div className="flex justify-between"><span className="text-sm">{p.zone_name}</span><span className="text-xs text-[#8A8887]">{getFillLabel(p.fill_level_found)} • {p.weight_collected_kg || "—"}kg</span></div>
          </div>
        ))}
      </div>
      {toast && <div className="fixed bottom-4 left-4 right-4 bg-[#0F6E56] text-white p-4 rounded-xl text-sm font-medium shadow-lg">{toast}</div>}
    </div>
  );
}
