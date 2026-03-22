"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ReceiverPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [activeListings, setActiveListings] = useState<any[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => { if (!loading && user?.role !== "receiver") router.push("/"); }, [user, loading, router]);
  useEffect(() => { 
    if (user) {
      api.getMatches().then(setMatches).catch(console.error); 
      api.getListings("active").then(setActiveListings).catch(console.error);
    }
  }, [user]);

  const handleAction = async (id: number, action: string) => {
    await api.updateMatch(id, action);
    setToast(`Match ${action}!`);
    api.getMatches().then(setMatches);
    setTimeout(() => setToast(""), 3000);
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1F2937] pwa-container">
      <div className="bg-white border-b border-[#D6D3C8] p-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div><h1 className="text-lg font-bold text-[#1F2937]">Surplus Receiver</h1><p className="text-sm font-medium text-[#6B7280]">{user.name}</p></div>
        <button onClick={logout} className="text-xs font-bold text-[#6B7280] hover:text-[#B91C1C] transition-colors">Logout</button>
      </div>
      <div className="p-4 space-y-4">
        <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mt-2">Match Alerts</h2>
        {matches.length === 0 && <p className="text-[#9CA3AF] text-sm text-center py-8 font-medium bg-white rounded-xl border border-dashed border-[#D6D3C8]">No matches yet.</p>}
        {matches.map(m => (
          <div key={m.id} className="card card-hover shadow-sm border border-[#D6D3C8] bg-white">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-lg text-[#1F2937] capitalize">{m.listing?.material_type}</span>
              <span className={`badge shadow-sm ${m.status === "pending" ? "bg-amber-100 text-amber-800 border border-amber-200" : m.status === "accepted" ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : m.status === "completed" ? "bg-green-100 text-green-800 border border-green-200" : "bg-red-100 text-red-800 border border-red-200"}`}>{m.status}</span>
            </div>
            <div className="bg-[#F5F5F0] p-3 rounded-lg border border-[#D6D3C8]/50 mb-3">
              <p className="text-sm font-medium text-[#6B7280]"><span className="font-bold text-[#1F2937]">{m.listing?.quantity_kg}kg</span> — {m.listing?.description}</p>
            </div>
            <p className="text-[10px] text-[#9CA3AF] mt-1 font-bold uppercase tracking-wider">Matched: {new Date(m.matched_at).toLocaleString("en-IN")}</p>
            {m.status === "pending" && (
              <div className="flex gap-3 mt-4">
                <button onClick={() => handleAction(m.id, "accept")} className="btn-primary flex-1 py-2.5 text-sm font-bold shadow-sm">Accept</button>
                <button onClick={() => handleAction(m.id, "decline")} className="bg-white border border-[#D6D3C8] text-[#B91C1C] hover:bg-red-50 flex-1 py-2.5 text-sm font-bold rounded-xl shadow-sm transition-colors">Decline</button>
              </div>
            )}
            {m.status === "accepted" && <button onClick={() => handleAction(m.id, "complete")} className="btn-primary w-full mt-4 py-3 text-sm font-bold shadow-md">Confirm Collection</button>}
          </div>
        ))}

        <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mt-8 pt-4 border-t border-[#D6D3C8]">Available Surplus</h2>
        {activeListings.length === 0 && <p className="text-[#9CA3AF] text-sm text-center py-8 font-medium bg-white rounded-xl border border-dashed border-[#D6D3C8]">No active surplus available right now.</p>}
        {activeListings.map(l => (
          <div key={l.id} className="card card-hover shadow-sm border border-[#D6D3C8] bg-white">
            <div className="flex justify-between items-center mb-2">
              <span className="font-bold text-[#1F2937] capitalize text-lg text-emerald-800">{l.material_type}</span>
              <span className="badge shadow-sm badge-worker border-[#1B7A4A]/20">{l.status}</span>
            </div>
            <div className="bg-[#F5F5F0] p-3 rounded-lg border border-[#D6D3C8]/50 mb-2">
              <p className="text-sm font-medium text-[#6B7280]"><span className="font-bold text-[#1F2937]">{l.quantity_kg}kg</span> — {l.description || "No description provided."}</p>
            </div>
            <p className="text-[10px] text-[#9CA3AF] mt-1 font-bold uppercase tracking-wider">Posted: {new Date(l.created_at).toLocaleDateString("en-IN")}</p>
          </div>
        ))}
      </div>
      {toast && <div className="fixed bottom-4 left-4 right-4 bg-[#1B7A4A] text-white p-4 rounded-xl text-sm font-bold shadow-2xl animate-bounce text-center">{toast}</div>}
    </div>
  );
}
