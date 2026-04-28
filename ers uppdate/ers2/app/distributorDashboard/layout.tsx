"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Navbar from "@/components/layout/navbar";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/authcontext";
import { Toaster } from "sonner";
import { Menu, ShieldCheck, Loader2 } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, token, isLoading } = useAuth();
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
    <div className="app-shell app-grid relative flex h-screen overflow-hidden">
      <Toaster theme="dark" position="top-right" richColors />

      <div
        className={`fixed inset-y-0 left-0 z-[60] h-screen p-3 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:p-4 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <Sidebar />
      </div>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 z-[55] bg-slate-950/55 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full bg-sky-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-500/10 blur-[120px]" />

        <div className="flex items-center gap-3 px-3 pt-3 md:px-6 md:pt-6">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="app-soft-badge flex h-14 w-14 items-center justify-center rounded-[1.5rem] text-slate-500 transition-all hover:border-blue-500/25 hover:text-white md:hidden"
          >
            <Menu size={22} />
          </button>

          <div className="min-w-0 flex-1">
            <Navbar />
          </div>

          <div className="app-soft-badge hidden items-center gap-2 rounded-full px-4 py-3 md:flex">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
              Link Stable: {user?.role}
            </span>
          </div>
        </div>

        <main className="custom-scrollbar relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 pt-3 md:px-6 md:pb-6 md:pt-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="h-full">
            {children}
          </motion.div>
        </main>

        <div className="relative z-10 px-3 pb-3 md:px-6 md:pb-6">
          <div className="app-footer-surface flex h-12 items-center justify-between rounded-[1.5rem] px-4">
            <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Neural Net Active
            </span>
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600">
              GeniLabs v2.0
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
