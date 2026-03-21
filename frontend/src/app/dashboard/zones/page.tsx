"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import dynamic from "next/dynamic";
const ZoneMap = dynamic(() => import("@/components/ZoneMap"), { ssr: false });

export default function ZonesPage() {
  const [zones, setZones] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  useEffect(() => { api.getZones().then(setZones); api.getTrucks().then(setTrucks); }, []);

  const getSourceBadge = (s: string) => s === "worker_reported" ? <span className="badge badge-worker">👷 Worker</span> : s === "driver_reported" ? <span className="badge badge-driver">🚛 Driver</span> : <span className="badge badge-ml">🤖 ML</span>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1F2937]">🗺️ Zone Map</h1>
      <div className="card shadow-md border-[#D6D3C8] p-2" style={{ minHeight: 600 }}><ZoneMap zones={zones} trucks={trucks} /></div>
      <div className="card shadow-md border-[#D6D3C8]">
        <h3 className="text-sm font-bold mb-5 text-[#1F2937] uppercase tracking-wider">Zone Details</h3>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#D6D3C8] text-[#6B7280]"><th className="text-left py-4 px-3 font-semibold uppercase tracking-wider text-[10px]">Zone</th><th className="text-right py-4 px-3 font-semibold uppercase tracking-wider text-[10px]">Fill Level</th><th className="text-center py-4 px-3 font-semibold uppercase tracking-wider text-[10px]">Source</th><th className="text-center py-4 px-3 font-semibold uppercase tracking-wider text-[10px]">Type</th><th className="text-center py-4 px-3 font-semibold uppercase tracking-wider text-[10px]">Trust</th></tr></thead>
          <tbody>{zones.map(z => (
            <tr key={z.id} className="border-b border-[#D6D3C8] hover:bg-[#F0EDE6]/30 transition-colors">
              <td className="py-4 px-3 font-semibold text-[#1F2937]">{z.name}</td>
              <td className="text-right py-4 px-3 font-black"><span className={z.current_fill_level > 75 ? "text-[#B91C1C]" : z.current_fill_level > 40 ? "#C9A84C" : "text-[#15803D]"}>{Math.round(z.current_fill_level)}%</span></td>
              <td className="text-center py-4 px-3">{getSourceBadge(z.fill_level_source)}</td>
              <td className="text-center py-4 px-3 capitalize font-medium text-[#6B7280]">{z.zone_type}</td>
              <td className="text-center py-4 px-3 font-bold text-[#1F2937]">{Math.round(z.ml_trust_score * 100)}%</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
