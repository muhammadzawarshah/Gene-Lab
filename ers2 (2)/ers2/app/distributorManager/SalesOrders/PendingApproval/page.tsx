"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Search, BadgeCheck, Edit2, Printer, Save, Loader2, ListFilter, X, Truck 
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Type Definitions ---
interface ApprovedOrder {
  id: string;
  distributor: string;
  date: string;
  items: number;
  total: string;
  shipStatus: string;
}

export default function PendingApprovalPage() {
  const [orders, setOrders] = useState<ApprovedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [editTarget, setEditTarget] = useState<ApprovedOrder | null>(null);

  // --- Secure Backend Config ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const token = Cookies.get('virtue_token');

  const secureApi = useMemo(() => axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'Content-Type': 'application/json'
    }
  }), [token, API_URL, API_KEY]);

  // --- Fetch & Map Data ---
  const loadLedger = useCallback(async () => {
    try {
      setLoading(true);
      const res = await secureApi.get('/api/v1/distribution/listsale');
      const rawData = res.data?.data || [];
      
      const mappedData = rawData.map((item: any) => ({
        id: item?.so_id ? String(item.so_id) : "N/A", 
        distributor: item?.party_id_customer || "UNKNOWN ENTITY",
        date: item?.order_date ? new Date(item.order_date).toLocaleDateString() : 'N/A',
        items: 0,
        total: item?.total_amount ? String(item.total_amount) : "0",
        shipStatus: item?.status || 'PENDING'
      }));

      setOrders(mappedData);
    } catch (err) {
      toast.error("SYSTEM_SYNC_ERROR");
    } finally {
      setLoading(false);
    }
  }, [secureApi]);

  useEffect(() => { loadLedger(); }, [loadLedger]);

  // --- CRASH-PROOF FILTER LOGIC ---
  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    
    return orders.filter(o => {
      // 1. Term check (Safe from undefined)
      const term = (searchTerm || "").toLowerCase();
      
      // 2. Property check (Safely converting to string before toLowerCase)
      const orderId = String(o?.id || "").toLowerCase();
      const distName = String(o?.distributor || "").toLowerCase();

      const matchesSearch = orderId.includes(term) || distName.includes(term);
      const matchesStatus = statusFilter === "ALL" || (o?.shipStatus === statusFilter);
      
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const handlePrint = (id: string) => {
    window.open(`${API_URL}/orders/print/${id}?auth=${token}`, '_blank');
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto p-4 lg:p-10 min-h-screen text-white bg-[#020617]">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* Header UI */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase flex items-center gap-3">
            <BadgeCheck className="text-emerald-500 w-8 h-8" />
            Approved Ledger
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            Confirmed Nodes <span className="text-emerald-500/50">|</span> Total: {filteredOrders.length}
          </p>
        </motion.div>

        <div className="flex flex-wrap gap-3">
            {/* Filter Dropdown */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 gap-2">
              <ListFilter size={14} className="text-slate-500" />
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent py-2 text-[10px] font-black uppercase outline-none text-emerald-500 cursor-pointer appearance-none"
              >
                <option value="ALL" className="bg-[#050b1d]">ALL STATUS</option>
                <option value="APPROVED" className="bg-[#050b1d]">APPROVED</option>
                <option value="DRAFT" className="bg-[#050b1d]">DRAFT</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64 group">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
               <input 
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 placeholder="SCAN NODE ID..." 
                 className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-emerald-500/50 outline-none transition-all font-bold uppercase"
               />
            </div>
        </div>
      </div>

      {/* Main Data Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-slate-950/40 border border-white/[0.08] rounded-[2rem] overflow-hidden backdrop-blur-xl shadow-2xl"
      >
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Auth ID</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Distributor Entity</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Value (PKR)</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Protocol</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" /></td></tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredOrders.map((order, idx) => (
                    <motion.tr 
                      key={order?.id || `row-${idx}`} 
                      layout
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-b border-white/[0.03] hover:bg-emerald-500/[0.02] transition-colors group"
                    >
                      <td className="p-6 font-mono text-sm text-emerald-400 font-bold tracking-tighter">#{order.id}</td>
                      <td className="p-6 text-sm font-bold uppercase text-slate-300">{order.distributor}</td>
                      <td className="p-6 text-sm font-black italic text-white">
                        {Number(order.total || 0).toLocaleString()}
                      </td>
                      <td className="p-6">
                        <span className={cn(
                          "flex items-center gap-2 text-[9px] font-black px-3 py-1 rounded-full border uppercase w-fit",
                          order.shipStatus === 'DRAFT' ? "border-amber-500/20 bg-amber-500/10 text-amber-500" : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        )}>
                          <div className={cn("w-1 h-1 rounded-full animate-pulse", order.shipStatus === 'DRAFT' ? "bg-amber-500" : "bg-emerald-500")} />
                          {order.shipStatus}
                        </span>
                      </td>
                      <td className="p-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handlePrint(order.id)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"><Printer size={16} /></button>
                          <button onClick={() => setEditTarget(order)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-emerald-400 transition-all"><Edit2 size={16} /></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Futuristic Update Modal */}
      <AnimatePresence>
        {editTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#050b1d] border border-white/10 rounded-[2.5rem] p-8 shadow-3xl overflow-hidden"
            >
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 blur-[100px]" />
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h2 className="text-xl font-black italic uppercase flex items-center gap-3">
                  <Edit2 className="text-emerald-500" /> Manifest Override
                </h2>
                <button onClick={() => setEditTarget(null)} className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-500"><X size={20}/></button>
              </div>
              <div className="space-y-6 relative z-10">
                <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Entity Reference</p>
                    <p className="text-white font-bold uppercase">{editTarget.distributor}</p>
                </div>
                <button 
                  onClick={() => setEditTarget(null)} 
                  className="w-full py-4 bg-emerald-600 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <Save size={16} className="inline mr-2" /> Re-Sign & Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}