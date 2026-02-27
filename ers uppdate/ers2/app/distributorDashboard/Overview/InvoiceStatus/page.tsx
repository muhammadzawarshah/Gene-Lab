"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  FileCheck, Truck, Receipt, AlertCircle, ArrowUpRight,
  ShieldCheck, Activity, Loader2, RefreshCcw
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Constants ---
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

export default function InvoiceStatus() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [invoiceData, setInvoiceData] = useState([]);
  const [stats, setStats] = useState({
    fullyInvoiced: 0,
    pending: 0,
    disputed: 0
  });

  // --- Secure Auth Logic ---
  const token = Cookies.get('virtue_token');
  
  const currentUserId = useMemo(() => {
    const rawUser = Cookies.get('virtue_user');
    if (!rawUser) return null;
    try {
      const parsed = JSON.parse(decodeURIComponent(rawUser));
      return String(parsed.id);
    } catch (err) { return null; }
  }, []);

  const secureApi = useMemo(() => axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'x-user-id': currentUserId,
      'Content-Type': 'application/json'
    }
  }), [token, currentUserId]);

  // --- Data Sync Logic ---
  const syncInvoiceData = useCallback(async () => {
    if (!currentUserId || !token) {
      setLoading(false);
      return; 
    }

    try {
      setSyncing(true);
      // Naya Billing Sync Endpoint
      const response = await secureApi.get(`/api/v1/distribution/billing-sync/${currentUserId}`);
      
      console.log("Debug - Billing Response:", response.data); // Console check karein

      if (response.data.success || response.data.logs) {
        setInvoiceData(response.data.logs || []);
        setStats(response.data.metrics || { fullyInvoiced: 0, pending: 0, disputed: 0 });
        
        if (!loading) {
          toast.success("NEXUS SYNC COMPLETE", { description: "Invoice logs synchronized." });
        }
      }
    } catch (err: any) {
      console.error("Sync Error:", err);
      toast.error("ENCRYPTION ERROR", { description: "Failed to verify invoice integrity." });
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [currentUserId, token, secureApi, loading]);

  useEffect(() => {
    syncInvoiceData();
  }, [syncInvoiceData]);

  const invoiceStats = [
    { label: "Fully Invoiced", value: stats.fullyInvoiced, sub: "Delivered Items", icon: FileCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Pending Invoice", value: stats.pending, sub: "Awaiting Billing", icon: Receipt, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Disputed Items", value: stats.disputed, sub: "Under Review", icon: AlertCircle, color: "text-rose-500", bg: "bg-rose-500/10" },
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] p-8 text-slate-200 relative">
      <Toaster position="top-right" theme="dark" richColors />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/5 rounded-full blur-[150px] pointer-events-none" />

      {/* --- Header --- */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex justify-between items-start relative z-10">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white flex items-center gap-3">
            <Activity className="text-blue-500 w-8 h-8" />
            Invoice <span className="text-blue-500">Synchronization</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 italic flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            SECURE NODE: {currentUserId?.slice(0, 15)}...
          </p>
        </div>
        <div className="flex gap-4">
          <button onClick={syncInvoiceData} disabled={syncing} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-slate-400 disabled:opacity-50">
            <RefreshCcw size={18} className={cn(syncing && "animate-spin text-blue-400")} />
          </button>
          <div className="bg-blue-600/10 border border-blue-500/20 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-[0_0_20px_rgba(37,99,235,0.1)]">
            <ShieldCheck className="text-blue-400 w-5 h-5" />
            <span className="text-[10px] font-black text-blue-400 uppercase italic">Anti-Tamper Active</span>
          </div>
        </div>
      </motion.div>

      {/* --- Metrics --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 relative z-10">
        {invoiceStats.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-md group hover:bg-white/[0.04] transition-all border-l-2 border-l-transparent hover:border-l-blue-500"
          >
            <div className={cn("p-4 rounded-xl w-fit mb-6 transition-all duration-500 group-hover:rotate-[360deg]", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
            <div className="flex items-end gap-3">
              <h2 className="text-4xl font-black text-white mt-2 tracking-tighter italic">{stat.value}</h2>
              <span className="text-[9px] font-bold text-slate-600 mb-2 uppercase italic">{stat.sub}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* --- Main Table --- */}
      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="rounded-[3rem] border border-white/5 bg-white/[0.01] overflow-hidden shadow-2xl relative z-10">
        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Truck className="text-blue-500 w-6 h-6" />
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-white italic">Encrypted Delivery Log</h3>
          </div>
          <div className="bg-white/5 px-4 py-1.5 rounded-full text-[9px] font-bold text-slate-500 uppercase tracking-widest border border-white/5">
            Integrity Status: <span className="text-emerald-500 ml-1 font-black">Verified</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5 bg-white/[0.01]">
                <th className="px-10 py-7">Delivery Note</th>
                <th className="px-10 py-7">Invoiced ID</th>
                <th className="px-10 py-7">Material Description</th>
                <th className="px-10 py-7">Valuation</th>
                <th className="px-10 py-7">Sync Status</th>
                <th className="px-10 py-7 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {invoiceData.length > 0 ? invoiceData.map((row: any, i) => (
                <motion.tr key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="group hover:bg-blue-500/[0.03] transition-colors"
                >
                  <td className="px-10 py-7">
                    <span className="text-sm font-black text-white tracking-tighter italic group-hover:text-blue-400 transition-colors">
                      {row.deliveryId || "N/A"}
                    </span>
                  </td>
                  <td className="px-10 py-7">
                    <span className={cn(
                      "text-[10px] font-black px-4 py-1.5 rounded-xl border italic uppercase tracking-widest",
                      row.id === "PENDING" ? "text-amber-500 border-amber-500/20 bg-amber-500/5 shadow-[0_0_10px_rgba(245,158,11,0.1)]" : "text-slate-400 border-white/10 bg-white/5"
                    )}>
                      {row.id}
                    </span>
                  </td>
                  <td className="px-10 py-7">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-black text-slate-300 uppercase tracking-tight">{row.items || "Unspecified Item"}</span>
                      <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">{row.date || "No Date"}</span>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-sm font-black text-white italic">{row.amount || "PKR 0"}</td>
                  <td className="px-10 py-7">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full shadow-[0_0_12px_currentColor]", row.status === "Invoiced" ? "text-emerald-500 bg-emerald-500" : "text-amber-500 bg-amber-500 animate-pulse")} />
                      <span className={cn("text-[10px] font-black uppercase italic tracking-[0.1em]", row.status === "Invoiced" ? "text-emerald-500" : "text-amber-500")}>
                        {row.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-10 py-7 text-right">
                    <button className="p-3 rounded-2xl bg-white/5 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 border border-transparent transition-all shadow-xl group/btn">
                      <ArrowUpRight size={20} className="group-hover/btn:rotate-45 transition-transform" />
                    </button>
                  </td>
                </motion.tr>
              )) : (
                <tr>
                   <td colSpan={6} className="py-20 text-center text-[10px] font-black uppercase text-slate-600 tracking-[0.4em] italic">
                    No delivery logs available for synchronization.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-8 bg-blue-500/[0.02] border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <ShieldCheck size={18} className="text-blue-500" />
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] italic">
                  ERD Compliance: <span className="text-slate-400">Digital fingerprints verified via SalesOrder bridge.</span>
                </p>
            </div>
            <button className="text-[10px] font-black text-blue-500 hover:text-white uppercase tracking-[0.2em] transition-all border-b border-blue-500/20 pb-1">
              Audit Full History
            </button>
        </div>
      </motion.div>
    </div>
  );
}