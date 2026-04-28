"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Loader2,
  Sparkles,
} from "lucide-react";
import Cookies from "js-cookie";
import { useAuth } from "@/app/context/authcontext";
import ThemeToggle from "./theme-toggle";

export default function Navbar() {
  const { logout } = useAuth();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    const syncUser = () => {
      const savedUser = Cookies.get("virtue_user");
      if (savedUser) {
        try {
          setActiveUser(JSON.parse(savedUser));
        } catch (error) {
          console.error("Auth Sync Error", error);
        }
      }
      setIsSyncing(false);
    };

    syncUser();
    window.addEventListener("focus", syncUser);
    return () => window.removeEventListener("focus", syncUser);
  }, []);

  const currentPathLabel = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return "DASHBOARD";
    return segments[segments.length - 1].replace(/-/g, " ").toUpperCase();
  }, [pathname]);

  const renderAvatar = () => {
    const displayName = activeUser?.name || activeUser?.useremail || "";

    if (displayName) {
      return <span className="text-xs font-black text-white">{displayName[0].toUpperCase()}</span>;
    }

    return <UserIcon size={18} className="text-white/50" />;
  };

  return (
    <nav className="app-topbar-surface flex h-20 items-center justify-between gap-4 rounded-[1.75rem] px-4 md:px-6">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="app-soft-badge inline-flex items-center gap-2 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.28em] text-blue-500">
            <Sparkles size={10} />
            Refined Workspace
          </span>
        </div>

        <h1 className="truncate text-sm font-black uppercase tracking-[0.14em] text-white md:text-lg">
          Gene Labs
          <span className="mx-2 text-slate-600">/</span>
          <span className="text-blue-500">{currentPathLabel}</span>
        </h1>

        <p className="mt-1 hidden text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500 sm:block">
          Clean layout, better spacing, lighter visual rhythm
        </p>
      </div>

      <div className="relative flex items-center gap-3">
        <ThemeToggle />

        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="app-soft-badge group flex items-center gap-3 rounded-[1.25rem] p-1.5 pr-3 transition-all hover:border-blue-500/25 hover:bg-blue-500/5"
        >
          <div className="relative">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 shadow-lg shadow-blue-500/20">
              {isSyncing ? <Loader2 size={16} className="animate-spin text-white/40" /> : renderAvatar()}
            </div>
            <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#020617] bg-emerald-500 shadow-lg" />
          </div>

          <div className="hidden min-w-[118px] text-left md:block">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.16em] text-white">
              {activeUser?.name || activeUser?.useremail?.split("@")[0] || "Unknown User"}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
              <ShieldCheck size={10} className="text-blue-500" />
              {activeUser?.role?.replace(/_/g, " ") || "Verifying"}
            </p>
          </div>

          <ChevronDown
            className={`h-4 w-4 text-slate-600 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-2" onClick={() => setIsDropdownOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                className="app-panel absolute right-0 top-full z-[999] mt-4 w-72 rounded-[2rem] p-2"
              >
                <div className="app-soft-badge mb-2 rounded-[1.5rem] p-4">
                  <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.26em] text-blue-500">
                    Session Info
                  </p>
                  <p className="truncate text-sm font-bold text-white">
                    {activeUser?.useremail || "No email found"}
                  </p>
                </div>

                <button
                  onClick={() => {
                    logout();
                    setIsDropdownOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-[1.2rem] px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-rose-500 transition-all hover:bg-rose-500 hover:text-white"
                >
                  <LogOut size={14} />
                  Terminate Session
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
