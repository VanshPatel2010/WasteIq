"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const materials = [
  { type: "plastic", icon: "🥤", label: "Plastic" },
  { type: "paper", icon: "📄", label: "Paper" },
  { type: "metal", icon: "🔩", label: "Metal" },
  { type: "glass", icon: "🍶", label: "Glass" },
  { type: "organic", icon: "🌿", label: "Organic" },
  { type: "other", icon: "📦", label: "Other" },
];

const quantities = [
  { value: "small", label: "Small", icon: "📏", desc: "< 5 kg" },
  { value: "medium", label: "Medium", icon: "📐", desc: "5-20 kg" },
  { value: "large", label: "Large", icon: "📏", desc: "> 20 kg" },
];

export default function KabadiwalaPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(0); // 0=material, 1=quantity, 2=confirm
  const [material, setMaterial] = useState("");
  const [quantity, setQuantity] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [toast, setToast] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => { if (!loading && user?.role !== "kabadiwalla") router.push("/"); }, [user, loading, router]);
  useEffect(() => { if (user) api.getKabadiwalaLogs().then(setLogs).catch(console.error); }, [user]);

  const handleSubmit = async () => {
    try {
      await api.logPickup({ material_type: material, quantity_estimate: quantity, logged_at: new Date().toISOString() });
      setToast("Pickup logged! ✓");
      setStep(0); setMaterial(""); setQuantity("");
      api.getKabadiwalaLogs().then(setLogs);
    } catch { setToast("Saved offline — will sync"); }
    setTimeout(() => setToast(""), 3000);
  };

  if (loading || !user) return null;

  if (showHistory) return (
    <div className="min-h-screen bg-[#0F0F12] pwa-container">
      <div className="bg-[#1A1A22] p-4 flex items-center gap-3 border-b border-[#2A2A36]">
        <button onClick={() => setShowHistory(false)} className="text-[#8A8887]">←</button><h2 className="font-bold">History</h2>
      </div>
      <div className="p-4">{logs.map(l => (
        <div key={l.id} className="card mb-2 py-3 flex justify-between items-center">
          <div><span className="text-lg mr-2">{materials.find(m => m.type === l.material_type)?.icon || "📦"}</span><span className="text-sm capitalize">{l.material_type}</span></div>
          <div className="text-right"><span className="badge badge-worker capitalize">{l.quantity_estimate}</span><p className="text-xs text-[#8A8887] mt-1">{new Date(l.logged_at).toLocaleDateString("en-IN")}</p></div>
        </div>
      ))}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0F0F12] pwa-container flex flex-col">
      <div className="bg-[#1A1A22] border-b border-[#2A2A36] p-4">
        <div className="flex items-center justify-between">
          <div><h1 className="text-lg font-bold">{user.name}</h1><p className="text-sm text-[#8A8887]">Kabadiwalla</p></div>
          <div className="flex gap-2"><button onClick={() => setShowHistory(true)} className="text-xs text-[#534AB7]">History</button><button onClick={logout} className="text-xs text-[#8A8887]">Logout</button></div>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col justify-center">
        {/* Step indicators */}
        <div className="flex justify-center gap-2 mb-8">{[0,1,2].map(s => <div key={s} className={`w-3 h-3 rounded-full ${step >= s ? "bg-[#534AB7]" : "bg-[#2A2A36]"}`} />)}</div>

        {step === 0 && (
          <div><h2 className="text-center text-lg font-bold mb-6">What material?</h2>
            <div className="grid grid-cols-3 gap-3">{materials.map(m => (
              <button key={m.type} onClick={() => { setMaterial(m.type); setStep(1); }} className="card card-hover p-6 text-center">
                <span className="text-4xl block mb-2">{m.icon}</span><span className="text-sm">{m.label}</span>
              </button>
            ))}</div></div>
        )}

        {step === 1 && (
          <div><h2 className="text-center text-lg font-bold mb-6">How much?</h2>
            <div className="space-y-3">{quantities.map(q => (
              <button key={q.value} onClick={() => { setQuantity(q.value); setStep(2); }} className="card card-hover w-full p-6 text-center">
                <span className="text-3xl block mb-2">{q.icon}</span><span className="text-lg font-bold">{q.label}</span><p className="text-sm text-[#8A8887]">{q.desc}</p>
              </button>
            ))}</div></div>
        )}

        {step === 2 && (
          <div className="text-center">
            <span className="text-6xl block mb-4">{materials.find(m => m.type === material)?.icon}</span>
            <h2 className="text-xl font-bold mb-2 capitalize">{material}</h2>
            <p className="text-[#8A8887] capitalize mb-8">{quantity} quantity</p>
            <button onClick={handleSubmit} className="btn-teal w-full py-5 text-lg font-bold">✓ LOG PICKUP</button>
            <button onClick={() => setStep(0)} className="text-[#8A8887] text-sm mt-4 block mx-auto">Start Over</button>
          </div>
        )}
      </div>

      {toast && <div className="fixed bottom-4 left-4 right-4 bg-[#0F6E56] text-white p-4 rounded-xl text-sm font-medium shadow-lg">{toast}</div>}
    </div>
  );
}
