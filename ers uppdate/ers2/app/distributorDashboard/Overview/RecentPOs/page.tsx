"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Search, Package, Loader2, RefreshCcw, ShieldCheck,
  AlertTriangle, ChevronLeft, ChevronRight, Eye, FileDown
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Security & Config ---
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

const statusStyles: any = {
  "Approved": "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]",
  "DRAFT": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Pending": "text-amber-400 bg-amber-500/10 border-amber-500/20",
  "Partially Delivered": "text-blue-400 bg-blue-500/10 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]",
};

export default function RecentPOs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [poData, setPoData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // --- Auth Logic: Ensured currentUserId is a STRING ---
  const token = Cookies.get('auth_token');
  const currentUserId = useMemo(() => {
    const rawUser = Cookies.get('virtue_user');
    if (!rawUser) return null;
    try {
      const parsed = JSON.parse(decodeURIComponent(rawUser));
      return String(parsed.id); // Convert to string to prevent .slice() error
    } catch (err) { 
      return null; 
    }
  }, []);

  const secureApi = useMemo(() => axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'x-user-id': currentUserId,
      'Content-Type': 'application/json'
    }
  }), [token, currentUserId]);

  // --- Data Fetching & Mapping ---
  const fetchPOs = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      const response = await secureApi.get(`/api/v1/distribution/listcust-sale/${currentUserId}`);
      
      // Mapping API response to UI Table structure
      const mappedData = (response.data.data || []).map((order: any) => ({
        db_id: order.so_id,
        id: `#SO-${order.so_id}`,
        date: new Date(order.order_date).toLocaleDateString('en-GB'),
        items: order.salesorderline?.length || 0,
        total: `PKR ${parseFloat(order.total_amount).toLocaleString()}`,
        status: order.status === 'DRAFT' ? 'Pending' : order.status,
        raw_status: order.status
      }));

      setPoData(mappedData);
    } catch (err: any) {
      console.error("Fetch Error:", err);
      toast.error("SYSTEM ERROR", { description: "Failed to fetch secure PO records." });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [currentUserId, secureApi]);

  useEffect(() => {
    fetchPOs();
  }, [fetchPOs]);

  // Client-side search logic
  const filteredPOs = useMemo(() => {
    return poData.filter(po => 
      po.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [poData, searchTerm]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchPOs();
  };

  return (
    <div className="min-h-screen p-8 text-slate-200 bg-[#020617] relative overflow-hidden">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* Background Decorative Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 relative z-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck size={14} className="text-blue-500" />
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em]">Secure Ledger v2.0</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white flex items-center gap-3">
            <Package className="text-blue-500 w-8 h-8" />
            Recent <span className="text-blue-500">Sales Orders</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
            <span className={cn("w-2 h-2 rounded-full", loading ? "bg-amber-500 animate-pulse" : "bg-blue-500")} />
            {loading ? "Synchronizing Data..." : "Encrypted Link Active"}
          </p>
        </motion.div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="SEARCH SECURE ID..."
              value={searchTerm}
              className="bg-white/[0.03] border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-xs font-bold tracking-widest outline-none focus:border-blue-500/50 w-full md:w-64 transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={handleManualRefresh} className="p-3 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/10 active:scale-95 transition-all">
            <RefreshCcw size={20} className={cn("text-slate-400", isRefreshing && "animate-spin text-blue-500")} />
          </button>
        </div>
      </div>

      {/* --- Main Table --- */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2.5rem] border border-white/5 bg-white/[0.01] backdrop-blur-3xl overflow-hidden shadow-2xl relative">
        <AnimatePresence>
          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#020617]/40 backdrop-blur-sm z-20 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Decrypting Records...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">PO Reference</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Timestamp</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Volume</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Net Amount</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filteredPOs.length > 0 ? (
                filteredPOs.map((po: any, index: number) => (
                  <motion.tr key={po.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="group hover:bg-blue-500/[0.02] transition-all">
                    <td className="px-8 py-6">
                      <span className="text-sm font-black text-white group-hover:text-blue-400 transition-colors tracking-tighter">{po.id}</span>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold text-slate-400 uppercase tracking-tighter">{po.date}</td>
                    <td className="px-8 py-6 text-xs font-bold text-slate-300">{po.items} <span className="text-[10px] text-slate-600 ml-1 uppercase">SKUs</span></td>
                    <td className="px-8 py-6 text-sm font-black text-white italic">{po.total}</td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border italic inline-flex items-center gap-2",
                        statusStyles[po.raw_status] || "text-slate-400 bg-slate-500/10 border-slate-500/20"
                      )}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {po.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 rounded-xl bg-white/5 hover:bg-blue-500/20 text-slate-400 hover:text-blue-400 border border-transparent hover:border-blue-500/30 transition-all">
                          <Eye size={16} />
                        </button>
                        <button className="p-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-transparent hover:border-emerald-500/30 transition-all">
                          <FileDown size={16} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              ) : !loading && (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <AlertTriangle size={40} />
                      <p className="text-xs font-black uppercase tracking-[0.3em]">No Secure Records Found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* --- Footer --- */}
        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-[10px] font-bold text-slate-500 uppercase italic">
            Active Node: <span className="text-blue-500">{currentUserId ? currentUserId.slice(0, 15) : "GUEST"}</span>
          </div>
          <div className="flex gap-2">
            <button className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"><ChevronLeft size={16} /></button>
            <button className="px-6 py-2 rounded-xl bg-blue-600 border border-blue-400/50 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95">Next Node</button>
            <button className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"><ChevronRight size={16} /></button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}