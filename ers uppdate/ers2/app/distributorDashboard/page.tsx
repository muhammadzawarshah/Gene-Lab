"use client";

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Zap, Package, FileText, CreditCard, 
  TrendingUp, ArrowUpRight, Clock, AlertTriangle,
  Box, Truck, ChevronRight, BarChart3, Loader2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  DataRibbon,
  MetricCard,
  PharmaKitVisual,
  PremiumAreaChart,
  PremiumHero,
  PremiumPage,
} from "@/components/ui/premium";

// --- Types for Data Integrity ---
interface DashboardData {
  stats: {
    activeOrders: string;
    pendingInvoices: string;
    creditUsedPercentage: number;
    monthlyGrowth: string;
  };
  procurementTrend: number[];
  recentShipments: Array<{
    id: string;
    status: string;
    eta: string;
  }>;
  alerts: Array<{
    id: string;
    message: string;
    subtext: string;
  }>;
  creditDetails: {
    used: string;
    total: string;
  };
}

export default function DistributorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Secure Config ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const authToken = Cookies.get('auth_token');

  // --- Get User ID from virtue_user Cookie ---
  const currentUserId = useMemo(() => {
    const rawUser = Cookies.get('virtue_user');
    if (!rawUser) return null;
    try {
      const parsed = JSON.parse(decodeURIComponent(rawUser));
      return String(parsed.id);
    } catch (err) { return null; }
  }, []);

  const nexusReq = useMemo(() => axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'x-api-key': API_KEY,
      'x-user-id': currentUserId
    }
  }), [authToken, currentUserId, API_URL, API_KEY]);

  // --- Fetch Dashboard Aggregated Data ---
  const fetchDashboardStats = useCallback(async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Calling the new route we added: /dashboard-stats/:id
      const response = await nexusReq.get(`/api/v1/distribution/dashboard-stats/${currentUserId}`);
      console.log(response)
      setData(response.data);
    } catch (error: any) {
      console.error("Fetch Error:", error);
      toast.error("NODE_OFFLINE", { description: "Failed to sync with secure data nodes." });
      
      // Setting Empty State to prevent UI crash
      setData({
        stats: { activeOrders: "0", pendingInvoices: "0", creditUsedPercentage: 0, monthlyGrowth: "0%" },
        procurementTrend: [0, 0, 0, 0, 0, 0, 0],
        recentShipments: [],
        alerts: [{ id: "err", message: "CONNECTION_LOST", subtext: "Verify backend node status" }],
        creditDetails: { used: "0", total: "1.0M" }
      });
    } finally {
      setLoading(false);
    }
  }, [currentUserId, nexusReq]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  if (loading) return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="app-panel-strong flex flex-col items-center rounded-[2rem] px-10 py-8">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.35em] text-blue-500">Syncing Dashboard</p>
      </div>
    </div>
  );

  if (!data) return null;

  const statsDisplay = [
    { label: "Active Orders", value: data.stats.activeOrders, icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Pending Invoices", value: data.stats.pendingInvoices, icon: FileText, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Credit Used", value: `${data.stats.creditUsedPercentage}%`, icon: CreditCard, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Monthly Growth", value: data.stats.monthlyGrowth, icon: TrendingUp, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  ];

  return (
    <PremiumPage>
      <Toaster position="top-right" theme="light" richColors />
      
      {/* --- HEADER --- */}
      <PremiumHero
        eyebrow="Distributor Workspace"
        title={<>Gene <span className="text-blue-600">Command</span></>}
        description="A distributor operations cockpit for orders, credit exposure, shipments, alerts, and procurement movement."
        meta={<span className="app-soft-badge rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Node ID: {currentUserId?.slice(0, 8) || "Pending"}</span>}
        actions={<div className="app-soft-badge flex items-center gap-3 rounded-full px-5 py-3"><div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /><span className="text-[10px] font-black uppercase tracking-widest text-white">Live Link: Stable</span></div>}
      >
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <DataRibbon
            items={[
              { label: "Active Orders", value: data.stats.activeOrders },
              { label: "Pending Invoices", value: data.stats.pendingInvoices },
              { label: "Credit Used", value: `${data.stats.creditUsedPercentage}%` },
              { label: "Monthly Growth", value: data.stats.monthlyGrowth },
            ]}
          />
          <PharmaKitVisual className="hidden scale-90 lg:block" />
        </div>
      </PremiumHero>
      {false && <section className="app-panel-strong mb-8 overflow-hidden rounded-[2rem] p-6 md:p-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <span className="app-soft-badge mb-4 inline-flex rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-500">Distributor Workspace</span>
          <h1 className="text-4xl font-black tracking-tight text-white md:text-5xl">Gene <span className="text-blue-600">Command</span></h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1">
             Operational Overview • Node ID: {currentUserId?.slice(0, 8)}
          </p>
        </motion.div>
        <div className="app-soft-badge flex items-center gap-3 rounded-full px-5 py-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Link: Stable</span>
        </div>
      </div>
      </section>}

      {/* --- STATS GRID --- */}
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
        {statsDisplay.map((stat, i) => (
          <MetricCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            tone={i === 1 ? "amber" : i === 2 ? "emerald" : i === 3 ? "violet" : "blue"}
            note={i === 2 ? "Credit exposure in current cycle." : "Live operational metric."}
          />
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* --- PROCUREMENT CHART --- */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="app-panel-strong rounded-[2rem] p-6 md:p-8"
          >
            <div className="mb-10 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-black tracking-tight text-white">Procurement Trend</h3>
                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Real-time Volume Analysis (Last 7 Days)</p>
              </div>
              <BarChart3 className="text-blue-500/50 w-8 h-8" />
            </div>
            <div className="rounded-[1.5rem] bg-white/55 p-4">
              <PremiumAreaChart
                data={data.procurementTrend.map((value, index) => ({
                  label: `D${index + 1}`,
                  value: Number(value || 0),
                }))}
                color="#2563eb"
                label="Procurement"
              />
            </div>
          </motion.div>

          {/* --- SHIPMENTS --- */}
          <div className="app-panel rounded-[2rem] p-6 md:p-8">
            <h3 className="mb-6 text-xl font-black tracking-tight text-white">Active Shipments</h3>
            <div className="space-y-4">
              {data.recentShipments.length > 0 ? data.recentShipments.map((shipment) => (
                <div key={shipment.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.55] p-4 transition-all hover:border-blue-500/30 hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 rounded-xl"><Truck size={18} className="text-slate-500" /></div>
                    <div>
                      <p className="text-xs font-black text-white">{shipment.id}</p>
                      <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">{shipment.status} • ETA: {shipment.eta}</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-800" />
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/10 py-8 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                   No shipments in transit
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- SIDEBAR --- */}
        <div className="space-y-8">
          {/* CREDIT CARD */}
          <div className="app-panel relative overflow-hidden rounded-[2rem] p-6 md:p-8">
            <Zap className="absolute right-[-10px] top-[-10px] w-32 h-32 text-emerald-500/5 -rotate-12" />
            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-6">Credit Liquidity</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Spent: PKR {data.creditDetails.used}</span>
                  <span className="text-[9px] font-black text-white">Limit: {data.creditDetails.total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${data.stats.creditUsedPercentage}%` }}
                    className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                  />
                </div>
              </div>
              <button className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[9px] font-black text-emerald-500 uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">
                Quick Settle
              </button>
            </div>
          </div>

          {/* ALERTS */}
          <div className="app-panel rounded-[2rem] border-rose-500/10 p-6 md:p-8">
            <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-6">Security Alerts</h3>
            <div className="space-y-4">
              {data.alerts.map((alert) => (
                <div key={alert.id} className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/10">
                  <p className="text-[10px] font-black text-white uppercase">{alert.message}</p>
                  <p className="text-[8px] font-bold text-rose-400/70 mt-1 uppercase">{alert.subtext}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PremiumPage>
  );
}
