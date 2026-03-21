"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function WorkersPage() {
  const [workers, setWorkers] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => {
    api.getReports({}).then(setReports).catch(console.error);
    // Get zones to find workers
    api.getZones().then((zones: any[]) => {
      const workerMap = new Map<number, any>();
      zones.forEach(z => {
        if (z.assigned_waste_worker_id) {
          if (!workerMap.has(z.assigned_waste_worker_id)) {
            workerMap.set(z.assigned_waste_worker_id, { id: z.assigned_waste_worker_id, zones: [], reportsToday: 0, reportsWeek: 0 });
          }
          workerMap.get(z.assigned_waste_worker_id).zones.push(z.name);
        }
      });
      setWorkers(Array.from(workerMap.values()));
    }).catch(console.error);
  }, []);

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">👷 Waste Worker Management</h1><p className="text-[#8A8887] text-sm">Manage field workers and zone assignments</p></div>

      <div className="card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#2A2A36] text-[#8A8887]">
            <th className="text-left py-3 px-2">Worker</th><th className="text-left py-3 px-2">Assigned Zones</th>
            <th className="text-center py-3 px-2">Reports Today</th><th className="text-center py-3 px-2">Status</th>
          </tr></thead>
          <tbody>
            {workers.map(w => (
              <tr key={w.id} className="border-b border-[#2A2A36] hover:bg-[#22222E]">
                <td className="py-3 px-2 font-medium">Worker #{w.id}</td>
                <td className="py-3 px-2">{w.zones.map((z: string) => <span key={z} className="badge badge-worker mr-1 mb-1">{z}</span>)}</td>
                <td className="text-center py-3 px-2">{reports.filter(r => r.worker_id === w.id).length}</td>
                <td className="text-center py-3 px-2"><span className="badge fill-green">Active</span></td>
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
