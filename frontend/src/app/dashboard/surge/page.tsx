"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function SurgePage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleReroute = async () => {
    try {
      setIsOptimizing(true);
      await api.optimizeRoutes();
      alert("Routes optimized! Trucks have been dispatched to handle surge zones.");
      
      // Refresh UI data
      api.getSurgeAlerts().then(setAlerts).catch(console.error);
    } catch (err: any) {
      alert("Failed to optimize routes: " + err.message);
    } finally {
      setIsOptimizing(false);
    }
  };

  useEffect(() => {
    const fetchAlerts = () => api.getSurgeAlerts().then(setAlerts).catch(console.error);
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const getSourceBadge = (s: string) => s === "worker_reported" ? <span className="badge badge-worker">👷 Worker</span> : s === "driver_reported" ? <span className="badge badge-driver">🚛 Driver</span> : <span className="badge badge-ml">🤖 ML</span>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">⚠️ Surge Alerts</h1>
      <div className="card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#D6D3C8] text-[#6B7280]"><th className="text-left py-3 px-2">Zone</th><th className="text-right py-3 px-2">Fill Level</th><th className="text-center py-3 px-2">Source</th><th className="text-right py-3 px-2">Surge Score</th><th className="text-center py-3 px-2">Time</th><th className="text-center py-3 px-2">Action</th></tr></thead>
          <tbody>{alerts.map(a => (
            <tr key={a.id} className="border-b border-[#D6D3C8] hover:bg-[#F0EDE6]/50 transition-colors">
              <td className="py-3 px-2 font-medium text-[#1F2937]">{a.zone_name}</td>
              <td className="text-right py-3 px-2"><span className="text-[#B91C1C] font-bold">{Math.round(a.predicted_fill_level)}%</span></td>
              <td className="text-center py-3 px-2">{getSourceBadge(a.fill_level_source)}</td>
              <td className="text-right py-3 px-2"><span className={`font-bold ${a.surge_score >= 8 ? "text-[#B91C1C]" : "text-[#D97706]"}`}>{a.surge_score}</span></td>
              <td className="text-center py-3 px-2 text-[#6B7280]">{new Date(a.predicted_at).toLocaleTimeString("en-IN")}</td>
              <td className="text-center py-3 px-2">
                <button className="btn-primary text-xs py-1.5 px-3" onClick={handleReroute} disabled={isOptimizing}>
                  {isOptimizing ? "Routing..." : "Reroute Truck"}
                </button>
              </td>
            </tr>
          ))}</tbody>
        </table>
        {alerts.length === 0 && <p className="text-[#9CA3AF] text-center py-8">No active surge alerts — all zones within normal levels</p>}
      </div>
    </div>
  );
}
