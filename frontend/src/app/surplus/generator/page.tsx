"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function GeneratorPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [listings, setListings] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ material_type: "food", quantity_kg: "", description: "", expires_at: "" });

  useEffect(() => { if (!loading && user?.role !== "generator") router.push("/"); }, [user, loading, router]);
  useEffect(() => { if (user) { api.getListings().then(setListings); api.getMatches().then(setMatches); } }, [user]);

  const handleSubmit = async () => {
    await api.createListing({ ...form, quantity_kg: parseFloat(form.quantity_kg), expires_at: new Date(form.expires_at).toISOString() });
    setShowForm(false);
    api.getListings().then(setListings);
    api.getMatches().then(setMatches);
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-[#F5F5F0] text-[#1F2937] pwa-container">
      <div className="bg-white border-b border-[#D6D3C8] p-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
        <div><h1 className="text-lg font-bold text-[#1F2937]">Surplus Generator</h1><p className="text-sm font-medium text-[#6B7280]">{user.name}</p></div>
        <div className="flex items-center gap-3"><button onClick={() => setShowForm(true)} className="btn-primary text-xs py-2 px-4 shadow-sm">+ New Listing</button><button onClick={logout} className="text-xs font-bold text-[#6B7280] hover:text-[#B91C1C] transition-colors">Logout</button></div>
      </div>
      {showForm && (
        <div className="p-4"><div className="card space-y-4 shadow-md border border-[#D6D3C8] bg-white">
          <h2 className="text-sm font-bold text-[#1F2937] uppercase tracking-wider mb-2">Create Listing</h2>
          <select value={form.material_type} onChange={e => setForm({...form, material_type: e.target.value})} className="input w-full bg-[#F5F5F0] border-[#D6D3C8] text-[#1F2937] shadow-inner">
            {["food","organic","plastic","metal","paper","glass","other"].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
          <input type="number" placeholder="Quantity (kg)" value={form.quantity_kg} onChange={e => setForm({...form, quantity_kg: e.target.value})} className="input w-full bg-[#F5F5F0] border-[#D6D3C8] text-[#1F2937] shadow-inner" />
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input w-full bg-[#F5F5F0] border-[#D6D3C8] text-[#1F2937] shadow-inner resize-none h-24" />
          <input type="datetime-local" value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})} className="input w-full bg-[#F5F5F0] border-[#D6D3C8] text-[#1F2937] shadow-inner" />
          <div className="flex gap-3 mt-4"><button onClick={handleSubmit} className="btn-primary flex-1 py-3 text-sm font-bold shadow-md">Submit</button><button onClick={() => setShowForm(false)} className="bg-white border border-[#D6D3C8] text-[#1F2937] hover:bg-[#F0EDE6] flex-1 py-3 text-sm font-bold rounded-xl shadow-sm transition-colors">Cancel</button></div>
        </div></div>
      )}
      <div className="p-4 space-y-4">
        <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mt-2">My Listings</h2>
        {listings.length === 0 && <p className="text-[#9CA3AF] text-sm text-center py-6 font-medium bg-white rounded-xl border border-dashed border-[#D6D3C8]">No active listings found.</p>}
        {listings.map(l => (
          <div key={l.id} className="card card-hover shadow-sm border border-[#D6D3C8] bg-white">
            <div className="flex justify-between items-center mb-2"><span className="font-bold text-[#1F2937] capitalize text-lg">{l.material_type}</span><span className={`badge shadow-sm ${l.status === "active" ? "badge-worker border-[#1B7A4A]/20" : l.status === "matched" ? "badge-ml border-purple-500/20" : "badge-driver border-blue-500/20"}`}>{l.status}</span></div>
            <p className="text-sm font-medium text-[#6B7280] mt-1 bg-[#F5F5F0] p-3 rounded-lg border border-[#D6D3C8]/50"><span className="font-bold text-[#1F2937]">{l.quantity_kg}kg</span> — {l.description}</p>
          </div>
        ))}
        <h2 className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mt-8">Active Matches</h2>
        {matches.length === 0 && <p className="text-[#9CA3AF] text-sm text-center py-6 font-medium bg-white rounded-xl border border-dashed border-[#D6D3C8]">No matches yet.</p>}
        {matches.map(m => (
          <div key={m.id} className="card card-hover shadow-sm border border-[#D6D3C8] bg-white">
            <div className="flex justify-between items-center mb-2"><span className="font-bold text-[#1F2937] capitalize text-lg text-emerald-800">{m.listing?.material_type}</span><span className={`badge shadow-sm ${m.status === "accepted" ? "fill-green" : m.status === "completed" ? "fill-green" : "fill-yellow"}`}>{m.status}</span></div>
            <p className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">{m.listing?.quantity_kg}kg • Matched {new Date(m.matched_at).toLocaleDateString("en-IN")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
