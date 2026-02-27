"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { 
  LayoutDashboard, ShoppingCart, FileCheck, 
  Package, Users, TrendingUp, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Activity, 
  ShieldCheck, Loader2, Calendar, ChevronRight
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

// --- DASHBOARD CARD COMPONENT ---
const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 hover:border-blue-500/30 transition-all group relative overflow-hidden">
    <div className={`absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform ${color}`}>
      <Icon size={120} />
    </div>
    <div className="relative z-10">
      <div className="flex justify-between items-start mb-6">
        <div className={`p-4 rounded-2xl bg-white/5 ${color} border border-white/10`}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-[10px] font-black px-3 py-1 rounded-full ${trend > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
            {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{title}</p>
      <h3 className="text-4xl font-black italic tracking-tighter text-white">{value}</h3>
    </div>
  </div>
);

export default function CyberDashboard() {
  // Dummy Data for Preview (Jab tak API connect na ho)
  const [stats, setStats] = useState<any>({
    revenue: 1250840,
    totalOrders: 142,
    pendingInvoices: 12,
    lowStock: 5,
    recentActivity: [
      { action: "New Invoice Generated", timestamp: "2 mins ago", refId: "INV-9901" },
      { action: "Stock Updated: Paracetamol", timestamp: "15 mins ago", refId: "STK-442" },
      { action: "Order Approved by Admin", timestamp: "1 hour ago", refId: "ORD-7721" },
      { action: "New User Registered", timestamp: "3 hours ago", refId: "USR-102" },
    ]
  });
  
  const [loading, setLoading] = useState(false); // Loader ko false kar diya taake UI dikhe

  const token = Cookies.get('auth_token');
  const currentUserId = Cookies.get('user_id');
  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  const api = useMemo(() => axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${token}` }
  }), [token, API_BASE]);

  // --- API FETCH LOGIC ---
  useEffect(() => {
    const fetchStats = async () => {
      // Agar token nahi hai to gussa mat karo, dummy data dikhao
      if (!token) {
          console.warn("No token found, showing dummy dashboard data");
          return;
      }
      try {
        const res = await api.get('#');
        setStats(res.data);
      } catch (err) {
        console.error("Backend offline, using fallback data");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [api, token]);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={60} />
    </div>
  );

  return (
    <div className="text-white p-6 md:p-12 pb-32 font-sans selection:bg-blue-500 selection:text-black">
      <Toaster position="top-right" theme="dark" richColors />

      {/* --- TOP BAR --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16 border-b border-white/5 pb-10">
        <div>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter flex items-center gap-4">
            <LayoutDashboard className="text-blue-500" size={48} />
            Command <span className="text-blue-500">Center</span>
          </h1>
          <div className="flex items-center gap-4 mt-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] italic flex items-center gap-2">
              <ShieldCheck size={14} className="text-blue-500" /> Secure Node: {currentUserId || "LOCAL_HOST"}
            </p>
            <div className="h-1 w-1 rounded-full bg-slate-700" />
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] italic flex items-center gap-2">
              <Calendar size={14} /> {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-4 flex items-center gap-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center font-black text-black text-xl italic shadow-lg shadow-blue-500/20">
              {currentUserId ? currentUserId.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="pr-4">
              <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Authorized Operator</p>
              <p className="text-sm font-black uppercase tracking-tighter">Administrator</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- STATS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        <StatCard 
          title="Gross Revenue" 
          value={`PKR ${stats.revenue.toLocaleString()}`} 
          icon={TrendingUp} 
          trend={14.2}
          color="text-emerald-500"
        />
        <StatCard 
          title="Active Orders" 
          value={stats.totalOrders} 
          icon={ShoppingCart} 
          trend={5.7}
          color="text-blue-500"
        />
        <StatCard 
          title="Pending Invoices" 
          value={stats.pendingInvoices} 
          icon={FileCheck} 
          trend={-1.2}
          color="text-amber-500"
        />
        <StatCard 
          title="Low Stock Items" 
          value={stats.lowStock} 
          icon={AlertTriangle} 
          color="text-rose-500"
        />
      </div>

      {/* --- LOWER SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* MODULE LINKS */}
        <div className="lg:col-span-1 space-y-4">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-6 ml-2 italic">Navigation Modules</p>
          
          {[
            { label: 'Create Sales Order', sub: 'New Client Bookings', icon: ShoppingCart, color: 'text-blue-500' },
            { label: 'Invoice Forge', sub: 'Billing & Payments', icon: FileCheck, color: 'text-emerald-500' },
            { label: 'Inventory Vault', sub: 'Stock Management', icon: Package, color: 'text-purple-500' },
            { label: 'User Control', sub: 'Access Management', icon: Users, color: 'text-amber-500' }
          ].map((item, idx) => (
            <button key={idx} className="w-full flex items-center justify-between p-6 bg-slate-900/50 border border-white/5 rounded-[2rem] hover:border-blue-500/50 transition-all group overflow-hidden relative">
              <div className="flex items-center gap-5 relative z-10">
                <div className={`p-3 rounded-xl bg-white/5 ${item.color}`}>
                  <item.icon size={22} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-tight group-hover:text-blue-400 transition-colors">{item.label}</p>
                  <p className="text-[9px] font-bold text-slate-600 uppercase italic">{item.sub}</p>
                </div>
              </div>
              <ChevronRight size={20} className="text-slate-700 group-hover:text-white transition-all transform group-hover:translate-x-1" />
            </button>
          ))}
        </div>

        {/* RECENT ACTIVITY LOG */}
        <div className="lg:col-span-2 bg-slate-900/20 border border-white/5 rounded-[3.5rem] p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-20 opacity-[0.02] pointer-events-none">
                <Activity size={300} />
            </div>
          
          <div className="flex justify-between items-center mb-10 relative z-10">
            <h3 className="text-xl font-black italic uppercase flex items-center gap-3">
              <Activity className="text-blue-500" /> Operational Logs
            </h3>
            <span className="px-4 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-black rounded-full border border-blue-500/20">LIVE FEED</span>
          </div>

          <div className="space-y-4 relative z-10">
            {stats.recentActivity.map((log: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.04] transition-all">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center font-mono text-xs text-blue-500 font-bold border border-white/5">
                    0{i + 1}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-white">{log.action}</p>
                    <p className="text-[9px] font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Calendar size={10} /> {log.timestamp}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-blue-400 font-mono">REF: {log.refId}</p>
                  <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1 italic">Verified ✓</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}