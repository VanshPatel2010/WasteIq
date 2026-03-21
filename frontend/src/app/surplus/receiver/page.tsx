"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function ReceiverPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<any[]>([]);
  const [toast, setToast] = useState("");

  useEffect(() => { if (!loading && user?.role !== "receiver") router.push("/"); }, [user, loading, router]);
  useEffect(() => { if (user) api.getMatches().then(setMatches).catch(console.error); }, [user]);

  const handleAction = async (id: number, action: string) => {
    await api.updateMatch(id, action);
    setToast(`Match ${action}!`);
    api.getMatches().then(setMatches);
    setTimeout(() => setToast(""), 3000);
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-[#0F0F12]">
      <div className="bg-[#1A1A22] border-b border-[#2A2A36] p-4 flex justify-between items-center">
        <div><h1 className="text-lg font-bold">Surplus Receiver</h1><p className="text-sm text-[#8A8887]">{user.name}</p></div>
        <button onClick={logout} className="text-xs text-[#8A8887]">Logout</button>
      </div>
      <div className="p-4 space-y-3">
        <h2 className="text-sm font-semibold text-[#8A8887]">MATCH ALERTS</h2>
        {matches.length === 0 && <p className="text-[#5F5E5A] text-center py-8">No matches yet</p>}
        {matches.map(m => (
          <div key={m.id} className="card card-hover">
            <div className="flex justify-between mb-2">
              <span className="font-medium capitalize">{m.listing?.material_type}</span>
              <span className={`badge ${m.status === "pending" ? "fill-yellow" : m.status === "accepted" ? "fill-green" : m.status === "completed" ? "fill-green" : "fill-red"}`}>{m.status}</span>
            </div>
            <p className="text-sm text-[#8A8887]">{m.listing?.quantity_kg}kg — {m.listing?.description}</p>
            <p className="text-xs text-[#5F5E5A] mt-1">Matched: {new Date(m.matched_at).toLocaleString("en-IN")}</p>
            {m.status === "pending" && (
              <div className="flex gap-2 mt-3">
                <button onClick={() => handleAction(m.id, "accept")} className="btn-teal flex-1 py-2 text-sm">Accept</button>
                <button onClick={() => handleAction(m.id, "decline")} className="btn-danger flex-1 py-2 text-sm">Decline</button>
              </div>
            )}
            {m.status === "accepted" && <button onClick={() => handleAction(m.id, "complete")} className="btn-teal w-full mt-3 py-2 text-sm">Confirm Collection</button>}
          </div>
        ))}
      </div>
      {toast && <div className="fixed bottom-4 left-4 right-4 bg-[#0F6E56] text-white p-4 rounded-xl text-sm font-medium shadow-lg">{toast}</div>}
    </div>
  );
}
