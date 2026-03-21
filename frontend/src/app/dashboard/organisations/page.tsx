"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
export default function OrgsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  useEffect(() => { api.getOrganisations().then(setOrgs); }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🏢 Organisations</h1>
      <div className="grid grid-cols-3 gap-4">{orgs.map(o => (
        <div key={o.id} className="card card-hover">
          <h3 className="font-semibold">{o.name}</h3>
          <p className="text-sm text-[#8A8887] capitalize">{o.type}</p>
          <div className="mt-3 flex justify-between">
            <div><p className="text-2xl font-bold text-[#0F6E56]">{Math.round(o.sustainability_score || 0)}</p><p className="text-xs text-[#8A8887]">Score</p></div>
            <div><p className="text-2xl font-bold text-[#854F0B]">{Math.round(o.diversion_rate || 0)}%</p><p className="text-xs text-[#8A8887]">Diversion</p></div>
          </div>
        </div>
      ))}</div>
    </div>
  );
}
