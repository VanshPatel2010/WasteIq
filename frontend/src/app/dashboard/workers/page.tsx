"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function WorkersPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    api.getReports({}).then(setReports).catch(console.error);
    api.getWorkers().then(setWorkers).catch(console.error);
  }, []);

  const getAccuracyColor = (score: number) => {
    if (score >= 80) return "#14A37F";
    if (score >= 50) return "#D4A017";
    return "#E04848";
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">👷 Waste Worker Management</h1><p className="text-[#8A8887] text-sm">Manage field workers, zone assignments, and report accuracy</p></div>

      <div className="card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#2A2A36] text-[#8A8887]">
            <th className="text-left py-3 px-2">Worker</th>
            <th className="text-left py-3 px-2">Assigned Zones</th>
            <th className="text-center py-3 px-2">Reports Today</th>
            <th className="text-center py-3 px-2">Accuracy</th>
            <th className="text-center py-3 px-2">Penalties</th>
            <th className="text-center py-3 px-2">Status</th>
          </tr></thead>
          <tbody>
            {workers.map(w => (
              <tr key={w.id} className="border-b border-[#2A2A36] hover:bg-[#22222E]">
                <td className="py-3 px-2">
                  <p className="font-medium">{w.name}</p>
                  <p className="text-xs text-[#5F5E5A]">{w.email}</p>
                </td>
                <td className="py-3 px-2">{w.zones.map((z: string) => <span key={z} className="badge badge-worker mr-1 mb-1">{z}</span>)}</td>
                <td className="text-center py-3 px-2">{reports.filter(r => r.worker_name === w.name).length}</td>
                <td className="text-center py-3 px-2">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-16 h-2 bg-[#2A2A36] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${w.accuracy_score}%`, background: getAccuracyColor(w.accuracy_score) }} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: getAccuracyColor(w.accuracy_score) }}>{w.accuracy_score}%</span>
                  </div>
                </td>
                <td className="text-center py-3 px-2">
                  {w.penalty_count > 0 ? (
                    <span className="badge" style={{ background: "rgba(224,72,72,0.15)", color: "#E04848" }}>
                      ⚠️ {w.penalty_count}
                    </span>
                  ) : (
                    <span className="badge fill-green">None</span>
                  )}
                </td>
                <td className="text-center py-3 px-2">
                  <span className={`badge ${w.is_active ? "fill-green" : "fill-red"}`}>
                    {w.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3 className="text-sm font-semibold mb-3">Recent Reports</h3>
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {reports.slice(0, 20).map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 py-2 border-b border-[#2A2A36]">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${r.reported_fill_level > 75 ? "bg-red-500/20 text-red-400" : r.reported_fill_level > 40 ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}`}>{Math.round(r.reported_fill_level)}%</div>
              <div className="flex-1">
                <p className="text-sm">{r.zone_name} — <span className="text-[#8A8887]">{r.worker_name}</span></p>
                <p className="text-xs text-[#5F5E5A]">{new Date(r.reported_at).toLocaleString("en-IN")}</p>
              </div>
              <span className={`badge ${r.synced ? "fill-green" : "fill-yellow"}`}>{r.synced ? "Synced" : "Pending"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
