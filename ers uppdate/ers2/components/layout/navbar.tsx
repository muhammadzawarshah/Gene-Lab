"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import Cookies from "js-cookie";
import { useAuth } from "@/app/context/authcontext";

type ActiveUser = {
  name?: string;
  useremail?: string;
  role?: string;
};

export default function Navbar() {
  const { logout } = useAuth();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<ActiveUser | null>(null);
  const [isSyncing, setIsSyncing] = useState(true);
  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleOutsideClose = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        profileButtonRef.current?.contains(target) ||
        profileDropdownRef.current?.contains(target)
      ) {
        return;
      }
      setIsDropdownOpen(false);
    };

    const handleEscapeClose = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDropdownOpen(false);
    };

    document.addEventListener("mousedown", handleOutsideClose);
    document.addEventListener("keydown", handleEscapeClose);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClose);
      document.removeEventListener("keydown", handleEscapeClose);
    };
  }, [isDropdownOpen]);

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
    <nav className="relative z-[90] flex min-h-[4.5rem] flex-1 items-center justify-between gap-3 px-3 py-2.5 md:px-4">
      <div className="flex min-w-0 items-center gap-4">
        <div className="min-w-0">
          <h1 className="max-w-[58vw] truncate text-base font-black leading-tight tracking-tight text-white sm:max-w-none sm:text-lg md:text-xl xl:text-2xl">
            Command Platform
            <span className="mx-2 text-slate-600 sm:mx-2.5">/</span>
            <span className="text-blue-500">{currentPathLabel}</span>
          </h1>
        </div>
      </div>

      <div className="relative flex items-center gap-3">
        <button
          ref={profileButtonRef}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="group flex items-center gap-2 rounded-[0.95rem] border border-white/10 bg-white/55 p-1.5 transition-all hover:border-blue-500/25 hover:bg-blue-500/5 xl:gap-3 xl:pr-3"
        >
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-[0.9rem] bg-gradient-to-br from-[#125a9d] via-[#0099dc] to-[#bad048] text-white shadow-lg shadow-blue-500/20">
              {isSyncing ? <Loader2 size={16} className="animate-spin text-white/40" /> : renderAvatar()}
            </div>
            <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#020617] bg-[#bad048] shadow-lg" />
          </div>

          <div className="hidden min-w-[118px] text-left xl:block">
            <p className="truncate text-[11px] font-black uppercase tracking-[0.16em] text-white">
              {activeUser?.name || activeUser?.useremail?.split("@")[0] || "Unknown User"}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">
              <ShieldCheck size={10} className="text-blue-500" />
              {activeUser?.role?.replace(/_/g, " ") || "Verifying"}
            </p>
          </div>

          <ChevronDown
            className={`hidden h-4 w-4 text-slate-600 transition-transform xl:block ${isDropdownOpen ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-[900]" onClick={() => setIsDropdownOpen(false)} />
              <motion.div
                ref={profileDropdownRef}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 14 }}
                className="absolute right-0 top-full z-[9999] mt-3 w-72 border border-blue-100 bg-white p-2 shadow-xl shadow-slate-900/10"
              >
                <div className="mb-2 rounded-[1rem] border border-slate-100 bg-slate-50 p-4">
                  <p className="truncate text-sm font-bold text-slate-950">
                    {activeUser?.useremail || "No email found"}
                  </p>
                </div>

                <button
                  onMouseEnter={() => setIsLogoutHovered(true)}
                  onMouseLeave={() => setIsLogoutHovered(false)}
                  onFocus={() => setIsLogoutHovered(true)}
                  onBlur={() => setIsLogoutHovered(false)}
                  onClick={() => {
                    logout();
                    setIsDropdownOpen(false);
                  }}
                  className="navbar-logout-button mt-2 flex w-full items-center gap-3 rounded-[1rem] border px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                  style={{
                    backgroundColor: isLogoutHovered ? "#e11d48" : "#ffffff",
                    borderColor: isLogoutHovered ? "#e11d48" : "#e2e8f0",
                    color: isLogoutHovered ? "#ffffff" : "#020617",
                  }}
                >
                  <LogOut
                    size={14}
                    style={{
                      color: isLogoutHovered ? "#ffffff" : "#020617",
                      stroke: isLogoutHovered ? "#ffffff" : "#020617",
                    }}
                  />
                  <span
                    style={{
                      color: isLogoutHovered ? "#ffffff" : "#020617",
                      WebkitTextFillColor: isLogoutHovered ? "#ffffff" : "#020617",
                    }}
                  >
                    Logout
                  </span>
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
