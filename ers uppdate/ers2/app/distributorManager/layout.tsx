"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/layout/sidebar";
import Navbar from "@/components/layout/navbar";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import { Menu, Activity, Bell, CheckCheck, AlertTriangle } from "lucide-react";
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
        <div className="pointer-events-none absolute left-0 top-0 h-72 w-72 rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-[120px]" />

        <div className="relative z-50 flex items-center gap-3 px-3 pt-3 md:px-6 md:pt-6">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="app-soft-badge flex h-14 w-14 items-center justify-center rounded-[1.5rem] text-slate-500 transition-all hover:border-blue-500/25 hover:text-white md:hidden"
          >
            <Menu size={22} />
          </button>

          <div className="min-w-0 flex-1">
            <Navbar />
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-[#0b1224] border border-white/10 text-slate-400 hover:text-white transition-all hover:bg-white/5 active:scale-95"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-14 z-[999] w-80 md:w-96 rounded-[1.5rem] bg-[#0f172a] border border-white/10 shadow-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#0b1224]">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Notifications</h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-bold text-blue-500 hover:text-blue-400 uppercase tracking-widest flex items-center gap-1 transition-all"
                      >
                        <CheckCheck size={12} /> Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-500 font-bold uppercase tracking-widest">
                        No notifications
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => !notif.is_read && handleMarkRead(notif.id)}
                            className={`p-3 rounded-xl transition-all cursor-pointer border border-transparent ${
                              notif.is_read
                                ? "opacity-60 hover:bg-white/[0.02]"
                                : "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20"
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className="mt-1">
                                <AlertTriangle size={16} className={notif.is_read ? "text-slate-500" : "text-rose-500"} />
                              </div>
                              <div>
                                <p className={`text-xs ${notif.is_read ? "text-slate-400" : "text-white font-bold"}`}>
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

            <div className="app-soft-badge hidden items-center gap-2 rounded-full px-4 py-3 md:flex">
              <Activity size={14} className="text-blue-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                System Ready
              </span>
            </div>
          </div>
        </div>

        <main className="custom-scrollbar relative z-10 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3 pt-3 md:px-6 md:pb-6 md:pt-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>

        <div className="relative z-10 px-3 pb-3 md:px-6 md:pb-6">
          <div className="app-footer-surface flex h-12 items-center justify-between rounded-[1.5rem] px-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                Direct Node Connection
              </span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600">
              VirtueOS Stable v4.2
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
