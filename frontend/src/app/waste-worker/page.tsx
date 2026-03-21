"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function WasteWorkerHome() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [zones, setZones] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"zones" | "history">("zones");
  const [reports, setReports] = useState<any[]>([]);
  const [reportZone, setReportZone] = useState<any>(null);
  const [fillLevel, setFillLevel] = useState(50);
  const [overflow, setOverflow] = useState(false);
  const [binCount, setBinCount] = useState(10);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!loading && user?.role !== "waste_worker") router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      api.getMyZones().then(setZones).catch(console.error);
      api.getReports({}).then(setReports).catch(console.error);
    }
  }, [user]);

  const getFillColor = (l: number) => l >= 91 ? "#B91C1C" : l >= 71 ? "#D97706" : l >= 41 ? "#C9A84C" : "#15803D";
  const getFillBg = (l: number) => l >= 91 ? "rgba(185,28,28,0.1)" : l >= 71 ? "rgba(217,119,6,0.1)" : l >= 41 ? "rgba(201,168,76,0.1)" : "rgba(21,128,61,0.1)";

  const handleSubmit = async () => {
    if (!reportZone) return;
    setSubmitting(true);
    try {
      const res = await api.submitReport({ zone_id: reportZone.id, fill_level: fillLevel, bin_count_checked: binCount, overflow_detected: overflow, notes: notes || undefined, reported_at: new Date().toISOString() });
      setToast(res.prediction_overridden ? `Report submitted — ML prediction overridden! Routes recalculating.` : `Report submitted — zone updated`);
      setReportZone(null);
      api.getMyZones().then(setZones);
      api.getReports({}).then(setReports);
    } catch (e: any) { setToast("Error: " + e.message); }
    finally { setSubmitting(false); setTimeout(() => setToast(""), 3000); }
  };

  if (loading || !user) return null;

  // Report form modal
  if (reportZone) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] p-4 pwa-container text-[#1F2937]">
        <div className="flex items-center justify-between mb-8">
          <button onClick={() => setReportZone(null)} className="text-[#6B7280] font-bold hover:text-[#1F2937]">← Back</button>
          <h2 className="font-bold text-lg text-[#1F2937] truncate flex-1 text-center px-4">Report: {reportZone.name}</h2>
          <div className="w-12" /> {/* spacer for alignment */}
        </div>

        {/* Step 1 — Fill Level Slider */}
        <div className="card mb-6 shadow-sm border border-[#D6D3C8] relative overflow-hidden">
          <div className="absolute inset-0 opacity-50" style={{ background: getFillBg(fillLevel) }} />
          <div className="relative z-10">
            <label className="text-xs font-bold text-[#6B7280] mb-4 block uppercase tracking-widest text-center">How full are the bins in this zone?</label>
            <div className="text-center mb-6"><span className="text-6xl font-black drop-shadow-sm" style={{ color: getFillColor(fillLevel) }}>{fillLevel}%</span></div>
            <input type="range" min={0} max={100} value={fillLevel} onChange={e => setFillLevel(Number(e.target.value))} className="w-full h-3 rounded-full appearance-none cursor-pointer shadow-inner" style={{ background: `linear-gradient(to right, #15803D 0%, #C9A84C 40%, #D97706 70%, #B91C1C 100%)` }} />
            <div className="flex justify-between text-[10px] uppercase font-bold text-[#6B7280] mt-3 tracking-widest"><span>Empty</span><span>Half</span><span>Full</span><span>Overflow</span></div>
          </div>
        </div>

        {/* Step 2 — Quick Checks */}
        <div className="card mb-6 space-y-4 shadow-sm border-[#D6D3C8]">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-[#1F2937]">Overflow detected?</span>
            <button onClick={() => setOverflow(!overflow)} className={`w-14 h-8 rounded-full transition-all shadow-inner border border-[#D6D3C8] flex items-center ${overflow ? "bg-[#B91C1C]" : "bg-[#F0EDE6]"}`}><div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all ${overflow ? "translate-x-7" : "translate-x-1"}`} /></button>
          </div>
        </div>

        {/* Step 3 — Bin Count */}
        <div className="card mb-6 shadow-sm border-[#D6D3C8]">
          <label className="text-xs font-bold text-[#6B7280] mb-4 block uppercase tracking-widest">Bins checked</label>
          <div className="flex items-center gap-4 bg-[#F0EDE6] p-2 rounded-xl border border-[#D6D3C8]">
            <button onClick={() => setBinCount(Math.max(1, binCount - 1))} className="w-12 h-12 rounded-lg bg-white shadow-sm text-2xl font-bold text-[#1F2937] active:scale-95 transition-transform">−</button>
            <span className="text-3xl font-black flex-1 text-center text-[#1F2937]">{binCount}</span>
            <button onClick={() => setBinCount(binCount + 1)} className="w-12 h-12 rounded-lg bg-white shadow-sm text-2xl font-bold text-[#1F2937] active:scale-95 transition-transform">+</button>
          </div>
        </div>

        {/* Step 5 — Notes */}
        <div className="card mb-8 shadow-sm border-[#D6D3C8]">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add specific notes if a bin is broken, blocked, etc..." className="w-full h-24 resize-none bg-transparent outline-none text-[#1F2937] placeholder:text-[#9CA3AF] text-sm font-medium" />
        </div>

        <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full text-lg py-5 font-black tracking-widest shadow-xl disabled:opacity-50">{submitting ? "SUBMITTING..." : "✓ CONFIRM REPORT"}</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] pwa-container text-[#1F2937]">
      {/* Header */}
      <div className="bg-white border-b border-[#D6D3C8] p-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div><h1 className="text-lg font-bold text-[#1F2937]">{user.name}</h1><p className="text-sm text-[#6B7280] font-medium">{zones.length} assigned zones</p></div>
          <div className="flex items-center gap-3">
            <div className="badge badge-worker shadow-sm border border-[#1B7A4A]/20">● Online</div>
            <button onClick={logout} className="text-xs text-[#6B7280] font-bold hover:text-[#B91C1C]">Logout</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#D6D3C8] bg-[#F0EDE6]">
        {(["zones", "history"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-4 text-sm font-bold capitalize transition-colors ${activeTab === tab ? "text-[#1B7A4A] border-b-2 border-[#1B7A4A] bg-white" : "text-[#6B7280] hover:text-[#1F2937]"}`}>{tab === "zones" ? "My Zones" : "History"}</button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {activeTab === "zones" && zones.map(z => (
          <div key={z.id} className="card card-hover shadow-sm border-[#D6D3C8] bg-white">
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-[#1F2937] text-lg leading-tight w-2/3">{z.name}</h3>
              <span className={`badge shadow-sm border ${z.fill_level_source === "worker_reported" ? "badge-worker border-[#1B7A4A]/20" : z.fill_level_source === "driver_reported" ? "badge-driver border-blue-500/20" : "badge-ml border-purple-500/20"}`}>
                {z.fill_level_source === "worker_reported" ? "My report" : z.fill_level_source === "driver_reported" ? "Driver" : "ML estimate"}
              </span>
            </div>
            <div className="flex items-center gap-4 mb-4 bg-[#F5F5F0] p-3 rounded-lg border border-[#D6D3C8]/50">
              <div className="w-full h-2.5 bg-[#D6D3C8] rounded-full shadow-inner"><div className="h-full rounded-full transition-all duration-1000" style={{ width: `${z.current_fill_level}%`, background: getFillColor(z.current_fill_level) }} /></div>
              <span className="text-xl font-black w-12 text-right" style={{ color: getFillColor(z.current_fill_level) }}>{Math.round(z.current_fill_level)}%</span>
            </div>
            <div className="flex items-center justify-between border-t border-[#D6D3C8]/50 pt-4">
              <p className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider">{z.latest_report ? `Last reported: ${z.latest_report.hours_ago}h ago` : "Not yet today"}</p>
              <button onClick={() => { setReportZone(z); setFillLevel(Math.round(z.current_fill_level)); setBinCount(z.bin_count || 10); }} className="btn-primary py-2.5 px-6 text-xs font-black tracking-widest shadow-md">REPORT</button>
            </div>
          </div>
        ))}

        {activeTab === "history" && (
          <div>
            <div className="card mb-4 bg-white shadow-sm border-[#D6D3C8] flex items-center gap-4 py-6">
              <div className="text-5xl font-black text-[#1B7A4A] pl-2">{reports.filter(r => { const d = new Date(r.reported_at); const t = new Date(); return d.toDateString() === t.toDateString(); }).length}</div>
              <div>
                <p className="text-sm font-bold text-[#1F2937] uppercase tracking-wider">Reports Today</p>
                <p className="text-xs text-[#6B7280] font-medium">Synced with central intelligence</p>
              </div>
            </div>
            {reports.map(r => (
              <div key={r.id} className="card mb-3 py-4 shadow-sm border-[#D6D3C8] bg-white">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold text-[#1F2937] leading-tight flex-1 pr-4">{r.zone_name}</p>
                    <span className="text-2xl font-black text-right" style={{ color: getFillColor(r.reported_fill_level) }}>{Math.round(r.reported_fill_level)}%</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] uppercase font-bold text-[#6B7280] tracking-wider">{new Date(r.reported_at).toLocaleString("en-IN")}</p>
                    <span className={`badge shadow-sm ${r.synced ? "fill-green" : "fill-yellow"}`}>{r.synced ? "Synced ✓" : "Pending ⏳"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <div className="fixed bottom-4 left-4 right-4 bg-[#1B7A4A] text-white p-4 rounded-xl text-sm font-bold shadow-2xl animate-bounce text-center">{toast}</div>}
    </div>
  );
}
