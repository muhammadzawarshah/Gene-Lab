"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Wallet, ArrowUpRight, Clock, FileText,
  TrendingUp, AlertCircle, Loader2, RefreshCcw, ShieldCheck
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
interface Transaction {
  id: string;
  date: string;
  amount: string;
  status: "Invoiced" | "Pending Invoice";
  type: string;
}

export default function OutstandingBalance() {
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [financials, setFinancials] = useState({
    total: "0",
    invoiced: "0",
    delivered: "0",
    growth: "0%"
  });

  // --- Security Config (Backend Sync) ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const token = Cookies.get('auth_token');

  // Extracting user ID from the correct cookie
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
      'x-user-id': currentUserId
    }
  }), [token, currentUserId, API_URL, API_KEY]);

  // --- Fetch Financial Data from Aggregated Route ---
  const fetchFinancials = useCallback(async () => {
    try {
      if (!currentUserId) return;
      
      setIsLoading(true);
      // Calling our new aggregated ledger route
      const response = await secureApi.get(`/api/v1/distribution/financial-ledger/${currentUserId}`);

      setFinancials(response.data.summary);
      setTransactions(response.data.history);
    } catch (err) {
      toast.error("DATA SYNC FAILED", { 
        description: "Secure node could not verify financial integrity." 
      });
      console.error("Ledger Sync Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId, secureApi]);

  useEffect(() => {
    fetchFinancials();
  }, [fetchFinancials]);

  // --- UI Configuration (Keep UI exactly as is) ---
  const stats = [
    {
      label: "Total Outstanding",
      value: `PKR ${financials.total}`,
      sub: financials.growth,
      icon: Wallet,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      glow: "shadow-[0_0_20px_rgba(37,99,235,0.2)]"
    },
    {
      label: "Invoiced Amount",
      value: `PKR ${financials.invoiced}`,
      sub: "Awaiting Clearance",
      icon: FileText,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
      glow: "shadow-[0_0_20px_rgba(6,182,212,0.2)]"
    },
    {
      label: "Delivered (Not Invoiced)",
      value: `PKR ${financials.delivered}`,
      sub: "In Audit Phase",
      icon: Clock,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      glow: "shadow-[0_0_20px_rgba(245,158,11,0.2)]"
    }
  ];

  if (isLoading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="animate-spin text-blue-500 w-10 h-10" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Decrypting Ledger...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-200 relative overflow-hidden bg-[#020617]">
      <Toaster position="top-right" theme="dark" richColors />
      <ShieldCheck className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] text-white/[0.01] pointer-events-none" />

      {/* --- Header Section --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white flex items-center gap-3">
            <TrendingUp className="text-blue-500 w-8 h-8" />
            Outstanding <span className="text-blue-500">Balance</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Financial Node ID: {currentUserId?.slice(0, 12)}
          </p>
        </motion.div>

        <div className="flex gap-4">
          <button onClick={fetchFinancials} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-slate-400 hover:text-white">
            <RefreshCcw size={18} />
          </button>
          <button className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all shadow-lg shadow-blue-600/20">
            Export Ledger
          </button>
        </div>
      </div>

      {/* --- Stats Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 relative z-10">
        {stats.map((stat, index) => (
          <motion.div key={index} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }}
            className={cn("p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] backdrop-blur-xl relative overflow-hidden group", stat.glow)}
          >
            <div className={cn("p-4 rounded-2xl w-fit mb-6 transition-transform group-hover:scale-110 duration-500", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
            <h2 className="text-3xl font-black text-white mt-2 tracking-tight italic">{stat.value}</h2>
            <div className="mt-6">
              <span className={cn("text-[9px] font-black px-3 py-1 rounded-lg bg-white/5 uppercase", stat.color)}>
                {stat.sub}
              </span>
            </div>
            <div className="absolute -right-6 -bottom-6 opacity-5 group-hover:opacity-10 transition-opacity duration-700">
               <stat.icon size={140} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* --- Detailed Breakdown Table --- */}
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="rounded-[3rem] border border-white/5 bg-white/[0.01] backdrop-blur-3xl overflow-hidden shadow-2xl shadow-black/50 relative z-10"
      >
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h3 className="text-xs font-black uppercase tracking-[0.3em] text-blue-500 italic flex items-center gap-3">
            <FileText size={16} /> Audit Trail Breakdown
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-white/[0.01]">
                <th className="px-10 py-6">Transaction Ref</th>
                <th className="px-10 py-6">Sync Date</th>
                <th className="px-10 py-6">Status Node</th>
                <th className="px-10 py-6">Nominal Value</th>
                <th className="px-10 py-6 text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              <AnimatePresence>
                {transactions.map((t, i) => (
                  <motion.tr key={t.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="group hover:bg-blue-500/[0.03] transition-colors"
                  >
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.8)]" />
                        <span className="text-sm font-black text-white tracking-widest">{t.id}</span>
                      </div>
                    </td>
                    <td className="px-10 py-6 text-xs font-bold text-slate-500">{t.date}</td>
                    <td className="px-10 py-6">
                      <span className={cn(
                        "text-[9px] font-black px-4 py-1.5 rounded-xl uppercase tracking-tighter italic",
                        t.status === "Invoiced" 
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                          : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                      )}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-sm font-black text-white italic">{t.amount}</td>
                    <td className="px-10 py-6 text-right">
                      <button className="p-2 text-slate-600 hover:text-blue-500 hover:bg-blue-500/10 rounded-xl transition-all">
                        <ArrowUpRight size={20} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {transactions.length === 0 && !isLoading && (
            <div className="py-20 text-center text-[10px] font-black uppercase text-slate-600 tracking-widest italic">
              No financial audit records found for this node.
            </div>
          )}
        </div>
        
        <div className="p-8 bg-white/[0.02] border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <AlertCircle size={16} className="text-blue-500" />
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
                    Nexus-Calculated balances based on confirmed <span className="text-blue-400">GRNs</span> and generated <span className="text-blue-400">Invoices</span>.
                </span>
            </div>
            <button className="text-[10px] font-black text-blue-500 hover:text-blue-400 transition-all uppercase tracking-widest border-b border-blue-500/20 pb-1">
              Analyze Full History
            </button>
        </div>
      </motion.div>
    </div>
  );
}