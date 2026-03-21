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
            <span className="font-bold text-lg">{comparison.worker_reported}%</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg bg-[#22222E]">
            <span className="text-[#8A8887]">🚛 You found</span>
            <span className="font-bold text-lg">{comparison.driver_found}%</span>
          </div>
          <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: comparison.accurate ? "rgba(20,163,127,0.15)" : "rgba(224,72,72,0.15)" }}>
            <span className="text-[#8A8887]">Difference</span>
            <span className="font-bold text-lg" style={{ color: comparison.accurate ? "#14A37F" : "#E04848" }}>
              {comparison.difference}%
            </span>
          </div>
        </div>
        {!comparison.accurate && (
          <p className="text-xs text-[#E04848] text-center mb-4">
            ⚠️ Worker {comparison.worker_name || "Unknown"} has been penalized for inaccurate reporting.
          </p>
        )}
        {comparison.accurate && (
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
        <label className="text-sm text-[#8A8887] mb-2 block">Fill level found</label>
        <div className="text-center text-4xl font-bold mb-4" style={{ color: fillFound > 75 ? "#E04848" : fillFound > 40 ? "#D4A017" : "#14A37F" }}>{fillFound}%</div>
        <input type="range" min={0} max={100} value={fillFound} onChange={e => setFillFound(Number(e.target.value))} className="w-full" />
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
                <p className="text-xs text-[#8A8887]">Fill: {Math.round(stop.fill_level || 0)}% {stop.distance_km ? `• ${stop.distance_km}km away` : ""}</p>
              </div>
              {!stop.completed && <button onClick={() => setCompleting(stop)} className="btn-teal py-2 px-3 text-sm">Complete</button>}
              {stop.completed && <span className="badge fill-green">Done ✓</span>}
            </div>
          </div>
        ))}

        <h2 className="text-sm font-semibold text-[#8A8887] mt-6 mb-3">RECENT PICKUPS</h2>
        {pickups.slice(0, 5).map(p => (
          <div key={p.id} className="card mb-2 py-3">
            <div className="flex justify-between"><span className="text-sm">{p.zone_name}</span><span className="text-xs text-[#8A8887]">{p.fill_level_found}% • {p.weight_collected_kg || "—"}kg</span></div>
          </div>
        ))}
      </div>
      {toast && <div className="fixed bottom-4 left-4 right-4 bg-[#0F6E56] text-white p-4 rounded-xl text-sm font-medium shadow-lg">{toast}</div>}
    </div>
  );
}
