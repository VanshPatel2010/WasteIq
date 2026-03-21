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
      <div className="min-h-screen bg-[#0F0F12] p-4 pwa-container">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setReportZone(null)} className="text-[#8A8887]">← Back</button>
          <h2 className="font-bold">Report: {reportZone.name}</h2>
          <div />
        </div>

        {/* Step 1 — Fill Level Selection */}
        <div className="card mb-4">
          <label className="text-sm text-[#8A8887] mb-3 block">How full are the bins in this zone?</label>
          <div className="grid grid-cols-3 gap-3">
            {(["low", "medium", "high"] as const).map(level => (
              <button
                key={level}
                onClick={() => { setFillLevelLabel(level); setFillLevel(fillLevelMap[level]); }}
                className={`py-5 px-3 rounded-xl text-center transition-all border-2 ${
                  fillLevelLabel === level
                    ? level === "low" ? "border-[#14A37F] bg-[#14A37F]/15" : level === "medium" ? "border-[#D4A017] bg-[#D4A017]/15" : "border-[#E04848] bg-[#E04848]/15"
                    : "border-[#2A2A36] bg-[#22222E]"
                }`}
              >
                <div className="text-3xl mb-2">{level === "low" ? "🟢" : level === "medium" ? "🟡" : "🔴"}</div>
                <p className="text-sm font-bold capitalize" style={{ color: level === "low" ? "#14A37F" : level === "medium" ? "#D4A017" : "#E04848" }}>{level}</p>
                <p className="text-xs text-[#8A8887] mt-1">{level === "low" ? "Nearly empty" : level === "medium" ? "Half full" : "Almost full"}</p>
              </button>
            ))}
          </div>
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
          <div>
            <h1 className="text-lg font-bold">{user.name}</h1>
            <p className="text-sm text-[#8A8887]">{zones.length} assigned zones</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Reward Points Badge */}
            <div className="flex items-center gap-1.5 bg-[#22222E] px-3 py-1.5 rounded-full">
              <span className="text-base">🏆</span>
              <span className="text-sm font-bold text-[#D4A017]">{rewardsData?.total_points ?? 0}</span>
              <span className="text-xs text-[#8A8887]">pts</span>
            </div>
            <div className="badge badge-worker">● Online</div>
            <button onClick={logout} className="text-xs text-[#8A8887]">Logout</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2A2A36]">
        {(["zones", "history", "rewards"] as const).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); if (tab === "rewards") { api.getMyRewards().then(setRewardsData); api.getLeaderboard().then(setLeaderboard); } }} className={`flex-1 py-3 text-sm font-medium capitalize ${activeTab === tab ? "text-[#0F6E56] border-b-2 border-[#0F6E56]" : "text-[#8A8887]"}`}>{tab === "zones" ? "My Zones" : tab === "history" ? "History" : "🏆 Rewards"}</button>
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
              <span className="text-sm font-bold" style={{ color: getFillLabelColor(getFillLabel(z.current_fill_level)) }}>{getFillLabel(z.current_fill_level)}</span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-xs text-[#8A8887]">{z.latest_report ? `Last reported: ${z.latest_report.hours_ago}h ago` : "Not yet today"}</p>
              <button onClick={() => { setReportZone(z); const lbl = z.current_fill_level <= 35 ? "low" as const : z.current_fill_level <= 65 ? "medium" as const : "high" as const; setFillLevelLabel(lbl); setFillLevel(fillLevelMap[lbl]); setBinCount(z.bin_count || 10); }} className="btn-teal py-2 px-4 text-sm font-bold">REPORT NOW</button>
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
                    <span className="text-sm font-bold px-2 py-1 rounded-lg" style={{ color: getFillLabelColor(getFillLabel(r.reported_fill_level)), background: getFillLabelColor(getFillLabel(r.reported_fill_level)) + "20" }}>{getFillLabel(r.reported_fill_level)}</span>
                    <span className={`badge ml-2 ${r.synced ? "fill-green" : "fill-yellow"}`}>{r.synced ? "✓" : "⏳"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "rewards" && (
          <div>
            {/* Total Points Card */}
            <div className="card mb-4 p-6 text-center" style={{ background: "linear-gradient(135deg, rgba(212,160,23,0.15) 0%, rgba(20,163,127,0.15) 100%)" }}>
              <div className="text-4xl mb-2">🏆</div>
              <p className="text-4xl font-bold text-[#D4A017] mb-1">{rewardsData?.total_points ?? 0}</p>
              <p className="text-sm text-[#8A8887]">Total Reward Points</p>
              <p className="text-xs text-[#8A8887] mt-1">{rewardsData?.reward_count ?? 0} verified reports rewarded</p>
            </div>

            {/* How It Works */}
            <div className="card mb-4">
              <h3 className="text-sm font-semibold text-[#8A8887] mb-3">HOW IT WORKS</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 rounded-lg bg-[#22222E]">
                  <span className="text-xl">📝</span>
                  <div><p className="text-sm font-medium">Submit Report</p><p className="text-xs text-[#8A8887]">Report fill levels for your zones</p></div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-[#22222E]">
                  <span className="text-xl">🚛</span>
                  <div><p className="text-sm font-medium">Driver Verifies</p><p className="text-xs text-[#8A8887]">Truck driver reports fill level found</p></div>
                </div>
                <div className="flex items-center gap-3 p-2 rounded-lg bg-[#22222E]">
                  <span className="text-xl">✅</span>
                  <div><p className="text-sm font-medium">Earn Points</p><p className="text-xs text-[#8A8887]">+10 pts for accurate report, +15 for high accuracy</p></div>
                </div>
              </div>
            </div>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div className="card mb-4">
                <h3 className="text-sm font-semibold text-[#8A8887] mb-3">🏅 LEADERBOARD</h3>
                <div className="space-y-2">
                  {leaderboard.map((w: any) => (
                    <div key={w.id} className={`flex items-center gap-3 p-3 rounded-lg ${w.is_current_user ? "bg-[#0F6E56]/15 border border-[#0F6E56]/30" : "bg-[#22222E]"}`}>
                      <span className="text-lg font-bold w-8 text-center" style={{ color: w.rank <= 3 ? "#D4A017" : "#8A8887" }}>
                        {w.rank === 1 ? "🥇" : w.rank === 2 ? "🥈" : w.rank === 3 ? "🥉" : `#${w.rank}`}
                      </span>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${w.is_current_user ? "text-[#14A37F]" : ""}`}>
                          {w.name} {w.is_current_user ? "(You)" : ""}
                        </p>
                        <p className="text-xs text-[#8A8887]">Accuracy: {w.accuracy_score}%</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#D4A017]">{w.reward_points}</p>
                        <p className="text-xs text-[#8A8887]">pts</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reward History */}
            <h3 className="text-sm font-semibold text-[#8A8887] mb-3">REWARD HISTORY</h3>
            {(!rewardsData?.rewards || rewardsData.rewards.length === 0) ? (
              <div className="card text-center py-8">
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm text-[#8A8887]">No rewards yet. Submit accurate reports to earn points!</p>
              </div>
            ) : (
              rewardsData.rewards.map((r: any) => (
                <div key={r.id} className="card mb-2 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#D4A017]/15 flex items-center justify-center">
                        <span className="text-sm">{r.points >= 15 ? "⭐" : "✅"}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium">{r.reason}</p>
                        <p className="text-xs text-[#8A8887]">{r.awarded_at ? new Date(r.awarded_at).toLocaleString("en-IN") : ""}</p>
                        <p className="text-xs text-[#8A8887]">Reported: {r.fill_level_reported}% → Found: {r.fill_level_found}% (diff: {r.difference}%)</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-[#14A37F]">+{r.points}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && <div className="fixed bottom-4 left-4 right-4 bg-[#0F6E56] text-white p-4 rounded-xl text-sm font-medium shadow-lg animate-bounce">{toast}</div>}
    </div>
  );
}
