"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
export default function ReportsPage() {
  const [zones, setZones] = useState<any[]>([]);
  useEffect(() => { api.getZones().then(setZones); }, []);
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">📈 Reports</h1>
        <button className="btn-primary text-sm">Export CSV</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="card"><h3 className="text-sm font-semibold mb-3">Zone Fill Level Summary</h3>
          {zones.map(z => (
            <div key={z.id} className="flex items-center gap-3 py-2 border-b border-[#2A2A36] last:border-0">
              <span className="text-sm flex-1">{z.name}</span>
              <div className="w-32 h-2 bg-[#2A2A36] rounded-full"><div className="h-full rounded-full transition-all" style={{ width: `${z.current_fill_level}%`, background: z.current_fill_level > 75 ? "#E04848" : z.current_fill_level > 40 ? "#D4A017" : "#14A37F" }} /></div>
              <span className="text-xs text-[#8A8887] w-12 text-right">{Math.round(z.current_fill_level)}%</span>
            </div>
          ))}
        </div>
        <div className="card"><h3 className="text-sm font-semibold mb-3">Data Source Distribution</h3>
          {["worker_reported", "predicted", "driver_reported"].map(s => {
            const count = zones.filter(z => z.fill_level_source === s).length;
            return <div key={s} className="flex justify-between py-2 border-b border-[#2A2A36]"><span className="text-sm capitalize">{s.replace(/_/g, " ")}</span><span className="text-sm font-bold">{count} zones</span></div>;
          })}
        </div>
      </div>
    </div>
  );
}
