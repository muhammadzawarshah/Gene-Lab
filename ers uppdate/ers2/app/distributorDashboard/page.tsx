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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#020617] gap-4">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-500 animate-pulse">Syncing Nexus Node...</p>
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
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans bg-[#020617]">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* --- HEADER --- */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">Nexus <span className="text-blue-600">Command</span></h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1">
             Operational Overview • Node ID: {currentUserId?.slice(0, 8)}
          </p>
        </motion.div>
        <div className="px-5 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white">Live Link: Stable</span>
        </div>
      </div>

      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {statsDisplay.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white/[0.02] border border-white/5 p-6 rounded-[2rem] hover:border-white/10 transition-all group"
          >
            <div className={cn("p-3 rounded-2xl w-fit mb-4 transition-transform group-hover:scale-110", stat.bg)}>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
            <h2 className="text-2xl font-black text-white mt-1 italic">{stat.value}</h2>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* --- PROCUREMENT CHART --- */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-gradient-to-br from-blue-600/20 to-transparent border border-blue-500/20 rounded-[2.5rem] p-8"
          >
            <div className="flex justify-between items-start mb-10">
              <div>
                <h3 className="text-lg font-black text-white italic uppercase tracking-tight">Procurement Trend</h3>
                <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Real-time Volume Analysis (Last 7 Days)</p>
              </div>
              <BarChart3 className="text-blue-500/50 w-8 h-8" />
            </div>
            <div className="flex items-end justify-between h-48 gap-2">
              {data.procurementTrend.map((h, i) => (
                <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${Math.max(h, 5)}%` }}
                  transition={{ delay: i * 0.05, duration: 1 }}
                  className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg opacity-80 hover:opacity-100 transition-opacity"
                />
              ))}
            </div>
          </motion.div>

          {/* --- SHIPMENTS --- */}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
            <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic mb-8">Active Shipments</h3>
            <div className="space-y-4">
              {data.recentShipments.length > 0 ? data.recentShipments.map((shipment) => (
                <div key={shipment.id} className="flex items-center justify-between p-4 bg-[#050b1d] border border-white/5 rounded-2xl hover:border-blue-500/30 transition-all">
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
                <div className="py-8 text-center text-[10px] font-black uppercase text-slate-600 tracking-widest italic border border-dashed border-white/5 rounded-2xl">
                   No shipments in transit
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- SIDEBAR --- */}
        <div className="space-y-8">
          {/* CREDIT CARD */}
          <div className="bg-[#050b1d] border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden">
            <Zap className="absolute right-[-10px] top-[-10px] w-32 h-32 text-emerald-500/5 -rotate-12" />
            <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-6">Credit Liquidity</h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Spent: PKR {data.creditDetails.used}</span>
                  <span className="text-[9px] font-black text-white">Limit: {data.creditDetails.total}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
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
          <div className="bg-rose-500/5 border border-rose-500/10 rounded-[2.5rem] p-8">
            <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-[0.3em] mb-6">Security Alerts</h3>
            <div className="space-y-4">
              {data.alerts.map((alert) => (
                <div key={alert.id} className="p-4 bg-rose-500/10 rounded-2xl border border-rose-500/10">
                  <p className="text-[10px] font-black text-white uppercase italic">{alert.message}</p>
                  <p className="text-[8px] font-bold text-rose-400/70 mt-1 uppercase">{alert.subtext}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}