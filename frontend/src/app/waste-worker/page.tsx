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

  const getFillColor = (l: number) => l >= 91 ? "#E04848" : l >= 71 ? "#C05621" : l >= 41 ? "#D4A017" : "#14A37F";
  const getFillBg = (l: number) => l >= 91 ? "rgba(224,72,72,0.1)" : l >= 71 ? "rgba(192,86,33,0.1)" : l >= 41 ? "rgba(212,160,23,0.1)" : "rgba(20,163,127,0.1)";

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
      <div className="min-h-screen bg-[#0F0F12] p-4 pwa-container">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setReportZone(null)} className="text-[#8A8887]">← Back</button>
          <h2 className="font-bold">Report: {reportZone.name}</h2>
          <div />
        </div>

        {/* Step 1 — Fill Level Slider */}
        <div className="card mb-4" style={{ background: getFillBg(fillLevel) }}>
          <label className="text-sm text-[#8A8887] mb-2 block">How full are the bins in this zone?</label>
          <div className="text-center mb-4"><span className="text-5xl font-bold" style={{ color: getFillColor(fillLevel) }}>{fillLevel}%</span></div>
          <input type="range" min={0} max={100} value={fillLevel} onChange={e => setFillLevel(Number(e.target.value))} className="w-full h-3 rounded-full appearance-none cursor-pointer" style={{ background: `linear-gradient(to right, #14A37F 0%, #D4A017 40%, #C05621 70%, #E04848 100%)` }} />
          <div className="flex justify-between text-xs text-[#8A8887] mt-2"><span>Empty</span><span>Half</span><span>Full</span><span>Overflow</span></div>
        </div>

        {/* Step 2 — Quick Checks */}
        <div className="card mb-4 space-y-3">
          <div className="flex items-center justify-between"><span className="text-sm">Overflow detected?</span>
            <button onClick={() => setOverflow(!overflow)} className={`w-12 h-6 rounded-full transition-all ${overflow ? "bg-[#E04848]" : "bg-[#2A2A36]"}`}><div className={`w-5 h-5 rounded-full bg-white transition-all ${overflow ? "ml-6" : "ml-0.5"}`} /></button>
          </div>
        </div>

        {/* Step 3 — Bin Count */}
        <div className="card mb-4">
          <label className="text-sm text-[#8A8887] mb-2 block">Bins checked</label>
          <div className="flex items-center gap-4">
            <button onClick={() => setBinCount(Math.max(1, binCount - 1))} className="w-10 h-10 rounded-lg bg-[#22222E] text-xl">−</button>
            <span className="text-2xl font-bold flex-1 text-center">{binCount}</span>
            <button onClick={() => setBinCount(binCount + 1)} className="w-10 h-10 rounded-lg bg-[#22222E] text-xl">+</button>
          </div>
        </div>

        {/* Step 5 — Notes */}
        <div className="card mb-6">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." className="input w-full h-20 resize-none" />
        </div>

        <button onClick={handleSubmit} disabled={submitting} className="btn-teal w-full text-lg py-4 font-bold disabled:opacity-50">{submitting ? "Submitting..." : "✓ CONFIRM REPORT"}</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F0F12] pwa-container">
      {/* Header */}
      <div className="bg-[#1A1A22] border-b border-[#2A2A36] p-4">
        <div className="flex items-center justify-between">
          <div><h1 className="text-lg font-bold">{user.name}</h1><p className="text-sm text-[#8A8887]">{zones.length} assigned zones</p></div>
          <div className="flex items-center gap-2">
            <div className="badge badge-worker">● Online</div>
            <button onClick={logout} className="text-xs text-[#8A8887]">Logout</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2A2A36]">
        {(["zones", "history"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-sm font-medium capitalize ${activeTab === tab ? "text-[#0F6E56] border-b-2 border-[#0F6E56]" : "text-[#8A8887]"}`}>{tab === "zones" ? "My Zones" : "History"}</button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {activeTab === "zones" && zones.map(z => (
          <div key={z.id} className="card card-hover">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{z.name}</h3>
              <span className={`badge ${z.fill_level_source === "worker_reported" ? "badge-worker" : z.fill_level_source === "driver_reported" ? "badge-driver" : "badge-ml"}`}>
                {z.fill_level_source === "worker_reported" ? "My report" : z.fill_level_source === "driver_reported" ? "Driver" : "ML estimate"}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-full h-2 bg-[#2A2A36] rounded-full"><div className="h-full rounded-full" style={{ width: `${z.current_fill_level}%`, background: getFillColor(z.current_fill_level) }} /></div>
              <span className="text-sm font-bold" style={{ color: getFillColor(z.current_fill_level) }}>{Math.round(z.current_fill_level)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#8A8887]">{z.latest_report ? `Last reported: ${z.latest_report.hours_ago}h ago` : "Not yet today"}</p>
              <button onClick={() => { setReportZone(z); setFillLevel(Math.round(z.current_fill_level)); setBinCount(z.bin_count || 10); }} className="btn-teal py-2 px-4 text-sm font-bold">REPORT NOW</button>
            </div>
          </div>
        ))}

        {activeTab === "history" && (
          <div>
            <div className="card mb-4"><p className="text-sm"><span className="text-2xl font-bold text-[#0F6E56]">{reports.filter(r => { const d = new Date(r.reported_at); const t = new Date(); return d.toDateString() === t.toDateString(); }).length}</span> reports today</p></div>
            {reports.map(r => (
              <div key={r.id} className="card mb-2 py-3">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-medium">{r.zone_name}</p><p className="text-xs text-[#8A8887]">{new Date(r.reported_at).toLocaleString("en-IN")}</p></div>
                  <div className="text-right">
                    <span className="text-lg font-bold" style={{ color: getFillColor(r.reported_fill_level) }}>{Math.round(r.reported_fill_level)}%</span>
                    <span className={`badge ml-2 ${r.synced ? "fill-green" : "fill-yellow"}`}>{r.synced ? "✓" : "⏳"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <div className="fixed bottom-4 left-4 right-4 bg-[#0F6E56] text-white p-4 rounded-xl text-sm font-medium shadow-lg animate-bounce">{toast}</div>}
    </div>
  );
}
