"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function WasteWorkerHome() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [zones, setZones] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"zones" | "history" | "rewards">("zones");
  const [reports, setReports] = useState<any[]>([]);
  const [reportZone, setReportZone] = useState<any>(null);
  const [fillLevel, setFillLevel] = useState(50);
  const [fillLevelLabel, setFillLevelLabel] = useState<"low" | "medium" | "high">("medium");

  const fillLevelMap = { low: 25, medium: 50, high: 85 };
  const getFillLabel = (val: number) => val <= 35 ? "Low" : val <= 65 ? "Medium" : "High";
  const getFillLabelColor = (label: string) => label === "High" || label === "high" ? "#E04848" : label === "Medium" || label === "medium" ? "#D4A017" : "#14A37F";
  const [overflow, setOverflow] = useState(false);
  const [binCount, setBinCount] = useState(10);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [rewardsData, setRewardsData] = useState<any>(null);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && user?.role !== "waste_worker") router.push("/");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      api.getMyZones().then(setZones).catch(console.error);
      api.getReports({}).then(setReports).catch(console.error);
      api.getMyRewards().then(setRewardsData).catch(console.error);
      api.getLeaderboard().then(setLeaderboard).catch(console.error);
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
      <div className="min-h-screen bg-[#F5F5F0] p-4 pwa-container text-[#1F2937]">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setReportZone(null)} className="text-[#6B7280] font-bold hover:text-[#1F2937] transition-colors">← Back</button>
          <h2 className="font-bold text-lg text-[#1F2937]">Report: {reportZone.name}</h2>
          <div />
        </div>

        {/* Step 1 — Fill Level Selection */}
        <div className="card mb-4 bg-white shadow-sm border border-[#D6D3C8]">
          <label className="text-xs font-bold uppercase tracking-widest text-[#6B7280] mb-3 block">How full are the bins in this zone?</label>
          <div className="grid grid-cols-3 gap-3">
            {(["low", "medium", "high"] as const).map(level => (
              <button
                key={level}
                onClick={() => { setFillLevelLabel(level); setFillLevel(fillLevelMap[level]); }}
                className={`py-5 px-3 rounded-xl text-center shadow-sm transition-all border ${
                  fillLevelLabel === level
                    ? level === "low" ? "border-[#15803D] bg-[#15803D]/5" : level === "medium" ? "border-[#D97706] bg-[#D97706]/5" : "border-[#B91C1C] bg-[#B91C1C]/5"
                    : "border-[#D6D3C8] bg-[#F5F5F0] hover:bg-[#F0EDE6]"
                }`}
              >
                <div className="text-3xl mb-2 drop-shadow-sm">{level === "low" ? "🟢" : level === "medium" ? "🟡" : "🔴"}</div>
                <p className="text-sm font-bold capitalize" style={{ color: level === "low" ? "#15803D" : level === "medium" ? "#D97706" : "#B91C1C" }}>{level}</p>
                <p className="text-xs font-semibold text-[#6B7280] mt-1">{level === "low" ? "Nearly empty" : level === "medium" ? "Half full" : "Almost full"}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2 — Quick Checks */}
        <div className="card mb-4 space-y-3 bg-white shadow-sm border border-[#D6D3C8]">
          <div className="flex items-center justify-between"><span className="text-sm font-bold text-[#1F2937]">Overflow detected?</span>
            <button onClick={() => setOverflow(!overflow)} className={`w-12 h-6 rounded-full transition-all ${overflow ? "bg-[#B91C1C]" : "bg-[#D6D3C8]"}`}><div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-all flex items-center justify-center ${overflow ? "ml-6" : "ml-0.5"}`} /></button>
          </div>
        </div>

        {/* Step 3 — Bin Count */}
        <div className="card mb-4 bg-white shadow-sm border border-[#D6D3C8]">
          <label className="text-xs font-bold uppercase tracking-widest text-[#6B7280] mb-3 block">Bins checked</label>
          <div className="flex items-center gap-4">
            <button onClick={() => setBinCount(Math.max(1, binCount - 1))} className="w-10 h-10 rounded-lg bg-[#F5F5F0] border border-[#D6D3C8] text-xl font-bold text-[#1F2937] hover:bg-[#F0EDE6] active:bg-[#E5E2D9] transition-colors">−</button>
            <span className="text-2xl font-black flex-1 text-center text-[#1F2937] drop-shadow-sm">{binCount}</span>
            <button onClick={() => setBinCount(binCount + 1)} className="w-10 h-10 rounded-lg bg-[#F5F5F0] border border-[#D6D3C8] text-xl font-bold text-[#1F2937] hover:bg-[#F0EDE6] active:bg-[#E5E2D9] transition-colors">+</button>
          </div>
        </div>

        {/* Step 5 — Notes */}
        <div className="card mb-6 bg-white shadow-sm border border-[#D6D3C8]">
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes... (e.g. lid broken)" className="input w-full h-20 resize-none bg-[#F5F5F0] border border-[#D6D3C8] text-[#1F2937] placeholder-[#9CA3AF]" />
        </div>

        <button onClick={handleSubmit} disabled={submitting} className="btn-primary w-full text-lg py-4 font-bold shadow-md tracking-wider disabled:opacity-50">{submitting ? "Submitting..." : "✓ CONFIRM REPORT"}</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F0] pwa-container text-[#1F2937]">
      {/* Header */}
      <div className="bg-white border-b border-[#D6D3C8] p-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#1F2937]">{user.name}</h1>
            <p className="text-sm font-medium text-[#6B7280]">{zones.length} assigned zones</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Reward Points Badge */}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 shadow-sm px-3 py-1.5 rounded-full">
              <span className="text-base drop-shadow-sm">🏆</span>
              <span className="text-sm font-black text-[#D97706]">{rewardsData?.total_points ?? 0}</span>
              <span className="text-[10px] font-bold text-[#D97706]/70 uppercase">pts</span>
            </div>
            <div className="badge badge-worker border border-[#1B7A4A]/20">● Online</div>
            <button onClick={logout} className="text-xs font-bold text-[#6B7280] hover:text-[#B91C1C]">Logout</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#D6D3C8] bg-white text-[#6B7280]">
        {(["zones", "history", "rewards"] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); if (tab === "rewards") { api.getMyRewards().then(setRewardsData); api.getLeaderboard().then(setLeaderboard); } }} className={`flex-1 py-3 text-sm font-bold capitalize transition-colors ${activeTab === tab ? "text-[#1B7A4A] border-b-2 border-[#1B7A4A] bg-[#F5F5F0]" : "hover:text-[#1F2937] hover:bg-[#F5F5F0]"}`}>{tab === "zones" ? "My Zones" : tab === "history" ? "History" : "🏆 Rewards"}</button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {activeTab === "zones" && zones.map(z => (
          <div key={z.id} className="card card-hover bg-white border border-[#D6D3C8] shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-[#1F2937]">{z.name}</h3>
              <span className={`badge ${z.fill_level_source === "worker_reported" ? "bg-green-100 text-[#15803D]" : z.fill_level_source === "driver_reported" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}`}>
                {z.fill_level_source === "worker_reported" ? "My report" : z.fill_level_source === "driver_reported" ? "Driver" : "ML estimate"}
              </span>
            </div>
            <div className="flex items-center gap-3 mb-4 mt-3">
              <div className="w-full h-2.5 bg-[#F0EDE6] rounded-full shadow-inner overflow-hidden border border-[#D6D3C8]/50"><div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${z.current_fill_level}%`, background: getFillColor(z.current_fill_level) }} /></div>
              <span className="text-sm font-bold" style={{ color: getFillLabelColor(getFillLabel(z.current_fill_level)) }}>{getFillLabel(z.current_fill_level)}</span>
            </div>
            <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#F0EDE6]">
              <p className="text-xs font-semibold text-[#6B7280]">{z.latest_report ? `Last reported: ${z.latest_report.hours_ago}h ago` : "Not yet today"}</p>
              <button onClick={() => { setReportZone(z); const lbl = z.current_fill_level <= 35 ? "low" as const : z.current_fill_level <= 65 ? "medium" as const : "high" as const; setFillLevelLabel(lbl); setFillLevel(fillLevelMap[lbl]); setBinCount(z.bin_count || 10); }} className="btn-primary py-2 px-5 text-sm font-bold shadow-sm whitespace-nowrap tracking-wide">REPORT NOW</button>
            </div>
          </div>
        ))}

        {activeTab === "history" && (
          <div>
            <div className="card mb-4 bg-white border border-[#D6D3C8] shadow-sm"><p className="text-sm font-semibold text-[#6B7280]"><span className="text-2xl font-black text-[#1B7A4A]">{reports.filter(r => { const d = new Date(r.reported_at); const t = new Date(); return d.toDateString() === t.toDateString(); }).length}</span> reports today</p></div>
            {reports.map(r => (
              <div key={r.id} className="card card-hover mb-3 py-3 shadow-sm border border-[#D6D3C8] bg-white">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm font-bold text-[#1F2937]">{r.zone_name}</p><p className="text-xs font-semibold text-[#9CA3AF] mt-0.5">{new Date(r.reported_at).toLocaleString("en-IN")}</p></div>
                  <div className="text-right flex items-center gap-2">
                    <span className="text-xs font-bold px-2.5 py-1.5 rounded border shadow-sm" style={{ color: getFillLabelColor(getFillLabel(r.reported_fill_level)), background: getFillLabelColor(getFillLabel(r.reported_fill_level)) + "10", borderColor: getFillLabelColor(getFillLabel(r.reported_fill_level)) + "30" }}>{getFillLabel(r.reported_fill_level)}</span>
                    <span className={`badge ${r.synced ? "fill-green lg shadow-sm" : "fill-yellow lg shadow-sm"}`}>{r.synced ? "✓" : "⏳"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "rewards" && (
          <div className="space-y-4">
            {/* Total Points Card */}
            <div className="card text-center border border-[#D6D3C8] shadow-sm py-8" style={{ background: "linear-gradient(135deg, rgba(217,119,6,0.1) 0%, rgba(21,128,61,0.1) 100%)" }}>
              <div className="text-5xl mb-3 drop-shadow-md">🏆</div>
              <p className="text-5xl font-black text-[#D97706] mb-1 drop-shadow-sm">{rewardsData?.total_points ?? 0}</p>
              <p className="text-sm font-bold uppercase tracking-widest text-[#6B7280]">Total Reward Points</p>
              <p className="text-xs font-semibold text-[#15803D] mt-3 bg-white/70 py-1.5 px-3 rounded-md shadow-sm border border-[#15803D]/20 inline-block">{rewardsData?.reward_count ?? 0} verified reports rewarded</p>
            </div>

            {/* How It Works */}
            <div className="card bg-white border border-[#D6D3C8] shadow-sm p-5">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#6B7280] mb-4">HOW IT WORKS</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-3 rounded-xl bg-[#F5F5F0] border border-[#D6D3C8]">
                  <span className="text-2xl drop-shadow-sm">📝</span>
                  <div><p className="text-sm font-bold text-[#1F2937]">Submit Report</p><p className="text-xs font-medium text-[#6B7280] mt-0.5">Report fill levels for your zones</p></div>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-xl bg-[#F5F5F0] border border-[#D6D3C8]">
                  <span className="text-2xl drop-shadow-sm">🚛</span>
                  <div><p className="text-sm font-bold text-[#1F2937]">Driver Verifies</p><p className="text-xs font-medium text-[#6B7280] mt-0.5">Truck driver reports fill level found</p></div>
                </div>
                <div className="flex items-center gap-4 p-3 rounded-xl bg-green-50 border border-green-200">
                  <span className="text-2xl drop-shadow-sm">✅</span>
                  <div><p className="text-sm font-bold text-[#15803D]">Earn Points</p><p className="text-xs font-medium text-[#15803D]/80 mt-0.5">+10 pts accurate, +15 high accuracy</p></div>
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="card bg-white border border-[#D6D3C8] shadow-sm p-5">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#6B7280] mb-4">🏅 LEADERBOARD</h3>
                <div className="space-y-2.5">
                  {leaderboard.map((w: any) => (
                    <div key={w.id} className={`flex items-center gap-3 p-3 rounded-xl border ${w.is_current_user ? "bg-green-50 border-green-300 shadow-sm" : "bg-[#F5F5F0] border-[#D6D3C8]"}`}>
                      <span className="text-xl font-black w-8 text-center drop-shadow-sm" style={{ color: w.rank <= 3 ? "#D97706" : "#9CA3AF" }}>
                        {w.rank === 1 ? "🥇" : w.rank === 2 ? "🥈" : w.rank === 3 ? "🥉" : `#${w.rank}`}
                      </span>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${w.is_current_user ? "text-[#15803D]" : "text-[#1F2937]"}`}>
                          {w.name} {w.is_current_user ? "(You)" : ""}
                        </p>
                        <p className="text-xs font-medium text-[#6B7280] mt-0.5">Accuracy: {w.accuracy_score}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-[#D97706]">{w.reward_points}</p>
                        <p className="text-[10px] font-bold uppercase text-[#9CA3AF]">pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reward History */}
            <div className="pt-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#6B7280] mb-3 ml-1">REWARD HISTORY</h3>
              {(!rewardsData?.rewards || rewardsData.rewards.length === 0) ? (
                <div className="card text-center py-10 bg-white border border-[#D6D3C8] border-dashed shadow-sm">
                  <p className="text-4xl mb-3 opacity-80 drop-shadow-sm">📋</p>
                  <p className="text-sm font-semibold text-[#6B7280]">No rewards yet. Submit accurate reports to earn points!</p>
                </div>
              ) : (
                rewardsData.rewards.map((r: any) => (
                  <div key={r.id} className="card py-3 bg-white border border-[#D6D3C8] shadow-sm hover:border-[#D97706]/40 transition-colors mb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-50 border border-amber-200 shadow-inner flex items-center justify-center">
                          <span className="text-base drop-shadow-sm">{r.points >= 15 ? "⭐" : "✅"}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#1F2937]">{r.reason}</p>
                          <p className="text-[11px] font-bold text-[#9CA3AF] mt-0.5 tracking-wider uppercase">{r.awarded_at ? new Date(r.awarded_at).toLocaleString("en-IN") : ""}</p>
                          <p className="text-[11px] font-semibold text-[#6B7280] mt-1 bg-[#F5F5F0] py-0.5 px-2 rounded w-max border border-[#D6D3C8]/40">Reported: {r.fill_level_reported}% → Found: {r.fill_level_found}% (diff: {r.difference}%)</p>
                        </div>
                      </div>
                      <span className="text-xl font-black text-[#15803D] drop-shadow-sm bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">+{r.points}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <div className="fixed bottom-4 left-4 right-4 bg-[#1B7A4A] text-white p-4 rounded-xl text-sm font-bold shadow-2xl tracking-wide text-center animate-bounce">{toast}</div>}
    </div>
  );
}
