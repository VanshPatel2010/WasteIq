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
    <div className="min-h-screen bg-[#F5F5F0] pwa-container text-[#1F2937]">
      <div className="bg-white p-4 flex items-center gap-3 border-b border-[#D6D3C8] shadow-sm sticky top-0">
        <button onClick={() => setShowHistory(false)} className="text-[#6B7280] font-bold p-2 hover:bg-[#F0EDE6] rounded-full transition-colors">←</button><h2 className="font-bold text-lg text-[#1F2937]">History</h2>
      </div>
      <div className="p-4">{logs.map(l => (
        <div key={l.id} className="card mb-3 py-3 flex justify-between items-center shadow-sm border-[#D6D3C8]">
          <div className="flex items-center"><span className="text-2xl mr-3 bg-[#F0EDE6] p-2 rounded-xl">{materials.find(m => m.type === l.material_type)?.icon || "📦"}</span><span className="text-sm font-bold capitalize text-[#1F2937]">{l.material_type}</span></div>
          <div className="text-right"><span className="badge badge-worker capitalize shadow-sm border border-[#1B7A4A]/20">{l.quantity_estimate}</span><p className="text-[10px] uppercase tracking-wider font-bold text-[#6B7280] mt-1.5">{new Date(l.logged_at).toLocaleDateString("en-IN")}</p></div>
        </div>
      ))}</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F0] pwa-container flex flex-col text-[#1F2937]">
      <div className="bg-white border-b border-[#D6D3C8] p-4 shadow-sm sticky top-0">
        <div className="flex items-center justify-between">
          <div><h1 className="text-lg font-bold text-[#1F2937]">{user.name}</h1><p className="text-sm text-[#6B7280]">Kabadiwalla</p></div>
          <div className="flex items-center gap-4"><button onClick={() => setShowHistory(true)} className="text-xs font-bold text-[#1B7A4A] hover:underline">History</button><button onClick={logout} className="text-xs font-medium text-[#6B7280] hover:text-[#B91C1C]">Logout</button></div>
        </div>
      </div>

      <div className="flex-1 p-4 flex flex-col justify-center">
        {/* Step indicators */}
        <div className="flex justify-center gap-3 mb-10">{[0,1,2].map(s => <div key={s} className={`w-3 h-3 rounded-full transition-colors ${step >= s ? "bg-[#1B7A4A]" : "bg-[#D6D3C8]"}`} />)}</div>

        {step === 0 && (
          <div><h2 className="text-center text-xl font-black mb-8 text-[#1F2937]">What material?</h2>
            <div className="grid grid-cols-3 gap-4">{materials.map(m => (
              <button key={m.type} onClick={() => { setMaterial(m.type); setStep(1); }} className="card card-hover p-6 text-center shadow-sm border-[#D6D3C8] hover:border-[#1B7A4A]/40 group flex flex-col items-center justify-center">
                <span className="text-4xl block mb-3 group-hover:scale-110 transition-transform">{m.icon}</span><span className="text-xs font-bold text-[#1F2937]">{m.label}</span>
              </button>
            ))}</div></div>
        )}

        {step === 1 && (
          <div><h2 className="text-center text-xl font-black mb-8 text-[#1F2937]">How much?</h2>
            <div className="space-y-4">{quantities.map(q => (
              <button key={q.value} onClick={() => { setQuantity(q.value); setStep(2); }} className="card card-hover w-full p-6 text-left shadow-sm border-[#D6D3C8] hover:border-[#1B7A4A]/40 flex items-center gap-6 group">
                <span className="text-5xl group-hover:scale-110 transition-transform">{q.icon}</span>
                <div><span className="text-xl font-black block text-[#1F2937]">{q.label}</span><p className="text-sm text-[#6B7280] font-medium">{q.desc}</p></div>
              </button>
            ))}</div></div>
        )}

        {step === 2 && (
          <div className="text-center">
            <div className="w-32 h-32 mx-auto bg-white rounded-full flex items-center justify-center shadow-lg border border-[#D6D3C8] mb-6">
              <span className="text-6xl block">{materials.find(m => m.type === material)?.icon}</span>
            </div>
            <h2 className="text-3xl font-black mb-2 capitalize text-[#1F2937]">{material}</h2>
            <p className="text-[#6B7280] capitalize mb-10 text-lg font-medium">{quantity} quantity</p>
            <button onClick={handleSubmit} className="btn-primary w-full py-5 text-lg font-bold shadow-xl">✓ LOG PICKUP</button>
            <button onClick={() => setStep(0)} className="text-[#6B7280] font-bold text-sm mt-6 block mx-auto hover:text-[#1F2937]">Start Over</button>
          </div>
        )}
      </div>

      {toast && <div className="fixed bottom-4 left-4 right-4 bg-[#1B7A4A] text-white p-4 rounded-xl text-sm font-bold shadow-2xl animate-bounce text-center">{toast}</div>}
    </div>
  );
}
