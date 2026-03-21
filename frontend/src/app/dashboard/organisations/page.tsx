"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
export default function OrgsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  useEffect(() => { api.getOrganisations().then(setOrgs); }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1F2937]">🏢 Organisations</h1>
      <div className="grid grid-cols-3 gap-6">
        {orgs.map(o => (
          <div key={o.id} className="card card-hover shadow-md border-[#D6D3C8] bg-white group hover:-translate-y-1 transition-all duration-300">
            <h3 className="font-bold text-lg text-[#1F2937] group-hover:text-[#1B7A4A] transition-colors">{o.name}</h3>
            <p className="text-xs text-[#6B7280] capitalize font-semibold tracking-wider flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B7A4A]" /> {o.type}
            </p>
            <div className="mt-6 flex justify-between items-end border-t border-[#D6D3C8]/50 pt-4">
              <div>
                <p className="text-3xl font-black text-[#15803D] tracking-tighter">{Math.round(o.sustainability_score || 0)}</p>
                <p className="text-[10px] text-[#6B7280] font-bold uppercase tracking-widest">Sustainability</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-[#92702A] tracking-tighter">{Math.round(o.diversion_rate || 0)}%</p>
                <p className="text-[10px] text-[#6B7280] font-bold uppercase tracking-widest">Diversion</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
