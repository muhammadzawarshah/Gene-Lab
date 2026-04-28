"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/app/context/authcontext";
import img from "@/public/logo.png";
import {
  ChevronRight,
  ChevronDown,
  CircleDot,
  Activity,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAVIGATION_CONFIG } from "../../lib/NavigationData";

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openNested, setOpenNested] = useState<string | null>(null);

  const pathname = usePathname();
  const router = useRouter();
  const { role, user, isLoading } = useAuth();

  const menuItems = useMemo(() => {
    if (!role) return [];
    return (NAVIGATION_CONFIG as Record<string, unknown[]>)[role] || [];
  }, [role]);

  useEffect(() => {
    if (!menuItems.length) return;

    menuItems.forEach((section: any) => {
      const hasActiveChild = section.items?.some((item: any) => {
        if (item.type === "nested") {
          const hasActiveSub = item.subItems?.some((sub: any) => pathname === sub.href);
          if (hasActiveSub) setOpenNested(item.id || null);
          return hasActiveSub;
        }

        return pathname === item.href;
      });

      if (hasActiveChild || pathname === section.href) {
        setOpenSection(section.id);
      }
    });
  }, [pathname, menuItems]);

  const toggleSection = (id: string) => setOpenSection(openSection === id ? null : id);

  const toggleNested = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    setOpenNested(openNested === id ? null : id);
  };

  if (isLoading) {
    return <div className="app-sidebar-surface h-full w-20 rounded-[2rem] animate-pulse" />;
  }

  return (
    <motion.div
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        "app-sidebar-surface flex h-full flex-col overflow-hidden rounded-[2rem] text-slate-200 transition-all duration-500",
        isCollapsed ? "w-20" : "w-72"
      )}
    >
      <div className="border-b border-white/10 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 flex-shrink-0 rounded-2xl bg-white/5 p-2 ring-1 ring-white/10">
            <Image src={img} alt="logo" fill className="object-contain p-2" />
          </div>

          {!isCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0 flex-1">
              <span className="block truncate text-lg font-black italic tracking-tight text-white">
                Gene<span className="text-blue-500">LABS</span>
              </span>
              <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                {role || "System"}
              </span>
            </motion.div>
          )}
        </div>
      </div>

      <nav className="custom-scrollbar flex-1 space-y-2 overflow-y-auto px-3 py-4">
        {menuItems.map((section: any) => {
          const isDropdown = section.type === "dropdown";
          const isOpen = openSection === section.id;
          const Icon = section.icon || LayoutDashboard;
          const isActive =
            section.items?.some((item: any) => {
              if (item.type === "nested") {
                return item.subItems?.some((sub: any) => pathname === sub.href);
              }

              return pathname === item.href;
            }) || pathname === section.href;

          return (
            <div key={section.id} className="space-y-1">
              <button
                onClick={() => (isDropdown ? toggleSection(section.id) : router.push(section.href!))}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-[1.2rem] px-3 py-3 text-left transition-all duration-300",
                  isActive
                    ? "app-soft-badge text-blue-500 shadow-[0_14px_30px_rgba(37,99,235,0.12)]"
                    : "text-slate-500 hover:bg-blue-500/5 hover:text-white"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-xl border transition-all duration-300",
                    isActive
                      ? "border-blue-500/20 bg-blue-500/10 text-blue-500"
                      : "border-white/10 bg-white/[0.03] group-hover:border-blue-500/15 group-hover:text-blue-400"
                  )}
                >
                  <Icon size={18} />
                </div>

                {!isCollapsed && (
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span className="truncate text-xs font-bold uppercase tracking-[0.14em]">
                      {section.label || section.title}
                    </span>
                    {isDropdown && (
                      <ChevronDown
                        size={14}
                        className={cn("shrink-0 transition-transform", isOpen && "rotate-180")}
                      />
                    )}
                  </div>
                )}

                {isActive && <div className="absolute left-0 top-3 h-8 w-1 rounded-r-full bg-blue-500" />}
              </button>

              <AnimatePresence>
                {isDropdown && isOpen && !isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="ml-5 overflow-hidden border-l border-white/10 pl-3"
                  >
                    {section.items?.map((item: any, index: number) => (
                      <div key={item.id ?? item.label ?? index} className="mt-1">
                        {item.type === "nested" ? (
                          <div>
                            <button
                              onClick={(event) => toggleNested(event, item.id!)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all",
                                openNested === item.id
                                  ? "bg-blue-500/10 text-blue-400"
                                  : "text-slate-500 hover:bg-blue-500/5 hover:text-white"
                              )}
                            >
                              <span className="flex items-center gap-2">
                                <CircleDot size={8} />
                                {item.label}
                              </span>
                              <ChevronDown
                                size={12}
                                className={cn("transition-transform", openNested === item.id && "rotate-180")}
                              />
                            </button>

                            {openNested === item.id &&
                              item.subItems?.map((sub: any) => (
                                <button
                                  key={sub.href}
                                  onClick={() => router.push(sub.href)}
                                  className={cn(
                                    "mt-1 block w-full rounded-xl px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] transition-all",
                                    pathname === sub.href
                                      ? "app-soft-badge text-blue-500"
                                      : "text-slate-500 hover:bg-blue-500/5 hover:text-blue-400"
                                  )}
                                >
                                  {sub.label}
                                </button>
                              ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => router.push(item.href)}
                            className={cn(
                              "block w-full rounded-xl px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] transition-all",
                              pathname === item.href
                                ? "app-soft-badge text-blue-500"
                                : "text-slate-500 hover:bg-blue-500/5 hover:text-white"
                            )}
                          >
                            {item.label}
                          </button>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 p-4">
        {!isCollapsed && (
          <div className="app-soft-badge mb-4 flex items-center gap-3 rounded-[1.5rem] px-3 py-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <Activity className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-black uppercase tracking-[0.18em] text-white">
                {user?.name || "System User"}
              </span>
              <span className="mt-1 block truncate text-[9px] font-bold uppercase tracking-[0.22em] text-blue-500">
                {role || "No Role Found"}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="app-soft-badge flex w-full items-center justify-center rounded-[1.25rem] p-3 transition-all hover:border-blue-500/25 hover:bg-blue-500/5"
        >
          <ChevronRight className={cn("transition-transform duration-500", !isCollapsed && "rotate-180")} />
        </button>
      </div>
    </motion.div>
  );
}
