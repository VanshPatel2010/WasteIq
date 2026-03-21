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
      <h1 className="text-2xl font-bold">🗺️ Zone Map</h1>
      <div className="card" style={{ minHeight: 600 }}><ZoneMap zones={zones} trucks={trucks} /></div>
      <div className="card">
        <h3 className="text-sm font-semibold mb-3">Zone Details</h3>
        <table className="w-full text-sm">
          <thead><tr className="border-b border-[#2A2A36] text-[#8A8887]"><th className="text-left py-2 px-2">Zone</th><th className="text-right py-2 px-2">Fill Level</th><th className="text-center py-2 px-2">Source</th><th className="text-center py-2 px-2">Type</th><th className="text-center py-2 px-2">Trust</th></tr></thead>
          <tbody>{zones.map(z => (
            <tr key={z.id} className="border-b border-[#2A2A36] hover:bg-[#22222E]">
              <td className="py-2 px-2 font-medium">{z.name}</td>
              <td className="text-right py-2 px-2"><span className={z.current_fill_level > 75 ? "text-red-400" : z.current_fill_level > 40 ? "text-yellow-400" : "text-green-400"}>{Math.round(z.current_fill_level)}%</span></td>
              <td className="text-center py-2 px-2">{getSourceBadge(z.fill_level_source)}</td>
              <td className="text-center py-2 px-2 capitalize">{z.zone_type}</td>
              <td className="text-center py-2 px-2">{Math.round(z.ml_trust_score * 100)}%</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}
