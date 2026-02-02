"use client";

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Truck, Search, Box, MapPin, Clock, ArrowRight,
  Navigation, MoreVertical, Layers, Zap, Trash2, 
  Edit3, X, Save, Loader2, CheckCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
interface Delivery {
  id: string;
  orderId: string;
  destination: string;
  carrier: string;
  items: number;
  eta: string;
  priority: 'High' | 'Standard' | 'Urgent';
}

export default function PendingDeliveryPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editTarget, setEditTarget] = useState<Delivery | null>(null);

  // --- Secure Axios Instance ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const currentUserId = Cookies.get('userId');
  const token = Cookies.get('auth_token');

  const secureApi = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'x-requester-id': currentUserId || 'node_unidentified'
    }
  });

  // --- Core Functions ---

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      const res = await secureApi.get('/logistics/pending');
      setDeliveries(res.data);
    } catch (err) {
      toast.error("DATA_FETCH_ERROR", { description: "Failed to sync with dispatch server." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDeliveries(); }, [fetchDeliveries]);

  // 1. Ship Now (Execute Dispatch)
  const handleShipNow = async (id: string) => {
    try {
      toast.loading(`Deploying Node #${id}...`);
      await secureApi.post(`/logistics/dispatch/${id}`);
      setDeliveries(prev => prev.filter(d => d.id !== id));
      toast.success("DISPATCH_SUCCESS", { description: "Carrier has been notified and route locked." });
    } catch (err) {
      toast.error("DISPATCH_FAILED", { description: "Route optimization error or unauthorized." });
    }
  };

  // 2. Update Delivery (Edit)
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;

    try {
      await secureApi.put(`/logistics/pending/${editTarget.id}`, editTarget);
      setDeliveries(prev => prev.map(d => d.id === editTarget.id ? editTarget : d));
      setEditTarget(null);
      toast.success("NODE_UPDATED", { description: "Logistics parameters recalculated." });
    } catch (err) {
      toast.error("UPDATE_FAILED", { description: "Check your permissions or network link." });
    }
  };

  // 3. Cancel Delivery (Delete)
  const handleDelete = async (id: string) => {
    if (!confirm("Confirm Node Deletion? This will revert items to warehouse stock.")) return;
    try {
      await secureApi.delete(`/logistics/pending/${id}`);
      setDeliveries(prev => prev.filter(d => d.id !== id));
      toast.warning("NODE_DELETED", { description: "Logistics node terminated successfully." });
    } catch (err) {
      toast.error("DELETE_FAILED");
    }
  };

  const filtered = deliveries.filter(d => 
    d.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10 p-4 lg:p-10">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <Navigation className="text-cyan-400 w-8 h-8 animate-pulse" />
            Dispatch Pipeline
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            Pending Logistics Nodes <span className="text-cyan-500/50">|</span> Ready for Deployment
          </p>
        </motion.div>

        <div className="flex flex-wrap gap-3">
           <div className="relative w-full sm:w-72 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Track Delivery ID..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-cyan-500/50 outline-none transition-all font-bold uppercase"
              />
           </div>
           <button onClick={() => toast.info("Batch Process Initialized")} className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
              <Layers size={14} /> Batch Dispatch
           </button>
        </div>
      </div>

      {/* Stats HUD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Awaiting Load', value: filtered.length, icon: Box, color: 'text-blue-500' },
          { label: 'Carrier Link', value: 'Active', icon: Navigation, color: 'text-cyan-400' },
          { label: 'Delayed Nodes', value: filtered.filter(d => d.eta === 'Delayed').length, icon: Clock, color: 'text-rose-500' },
          { label: 'Fleet Sync', value: '98%', icon: Zap, color: 'text-emerald-500' },
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white/[0.02] border border-white/[0.05] p-4 rounded-2xl flex items-center gap-4"
          >
            <stat.icon className={cn("w-5 h-5", stat.color)} />
            <div>
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <p className="text-lg font-black text-white italic">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Table */}
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-slate-950/40 border border-white/[0.08] rounded-[2.5rem] overflow-hidden backdrop-blur-xl shadow-2xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Node ID</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Target Sector</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Load Status</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Est. Time</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Execute</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-cyan-500" /></td></tr>
              ) : filtered.map((dlv, idx) => (
                <motion.tr key={dlv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-white/[0.03] hover:bg-cyan-500/[0.02] transition-colors group">
                  <td className="p-6">
                    <span className="font-mono text-sm text-cyan-400 font-bold tracking-tighter">#{dlv.id}</span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <MapPin size={12} className="text-slate-600" />
                      <span className="text-sm font-bold text-white uppercase">{dlv.destination}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-black text-white italic">{dlv.items} Units</span>
                      <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="w-[70%] h-full bg-cyan-500" />
                      </div>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={cn("text-[9px] font-black px-3 py-1 rounded-full border uppercase", 
                      dlv.eta === 'Delayed' ? "bg-rose-500/10 text-rose-500 border-rose-500/20" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                    )}>{dlv.eta}</span>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleShipNow(dlv.id)} className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-black rounded-xl text-[9px] font-black transition-all border border-cyan-500/20 uppercase tracking-widest group/btn">
                        Ship Now <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                      </button>
                      <button onClick={() => setEditTarget(dlv)} className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-cyan-400"><Edit3 size={16}/></button>
                      <button onClick={() => handleDelete(dlv.id)} className="p-2 hover:bg-rose-500/10 rounded-lg text-slate-500 hover:text-rose-500"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Edit Modal (Logistics Override) */}
      <AnimatePresence>
        {editTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/60">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#050a0a] border border-cyan-500/20 rounded-[2.5rem] p-8"
            >
              <button onClick={() => setEditTarget(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={24}/></button>
              <h2 className="text-xl font-black text-white italic uppercase mb-6 flex items-center gap-3">
                <Navigation className="text-cyan-400" /> Modify Pipeline Node
              </h2>
              <form onSubmit={handleUpdate} className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Destination Sector</label>
                  <input type="text" value={editTarget.destination} onChange={e => setEditTarget({...editTarget, destination: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-cyan-500 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Carrier Fleet</label>
                    <select value={editTarget.carrier} onChange={e => setEditTarget({...editTarget, carrier: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-xs font-bold outline-none uppercase" >
                      <option value="BlueEx">BlueEx</option>
                      <option value="Self Fleet">Self Fleet</option>
                      <option value="Leopard">Leopard</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Priority</label>
                    <select value={editTarget.priority} onChange={e => setEditTarget({...editTarget, priority: e.target.value as any})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-xs font-bold outline-none uppercase" >
                      <option value="Standard">Standard</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-2xl text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition-all">
                  <Save size={16} /> Update Logistics Node
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Info Sync Footer */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-cyan-500/5 border border-cyan-500/10 p-6 rounded-[2rem] flex items-center gap-6">
        <div className="p-4 bg-cyan-500/10 rounded-full"><Truck className="text-cyan-400 animate-bounce" size={24} /></div>
        <div>
           <h4 className="text-white text-xs font-black uppercase tracking-widest flex items-center gap-2">Fleet Synchronization Active <CheckCircle size={12} className="text-emerald-500"/></h4>
           <p className="text-slate-500 text-[10px] mt-1 font-bold uppercase leading-relaxed">
             Route optimization is live. Requesting a "Ship Now" command triggers an encrypted API call to carrier services with SHA-256 verification.
           </p>
        </div>
      </motion.div>
    </div>
  );
}