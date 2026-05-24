"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Navbar from "@/components/layout/navbar";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/authcontext";
import { Toaster } from "sonner";
import { Menu, Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace("/login");
    }
  }, [token, isLoading, router]);

  if (isLoading) {
    return (
      <div className="app-shell flex h-screen items-center justify-center p-6">
        <div className="app-panel-strong flex max-w-sm flex-col items-center rounded-[2.5rem] px-10 py-9 text-center">
          <Loader2 className="mb-5 h-12 w-12 animate-spin text-blue-500" />
          <span className="text-[11px] font-black uppercase tracking-[0.35em] text-blue-500">
            Establishing Node
          </span>
          <p className="mt-3 text-sm text-slate-500">
            Distributor workspace connect ho raha hai. Bas ek moment.
          </p>
        </div>
      </div>
    );
  }

  if (!token) return null;

  return (
    <div className="clinical-command-frame relative flex h-screen overflow-hidden">
      <Toaster theme="light" position="top-right" richColors />

      <div
        className={`fixed inset-y-0 left-0 z-[60] h-screen p-0 transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:p-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <Sidebar onNavigate={() => setIsSidebarOpen(false)} />
      </div>

      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-[55] bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute -right-24 top-20 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-violet-400/8 blur-3xl" />

        <div className="clinical-topbar relative z-[80] flex items-center gap-3 px-3 py-2.5 md:px-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="app-soft-badge flex h-14 w-14 items-center justify-center rounded-[1.5rem] text-slate-700 transition-all hover:border-blue-500/30 hover:bg-blue-50 hover:text-blue-700 lg:hidden"
          >
            <Menu size={22} />
          </button>

          <div className="flex min-w-0 flex-1">
            <Navbar />
          </div>

        </div>

        <main className="custom-scrollbar relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 pt-3 md:px-6 md:pb-5 md:pt-5 xl:px-8 xl:pb-6">
          <div className="h-full">
            <div className="clinical-content-card min-h-full rounded-[1.4rem] p-3 md:p-4">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

