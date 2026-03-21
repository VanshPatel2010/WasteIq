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
    <div className="min-h-screen bg-[#0F0F12]">
      <div className="bg-[#1A1A22] border-b border-[#2A2A36] p-4 flex justify-between items-center">
        <div><h1 className="text-lg font-bold">Surplus Generator</h1><p className="text-sm text-[#8A8887]">{user.name}</p></div>
        <div className="flex gap-2"><button onClick={() => setShowForm(true)} className="btn-teal text-sm py-2">+ New Listing</button><button onClick={logout} className="text-xs text-[#8A8887]">Logout</button></div>
      </div>
      {showForm && (
        <div className="p-4"><div className="card space-y-3">
          <select value={form.material_type} onChange={e => setForm({...form, material_type: e.target.value})} className="input w-full">
            {["food","organic","plastic","metal","paper","glass","other"].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
          </select>
          <input type="number" placeholder="Quantity (kg)" value={form.quantity_kg} onChange={e => setForm({...form, quantity_kg: e.target.value})} className="input w-full" />
          <textarea placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="input w-full" />
          <input type="datetime-local" value={form.expires_at} onChange={e => setForm({...form, expires_at: e.target.value})} className="input w-full" />
          <div className="flex gap-2"><button onClick={handleSubmit} className="btn-teal flex-1">Submit</button><button onClick={() => setShowForm(false)} className="btn-danger flex-1">Cancel</button></div>
        </div></div>
      )}
      <div className="p-4 space-y-4">
        <h2 className="text-sm font-semibold text-[#8A8887]">MY LISTINGS</h2>
        {listings.map(l => (
          <div key={l.id} className="card card-hover">
            <div className="flex justify-between"><span className="font-medium capitalize">{l.material_type}</span><span className={`badge ${l.status === "active" ? "badge-worker" : l.status === "matched" ? "badge-ml" : "badge-driver"}`}>{l.status}</span></div>
            <p className="text-sm text-[#8A8887] mt-1">{l.quantity_kg}kg — {l.description}</p>
          </div>
        ))}
        <h2 className="text-sm font-semibold text-[#8A8887] mt-6">ACTIVE MATCHES</h2>
        {matches.map(m => (
          <div key={m.id} className="card card-hover">
            <div className="flex justify-between"><span className="capitalize">{m.listing?.material_type}</span><span className={`badge ${m.status === "accepted" ? "fill-green" : m.status === "completed" ? "fill-green" : "fill-yellow"}`}>{m.status}</span></div>
            <p className="text-xs text-[#8A8887]">{m.listing?.quantity_kg}kg • Matched {new Date(m.matched_at).toLocaleDateString("en-IN")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
