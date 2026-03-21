"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, lazy, Suspense } from "react";
import { api } from "@/lib/api";

const DriverRouteMap = lazy(() => import("@/components/DriverRouteMap"));

export default function DriverPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [routes, setRoutes] = useState<any[]>([]);
  const [pickups, setPickups] = useState<any[]>([]);
  const [completing, setCompleting] = useState<any>(null);
  const [fillFound, setFillFound] = useState(50);
  const [weight, setWeight] = useState("");
  const [toast, setToast] = useState("");
  const [comparison, setComparison] = useState<any>(null);

  useEffect(() => { if (!loading && user?.role !== "driver") router.push("/"); }, [user, loading, router]);
  useEffect(() => {
    if (!user) return;
    const fetchData = () => {
      api.getRoutes({}).then(setRoutes);
      api.getPickups().then(setPickups);
    };
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user]);

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
      <h2 className="text-xl font-bold mb-6 text-center text-[#1F2937]">Pickup Report</h2>
      <div className="card mb-4 p-6 shadow-md border-[#D6D3C8]">
        <div className="text-center text-4xl mb-4">{comparison.accurate ? "✅" : "⚠️"}</div>
        <h3 className="text-lg font-semibold text-center mb-4 text-[#1F2937]">
          {comparison.accurate ? "Worker Report Matches!" : "Worker Report Mismatch!"}
        </h3>
        <div className="space-y-3 mb-4">
          <div className="flex justify-between items-center p-3 rounded-lg bg-[#F0EDE6] shadow-inner">
            <span className="text-[#6B7280]">👷 Worker reported</span>
            <span className="font-bold text-lg text-[#1F2937]">{comparison.worker_reported}%</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-[#F0EDE6] shadow-inner">
            <span className="text-[#6B7280]">🚛 You found</span>
            <span className="font-bold text-lg text-[#1F2937]">{comparison.driver_found}%</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg border" style={{ background: comparison.accurate ? "rgba(21,128,61,0.05)" : "rgba(185,28,28,0.05)", borderColor: comparison.accurate ? "rgba(21,128,61,0.2)" : "rgba(185,28,28,0.2)" }}>
            <span className="text-[#6B7280]">Difference</span>
            <span className="font-bold text-lg" style={{ color: comparison.accurate ? "#15803D" : "#B91C1C" }}>
              {comparison.difference}%
            </span>
          </div>
        </div>
        {!comparison.accurate && (
          <p className="text-xs text-[#B91C1C] text-center mb-4 font-medium">
            ⚠️ Worker {comparison.worker_name || "Unknown"} has been penalized for inaccurate reporting.
          </p>
        )}
        {comparison.accurate && (
          <p className="text-xs text-[#15803D] text-center mb-4 font-medium">
            ✅ Worker {comparison.worker_name || "Unknown"}&apos;s report is within acceptable range.
          </p>
        )}
      </div>
      <button onClick={() => { setComparison(null); setToast("Pickup completed!"); setTimeout(() => setToast(""), 3000); }} className="btn-primary w-full py-4 text-lg font-bold shadow-lg">
        Continue →
      </button>
    </div>
  );

  // --- Completing a pickup ---
  if (completing) return (
    <div className="min-h-screen bg-[#F5F5F0] p-4 text-[#1F2937]">
      <button onClick={() => setCompleting(null)} className="text-[#6B7280] mb-4 hover:text-[#1F2937] transition-colors font-medium">← Back</button>
      <h2 className="text-xl font-bold mb-6 text-[#1F2937]">Complete Pickup: {completing.zone_name}</h2>
      <div className="card mb-4 shadow-sm border-[#D6D3C8]">
        <label className="text-sm font-semibold text-[#6B7280] mb-2 block uppercase tracking-wider">Fill level found</label>
        <div className="text-center text-4xl font-bold mb-4" style={{ color: fillFound > 75 ? "#B91C1C" : fillFound > 40 ? "#C9A84C" : "#15803D" }}>{fillFound}%</div>
        <input type="range" min={0} max={100} value={fillFound} onChange={e => setFillFound(Number(e.target.value))} className="w-full h-2 bg-[#D6D3C8] rounded-lg appearance-none cursor-pointer accent-[#1B7A4A] overflow-hidden" />
      </div>
      <div className="card mb-6 shadow-sm border-[#D6D3C8]">
        <label className="text-sm font-semibold text-[#6B7280] mb-2 block uppercase tracking-wider">Weight collected (kg)</label>
        <input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="input w-full bg-white border-[#D6D3C8] text-[#1F2937]" placeholder="Optional" />
      </div>
      <button onClick={handleComplete} className="btn-primary w-full py-4 text-lg font-bold shadow-lg">✓ MARK COMPLETED</button>
    </div>
  );

  // --- Main driver view ---
  return (
    <div className="min-h-screen bg-[#F5F5F0] pwa-container text-[#1F2937]">
      <div className="bg-white border-b border-[#D6D3C8] p-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div><h1 className="text-lg font-bold text-[#1F2937]">{user.name}</h1><p className="text-sm text-[#6B7280]">Driver</p></div>
          <div className="flex items-center gap-3"><div className="badge badge-worker shadow-sm border border-[#1B7A4A]/20">● Online</div><button onClick={logout} className="text-xs text-[#6B7280] font-medium hover:text-[#B91C1C] transition-colors">Logout</button></div>
        </div>
      </div>

      <div className="p-4">
        {/* Route Map */}
        <h2 className="text-xs font-bold text-[#6B7280] mb-3 tracking-widest uppercase">📍 Route Map</h2>
        <div className="card mb-6 p-0 overflow-hidden shadow-md border-[#D6D3C8]">
          <Suspense fallback={<div className="h-[250px] flex items-center justify-center text-[#9CA3AF] bg-[#F0EDE6]">Loading map...</div>}>
            <DriverRouteMap stops={sequence} />
          </Suspense>
        </div>

        <h2 className="text-xs font-bold text-[#6B7280] mb-3 tracking-widest uppercase">Today&apos;s Route</h2>
        {sequence.length === 0 && <p className="text-[#9CA3AF] text-center py-8 font-medium">No route assigned yet</p>}
        {sequence.map((stop: any, i: number) => (
          <div key={i} className={`card mb-3 shadow-sm border-[#D6D3C8] transition-opacity ${stop.completed ? "opacity-60 bg-white/50" : "bg-white hover:border-[#1B7A4A]/30"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-inner ${stop.completed ? "bg-[#15803D]/10 text-[#15803D]" : "bg-[#1B7A4A] text-white"}`}>{stop.order}</div>
              <div className="flex-1">
                <p className="font-bold text-[#1F2937]">{stop.zone_name || `Zone ${stop.zone_id}`}</p>
                <p className="text-xs text-[#6B7280] font-medium">Fill: {Math.round(stop.fill_level || 0)}% {stop.distance_km ? `• ${stop.distance_km}km away` : ""}</p>
              </div>
              {!stop.completed && <button onClick={() => setCompleting(stop)} className="btn-primary py-2 px-4 text-sm font-bold shadow-md">Complete</button>}
              {stop.completed && <span className="badge fill-green shadow-sm px-3 py-1 text-xs">Done ✓</span>}
            </div>
          </div>
        ))}

        <h2 className="text-xs font-bold text-[#6B7280] mt-8 mb-3 tracking-widest uppercase">Recent Pickups</h2>
        {pickups.slice(0, 5).map(p => (
          <div key={p.id} className="card mb-2 py-3 shadow-sm border-[#D6D3C8]">
            <div className="flex justify-between items-center"><span className="text-sm font-bold text-[#1F2937]">{p.zone_name}</span><span className="text-xs text-[#6B7280] font-medium badge bg-[#F0EDE6]">{p.fill_level_found}% • {p.weight_collected_kg || "—"}kg</span></div>
          </div>
        ))}
      </div>
      {toast && <div className="fixed bottom-4 left-4 right-4 bg-[#1B7A4A] text-white p-4 rounded-xl text-sm font-bold shadow-2xl animate-bounce text-center">{toast}</div>}
    </div>
  );
}
