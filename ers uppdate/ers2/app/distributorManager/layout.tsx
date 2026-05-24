"use client";

import React, { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Navbar from "@/components/layout/navbar";
import { Toaster } from "sonner";
import { Menu, Bell, CheckCheck, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/authcontext";
import axios from "axios";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const { token, isLoading } = useAuth();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLoading && !token) {
      router.replace("/login");
    }
  }, [token, isLoading, router]);

  useEffect(() => {
    if (!token) return;

    const api = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      headers: { Authorization: `Bearer ${token}` },
    });

    const fetchNotifications = async () => {
      try {
        await api.post("/api/v1/notifications/sync-low-stock").catch(() => {});
        const res = await api.get("/api/v1/notifications?limit=10");
        const countRes = await api.get("/api/v1/notifications/unread-count");
        setNotifications(res.data?.data || []);
        setUnreadCount(countRes.data?.count || 0);
      } catch (err) {
        console.error("Notifications fetch failed:", err);
      }
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!showNotifications) return;

    const handleOutsideClose = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        notificationButtonRef.current?.contains(target) ||
        notificationDropdownRef.current?.contains(target)
      ) {
        return;
      }
      setShowNotifications(false);
    };

    const handleEscapeClose = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowNotifications(false);
    };

    document.addEventListener("mousedown", handleOutsideClose);
    document.addEventListener("keydown", handleEscapeClose);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClose);
      document.removeEventListener("keydown", handleEscapeClose);
    };
  }, [showNotifications]);

  const handleMarkRead = async (id: number) => {
    try {
      const api = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL,
        headers: { Authorization: `Bearer ${token}` },
      });
      await api.patch(`/api/v1/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Mark read failed");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const api = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL,
        headers: { Authorization: `Bearer ${token}` },
      });
      await api.patch(`/api/v1/notifications/read-all`);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Mark all read failed");
    }
  };

  if (isLoading) {
    return (
      <div className="app-shell flex h-screen items-center justify-center p-6">
        <div className="app-panel-strong flex max-w-sm flex-col items-center rounded-[2.5rem] px-10 py-9 text-center">
          <div className="mb-5 h-14 w-14 rounded-full border-4 border-blue-500/15 border-t-blue-500 animate-spin" />
          <span className="text-[11px] font-black uppercase tracking-[0.35em] text-blue-500">
            Verifying Session
          </span>
          <p className="mt-3 text-sm text-slate-500">
            Secure workspace restore ho raha hai. Bas ek moment.
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

        <div className="clinical-topbar relative z-50 flex items-center gap-3 px-3 py-2.5 md:px-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="app-soft-badge flex h-14 w-14 items-center justify-center rounded-[1.5rem] text-slate-700 transition-all hover:border-blue-500/30 hover:bg-blue-50 hover:text-blue-700 lg:hidden"
          >
            <Menu size={22} />
          </button>

          <div className="flex min-w-0 flex-1">
            <Navbar />
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                ref={notificationButtonRef}
                onClick={() => setShowNotifications(!showNotifications)}
                className="app-soft-badge relative flex h-12 w-12 items-center justify-center rounded-[1.2rem] text-slate-500 transition-all hover:border-blue-500/25 hover:text-blue-500 active:scale-95"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  </span>
                )}
              </button>

              {showNotifications && (
                <div
                  ref={notificationDropdownRef}
                  className="absolute right-0 top-full z-[9999] mt-3 w-[min(24rem,calc(100vw-1rem))] overflow-hidden rounded-[1rem] border border-[#dbe7f1] bg-white p-2 shadow-[0_12px_28px_rgba(15,42,70,0.12)]"
                >
                  <div className="flex items-center justify-between rounded-[0.85rem] border border-[#dbe7f1] bg-[#f8fbfe] p-4">
                    <h3 className="text-sm font-black uppercase tracking-tight text-[#0f2742]">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-blue-600 transition-all hover:text-blue-700"
                      >
                        <CheckCheck size={12} /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="custom-scrollbar max-h-[min(22rem,calc(100vh-8rem))] overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs font-bold uppercase tracking-widest text-slate-600">
                        No notifications
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                            className={`cursor-pointer rounded-[0.85rem] border p-3 transition-all ${
                              notif.is_read
                                ? "border-[#dbe7f1] bg-white opacity-75 hover:bg-blue-50"
                                : "border-blue-200 bg-blue-50 hover:bg-blue-100"
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className="mt-1">
                                <AlertTriangle size={16} className={notif.is_read ? "text-slate-500" : "text-rose-500"} />
                              </div>
                              <div>
                                <p className={`text-xs ${notif.is_read ? "text-slate-600" : "font-bold text-[#0f2742]"}`}>
                                  {notif.message}
                                </p>
                                <p className="mt-1 text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                                  {new Date(notif.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        <main className="custom-scrollbar relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 pt-3 md:px-6 md:pb-5 md:pt-5 xl:px-8 xl:pb-6">
          <div className="clinical-content-card min-h-full rounded-[1.4rem] p-3 md:p-4">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

