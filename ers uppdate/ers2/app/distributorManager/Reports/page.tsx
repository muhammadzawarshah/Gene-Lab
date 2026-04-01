"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import {
  BarChart3, TrendingUp, ShoppingCart, PackageCheck,
  Truck, Boxes, Clock, Activity, Loader2, RefreshCw,
  FileText, Users, ArrowUpRight
} from 'lucide-react';
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface DashboardData {
  kpis: {
    totalSalesAmount: number;
    totalSalesCount: number;
    totalPurchaseAmount: number;
    totalPurchaseCount: number;
    totalGRN: number;
    totalDeliveries: number;
    totalProducts: number;
    totalStockOnHand: number;
    pendingSalesOrders: number;
  };
  monthlySales: { month: string; label: string; total: number; count: number }[];
  topProducts: { product_id: string; name: string; revenue: number; qty: number }[];
  recentInvoices: { number: string | null; party: string; amount: number; date: string; status: string }[];
}

const fmt = (n: number) =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `${(n / 1_000).toFixed(1)}K`
    : n.toFixed(0);

const fmtPKR = (n: number) => `PKR ${fmt(n)}`;

export default function ReportsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authToken = Cookies.get('auth_token') || Cookies.get('virtue_token') || '';
  const headers = { Authorization: `Bearer ${authToken}` };

  const fetchDashboard = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/v1/reports/dashboard`, { headers });
      setData(res.data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to load reports");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDashboard(); }, []);

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      <p className="text-indigo-500 font-black text-[10px] tracking-[0.5em] uppercase">Loading Reports...</p>
    </div>
  );

  if (!data) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <BarChart3 className="w-12 h-12 text-slate-600" />
      <p className="text-slate-500 font-black text-xs uppercase tracking-widest">No data available</p>
      <button onClick={fetchDashboard} className="text-indigo-400 text-xs font-bold flex items-center gap-2 hover:text-indigo-300">
        <RefreshCw size={12} /> Retry
      </button>
    </div>
  );

  const { kpis, monthlySales, topProducts, recentInvoices } = data;

  // Compute max for bar chart scaling
  const maxSales = Math.max(...monthlySales.map(m => m.total), 1);

  const kpiCards = [
    { icon: TrendingUp,   label: 'Total Sales',       value: fmtPKR(kpis.totalSalesAmount),    sub: `${kpis.totalSalesCount} invoices`,     color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
    { icon: ShoppingCart, label: 'Total Purchases',   value: fmtPKR(kpis.totalPurchaseAmount), sub: `${kpis.totalPurchaseCount} orders`,     color: 'text-blue-400',    bg: 'bg-blue-500/10' },
    { icon: PackageCheck, label: 'GRN Received',      value: kpis.totalGRN.toString(),          sub: 'Goods Receipt Notes',                  color: 'text-purple-400',  bg: 'bg-purple-500/10' },
    { icon: Truck,        label: 'Deliveries',         value: kpis.totalDeliveries.toString(),   sub: 'Delivery notes issued',                color: 'text-amber-400',   bg: 'bg-amber-500/10' },
    { icon: Boxes,        label: 'Products',           value: kpis.totalProducts.toString(),     sub: 'In catalogue',                         color: 'text-cyan-400',    bg: 'bg-cyan-500/10' },
    { icon: Activity,     label: 'Stock on Hand',      value: fmt(kpis.totalStockOnHand),        sub: 'Total units across warehouses',         color: 'text-indigo-400',  bg: 'bg-indigo-500/10' },
    { icon: Clock,        label: 'Pending Orders',     value: kpis.pendingSalesOrders.toString(), sub: 'Awaiting approval',                   color: 'text-rose-400',    bg: 'bg-rose-500/10' },
  ];

  const statusColor: Record<string, string> = {
    PAID:      'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    UNPAID:    'text-amber-400 bg-amber-500/10 border-amber-500/20',
    OVERDUE:   'text-rose-400 bg-rose-500/10 border-rose-500/20',
    CANCELLED: 'text-slate-500 bg-slate-500/10 border-slate-500/20',
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 p-6 pb-16 min-h-screen">
      <Toaster theme="dark" position="top-right" richColors />

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <BarChart3 className="text-indigo-500 w-10 h-10" /> Reports
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
            Business Analytics &amp; Performance Overview
          </p>
        </div>
        <button onClick={fetchDashboard}
          className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase transition-all">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* ── KPI CARDS ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7 gap-4">
        {kpiCards.map((k, i) => (
          <motion.div key={k.label}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-slate-900/40 border border-white/[0.08] rounded-[2rem] p-5 hover:border-indigo-500/20 transition-all"
          >
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", k.bg, k.color)}>
              <k.icon size={16} />
            </div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{k.label}</p>
            <p className="text-xl font-black text-white italic tracking-tighter">{k.value}</p>
            <p className="text-[9px] text-slate-600 font-bold mt-1">{k.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* ── MONTHLY SALES CHART + TOP PRODUCTS ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly Sales Bar Chart */}
        <div className="lg:col-span-2 bg-slate-900/40 border border-white/[0.08] rounded-[2.5rem] p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                <TrendingUp size={14} className="text-indigo-500" /> Monthly Sales
              </h2>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">Last 12 months</p>
            </div>
          </div>

          {/* Bars */}
          <div className="flex items-end gap-1.5 h-48">
            {monthlySales.map((m, i) => {
              const pct = maxSales > 0 ? (m.total / maxSales) * 100 : 0;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full" style={{ height: '100%' }}>
                    <div className="absolute bottom-0 w-full flex flex-col items-center">
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-[8px] font-black text-white whitespace-nowrap z-10 shadow-xl">
                        {fmtPKR(m.total)}
                      </div>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(pct, 2)}%` }}
                        transition={{ duration: 0.8, delay: i * 0.04, ease: 'circOut' }}
                        className={cn(
                          "w-full rounded-t-md",
                          pct > 0 ? "bg-gradient-to-t from-indigo-700/60 to-indigo-400/90" : "bg-white/5"
                        )}
                        style={{ maxHeight: '192px' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Labels */}
          <div className="flex gap-1.5 mt-2">
            {monthlySales.map(m => (
              <div key={m.month} className="flex-1 text-center">
                <span className="text-[8px] font-black text-slate-600 uppercase">{m.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-slate-900/40 border border-white/[0.08] rounded-[2.5rem] p-8">
          <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
            <ArrowUpRight size={14} className="text-emerald-500" /> Top Products
          </h2>

          {topProducts.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-slate-600 text-xs font-bold">No sales data yet</div>
          ) : (
            <div className="space-y-5">
              {topProducts.map((p, i) => {
                const maxRev = topProducts[0].revenue;
                const pct = maxRev > 0 ? (p.revenue / maxRev) * 100 : 0;
                return (
                  <div key={p.product_id}>
                    <div className="flex justify-between items-baseline mb-1.5">
                      <span className="text-[10px] font-black text-slate-300 truncate pr-2 max-w-[65%]">{p.name}</span>
                      <span className="text-[9px] font-black text-emerald-400 shrink-0">{fmtPKR(p.revenue)}</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, delay: i * 0.08 }}
                        className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
                      />
                    </div>
                    <p className="text-[8px] text-slate-600 font-bold mt-0.5">{fmt(p.qty)} units sold</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RECENT INVOICES ─────────────────────────────────────────────── */}
      <div className="bg-slate-900/40 border border-white/[0.08] rounded-[2.5rem] p-8">
        <h2 className="text-sm font-black text-white uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
          <FileText size={14} className="text-blue-500" /> Recent Invoices
        </h2>

        {recentInvoices.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-slate-600 text-xs font-bold">No invoices yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.05]">
                  {['Invoice #', 'Customer', 'Amount', 'Date', 'Status'].map(h => (
                    <th key={h} className="text-left text-[9px] font-black text-slate-500 uppercase tracking-widest pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((inv, i) => (
                  <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 pr-4 text-[10px] font-black text-indigo-400">{inv.number || '—'}</td>
                    <td className="py-3 pr-4 text-[10px] font-bold text-slate-300">{inv.party}</td>
                    <td className="py-3 pr-4 text-[10px] font-black text-white">{fmtPKR(inv.amount)}</td>
                    <td className="py-3 pr-4 text-[10px] font-bold text-slate-500">
                      {new Date(inv.date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={cn(
                        "text-[8px] font-black px-2.5 py-1 rounded-full uppercase border",
                        statusColor[inv.status] || 'text-slate-400 bg-slate-500/10 border-slate-500/20'
                      )}>
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
