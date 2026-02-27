"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  BarChart3, PieChart, TrendingUp, Download, 
  Calendar, ArrowUpRight, ArrowDownRight, 
  Activity, Globe, Target, FileJson, Loader2
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- API CONFIG ---
const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

interface AnalyticsData {
  kpis: { label: string; value: string; trend: string; up: boolean }[];
  salesTrajectory: number[];
  regionalSpread: { region: string; val: number; color: string }[];
}

export default function ReportsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeframe, setTimeframe] = useState("Last 30 Days");
  const [isLoading, setIsLoading] = useState(true);

  // Security Context
  const currentUserId = Cookies.get('userId');
  const authToken = Cookies.get('auth_token');

  const secureApi = axios.create({
    baseURL: API_BASE,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'x-api-key': API_KEY,
      'x-user-id': currentUserId
    }
  });

  // Anti-Injection Sanitizer
  const cleanParam = (val: string) => val.replace(/['";\-]/g, "").trim();

  // --- FETCH ANALYTICS ---
  const fetchIntel = async (period: string) => {
    setIsLoading(true);
    try {
      const sanitizedPeriod = cleanParam(period);
      const res = await secureApi.get(`/analytics/neural-report?range=${sanitizedPeriod}`);
      setData(res.data);
    } catch (err) {
      toast.error("DATA_ACCESS_DENIED", { description: "Encryption handshake failed with analytics node." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchIntel(timeframe); }, [timeframe]);

  // --- ACTIONS ---
  const handleExport = async (format: 'PDF' | 'JSON') => {
    const tId = toast.loading(`ENCRYPTING_${format}_PAYLOAD...`);
    try {
      const response = await secureApi.post('/analytics/export', { 
        format, 
        userId: currentUserId,
        timeframe: cleanParam(timeframe)
      });
      
      // Real download logic
      window.open(response.data.secureUrl, '_blank');
      toast.success("INTEL_EXPORT_COMPLETE", { id: tId });
    } catch (err) {
      toast.error("EXPORT_FAILED", { id: tId });
    }
  };

  if (isLoading || !data) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      <p className="text-indigo-500 font-black text-[10px] tracking-[0.5em] uppercase animate-pulse">Synchronizing Neural Metrics...</p>
    </div>
  );

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-16 p-4">
      <Toaster theme="dark" position="top-right" richColors />
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <Activity className="text-indigo-500 w-8 h-8" />
            Neural Analytics
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            Metrics Terminal <span className="text-indigo-500/50">|</span> Authorized Op: {currentUserId}
          </p>
        </motion.div>

        <div className="flex flex-wrap gap-3">
           <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus-within:border-indigo-500/50 transition-all">
              <Calendar size={14} className="text-indigo-400" />
              <select 
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="bg-transparent text-[10px] font-black text-white uppercase outline-none cursor-pointer"
              >
                 <option value="Last 30 Days" className="bg-slate-950">Last 30 Days</option>
                 <option value="Last 6 Months" className="bg-slate-950">Last 6 Months</option>
                 <option value="Year to Date" className="bg-slate-950">Year to Date</option>
              </select>
           </div>
           <button 
             onClick={() => handleExport('PDF')}
             className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)]"
           >
              <Download size={14} /> Export Intel
           </button>
        </div>
      </div>

      

      {/* Top Level KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.kpis.map((kpi, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white/[0.02] border border-white/[0.08] p-6 rounded-[2rem] relative overflow-hidden group hover:border-indigo-500/30 transition-all"
          >
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{kpi.label}</p>
            <div className="flex items-end justify-between mt-2">
               <h3 className="text-2xl font-black text-white italic tracking-tighter">{kpi.value}</h3>
               <div className={cn(
                 "flex items-center text-[10px] font-black px-2 py-0.5 rounded-md",
                 kpi.up ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
               )}>
                 {kpi.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                 {kpi.trend}
               </div>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
          </motion.div>
        ))}
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sales Trajectory */}
        <div className="lg:col-span-2 bg-slate-950/40 border border-white/[0.08] p-8 rounded-[2.5rem] backdrop-blur-xl shadow-2xl">
          <div className="flex justify-between items-start mb-10">
             <div>
                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                   <TrendingUp size={16} className="text-indigo-500" /> Sales Trajectory
                </h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 italic">Real-time Node Analysis</p>
             </div>
             <div className="flex gap-2">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-indigo-500" /><span className="text-[9px] text-slate-400 font-black uppercase">Actuals</span></div>
                <div className="flex items-center gap-1.5 ml-3"><span className="w-2 h-2 rounded-full bg-slate-700" /><span className="text-[9px] text-slate-400 font-black uppercase">Forecast</span></div>
             </div>
          </div>
          
          <div className="h-64 w-full flex items-end gap-2 px-2">
              {data.salesTrajectory.map((h, i) => (
               <motion.div 
                 key={i}
                 initial={{ height: 0 }}
                 animate={{ height: `${h}%` }}
                 transition={{ duration: 1, ease: "circOut" }}
                 className="flex-1 bg-gradient-to-t from-indigo-600/40 to-indigo-400/80 rounded-t-lg relative group"
               >
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-xl">
                     {h}k
                  </div>
               </motion.div>
              ))}
          </div>
          <div className="flex justify-between mt-4 px-2">
              {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map(m => (
               <span key={m} className="text-[9px] font-black text-slate-600 uppercase font-mono">{m}</span>
              ))}
          </div>
        </div>

        {/* Regional Distribution */}
        <div className="bg-slate-950/40 border border-white/[0.08] p-8 rounded-[2.5rem] backdrop-blur-xl">
           <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
              <Globe size={16} className="text-indigo-500" /> Region Spread
           </h3>
           <div className="space-y-6">
              {data.regionalSpread.map((r) => (
                <div key={r.region} className="space-y-2">
                   <div className="flex justify-between text-[10px] font-black uppercase italic">
                      <span className="text-slate-400">{r.region}</span>
                      <span className="text-white">{r.val}%</span>
                   </div>
                   <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${r.val}%` }}
                        className={cn("h-full rounded-full shadow-[0_0_10px_rgba(79,70,229,0.4)]", r.color)}
                      />
                   </div>
                </div>
              ))}
           </div>
           
           <div className="mt-12 p-6 bg-indigo-600/5 border border-indigo-500/10 rounded-3xl relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-2">
                 <Target className="text-indigo-500 group-hover:animate-ping" size={18} />
                 <span className="text-[10px] font-black text-white uppercase">Neural Growth Target</span>
              </div>
              <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">
                Network pacing is <span className="text-emerald-500 underline">Optimized</span>. Predicted reaching Q1 goal 4 days ahead of schedule.
              </p>
           </div>
        </div>
      </div>

      {/* Bottom Report Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { icon: PieChart, label: "Inventory Aging Report", color: "text-purple-500", bg: "bg-purple-500/10" },
           { icon: BarChart3, label: "Distributor Ranking", color: "text-amber-500", bg: "bg-amber-500/10" },
           { icon: FileJson, label: "System Audit Logs", color: "text-blue-500", bg: "bg-blue-500/10" }
         ].map((btn, i) => (
           <motion.div 
            whileHover={{ scale: 1.02 }}
            onClick={() => handleExport('JSON')}
            key={i} 
            className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem] flex items-center gap-4 hover:bg-white/[0.04] cursor-pointer transition-all active:scale-95"
           >
              <div className={cn("p-3 rounded-2xl", btn.bg, btn.color)}><btn.icon size={20} /></div>
              <span className="text-[10px] font-black text-white uppercase tracking-widest">{btn.label}</span>
           </motion.div>
         ))}
      </div>
    </div>
  );
}