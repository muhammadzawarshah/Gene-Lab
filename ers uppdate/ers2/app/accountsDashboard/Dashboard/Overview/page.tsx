"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Wallet, ArrowUpRight, 
  ArrowDownLeft, Activity, CreditCard, Landmark, 
  Clock, ChevronRight, PlusCircle, Download, Loader2,
  AlertTriangle
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Dashboard Types ---
interface DashboardData {
  stats: { label: string; value: string; change: string; trend: 'up' | 'down' }[];
  transactions: { id: string; party: string; type: string; amount: number; status: string }[];
  accounts: { name: string; type: string; balance: number }[];
  urgentPayables: number;
}

export default function AccountsHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Backend Config
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const userId = Cookies.get('userId'); 
        const token = Cookies.get('auth_token');

        if (!userId) {
          setError("Session Expired. Please Login Again.");
          setLoading(false);
          return;
        }

        // Axios Call with Headers & Params
        const response = await axios.get(`${API_BASE_URL}/accounts/dashboard`, {
          params: { userId },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        setData(response.data);
      } catch (err: any) {
        console.error("Fetch Error:", err);
        setError(err.response?.data?.message || "Backend Connection Failed");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [API_BASE_URL]);

  // --- LOADING UI (Wahi premium style) ---
  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#020617]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="text-blue-500 mb-6"
      >
        <Loader2 size={48} />
      </motion.div>
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 animate-pulse italic">
        Syncing Nexus Financial Data...
      </p>
    </div>
  );

  // --- ERROR UI ---
  if (error) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#020617] p-6 text-center">
      <AlertTriangle size={64} className="text-rose-500 mb-6 opacity-20" />
      <h2 className="text-2xl font-black text-white uppercase italic mb-2">Sync Error</h2>
      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">{error}</p>
      <button 
        onClick={() => window.location.reload()}
        className="mt-8 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase hover:bg-white/10"
      >
        Retry Connection
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-10 text-slate-300 font-sans">
      
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
          <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
            Nexus <span className="text-blue-500">Finance</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2 italic">
            Command Center • ID: {Cookies.get('userId')?.slice(-6).toUpperCase()}
          </p>
        </motion.div>
        
        <div className="flex gap-3">
          <button className="flex items-center gap-3 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
            <Download size={18} /> Financial Report
          </button>
          <button className="flex items-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
            <PlusCircle size={18} /> Quick Entry
          </button>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {data?.stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-[#050b1d] border border-white/5 p-8 rounded-[2.5rem] relative overflow-hidden group hover:border-blue-500/20 transition-all"
          >
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">{stat.label}</p>
            <h3 className="text-3xl font-black text-white italic mb-4">{stat.value}</h3>
            <div className={cn(
              "flex items-center gap-2 text-[10px] font-black uppercase",
              stat.trend === 'up' ? "text-emerald-500" : "text-rose-500"
            )}>
              {stat.trend === 'up' ? <TrendingUp size={14}/> : <TrendingDown size={14}/>}
              {stat.change} <span className="text-slate-600 ml-1">vs MTD</span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* RECENT ACTIVITY (LEFT) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-[#050b1d] border border-white/5 rounded-[3rem] p-8">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-xl font-black text-white uppercase italic tracking-tighter flex items-center gap-3">
                <Activity className="text-blue-500" /> Recent Transactions
              </h2>
              <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline">Full Audit Trail</button>
            </div>

            <div className="space-y-4">
              {data?.transactions.map((tx, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ delay: idx * 0.05 }}
                  key={idx} 
                  className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5 rounded-3xl hover:border-white/10 transition-all group"
                >
                  <div className="flex items-center gap-6">
                    <div className={cn(
                      "p-4 rounded-2xl",
                      tx.amount > 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                    )}>
                      {tx.amount > 0 ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase italic">{tx.party}</h4>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">{tx.type} • {tx.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-black italic", tx.amount > 0 ? "text-emerald-500" : "text-white")}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} PKR
                    </p>
                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{tx.status}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* ACCOUNT SNAPSHOT (RIGHT) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#050b1d] border border-white/5 rounded-[3rem] p-8">
            <h2 className="text-lg font-black text-white uppercase italic tracking-tighter mb-8 flex items-center gap-3">
              <Wallet className="text-amber-500" /> Account Snapshot
            </h2>
            
            <div className="space-y-6">
              {data?.accounts.map((acc, idx) => (
                <div key={idx} className="p-6 bg-white/5 rounded-3xl border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[9px] font-black text-slate-500 uppercase">{acc.name}</span>
                    {acc.type === 'Bank' ? <Landmark size={14} className="text-blue-500" /> : <CreditCard size={14} className="text-emerald-500" />}
                  </div>
                  <p className="text-xl font-black text-white italic">PKR {acc.balance.toLocaleString()}</p>
                </div>
              ))}

              <button className="w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-3">
                Bank Reconciliation <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* DUES ALERT */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/10 rounded-[3rem] p-8"
          >
            <h2 className="text-sm font-black text-rose-500 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Clock size={16} /> Urgent Payables
            </h2>
            <p className="text-2xl font-black text-white italic">PKR {data?.urgentPayables.toLocaleString()}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase mt-1 italic opacity-60">Action Required: Immediate</p>
          </motion.div>
        </div>

      </div>
    </div>
  );
}