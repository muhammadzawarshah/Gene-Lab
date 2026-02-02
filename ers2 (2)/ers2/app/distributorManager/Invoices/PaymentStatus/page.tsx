"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  BarChart3, Search, Filter, CreditCard, 
  ArrowUpRight, AlertCircle, CheckCircle2, 
  Clock, Wallet, Landmark, MoreVertical, ChevronDown,
  Trash2, Edit3, X, Save, Loader2
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Interfaces ---
interface PaymentRecord {
  id: string;
  invoice: string;
  entity: string;
  total: number;
  paid: number;
  balance: number;
  status: string;
  date: string;
}

export default function PaymentStatusPage() {
  // --- State Management ---
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editTarget, setEditTarget] = useState<PaymentRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // --- Backend Security Configuration ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const currentUserId = Cookies.get('userId');
  const token = Cookies.get('auth_token');

  const secureApi = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'x-requester-id': currentUserId || 'unauthorized_node'
    }
  });

  // --- Core Functions ---

  // 1. Fetch Records on Load
  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const res = await secureApi.get('/finance/settlements');
        setRecords(res.data);
      } catch (err) {
        toast.error("PROTOCOL_ERROR", { description: "Failed to sync with financial ledger." });
      } finally {
        setLoading(false);
      }
    };
    loadTransactions();
  }, []);

  // 2. Sanitize & Filter Logic (Security focused)
  const filteredRecords = useMemo(() => {
    const cleanSearch = searchTerm.replace(/[<>'"%;()&+]/g, "").toLowerCase();
    return records.filter(record => {
      const matchesSearch = record.entity.toLowerCase().includes(cleanSearch) || 
                           record.id.toLowerCase().includes(cleanSearch);
      const matchesStatus = statusFilter === "All" || record.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchTerm, statusFilter, records]);

  // 3. Financial Calculations
  const metrics = useMemo(() => {
    const total = records.reduce((acc, r) => acc + r.total, 0);
    const settled = records.reduce((acc, r) => acc + r.paid, 0);
    return { total, settled, debt: total - settled };
  }, [records]);

  // 4. CRUD Actions
  const handleDelete = async (id: string) => {
    if (!confirm("Confirm transaction purge? This action is immutable.")) return;
    
    try {
      toast.loading("Purging record...");
      await secureApi.delete(`/finance/settlements/${id}`);
      setRecords(prev => prev.filter(r => r.id !== id));
      toast.dismiss();
      toast.success("RECORD_DELETED", { description: `Settlement ${id} has been removed.` });
    } catch (err) {
      toast.dismiss();
      toast.error("PURGE_FAILED", { description: "Unauthorized or network deadlock." });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    setIsProcessing(true);
    try {
      // Logic: Auto-calculate balance
      const updatedRecord = {
        ...editTarget,
        balance: editTarget.total - editTarget.paid,
        entity: editTarget.entity.replace(/[<>]/g, "") // Basic XSS check
      };

      await secureApi.put(`/finance/settlements/${editTarget.id}`, updatedRecord);
      setRecords(prev => prev.map(r => r.id === editTarget.id ? updatedRecord : r));
      setEditTarget(null);
      toast.success("METADATA_UPDATED", { description: "Financial node synced successfully." });
    } catch (err) {
      toast.error("SYNC_ERROR", { description: "Failed to commit changes to ledger." });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10 p-4 lg:p-10">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <Wallet className="text-blue-500 w-8 h-8 p-1 bg-blue-500/20 rounded-lg" />
            Cashflow Matrix
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            Receivables Ledger <span className="text-blue-500/50">|</span> Node ID: {currentUserId || 'GUEST'}
          </p>
        </motion.div>

        <div className="flex flex-wrap items-center gap-4">
            <div className="relative w-full sm:w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Secure Node..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-blue-500/50 outline-none transition-all font-bold uppercase"
              />
            </div>

            <div className="relative flex items-center bg-[#020617] rounded-2xl border border-white/10 overflow-hidden">
                <div className="pl-4 py-2 border-r border-white/10"><Filter size={14} className="text-blue-400" /></div>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-[10px] font-black text-white uppercase outline-none cursor-pointer pl-3 pr-10 py-2.5 appearance-none"
                >
                  <option value="All">All Transactions</option>
                  <option value="Paid">Settled</option>
                  <option value="Partially Paid">Partial Bridge</option>
                  <option value="Pending">Unresolved</option>
                </select>
                <ChevronDown size={12} className="absolute right-3 text-slate-500 pointer-events-none" />
            </div>
        </div>
      </div>

      {/* Financial Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Receivables', value: metrics.total, color: 'text-blue-500', bg: 'bg-blue-500/5', icon: Landmark },
          { label: 'Settled Amount', value: metrics.settled, color: 'text-emerald-500', bg: 'bg-emerald-500/5', icon: CheckCircle2 },
          { label: 'Outstanding Debt', value: metrics.debt, color: 'text-rose-500', bg: 'bg-rose-500/5', icon: AlertCircle },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className={cn("p-8 rounded-[2.5rem] border border-white/[0.05] backdrop-blur-xl relative overflow-hidden group", stat.bg)}>
            <stat.icon className={cn("absolute -right-4 -top-4 w-24 h-24 opacity-5 transition-opacity", stat.color)} />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
            <h3 className="text-2xl font-black text-white italic tracking-tighter">PKR {stat.value.toLocaleString()}</h3>
          </motion.div>
        ))}
      </div>

      {/* Main Status Table */}
      <motion.div layout className="bg-slate-950/40 border border-white/[0.08] rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-blue-500" size={40} />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Deciphering Ledger...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Settlement ID</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Distributor</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total Amount</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Paid</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Balance</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode='popLayout'>
                  {filteredRecords.map((pay) => (
                    <motion.tr key={pay.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-b border-white/[0.03] hover:bg-blue-500/[0.02] transition-colors group">
                      <td className="p-6 font-mono text-xs text-blue-400 font-bold">#{pay.id}</td>
                      <td className="p-6">
                        <span className="text-sm font-bold text-white uppercase">{pay.entity}</span>
                        <p className="text-[9px] text-slate-600 font-bold uppercase">{pay.date}</p>
                      </td>
                      <td className="p-6 text-sm font-black text-white italic">PKR {pay.total.toLocaleString()}</td>
                      <td className="p-6 text-sm font-black text-emerald-500 italic">PKR {pay.paid.toLocaleString()}</td>
                      <td className="p-6 text-sm font-black text-rose-500 italic">PKR {pay.balance.toLocaleString()}</td>
                      <td className="p-6">
                        <div className={cn("flex items-center gap-2 text-[9px] font-black px-3 py-1 rounded-full border w-fit uppercase tracking-widest", 
                          pay.status === 'Paid' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                          pay.status === 'Partially Paid' ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse")}>
                          {pay.status}
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center justify-center gap-2">
                           <button onClick={() => setEditTarget(pay)} className="p-2 hover:bg-blue-500/20 rounded-lg text-slate-400 hover:text-blue-400 transition-all"><Edit3 size={16}/></button>
                           <button onClick={() => handleDelete(pay.id)} className="p-2 hover:bg-rose-500/20 rounded-lg text-slate-400 hover:text-rose-400 transition-all"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#020617] border border-blue-500/20 rounded-[2.5rem] p-10 shadow-2xl">
              <button onClick={() => setEditTarget(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={24}/></button>
              <h2 className="text-xl font-black text-white italic uppercase mb-8 flex items-center gap-3"><Edit3 className="text-blue-500" /> Adjust Transaction</h2>
              
              <form onSubmit={handleUpdate} className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Distributor Entity</label>
                  <input type="text" value={editTarget.entity} onChange={e => setEditTarget({...editTarget, entity: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Gross Amount</label>
                  <input type="number" value={editTarget.total} onChange={e => setEditTarget({...editTarget, total: Number(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Allocated Payment</label>
                  <input type="number" value={editTarget.paid} onChange={e => setEditTarget({...editTarget, paid: Number(e.target.value)})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-emerald-400 font-bold outline-none focus:border-blue-500" />
                </div>
                <div className="col-span-2 pt-4">
                  <button type="submit" disabled={isProcessing} className="w-full py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-black text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                    {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Commit Ledger Sync</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}