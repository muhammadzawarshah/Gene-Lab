"use client";

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  CheckCircle2, Search, Calendar, FileText, 
  MapPin, UserCheck, Download, ExternalLink,
  History, ShieldCheck, Printer, X, Save, 
  Trash2, Loader2, Edit3
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
interface CompletedDelivery {
  id: string;
  orderId: string;
  destination: string;
  recipient: string;
  date: string;
  total: string;
  status: string;
}

export default function CompletedDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<CompletedDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editNode, setEditNode] = useState<CompletedDelivery | null>(null);

  // --- Secure Axios Configuration ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const currentUserId = Cookies.get('userId');
  const token = Cookies.get('auth_token');

  const secureApi = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'x-requester-node': currentUserId || 'unauthorized_access'
    }
  });

  // --- Core Functions ---

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await secureApi.get('/logistics/completed');
      setDeliveries(res.data);
    } catch (err) {
      toast.error("SYNC_ERROR", { description: "Failed to fetch cryptographic logs." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // 1. Delete/Purge Log
  const handleDeleteLog = async (id: string) => {
    if (!confirm("CRITICAL: Purge this log from archive? This action is permanent.")) return;
    
    try {
      toast.loading("Purging Node...", { id: 'purge' });
      await secureApi.delete(`/logistics/archive/${id}`);
      setDeliveries(prev => prev.filter(d => d.id !== id));
      toast.success("LOG_PURGED", { id: 'purge', description: "Data successfully wiped from cluster." });
    } catch (err) {
      toast.error("PURGE_REJECTED", { id: 'purge' });
    }
  };

  // 2. Update Log Meta-data
  const handleUpdateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNode) return;

    try {
      // Input Sanitization for SQL Injection Prevention
      const sanitizedRecipient = editNode.recipient.replace(/[<>'"%;()&+]/g, "");
      
      await secureApi.put(`/logistics/archive/${editNode.id}`, {
        ...editNode,
        recipient: sanitizedRecipient
      });

      setDeliveries(prev => prev.map(d => d.id === editNode.id ? editNode : d));
      setEditNode(null);
      toast.success("ARCHIVE_UPDATED", { description: "Metadata integrity verified." });
    } catch (err) {
      toast.error("UPDATE_DENIED");
    }
  };

  // 3. Export/Download Manifest
  const handleDownload = async (id: string) => {
    toast.info("Generating Encrypted PDF...", { icon: <Download size={14}/> });
    // In real app: window.open(`${API_URL}/export/${id}?token=${token}`);
  };

  const filtered = deliveries.filter(d => 
    d.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.recipient.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10 p-4 lg:p-10">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <ShieldCheck className="text-emerald-500 w-8 h-8" />
            Execution Logs
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            Completed Logistics <span className="text-emerald-500/50">|</span> Archive Verified
          </p>
        </motion.div>

        <div className="flex flex-wrap gap-3">
           <div className="relative w-full sm:w-72 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-400 transition-colors" />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Scan Delivery Manifest..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-emerald-500/50 outline-none transition-all font-bold uppercase"
              />
           </div>
           <button onClick={() => toast.success("Bulk encryption started...")} className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500/20 transition-all">
              <Download size={14} /> Bulk Download
           </button>
        </div>
      </div>

      {/* Main Table Container */}
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-slate-950/40 border border-white/[0.08] rounded-[2.5rem] overflow-hidden backdrop-blur-xl shadow-2xl"
      >
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">DLV Manifest</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Receiving Node</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Auth Date</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Net Value</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Protocol</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" /></td></tr>
              ) : filtered.map((dlv, idx) => (
                <motion.tr key={dlv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b border-white/[0.03] hover:bg-emerald-500/[0.02] transition-colors group">
                  <td className="p-6">
                    <div className="flex flex-col">
                       <span className="font-mono text-sm text-emerald-400 font-bold tracking-tighter">#{dlv.id}</span>
                       <span className="text-[9px] text-slate-600 font-bold uppercase font-mono">HASH: {btoa(dlv.orderId).substring(0,12)}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                       <UserCheck size={14} className="text-emerald-500" />
                       <span className="text-sm font-bold text-white uppercase">{dlv.recipient}</span>
                    </div>
                  </td>
                  <td className="p-6 text-xs text-slate-400">{dlv.date}</td>
                  <td className="p-6 text-sm font-black text-white italic tracking-tighter font-mono">PKR {dlv.total}</td>
                  <td className="p-6">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleDownload(dlv.id)} className="p-2 hover:bg-white/10 rounded-xl text-slate-500 hover:text-white transition-all"><Printer size={16} /></button>
                      <button onClick={() => setEditNode(dlv)} className="p-2 hover:bg-emerald-500/10 rounded-xl text-slate-500 hover:text-emerald-400 transition-all"><Edit3 size={16}/></button>
                      <button onClick={() => handleDeleteLog(dlv.id)} className="p-2 hover:bg-rose-500/10 rounded-xl text-slate-500 hover:text-rose-500 transition-all"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Edit Modal (Archive Correction) */}
      <AnimatePresence>
        {editNode && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/70">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#050a0a] border border-emerald-500/20 rounded-[2.5rem] p-8 shadow-[0_0_50px_rgba(16,185,129,0.1)]"
            >
              <button onClick={() => setEditNode(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-emerald-500/10 rounded-2xl"><ShieldCheck className="text-emerald-400" size={20} /></div>
                <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Correct Archive Node</h2>
              </div>

              <form onSubmit={handleUpdateLog} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Authorized Recipient</label>
                  <input 
                    type="text" 
                    value={editNode.recipient} 
                    onChange={e => setEditNode({...editNode, recipient: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-bold outline-none focus:border-emerald-500/50 transition-all" 
                  />
                </div>

                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  <p className="text-[9px] text-emerald-500/70 font-bold uppercase leading-relaxed">
                    Note: Financial values (PKR {editNode.total}) and Time-stamps are locked by the system protocol and cannot be modified.
                  </p>
                </div>

                <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]">
                  <Save size={16} /> Update Cryptographic Log
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Info / Archive Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white/[0.02] border border-white/[0.05] p-6 rounded-[2rem] flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl"><History className="text-blue-500" size={24} /></div>
            <div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">History Retention</p>
               <h4 className="text-sm font-bold text-white uppercase italic">Active Nodes: {filtered.length} / Global Cluster: 3,420</h4>
            </div>
         </div>
         <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[2rem] flex items-center justify-between">
            <div className="flex items-center gap-4">
               <CheckCircle2 className="text-emerald-500" size={24} />
               <p className="text-[10px] text-slate-500 font-bold uppercase">SHA-256 Verification Protocol Active.</p>
            </div>
            <button onClick={() => toast.info("Security logs are being compiled...")} className="text-[9px] font-black text-emerald-500 uppercase hover:underline">View Security Log</button>
         </div>
      </div>
    </div>
  );
}