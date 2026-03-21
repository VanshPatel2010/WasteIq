"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function SurgePage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  useEffect(() => { api.getSurgeAlerts().then(setAlerts); }, []);

  const getSourceBadge = (s: string) => s === "worker_reported" ? <span className="badge badge-worker">👷 Worker</span> : s === "driver_reported" ? <span className="badge badge-driver">🚛 Driver</span> : <span className="badge badge-ml">🤖 ML</span>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">⚠️ Surge Alerts</h1>
      <div className="card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#2A2A36] text-[#8A8887]"><th className="text-left py-3 px-2">Zone</th><th className="text-right py-3 px-2">Fill Level</th><th className="text-center py-3 px-2">Source</th><th className="text-right py-3 px-2">Surge Score</th><th className="text-center py-3 px-2">Time</th><th className="text-center py-3 px-2">Action</th></tr></thead>
          <tbody>{alerts.map(a => (
            <tr key={a.id} className="border-b border-[#2A2A36] hover:bg-[#22222E]">
              <td className="py-3 px-2 font-medium">{a.zone_name}</td>
              <td className="text-right py-3 px-2"><span className="text-red-400 font-bold">{Math.round(a.predicted_fill_level)}%</span></td>
              <td className="text-center py-3 px-2">{getSourceBadge(a.fill_level_source)}</td>
              <td className="text-right py-3 px-2"><span className={`font-bold ${a.surge_score >= 8 ? "text-red-400" : "text-orange-400"}`}>{a.surge_score}</span></td>
              <td className="text-center py-3 px-2 text-[#8A8887]">{new Date(a.predicted_at).toLocaleTimeString("en-IN")}</td>
              <td className="text-center py-3 px-2"><button className="btn-primary text-xs py-1.5 px-3">Reroute Truck</button></td>
            </tr>
          ))}</tbody>
        </table>
        {alerts.length === 0 && <p className="text-[#5F5E5A] text-center py-8">No active surge alerts — all zones within normal levels</p>}
      </div>
    </div>
  );
}
