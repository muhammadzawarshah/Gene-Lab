"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Search, Truck, Printer, ArrowUpRight, BadgeCheck, 
  Edit2, Trash2, X, Save, Loader2, FileSpreadsheet 
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

export default function ApprovedOrdersPage() {
  const [orders, setOrders] = useState<ApprovedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editTarget, setEditTarget] = useState<ApprovedOrder | null>(null);

  // --- Secure Backend Config ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const currentUserId = Cookies.get('virtue_user');
  const token = Cookies.get('virtue_token');

  const secureApi = useMemo(() => axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'x-requester-id': currentUserId || 'unauthorized'
    }
  }), [token, API_URL, API_KEY, currentUserId]);

  // --- Fetch Approved Ledger ---
  const loadLedger = useCallback(async () => {
  try {
    setLoading(true);
    const res = await secureApi.get('/api/v1/distribution/listsale');
    
    // 1. Raw data fetch karein
    const rawData = res.data?.data || [];

    // 2. FILTER: Sirf wo orders lein jinka status 'APPROVED' hai
    // Note: Agar aapke DB mein status lowercase hai toh .toLowerCase() use karein
    const approvedOnly = rawData.filter((item: any) => 
      item?.status === "APPROVED" || item?.status === "Approved"
    );

    // 3. SANITIZE: Filtered data ko map karein
    const sanitizedData = approvedOnly.map((item: any) => ({
      id: String(item?.so_id || item?.id || ""),
      // Party object se name nikalna behtar hai agar backend bhej raha hai
      distributor: String(item?.party?.name || item?.party_id_customer || "UNKNOWN ENTITY"),
      date: item?.order_date ? new Date(item.order_date).toLocaleDateString() : 'N/A',
      items: Number(item?.salesorderline?.length || 0), // ERD ke mutabiq lines count
      total: String(item?.total_amount || "0"),
      shipStatus: String(item?.status || "Approved")
    }));

    setOrders(sanitizedData);
  } catch (err) {
    toast.error("LEDGER_FILTER_ERROR", { 
      description: "Failed to isolate approved transactions." 
    });
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => { loadLedger(); }, [loadLedger]);

  // --- Bulletproof Filter Logic ---
  const filtered = useMemo(() => {
    return orders.filter(o => {
      const search = searchTerm.toLowerCase();
      const id = (o.id || "").toLowerCase();
      const dist = (o.distributor || "").toLowerCase();
      return id.includes(search) || dist.includes(search);
    });
  }, [orders, searchTerm]);

  // --- Action Protocols ---
  const handleExport = async () => {
    try {
      toast.loading("Encrypting Manifest...");
      const res = await secureApi.get('/orders/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Manifest_${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      toast.dismiss();
      toast.success("MANIFEST_EXPORTED");
    } catch (err) {
      toast.dismiss();
      toast.error("EXPORT_FAILED");
    }
  };

  const handlePrint = (id: string) => {
    window.open(`${API_URL}/orders/print/${id}?auth=${token}`, '_blank');
  };

  const handleCreateDC = async (id: string) => {
    try {
      await secureApi.post(`/orders/generate-dc/${id}`);
      toast.success("DC_GENERATED");
      loadLedger();
    } catch (err) {
      toast.error("DC_GENERATION_ERROR");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    try {
      await secureApi.put(`/orders/approved/${editTarget.id}`, editTarget);
      setOrders(prev => prev.map(o => o.id === editTarget.id ? editTarget : o));
      setEditTarget(null);
      toast.success("LEDGER_UPDATED");
    } catch (err) {
      toast.error("OVERRIDE_REJECTED");
    }
  };

  const handlePurge = async (id: string) => {
    if (!window.confirm("Purge this record?")) return;
    try {
      await secureApi.delete(`/orders/approved/${id}`);
      setOrders(prev => prev.filter(o => o.id !== id));
      toast.success("RECORD_PURGED");
    } catch (err) {
      toast.error("PURGE_BLOCKED");
    }
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
            Authorized Nodes: {filtered.length}
          </p>
        </motion.div>

        <div className="flex flex-wrap gap-3">
           <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all">
              <FileSpreadsheet size={14} /> Export Manifest
           </button>
           <div className="relative w-full sm:w-64 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Scan Auth ID..." 
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-emerald-500/50 outline-none transition-all font-bold uppercase"
              />
           </div>
        </div>
      </div>

      {/* Main Table */}
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
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Ship Status</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Protocol Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" /></td></tr>
              ) : filtered.map((order, idx) => (
                <motion.tr 
                  key={order.id || idx} 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="border-b border-white/[0.03] hover:bg-emerald-500/[0.02] transition-colors group"
                >
                  <td className="p-6 font-mono text-sm text-emerald-400 font-bold tracking-tighter">#{order.id}</td>
                  <td className="p-6 text-sm font-bold uppercase text-slate-300">{order.distributor}</td>
                  <td className="p-6 text-sm font-black italic text-white">PKR {Number(order.total).toLocaleString()}</td>
                  <td className="p-6">
                    <span className={cn(
                      "flex items-center gap-2 text-[9px] font-black px-3 py-1 rounded-full border uppercase w-fit",
                      order.shipStatus.includes('Awaiting') ? "border-amber-500/20 bg-amber-500/10 text-amber-500" : "border-blue-500/20 bg-blue-500/10 text-blue-400"
                    )}>
                      <Truck size={10} /> {order.shipStatus}
                    </span>
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handlePrint(order.id)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"><Printer size={16} /></button>
                      <button onClick={() => setEditTarget(order)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-emerald-400 transition-all"><Edit2 size={16} /></button>
                      <button onClick={() => handlePurge(order.id)} className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-400 hover:text-rose-500 transition-all"><Trash2 size={16} /></button>
                      <button onClick={() => handleCreateDC(order.id)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg text-[9px] font-black uppercase border border-emerald-500/20 hover:bg-emerald-500 hover:text-black transition-all">
                        Create DC <ArrowUpRight size={12} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Edit Modal (Preserved) */}
      <AnimatePresence>
        {editTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#050b1d] border border-white/10 rounded-[2.5rem] p-8 shadow-3xl"
            >
              <h2 className="text-xl font-black italic uppercase mb-6 flex items-center gap-3 text-white">
                <Edit2 className="text-emerald-500" /> Manifest Override
              </h2>
              <form onSubmit={handleUpdate} className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Distributor Entity</label>
                  <input 
                    type="text" required value={editTarget.distributor}
                    onChange={e => setEditTarget({...editTarget, distributor: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Credits (PKR)</label>
                    <input 
                      type="text" value={editTarget.total}
                      onChange={e => setEditTarget({...editTarget, total: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Logistics Status</label>
                    <select 
                      value={editTarget.shipStatus}
                      onChange={e => setEditTarget({...editTarget, shipStatus: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-emerald-500 uppercase text-xs font-bold"
                    >
                      <option value="Processing">Processing</option>
                      <option value="Awaiting Pickup">Awaiting Pickup</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditTarget(null)} className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:bg-white/10 transition-all">Cancel</button>
                  <button type="submit" className="flex-[2] py-4 bg-emerald-600 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/20">
                    <Save size={16} /> Save Changes
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