"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function ModelHealthPage() {
  const [summary, setSummary] = useState<any>(null);
  const [zoneAccuracy, setZoneAccuracy] = useState<any[]>([]);
  const [driftAlerts, setDriftAlerts] = useState<any[]>([]);
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([api.getAccuracySummary(), api.getZoneAccuracy(), api.getDriftAlerts()])
      .then(([s, z, d]) => { setSummary(s); setZoneAccuracy(z); setDriftAlerts(d); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedZone) {
      api.getZoneAccuracyHistory(selectedZone).then(setHistory).catch(console.error);
    }
  }, [selectedZone]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-green-400 bg-green-500/10";
      case "watch": return "text-yellow-400 bg-yellow-500/10";
      case "drifting": return "text-orange-400 bg-orange-500/10";
      case "unreliable": return "text-red-400 bg-red-500/10";
      default: return "text-[#8A8887] bg-[#22222E]";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🤖 Model Health</h1>
        <p className="text-[#8A8887] text-sm">Prediction accuracy tracking & drift detection</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="metric-card">
            <div className="text-2xl font-bold text-[#534AB7]">{summary.avg_error_7d}%</div>
            <div className="text-sm text-[#8A8887]">Avg Error (7 days)</div>
          </div>
          <div className="metric-card">
            <div className="text-2xl font-bold text-[#C05621]">{summary.active_drift_alerts}</div>
            <div className="text-sm text-[#8A8887]">Active Drift Alerts</div>
          </div>
          <div className="metric-card">
            <div className="text-2xl font-bold text-[#854F0B]">{summary.auto_corrections_applied}</div>
            <div className="text-sm text-[#8A8887]">Auto-Corrections Applied</div>
          </div>
        </div>
      )}

      {/* Drift Alerts */}
      {driftAlerts.length > 0 && (
        <div className="card border-[#C05621]/30">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">🔔 Active Drift Alerts</h3>
          {driftAlerts.map((a: any) => (
            <div key={a.id} className="flex items-center gap-3 py-3 border-b border-[#2A2A36] last:border-0">
              <div className="w-3 h-3 rounded-full bg-[#C05621] animate-pulse" />
              <div className="flex-1">
                <p className="text-sm font-medium">{a.zone_name} — {a.alert_type.replace(/_/g, " ")}</p>
                <p className="text-xs text-[#8A8887]">Avg error 7d: {a.avg_error_last_7d}% | Bias: {a.bias_direction || "none"}</p>
                {a.action_taken && <p className="text-xs text-[#C05621] mt-1">{a.action_taken}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zone Accuracy Table */}
      <div className="card">
        <h3 className="text-sm font-semibold mb-4">Zone-Level Accuracy</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2A2A36] text-[#8A8887]">
                <th className="text-left py-3 px-2">Zone</th>
                <th className="text-right py-3 px-2">Avg Error 7d</th>
                <th className="text-right py-3 px-2">Avg Error 30d</th>
                <th className="text-center py-3 px-2">Bias</th>
                <th className="text-center py-3 px-2">Trust Score</th>
                <th className="text-center py-3 px-2">Correction</th>
                <th className="text-center py-3 px-2">Status</th>
                <th className="text-center py-3 px-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {zoneAccuracy.map((z: any) => (
                <tr key={z.zone_id} className="border-b border-[#2A2A36] hover:bg-[#22222E] cursor-pointer" onClick={() => setSelectedZone(selectedZone === z.zone_id ? null : z.zone_id)}>
                  <td className="py-3 px-2 font-medium">{z.zone_name}</td>
                  <td className="text-right py-3 px-2">{z.avg_error_7d}%</td>
                  <td className="text-right py-3 px-2">{z.avg_error_30d}%</td>
                  <td className="text-center py-3 px-2"><span className="capitalize text-xs">{z.bias_direction.replace(/_/g, " ")}</span></td>
                  <td className="text-center py-3 px-2">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-12 h-1.5 bg-[#2A2A36] rounded-full"><div className="h-full rounded-full" style={{ width: `${z.ml_trust_score * 100}%`, background: z.ml_trust_score >= 0.8 ? "#14A37F" : z.ml_trust_score >= 0.5 ? "#D4A017" : "#E04848" }} /></div>
                      <span className="text-xs">{Math.round(z.ml_trust_score * 100)}%</span>
                    </div>
                  </td>
                  <td className="text-center py-3 px-2">{z.correction_factor > 0 ? `${(z.correction_factor * 100).toFixed(0)}%` : "—"}</td>
                  <td className="text-center py-3 px-2"><span className={`badge ${getStatusColor(z.status)}`}>{z.status}</span></td>
                  <td className="text-center py-3 px-2"><button className="text-xs text-[#534AB7] hover:underline">Details</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Details Modal */}
        {selectedZone && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-[#1A1A22] border border-[#2A2A36] rounded-xl w-full max-w-4xl p-6 shadow-2xl relative">
              <button 
                className="absolute top-4 right-4 text-[#8A8887] hover:text-white"
                onClick={(e) => { e.stopPropagation(); setSelectedZone(null); }}
              >
                ✕ Close
              </button>
              <h4 className="text-lg font-bold mb-6">Zone Details & Accuracy Trend</h4>
              
              {history.length > 0 ? (
                <div className="h-80 w-full mt-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2A2A36" />
                      <XAxis dataKey="evaluated_at" tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} tick={{ fill: "#8A8887", fontSize: 11 }} />
                      <YAxis tick={{ fill: "#8A8887", fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: "#1A1A22", border: "1px solid #2A2A36", borderRadius: 8 }} />
                      <Line type="monotone" dataKey="predicted_fill_level" stroke="#534AB7" strokeWidth={2} name="Predicted" dot={false} />
                      <Line type="monotone" dataKey="actual_fill_level" stroke="#14A37F" strokeWidth={2} name="Actual" dot={false} />
                      <Line type="monotone" dataKey="error_magnitude" stroke="#C05621" strokeWidth={1.5} strokeDasharray="5 5" name="Error" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center text-[#8A8887] py-10">No history available for this zone.</div>
              )}
            </div>
          </div>
        )}
      </div>

      <button onClick={() => api.runEvaluation().then(() => { Promise.all([api.getAccuracySummary(), api.getZoneAccuracy(), api.getDriftAlerts()]).then(([s, z, d]) => { setSummary(s); setZoneAccuracy(z); setDriftAlerts(d); }); })} className="btn-primary">Run Manual Evaluation</button>
    </div>
  );
}
