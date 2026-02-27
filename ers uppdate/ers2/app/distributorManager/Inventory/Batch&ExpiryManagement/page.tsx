"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Hourglass, AlertTriangle, ShieldAlert, 
  Calendar, Search, Box, BarChart3, 
  RefreshCcw, MoveRight, CheckCircle2,
  Edit3, Trash2, Save, X, Loader2
} from 'lucide-react';
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

interface BatchRow {
  id: string;
  item: string;
  warehouse: string;
  batch: string;
  expiry: string;
  status: 'Critical' | 'Warning' | 'Safe';
  daysLeft: number;
  qty: string;
}

export default function ExpiryManagement() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [activeTab, setActiveTab] = useState('Critical');
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BatchRow | null>(null);

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

  const sanitize = (val: string) => val.replace(/[<>{}[\]\\^`|]/g, "").trim();

  // --- SYNCED FETCH LOGIC WITH YOUR BACKEND DATA ---
  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const res = await secureApi.get('/api/v1/product/expired-report');
      
      // Mapping your specific backend keys to the UI state
      const mappedData: BatchRow[] = res.data.data.map((b: any) => {
        const today = new Date();
        const expDate = b.expiryDate ? new Date(b.expiryDate) : new Date();
        const diffTime = expDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status: 'Critical' | 'Warning' | 'Safe' = 'Safe';
        if (daysLeft <= 30) status = 'Critical';
        else if (daysLeft <= 90) status = 'Warning';

        return {
          id: b.id.toString(),
          item: b.productName || "Unknown Product",
          warehouse: b.warehouseName || "Central Warehouse",
          batch: b.batch || "N/A",
          expiry: b.expiryDate ? new Date(b.expiryDate).toISOString().split('T')[0] : "N/A",
          qty: b.qty || "0",
          status: status,
          daysLeft: daysLeft
        };
      });

      setBatches(mappedData);
    } catch (err) {
      toast.error("LEDGER_FETCH_ERROR", { description: "Could not sync with inventory database." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, []);

  const handleDeleteBatch = async (id: string) => {
    if (!confirm("Decommission this batch?")) return;
    const tId = toast.loading("PURGING...");
    try {
      await secureApi.delete(`/inventory/batches/${id}`);
      setBatches(prev => prev.filter(b => b.id !== id));
      toast.success("BATCH_PURGED", { id: tId });
    } catch (err) {
      toast.error("ACTION_DENIED", { id: tId });
    }
  };

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;
    setIsUpdating(true);
    const tId = toast.loading("SYNCING...");
    try {
      await secureApi.put(`/inventory/batches/${editingBatch.id}`, editingBatch);
      setBatches(prev => prev.map(b => b.id === editingBatch.id ? editingBatch : b));
      setEditingBatch(null);
      toast.success("LEDGER_UPDATED", { id: tId });
    } catch (err) {
      toast.error("UPDATE_FAILED", { id: tId });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredData = useMemo(() => {
    return batches.filter(b => {
      const matchesTab = b.status === activeTab;
      const matchesSearch = b.batch.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            b.item.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [batches, activeTab, searchTerm]);

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#020617] gap-4">
      <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
      <p className="text-rose-500 font-black uppercase tracking-[0.4em] text-xs italic">Scanning Ledger Expiries...</p>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20 p-4 min-h-screen">
      <Toaster theme="dark" position="top-right" richColors />

      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <Hourglass className="text-rose-500 w-10 h-10 animate-pulse" />
            Batch & Expiry
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
            <ShieldAlert size={12} className="text-rose-500/50" />
            OPERATOR: {currentUserId || 'GUEST'} // LEDGER_LIVE
          </p>
        </motion.div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-1 flex gap-1">
             {['Critical', 'Warning', 'Safe'].map((tab) => (
               <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  activeTab === tab ? "bg-rose-600 text-white shadow-lg shadow-rose-900/20" : "text-slate-500 hover:text-white"
                )}
               >
                 {tab}
               </button>
             ))}
          </div>
          <button onClick={fetchBatches} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2">
            <RefreshCcw size={14} /> Re-Sync Ledger
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-950/40 border border-white/[0.08] rounded-[2.5rem] overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Inventory Batch Registry</h3>
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Batch # or SKU..." 
                className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-6 text-xs text-white outline-none focus:border-blue-500/50 w-full md:w-64 font-bold" 
              />
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Product Info</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Qty</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Expiry</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Life Expectancy</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              <AnimatePresence mode="popLayout">
                {filteredData.length > 0 ? filteredData.map((row) => (
                  <motion.tr layout key={row.id} className="group hover:bg-white/[0.02] transition-all">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-white/5 rounded-xl border border-white/10 flex items-center justify-center group-hover:border-blue-500/30 transition-all">
                            <Box size={20} className="text-slate-400" />
                         </div>
                         <div>
                            <p className="text-xs font-black text-white uppercase italic">{row.item}</p>
                            <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">Batch: {row.batch}</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-[10px] font-black text-white italic">{row.qty} Units</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                         <Calendar size={14} className="text-slate-600" />
                         <span className="text-xs font-bold text-white uppercase">{row.expiry}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="w-44 space-y-2">
                         <span className={cn("text-[8px] font-black uppercase flex justify-between", row.daysLeft < 30 ? "text-rose-500" : "text-slate-500")}>
                           <span>Time Remaining</span>
                           <span>{row.daysLeft}D</span>
                         </span>
                         <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }} 
                             animate={{ width: `${Math.min(100, Math.max(0, (row.daysLeft / 365) * 100))}%` }} 
                             className={cn("h-full", row.status === 'Critical' ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" : row.status === 'Warning' ? "bg-orange-500" : "bg-emerald-500")} 
                           />
                         </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => setEditingBatch(row)} className="p-2 bg-white/5 hover:bg-blue-600 rounded-lg text-slate-400 hover:text-white transition-all"><Edit3 size={14}/></button>
                         <button onClick={() => handleDeleteBatch(row.id)} className="p-2 bg-white/5 hover:bg-rose-600 rounded-lg text-slate-400 hover:text-white transition-all"><Trash2 size={14}/></button>
                       </div>
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-20 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest italic">
                      No Records found in {activeTab} status
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Edit Modal (Commit Changes) */}
      <AnimatePresence>
        {editingBatch && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditingBatch(null)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
            <motion.form 
              onSubmit={handleUpdateBatch}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 shadow-3xl"
            >
              <h2 className="text-2xl font-black text-white italic uppercase mb-8 flex items-center gap-3">
                <Edit3 className="text-rose-500" /> Modify Record
              </h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Batch Number</label>
                  <input value={editingBatch.batch} onChange={e => setEditingBatch({...editingBatch, batch: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-bold outline-none focus:border-rose-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Adjust Expiry Date</label>
                  <input type="date" value={editingBatch.expiry} onChange={e => setEditingBatch({...editingBatch, expiry: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-bold outline-none focus:border-rose-500" />
                </div>
              </div>
              <div className="flex gap-4 mt-10">
                <button type="button" onClick={() => setEditingBatch(null)} className="flex-1 py-4 bg-white/5 rounded-2xl font-black text-[10px] text-slate-500 uppercase">Dismiss</button>
                <button type="submit" disabled={isUpdating} className="flex-1 bg-rose-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-rose-900/20">
                  {isUpdating ? <Loader2 className="animate-spin mx-auto" size={16}/> : "Commit Sync"}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}