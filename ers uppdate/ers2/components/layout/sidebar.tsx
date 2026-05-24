"use client";

import React, { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/app/context/authcontext";
import geneLogo from "@/public/gene-logo.png";
import {
  ChevronRight,
  ChevronDown,
  CircleDot,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAVIGATION_CONFIG, type DropdownItem, type MenuItem } from "../../lib/NavigationData";

type SidebarProps = {
  onNavigate?: () => void;
};

export default function Sidebar({ onNavigate }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openNested, setOpenNested] = useState<string | null>(null);

  const pathname = usePathname();
  const router = useRouter();
  const { role, isLoading } = useAuth();

  const menuItems = useMemo(() => {
    if (!role) return [];
    return NAVIGATION_CONFIG[role] || [];
  }, [role]);

  useEffect(() => {
    if (!menuItems.length) return;

    menuItems.forEach((section) => {
      const hasActiveChild = section.items?.some((item) => {
        if (item.type === "nested") {
          const hasActiveSub = item.subItems?.some((sub) => pathname === sub.href);
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

  useEffect(() => {
    if (!menuItems.length) return;

    const prefetchRoutes = () => {
      menuItems.forEach((section) => {
        if (section.href) router.prefetch(section.href);
        section.items?.forEach((item) => {
          if (item.href) router.prefetch(item.href);
          item.subItems?.forEach((sub) => router.prefetch(sub.href));
        });
      });
    };

    const idleWindow = window as Window &
      typeof globalThis & {
        requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
        cancelIdleCallback?: (handle: number) => void;
      };

    if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
      const idleId = idleWindow.requestIdleCallback(prefetchRoutes, { timeout: 2500 });
      return () => idleWindow.cancelIdleCallback?.(idleId);
    }

    const timeoutId = globalThis.setTimeout(prefetchRoutes, 1200);
    return () => globalThis.clearTimeout(timeoutId);
  }, [menuItems, router]);

  const toggleSection = (id: string) => setOpenSection(openSection === id ? null : id);

  const toggleNested = (event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    setOpenNested(openNested === id ? null : id);
  };

  const navigateTo = (href?: string) => {
    if (!href) return;
    router.push(href);
    onNavigate?.();
  };

  if (isLoading) {
    return <div className="clinical-sidebar h-full w-20 animate-pulse" />;
  }

  return (
    <div
      className={cn(
        "clinical-sidebar flex h-full max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden text-slate-700 transition-all duration-500",
        isCollapsed ? "w-[5.25rem]" : "w-[17rem]"
      )}
    >
      <div className="relative border-b border-white/10 px-3 py-4">
        <div className="absolute inset-x-4 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 flex-shrink-0 rounded-2xl bg-white/70 p-1.5 shadow-inner">
            <Image src={geneLogo} alt="Gene Laboratories logo" fill className="object-contain" />
          </div>

          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <span className="block truncate text-base font-black tracking-tight text-slate-950">
                Gene<span className="text-blue-500"> Labs</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <nav className="custom-scrollbar flex-1 space-y-1 overflow-y-auto px-2.5 py-4">
        {menuItems.map((section: MenuItem) => {
          const isDropdown = section.type === "dropdown";
          const isOpen = openSection === section.id;
          const Icon = section.icon || LayoutDashboard;
          const isActive =
            section.items?.some((item) => {
              if (item.type === "nested") {
                return item.subItems?.some((sub) => pathname === sub.href);
              }

              return pathname === item.href;
            }) || pathname === section.href;

          return (
            <div key={section.id} className="space-y-1">
              <button
                onClick={() => (isDropdown ? toggleSection(section.id) : navigateTo(section.href))}
                  className={cn(
                  "group relative flex w-full items-center gap-3 rounded-[0.85rem] px-2.5 py-2.5 text-left transition-all duration-300",
                  isActive
                    ? "bg-gradient-to-r from-[#2563eb] to-[#7c3aed] text-white shadow-[0_8px_18px_rgba(79,70,229,0.14)]"
                    : "text-slate-700 hover:bg-blue-500/10 hover:text-blue-700"
                )}
              >
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border transition-all duration-300",
                    isActive
                      ? "border-white/15 bg-white/10 text-cyan-300"
                      : "border-blue-500/10 bg-white/65 text-slate-600 group-hover:border-blue-500/25 group-hover:text-blue-600"
                  )}
                >
                  <Icon size={18} />
                </div>

                {!isCollapsed && (
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span className="truncate text-[11px] font-black uppercase tracking-[0.13em]">
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

              {isDropdown && isOpen && !isCollapsed && (
                  <div className="ml-5 overflow-hidden border-l border-white/10 pl-3">
                    {section.items?.map((item: DropdownItem, index: number) => (
                      <div key={item.id ?? item.label ?? index} className="mt-1">
                        {item.type === "nested" ? (
                          <div>
                            <button
                              onClick={(event) => item.id && toggleNested(event, item.id)}
                              className={cn(
                                "flex w-full items-center justify-between rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition-all",
                                openNested === item.id
                                  ? "bg-blue-500/10 text-blue-500"
                                  : "text-slate-700 hover:bg-blue-500/10 hover:text-blue-700"
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
                              item.subItems?.map((sub) => (
                                <button
                                  key={sub.href}
                                  onClick={() => navigateTo(sub.href)}
                                  className={cn(
                                    "mt-1 block w-full rounded-xl px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] transition-all",
                                    pathname === sub.href
                                      ? "bg-blue-500/10 text-blue-500"
                                      : "text-slate-700 hover:bg-blue-500/10 hover:text-blue-700"
                                  )}
                                >
                                  {sub.label}
                                </button>
                              ))}
                          </div>
                        ) : (
                          <button
                            onClick={() => navigateTo(item.href)}
                            className={cn(
                              "block w-full rounded-xl px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.14em] transition-all",
                              pathname === item.href
                                ? "bg-blue-500/10 text-blue-500"
                                : "text-slate-700 hover:bg-blue-500/10 hover:text-blue-700"
                            )}
                          >
                            {item.label}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 p-3">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex w-full items-center justify-center rounded-[0.95rem] border border-white/10 bg-white/55 p-3 text-slate-500 transition-all hover:border-blue-500/25 hover:bg-blue-500/5"
        >
          <ChevronRight className={cn("transition-transform duration-500", !isCollapsed && "rotate-180")} />
        </button>
      </div>
    </div>
  );
}
