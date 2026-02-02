"use client";

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  XCircle, Search, Filter, AlertTriangle, 
  RotateCcw, Trash2, Eye, Info, Save, X,
  FileWarning, ShieldAlert, Loader2,
  Edit2
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Data Structure matching Backend Response ---
interface RejectedOrder {
  id: string;
  distributor: string;
  date: string;
  total: string;
  reason: string;
  severity: string;
}

export default function RejectedOrdersPage() {
  const [orders, setOrders] = useState<RejectedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editTarget, setEditTarget] = useState<RejectedOrder | null>(null);

  // --- Backend Secure Connection ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const token = Cookies.get('virtue_token');

  const secureApi = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
    }
  });

  // --- 1. Load & Sanitize Rejected Logs ---
  const loadRejectedLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await secureApi.get('/api/v1/distribution/listsale');
      
      const rawData = res.data?.data || [];
      
      // Filter only REJECTED or CANCELLED orders
      const filteredRaw = rawData.filter((item: any) => 
        item.status === "REJECTED" || item.status === "CANCELLED"
      );

      const sanitizedData = filteredRaw.map((item: any) => ({
        id: String(item.so_id),
        distributor: String(item.party?.name || "Unknown Entity"),
        date: item.order_date ? new Date(item.order_date).toLocaleDateString() : 'N/A',
        total: Number(item.total_amount).toLocaleString(),
        // Backend mein 'remarks' ya 'reason' column check karein
        reason: item.remarks || "Policy Violation / Credit Limit Exceeded", 
        severity: Number(item.total_amount) > 50000 ? "Critical" : "Moderate"
      }));

      setOrders(sanitizedData);
    } catch (err) {
      toast.error("ACCESS_DENIED", { description: "Security clearance failed." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRejectedLogs(); }, [loadRejectedLogs]);

  // --- 2. Update Logic (UI Override) ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    try {
      toast.loading("Encrypting Override...");
      await secureApi.put(`/api/v1/distribution/update-status/${editTarget.id}`, {
        remarks: editTarget.reason,
        status: "REJECTED"
      });
      setOrders(prev => prev.map(o => o.id === editTarget.id ? editTarget : o));
      setEditTarget(null);
      toast.success("LOG_UPDATED", { description: "Rejection parameters modified." });
    } catch (err) {
      toast.error("UPDATE_FAILED");
    }
  };

  // --- 3. Purge Log ---
  const handlePurge = async (id: string) => {
    if (!confirm("CRITICAL: Permanent delete from archives?")) return;
    try {
      await secureApi.delete(`/api/v1/distribution/delete-order/${id}`);
      setOrders(prev => prev.filter(o => o.id !== id));
      toast.success("LOG_PURGED");
    } catch (err) {
      toast.error("PURGE_ERROR");
    }
  };

  // --- 4. Re-Open (Change status to DRAFT/PENDING) ---
  const handleReOpen = async (id: string) => {
    try {
      await secureApi.post(`/api/v1/distribution/update-status/${id}`, { status: 'DRAFT' });
      toast.success("NODE_RESTORED", { description: "Order moved back to Draft." });
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      toast.error("RESTORE_BLOCKED");
    }
  };

  const filtered = orders.filter(o => 
    o.id.includes(searchTerm) ||
    o.distributor.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto p-4 lg:p-10 min-h-screen bg-[#020617] text-white">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* Header (Same UI) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase flex items-center gap-3">
            <ShieldAlert className="text-rose-500 w-8 h-8" />
            Rejected Archives
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            Denied Transactions <span className="text-rose-500/50">|</span> Terminal Rejections: {filtered.length}
          </p>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-3">
           <div className="relative w-full sm:w-72 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-rose-500 transition-colors" />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search Rejection ID..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-rose-500/50 outline-none transition-all font-bold uppercase"
              />
           </div>
        </div>
      </div>

      {/* Main Table (Same UI) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-slate-950/40 border border-white/[0.08] rounded-[2rem] overflow-hidden backdrop-blur-xl shadow-2xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[1000px]">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Node ID</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Entity</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Reason</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Value</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Protocol</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-rose-500" /></td></tr>
              ) : filtered.length > 0 ? filtered.map((order, idx) => (
                <motion.tr 
                  key={order.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border-b border-white/[0.03] hover:bg-rose-500/[0.02] transition-colors group"
                >
                  <td className="p-6 font-mono text-sm text-rose-400 font-bold tracking-tighter">#{order.id}</td>
                  <td className="p-6 text-sm font-bold text-white uppercase">{order.distributor}</td>
                  <td className="p-6">
                    <div className="flex items-center gap-2 text-rose-200/70 italic text-[11px] font-bold">
                      <AlertTriangle size={12} className="text-rose-500" /> {order.reason}
                    </div>
                  </td>
                  <td className="p-6 text-sm font-black text-white italic">PKR {order.total}</td>
                  <td className="p-6">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleReOpen(order.id)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-emerald-500/20 text-white hover:text-emerald-500 rounded-lg text-[9px] font-black transition-all border border-white/10 uppercase tracking-tighter">
                        <RotateCcw size={12} /> Re-Open
                      </button>
                      <button onClick={() => setEditTarget(order)} className="p-2 hover:bg-blue-500/10 rounded-lg text-slate-400 hover:text-blue-400 transition-all"><Edit2 size={16} className="w-4 h-4"/></button>
                      <button onClick={() => handlePurge(order.id)} className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-500 transition-all"><Trash2 size={16} className="w-4 h-4"/></button>
                    </div>
                  </td>
                </motion.tr>
              )) : (
                <tr><td colSpan={5} className="p-20 text-center text-slate-600 uppercase text-[10px] font-black">No rejected archives found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Edit Modal & Analysis (Same UI) */}
      <AnimatePresence>
        {editTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/80">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0a0505] border border-rose-500/20 rounded-[2.5rem] p-8 shadow-3xl"
            >
              <div className="absolute top-0 right-0 p-6">
                <button onClick={() => setEditTarget(null)} className="text-slate-500 hover:text-white"><X size={24} /></button>
              </div>
              <h2 className="text-xl font-black text-white italic uppercase mb-6 flex items-center gap-3">
                <FileWarning className="text-rose-500" /> Log Override
              </h2>
              <form onSubmit={handleUpdate} className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Reason for Rejection</label>
                  <input 
                    type="text" 
                    value={editTarget.reason}
                    onChange={e => setEditTarget({...editTarget, reason: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-rose-500 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Severity Level</label>
                    <select 
                      value={editTarget.severity}
                      onChange={e => setEditTarget({...editTarget, severity: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-rose-500 uppercase text-xs font-bold"
                    >
                      <option value="Moderate">Moderate</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Value (PKR)</label>
                    <input 
                      type="text" 
                      value={editTarget.total}
                      onChange={e => setEditTarget({...editTarget, total: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-rose-600 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-500 shadow-lg shadow-rose-500/20 transition-all">
                  <Save size={16} /> Authenticate Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-12">
        <div className="bg-rose-500/5 border border-rose-500/10 p-6 rounded-[2rem] flex items-center gap-4">
           <div className="p-3 bg-rose-500/20 rounded-2xl"><FileWarning className="text-rose-500" size={24} /></div>
           <div>
             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rejection Nodes</p>
             <h4 className="text-xl font-black text-white italic">{orders.length}</h4>
           </div>
        </div>
        <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem] flex items-center gap-4 md:col-span-2">
           <Info className="text-blue-500" size={20} />
           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed">
             Security Protocol: All rejected nodes are read-only for sub-admins. 
             Only <span className="text-rose-500 underline">Authorized Security Officers</span> can purge logs.
           </p>
        </div>
      </div>
    </div>
  );
}