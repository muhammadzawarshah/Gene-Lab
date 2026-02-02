"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import { 
  Package, Truck, Activity, ArrowUpRight, 
  TrendingUp, Zap, Loader2, Download, FileText 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';

// --- API CONFIG ---
const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

export default function DashboardHome() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("Last 7 Days");

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

  // Security: Input Sanitizer to prevent injection
  const sanitize = (val: string) => val.replace(/['";\-]/g, "").trim();

  // --- CORE FUNCTIONS ---

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await secureApi.get(`/dashboard/pharma-stats?range=${sanitize(timeframe)}`);
      setData(res.data);
    } catch (err) {
      toast.error("DATA_SYNC_ERROR", { description: "Failed to connect to Pharma-Core nodes." });
    } finally {
      setLoading(false);
    }
  }, [timeframe]);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const handleDownloadReport = async () => {
    const tId = toast.loading("ENCRYPTING_REPORT_STREAM...");
    try {
      const res = await secureApi.get('/reports/generate-pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Report_${new Date().getTime()}.pdf`);
      document.body.appendChild(link);
      link.click();
      toast.success("REPORT_DOWNLOADED", { id: tId });
    } catch (err) {
      toast.error("EXPORT_FAILED", { id: tId });
    }
  };

  const handleGenerateInvoice = async () => {
    const tId = toast.loading("PROCESSING_BLOCKCHAIN_INVOICE...");
    try {
      await secureApi.post('/invoices/create-batch', { userId: currentUserId });
      toast.success("INVOICE_BATCH_READY", { id: tId, description: "Check your billing terminal." });
    } catch (err) {
      toast.error("INVOICE_GEN_FAILED", { id: tId });
    }
  };

  if (loading || !data) return (
    <div className="h-screen flex flex-col items-center justify-center">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
      <p className="text-blue-500 font-black text-[10px] tracking-[0.5em] uppercase animate-pulse">Initializing Core Engine...</p>
    </div>
  );

  return (
    <div className="space-y-10 p-4 max-w-[1600px] mx-auto">
      <Toaster theme="dark" position="top-right" richColors />

      {/* 1. Header */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter italic flex items-center gap-3">
            PHARMA-CORE <span className="text-xs bg-blue-600 px-2 py-1 rounded-full not-italic tracking-normal">v2.0</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-1">Authorized User: <span className="text-blue-500 font-bold font-mono">{currentUserId}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleDownloadReport} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 flex items-center gap-2 transition-all">
            <Download size={14} /> Download Report
          </button>
          <button onClick={handleGenerateInvoice} className="px-4 py-2 bg-blue-600 rounded-xl text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:scale-105 flex items-center gap-2 transition-all">
            <FileText size={14} /> Generate Invoice
          </button>
        </div>
      </motion.div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Pending Picks", value: data.summary.pending, icon: Package, color: "text-blue-500", trend: "+2 today", bg: "bg-blue-500/10" },
          { label: "In Transit", value: data.summary.transit, icon: Truck, color: "text-emerald-400", trend: "On schedule", bg: "bg-emerald-500/10" },
          { label: "Revenue", value: data.summary.revenue, icon: TrendingUp, color: "text-purple-500", trend: "PKR (Current)", bg: "bg-purple-500/10" },
          { label: "Efficiency", value: data.summary.efficiency, icon: Zap, color: "text-amber-500", trend: "Optimal", bg: "bg-amber-500/10" },
        ].map((stat, i) => (
          <motion.div key={stat.label} whileHover={{ y: -10 }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="p-6 bg-slate-950 border border-white/[0.08] rounded-[2.5rem] relative overflow-hidden group">
            <div className={cn("p-4 rounded-3xl w-fit mb-6 transition-transform group-hover:rotate-12", stat.bg, stat.color)}>
              <stat.icon size={28} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{stat.label}</p>
            <div className="flex items-baseline gap-2 mt-2">
              <h3 className="text-4xl font-black text-white tracking-tighter">{stat.value}</h3>
              <span className="text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full">{stat.trend}</span>
            </div>
            <div className="absolute -bottom-2 -right-2 opacity-5 text-white"> <stat.icon size={120} /> </div>
          </motion.div>
        ))}
      </div>

      

      {/* 3. Main Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-slate-950 border border-white/[0.08] rounded-[3rem] p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-white">Stock vs Sales Flow</h3>
            <select value={timeframe} onChange={(e) => setTimeframe(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg text-[10px] text-slate-400 px-3 py-1 outline-none">
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
            </select>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chartData}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis hide />
                <Tooltip contentStyle={{backgroundColor: '#020617', borderRadius: '16px', border: '1px solid #ffffff10'}} />
                <Area type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorSales)" />
                <Area type="monotone" dataKey="stock" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Order Health */}
        <div className="bg-slate-950 border border-white/[0.08] rounded-[3rem] p-8 flex flex-col">
          <h3 className="text-xl font-bold text-white mb-8">Order Health</h3>
          <div className="flex-1 flex flex-col justify-center space-y-6">
            {data.health.map((bar: any) => (
              <div key={bar.label} className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <span>{bar.label}</span>
                  <span>{bar.val}%</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${bar.val}%` }} transition={{ duration: 1.5 }} className={cn("h-full rounded-full", bar.color)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-white px-2 flex items-center gap-2">
            <Activity className="text-blue-500" /> Recent System Audit
          </h3>
          <div className="bg-slate-950 border border-white/[0.08] rounded-[2.5rem] overflow-hidden">
            {data.audits.map((log: any, i: number) => (
              <div key={i} className="p-4 border-b border-white/5 last:border-0 flex items-center justify-between hover:bg-white/[0.02] transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs text-slate-300 italic">{log.message} <span className="text-white font-bold font-mono">#{log.id}</span></p>
                </div>
                <span className="text-[10px] text-slate-600 italic">{log.time}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/10 rounded-[2.5rem] p-8 flex flex-center relative overflow-hidden group cursor-pointer" onClick={() => toast.info("MAP_TERMINAL_OPEN", { description: "Loading geographic batch distribution..." })}>
           <div className="text-center z-10 w-full">
              <ArrowUpRight className="mx-auto text-blue-500 mb-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              <h4 className="text-white font-bold italic text-center">Open Distribution Heatmap</h4>
              <p className="text-[10px] text-slate-500 uppercase mt-1 tracking-widest text-center">Real-time Batch Localization</p>
           </div>
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}