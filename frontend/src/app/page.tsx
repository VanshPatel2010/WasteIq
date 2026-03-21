"use client";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/auth/login"); return; }
    const routes: Record<string, string> = {
      admin: "/dashboard",
      driver: "/driver",
      waste_worker: "/waste-worker",
      kabadiwalla: "/kabadiwalla",
      generator: "/surplus/generator",
      receiver: "/surplus/receiver",
    };
    router.push(routes[user.role] || "/dashboard");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F0]">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#1B7A4A]/30 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-[#1B7A4A] animate-ping" />
        </div>
        <p className="text-[#6B7280]">Loading WasteIQ...</p>
      </div>
    </div>
  );
}
