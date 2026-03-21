"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, ReactNode } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/zones", label: "Zone Map", icon: "🗺️" },
  { href: "/dashboard/fleet", label: "Fleet Tracker", icon: "🚛" },
  { href: "/dashboard/surge", label: "Surge Alerts", icon: "⚠️" },
  { href: "/dashboard/model-health", label: "Model Health", icon: "🤖" },
  { href: "/dashboard/workers", label: "Worker Mgmt", icon: "👷" },
  { href: "/dashboard/organisations", label: "Organisations", icon: "🏢" },
  { href: "/dashboard/reports", label: "Reports", icon: "📈" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.push("/auth/login");
    if (!loading && user && user.role !== "admin") router.push("/");
  }, [user, loading, router]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#D6D3C8] flex flex-col fixed h-full shadow-sm">
        <div className="p-5 border-b border-[#D6D3C8]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1B7A4A] text-white flex items-center justify-center text-sm font-bold">W</div>
            <span className="text-lg font-bold bg-gradient-to-r from-[#1B7A4A] to-[#24A65A] bg-clip-text text-transparent">WasteIQ</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className={`sidebar-link ${pathname === item.href ? "sidebar-link-active" : ""}`}>
              <span className="text-lg">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-[#D6D3C8]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#1B7A4A]/10 text-[#1B7A4A] flex items-center justify-center text-sm uppercase font-bold">{user.name[0]}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate text-[#1F2937]">{user.name}</p>
              <p className="text-xs text-[#6B7280]">Municipal Admin</p>
            </div>
          </div>
          <button onClick={logout} className="w-full text-sm text-[#6B7280] hover:text-[#B91C1C] transition-colors py-2 rounded-lg hover:bg-[#B91C1C]/10 font-medium">Sign Out</button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 p-6 overflow-auto">{children}</main>
    </div>
  );
}
