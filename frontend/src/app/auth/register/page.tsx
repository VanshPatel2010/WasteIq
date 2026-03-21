"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    role: "generator" // Default selection
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError("Name, email, and password are required.");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      // Backend api wrapper registers user and returns JWT token
      const res = await api.register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || null,
        role: form.role,
        organisation_id: null // Explicitly handle missing orgs by leaving null (backend defaults to 0)
      });
      
      // Auto-login logic
      api.setToken(res.access_token);
      
      // Redirect to specific surplus dashboard
      if (form.role === "generator") {
        router.push("/surplus/generator");
      } else {
        router.push("/surplus/receiver");
      }
      
    } catch (err: any) {
      setError(err.message || "Registration failed. Email might already exist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "linear-gradient(135deg, #F5F5F0 0%, #E8E8E0 50%, #F5F5F0 100%)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#1B7A4A] text-white flex items-center justify-center text-xl font-bold">W</div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-[#1B7A4A] to-[#24A65A] bg-clip-text text-transparent">WasteIQ</h1>
          </div>
          <p className="text-[#6B7280] text-sm font-medium">Join the City's Surplus Network</p>
        </div>

        <div className="card p-8 shadow-lg border-[#D6D3C8]">
          <form onSubmit={handleRegister} className="space-y-4">
            
            {/* Role Selection Toggle */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-3 text-center">I am registering as a...</label>
              <div className="flex bg-[#F0EDE6] p-1 rounded-xl shadow-inner border border-[#D6D3C8]/50">
                <button 
                  type="button"
                  onClick={() => setForm({...form, role: "generator"})}
                  className={`flex-1 py-2 px-2 text-xs font-bold tracking-wide rounded-lg transition-all ${form.role === "generator" ? "bg-white text-[#1B7A4A] shadow-sm transform scale-100" : "text-[#8A8887] hover:text-[#1F2937]"}`}
                >
                  🏨 Surplus Generator
                </button>
                <button 
                  type="button"
                  onClick={() => setForm({...form, role: "receiver"})}
                  className={`flex-1 py-2 px-2 text-xs font-bold tracking-wide rounded-lg transition-all ${form.role === "receiver" ? "bg-white text-[#1B7A4A] shadow-sm transform scale-100" : "text-[#8A8887] hover:text-[#1F2937]"}`}
                >
                  🤝 Surplus Receiver
                </button>
              </div>
              <p className="text-center text-[10px] text-[#6B7280] font-medium mt-3 px-2">
                {form.role === "generator" ? "Hotels, restaurants, supermarkets, or factories distributing excess material." : "NGOs, stray animal feeders, food banks, or community kitchens."}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#8A8887] mb-1">Full Name or Establishment Name</label>
              <input type="text" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} className="input w-full bg-[#F5F5F0] border-[#D6D3C8] focus:border-[#1B7A4A]" placeholder="e.g. Taj Gateway Hotel" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-[#8A8887] mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="input w-full bg-[#F5F5F0] border-[#D6D3C8] focus:border-[#1B7A4A] px-2" placeholder="Email" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#8A8887] mb-1">Phone <span className="text-[#9CA3AF] font-normal text-xs">(optional)</span></label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="input w-full bg-[#F5F5F0] border-[#D6D3C8] focus:border-[#1B7A4A] px-2" placeholder="Phone" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#8A8887] mb-1">Password</label>
              <input type="password" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="input w-full bg-[#F5F5F0] border-[#D6D3C8] focus:border-[#1B7A4A]" placeholder="Create a strong password" />
            </div>

            {error && <p className="text-[#B91C1C] text-xs font-bold text-center bg-[#FEF2F2] border border-[#B91C1C]/20 p-2 rounded-lg">{error}</p>}
            
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50 py-3 font-black tracking-widest uppercase mt-4 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
              {loading ? "Registering..." : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm border-t border-[#D6D3C8]/50 pt-5">
            <span className="text-[#6B7280] font-medium">Already have an account? </span>
            <a href="/auth/login" className="font-bold text-[#1B7A4A] hover:text-[#24A65A] transition-colors ml-1">Sign in here</a>
          </div>
        </div>
      </div>
    </div>
  );
}
