"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
export default function ReportsPage() {
  const [zones, setZones] = useState<any[]>([]);
  useEffect(() => { api.getZones().then(setZones); }, []);

  const handleExport = () => {
    if (!zones.length) return;
    const header = "Zone ID,Name,Fill Level,Source\n";
    const rows = zones.map(z => `${z.id},"${z.name}",${Math.round(z.current_fill_level)},${z.fill_level_source || "unknown"}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "wasteiq_reports.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937]">📈 Reports</h1>
          <p className="text-[#6B7280] text-sm">Historical analytical data & exports</p>
        </div>
        <button className="btn-primary text-sm shadow-lg shadow-[#1B7A4A]/20" onClick={handleExport}>Export CSV</button>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="card shadow-md border-[#D6D3C8]">
          <h3 className="text-sm font-bold mb-6 text-[#1F2937] uppercase tracking-wider">Zone Fill Level Summary</h3>
          {zones.map(z => (
            <div key={z.id} className="flex items-center gap-4 py-3 border-b border-[#D6D3C8] last:border-0 hover:bg-[#F0EDE6]/20 px-2 -mx-2 rounded-lg transition-colors">
              <span className="text-sm font-semibold text-[#1F2937] flex-1">{z.name}</span>
              <div className="w-32 h-2.5 bg-[#D6D3C8] rounded-full overflow-hidden shadow-inner flex-shrink-0">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${z.current_fill_level}%`, background: z.current_fill_level > 75 ? "#B91C1C" : z.current_fill_level > 40 ? "#C9A84C" : "#15803D" }} />
              </div>
              <span className="text-xs font-black text-[#1F2937] w-12 text-right">{Math.round(z.current_fill_level)}%</span>
            </div>
          ))}
        </div>
        <div className="card shadow-md border-[#D6D3C8]">
          <h3 className="text-sm font-bold mb-6 text-[#1F2937] uppercase tracking-wider">Data Source Distribution</h3>
          {["worker_reported", "predicted", "driver_reported"].map(s => {
            const count = zones.filter(z => z.fill_level_source === s).length;
            return (
              <div key={s} className="flex justify-between items-center py-4 border-b border-[#D6D3C8] last:border-0 hover:bg-[#F0EDE6]/20 px-2 -mx-2 rounded-lg transition-colors">
                <span className="text-sm font-medium capitalize text-[#1F2937]">{s.replace(/_/g, " ")}</span>
                <span className="text-sm font-black text-[#1B7A4A] bg-[#1B7A4A]/5 px-3 py-1 rounded-full">{count} zones</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
