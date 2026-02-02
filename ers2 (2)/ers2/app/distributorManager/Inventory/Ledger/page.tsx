"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  History, ArrowUpRight, ArrowDownLeft, 
  Search, Database, RefreshCcw, Tag, 
  Edit3, Trash2, Save, ShieldCheck, Loader2 
} from 'lucide-react';
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

export default function StockLedger() {
  const [ledgerData, setLedgerData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  
  const [editingTxn, setEditingTxn] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  // --- SYNCED FETCH LOGIC ---
  const fetchLedger = async () => {
    try {
      setIsLoading(true);
      const res = await secureApi.get('/api/v1/inventory/ledger');
      console.log(res)
      
      // Backend mapping logic to ensure UI gets what it needs
      const mappedData = res.data.map((mov: any) => ({
        id: mov.id || `TXN-${mov.stock_mov_id}`,
        // Schema relations mapping
        item: mov.item || mov.product?.name || "Unknown Asset",
        warehouse: mov.warehouse || "Central Node",
        qty: mov.qty || `${mov.quantity}`,
        type: mov.type || (mov.warehouse_to_id ? 'Inbound' : 'Outbound'),
        date: mov.date || new Date(mov.posted_at).toLocaleDateString('en-GB'),
        status: mov.status || 'Verified',
        // Raw values for editing
        raw: mov 
      }));

      setLedgerData(mappedData);
    } catch (err) {
      toast.error("LEDGER_SYNC_ERROR", { description: "Handshake failed with Node." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLedger(); }, []);

  // --- ACTIONS ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const tId = toast.loading("REWRITING_LEDGER_ENTRY...");
    try {
      const sanitizedPayload = {
        ...editingTxn,
        item: sanitize(editingTxn.item),
        warehouse: sanitize(editingTxn.warehouse)
      };
      
      // Changed to match standard REST pattern
      await secureApi.put(`/inventory/ledger/${editingTxn.id.replace('TXN-', '')}`, sanitizedPayload);
      
      setLedgerData(prev => prev.map(t => t.id === editingTxn.id ? sanitizedPayload : t));
      toast.success("TRANSACTION_UPDATED", { id: tId });
      setIsEditModalOpen(false);
    } catch (err) {
      toast.error("WRITE_PERMISSION_DENIED", { id: tId });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("PURGE TRANSACTION?")) return;
    const tId = toast.loading("REMOVING_ENTRY...");
    try {
      await secureApi.delete(`/inventory/ledger/${id.replace('TXN-', '')}`);
      setLedgerData(prev => prev.filter(t => t.id !== id));
      toast.success("ENTRY_PURGED", { id: tId });
    } catch (err) {
      toast.error("DELETE_FAILED", { id: tId });
    }
  };

  const processedData = useMemo(() => {
    return ledgerData.filter(item => {
      const matchesSearch = (item.id?.toString().toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
                            (item.item?.toLowerCase() || "").includes(searchTerm.toLowerCase());
      const matchesFilter = filter === 'All' || item.type === filter || item.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [searchTerm, filter, ledgerData]);

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#020617] gap-4">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      <p className="text-blue-500 font-black uppercase tracking-[0.4em] text-xs">Decrypting Ledger Matrix...</p>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20 p-4 min-h-screen">
      <Toaster theme="dark" position="top-right" richColors />

      {/* Header Area */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <History className="text-blue-500 w-10 h-10" />
            Stock Ledger
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
            <Database size={12} className="text-blue-500/50" />
            SECURE LOG: {currentUserId || 'SESSION_UNSTABLE'}
          </p>
        </motion.div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search TXN ID or Item..." 
              className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-xs text-white outline-none focus:border-blue-500/50 w-full sm:w-80 transition-all font-bold uppercase tracking-wider"
            />
          </div>
          <button onClick={fetchLedger} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2">
            <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} /> Sync Logs
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {['All', 'Inbound', 'Outbound', 'Pending', 'Verified'].map((tag) => (
          <button
            key={tag}
            onClick={() => setFilter(tag)}
            className={cn(
              "px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all whitespace-nowrap",
              filter === tag ? "bg-blue-600 border-blue-500 text-white" : "bg-white/5 border-white/5 text-slate-500"
            )}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Ledger Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-950/40 border border-white/[0.08] rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Transaction Info</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Node Path</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Qty</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              <AnimatePresence mode="popLayout">
                {processedData.map((row) => (
                  <motion.tr layout key={row.id} className="group hover:bg-white/[0.02] transition-all">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-2.5 rounded-xl border", row.type === 'Inbound' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500")}>
                          {row.type === 'Inbound' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                        </div>
                        <div>
                          <p className="text-xs font-black text-white italic">{row.id}</p>
                          <p className="text-[9px] text-slate-600 font-bold">{row.date}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-xs font-bold text-slate-200 uppercase">{row.item}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase">
                        <Tag size={12} className="text-blue-500/50" /> {row.warehouse}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn("text-sm font-black italic", row.qty.toString().startsWith('+') ? "text-emerald-500" : "text-rose-500")}>{row.qty}</span>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border", row.status === 'Verified' ? "border-emerald-500/20 text-emerald-500" : "border-amber-500/20 text-amber-500")}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <div className="flex justify-end gap-2">
                         <button onClick={() => {setEditingTxn(row); setIsEditModalOpen(true);}} className="p-2 bg-white/5 hover:bg-blue-600 rounded-lg text-slate-400 hover:text-white transition-all"><Edit3 size={14}/></button>
                         <button onClick={() => handleDelete(row.id)} className="p-2 bg-white/5 hover:bg-rose-600 rounded-lg text-slate-400 hover:text-white transition-all"><Trash2 size={14}/></button>
                       </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-[#020617]/95 backdrop-blur-xl" />
            <motion.form 
              onSubmit={handleUpdate}
              initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 shadow-2xl"
            >
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter mb-8 flex items-center gap-3">
                <Edit3 className="text-blue-500" /> Adjust Transaction
              </h2>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Asset Nomenclature</label>
                  <input required value={editingTxn.item} onChange={(e) => setEditingTxn({...editingTxn, item: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-blue-500 font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Assigned Node</label>
                  <input required value={editingTxn.warehouse} onChange={(e) => setEditingTxn({...editingTxn, warehouse: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-blue-500 font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Quantity</label>
                    <input required value={editingTxn.qty} onChange={(e) => setEditingTxn({...editingTxn, qty: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-blue-500 font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Audit Status</label>
                    <select value={editingTxn.status} onChange={(e) => setEditingTxn({...editingTxn, status: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-4 text-xs text-white outline-none focus:border-blue-500 font-bold appearance-none bg-slate-800">
                      <option value="Verified">Verified</option>
                      <option value="Pending">Pending</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 flex items-center gap-3">
                  <ShieldCheck className="text-blue-400" size={16} />
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Hash integrity will be re-verified by Node {currentUserId}.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-10">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="py-4 bg-white/5 rounded-2xl font-black text-[10px] text-slate-500 uppercase tracking-widest">Cancel</button>
                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2">
                  <Save size={14} /> Commit Changes
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}