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
      <div>
        <h1 className="text-2xl font-bold text-[#1F2937]">👷 Waste Worker Management</h1>
        <p className="text-[#6B7280] text-sm">Manage field workers, zone assignments, and report accuracy</p>
      </div>

      <div className="card shadow-md border-[#D6D3C8]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#D6D3C8] text-[#6B7280]">
              <th className="text-left py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Worker</th>
              <th className="text-left py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Assigned Zones</th>
              <th className="text-center py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Reports Today</th>
              <th className="text-center py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Accuracy</th>
              <th className="text-center py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Penalties</th>
              <th className="text-center py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {workers.map(w => (
              <tr key={w.id} className="border-b border-[#D6D3C8] hover:bg-[#F0EDE6]/30 transition-colors">
                <td className="py-4 px-4">
                  <p className="font-semibold text-[#1F2937]">{w.name}</p>
                  <p className="text-xs text-[#6B7280]">{w.email}</p>
                </td>
                <td className="py-4 px-4">{w.zones.map((z: string) => <span key={z} className="badge badge-worker mr-1 mb-1 shadow-sm border border-[#15803D]/10 text-[10px]">{z}</span>)}</td>
                <td className="text-center py-4 px-4 font-medium text-[#1F2937]">{reports.filter(r => r.worker_name === w.name).length}</td>
                <td className="text-center py-4 px-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-16 h-1.5 bg-[#D6D3C8] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${w.accuracy_score}%`, background: getAccuracyColor(w.accuracy_score) }} />
                    </div>
                    <span className="text-[11px] font-bold" style={{ color: getAccuracyColor(w.accuracy_score) }}>{w.accuracy_score}%</span>
                  </div>
                </td>
                <td className="text-center py-4 px-4">
                  {w.penalty_count > 0 ? (
                    <span className="badge shadow-sm" style={{ background: "rgba(185,28,28,0.1)", color: "#B91C1C", border: "1px solid rgba(185,28,28,0.1)" }}>
                      ⚠️ {w.penalty_count}
                    </span>
                  ) : (
                    <span className="badge fill-green shadow-sm text-[10px]">None</span>
                  )}
                </td>
                <td className="text-center py-4 px-4">
                  <span className={`badge ${w.is_active ? "fill-green" : "fill-red"} shadow-sm text-[10px] uppercase font-bold tracking-tighter`}>
                    {w.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card shadow-sm border-[#D6D3C8]">
        <h3 className="text-sm font-bold mb-4 text-[#1F2937]">Recent Reports</h3>
        <div className="space-y-1 max-h-[400px] overflow-y-auto pr-2">
          {reports.slice(0, 20).map((r: any) => (
            <div key={r.id} className="flex items-center gap-3 py-3 border-b border-[#D6D3C8] last:border-0 hover:bg-[#F0EDE6]/20 px-2 -mx-2 rounded-lg transition-colors">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black shadow-inner ${r.reported_fill_level > 75 ? "bg-red-500/10 text-red-700" : r.reported_fill_level > 40 ? "bg-yellow-500/10 text-yellow-700" : "bg-green-500/10 text-green-700"}`}>{Math.round(r.reported_fill_level)}%</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1F2937]">{r.zone_name} — <span className="text-[#6B7280] font-normal">{r.worker_name}</span></p>
                <p className="text-[10px] text-[#9CA3AF] uppercase font-bold tracking-wider">{new Date(r.reported_at).toLocaleString("en-IN")}</p>
              </div>
              <span className={`badge ${r.synced ? "fill-green" : "fill-yellow"} text-[10px] font-bold`}>{r.synced ? "Synced" : "Pending"}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
