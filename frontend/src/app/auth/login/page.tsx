"use client";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { email: "admin@wasteiq.com", role: "Municipal Admin", icon: "🏛️" },
    { email: "driver1@surat.gov.in", role: "Truck Driver", icon: "🚛" },
    { email: "worker1@wasteiq.com", role: "Waste Worker", icon: "👷" },
    { email: "kabadi@wasteiq.com", role: "Kabadiwalla", icon: "♻️" },
    { email: "generator@wasteiq.com", role: "Surplus Generator", icon: "🏨" },
    { email: "receiver@wasteiq.com", role: "Surplus Receiver", icon: "🤝" },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setError("");
    setLoading(true);
    try {
      await login(demoEmail, "password123");
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #0F0F12 0%, #1A1028 50%, #0F0F12 100%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#534AB7] flex items-center justify-center text-xl font-bold">W</div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#534AB7] to-[#7B73D1] bg-clip-text text-transparent">WasteIQ</h1>
          </div>
          <p className="text-[#8A8887] text-sm">From reactive to predictive — ground truth first.</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-[#8A8887] mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input w-full" placeholder="Enter your email" />
            </div>
            <div>
              <label className="block text-sm text-[#8A8887] mb-2">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input w-full" placeholder="Enter your password" />
            </div>
            {error && <p className="text-[#E04848] text-sm bg-[#A32D2D]/10 p-3 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <div className="mt-6">
          <p className="text-[#8A8887] text-xs text-center mb-3">Quick Demo Login</p>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((acc) => (
              <button key={acc.email} onClick={() => quickLogin(acc.email)} className="card card-hover p-3 text-left hover:border-[#534AB7]/40 cursor-pointer transition-all">
                <span className="text-lg">{acc.icon}</span>
                <p className="text-xs font-medium mt-1">{acc.role}</p>
                <p className="text-[10px] text-[#8A8887] truncate">{acc.email}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
