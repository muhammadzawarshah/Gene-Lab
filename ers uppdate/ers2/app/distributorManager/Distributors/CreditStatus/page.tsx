"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  ShieldAlert, Search, CreditCard, 
  History, TrendingDown, TrendingUp, AlertTriangle,
  CheckCircle2, Info, X, Save, Loader2, Edit3, Lock, Unlock
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- API CONFIG ---
const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

interface CreditNode {
  id: string;
  entity: string;
  limit: string;
  used: string;
  available: string;
  risk: 'Low' | 'Medium' | 'Critical';
  lastPayment: string;
  health: number;
  status: 'Active' | 'Blocked';
}

export default function CreditStatusPage() {
  const [creditData, setCreditData] = useState<CreditNode[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<CreditNode | null>(null);

  // Auth Context
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

  // Security: Clean input against SQL/XSS
  const sanitize = (val: string) => val.replace(/[<>{}[\]\\^`|]/g, "").trim();

  // --- FETCH CREDIT DATA ---
  const fetchCreditMatrix = async () => {
    setIsLoading(true);
    try {
      const res = await secureApi.get('/credit/surveillance');
      setCreditData(res.data);
    } catch (err) {
      toast.error("SECURITY_CLEARANCE_REQUIRED", { description: "Failed to fetch market exposure data." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchCreditMatrix(); }, []);

  // --- PROTOCOL ACTIONS ---
  const toggleSupplyStatus = async (id: string, currentStatus: string) => {
    const action = currentStatus === 'Active' ? 'BLOCK' : 'RESTORE';
    if (!confirm(`CONFIRM: ${action} supply protocol for this entity?`)) return;

    const tId = toast.loading(`EXECUTING_${action}_PROTOCOL...`);
    try {
      await secureApi.patch(`/credit/nodes/${id}/status`, { 
        status: currentStatus === 'Active' ? 'Blocked' : 'Active',
        operatorId: currentUserId 
      });
      
      setCreditData(prev => prev.map(n => n.id === id ? { ...n, status: currentStatus === 'Active' ? 'Blocked' : 'Active' } : n));
      toast.success("PROTOCOL_UPDATED", { id: tId });
    } catch (err) {
      toast.error("PROTOCOL_REJECTED", { id: tId });
    }
  };

  const handleUpdateCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode) return;

    const tId = toast.loading("SYNCHRONIZING_CREDIT_LIMITS...");
    try {
      const payload = {
        limit: sanitize(editingNode.limit),
        entity: sanitize(editingNode.entity),
        risk: editingNode.risk
      };

      await secureApi.put(`/credit/nodes/${editingNode.id}`, payload);
      setCreditData(prev => prev.map(n => n.id === editingNode.id ? { ...n, ...payload } : n));
      
      setIsModalOpen(false);
      toast.success("CREDIT_MATRIX_RECALIBRATED", { id: tId });
    } catch (err) {
      toast.error("MATRIX_UPDATE_FAILED", { id: tId });
    }
  };

  const filteredNodes = useMemo(() => {
    return creditData.filter(n => 
      n.entity.toLowerCase().includes(searchTerm.toLowerCase()) || 
      n.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [creditData, searchTerm]);

  // --- SUMMARY STATS ---
  const stats = useMemo(() => {
    const total = creditData.reduce((acc, n) => acc + parseFloat(n.used.replace(/,/g, '')), 0);
    const atRisk = creditData.filter(n => n.risk === 'Critical').length;
    return { exposure: total.toLocaleString(), riskNodes: atRisk };
  }, [creditData]);

  if (isLoading) return (
    <div className="h-96 flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-rose-500 animate-spin" />
      <p className="text-rose-500 font-black text-[10px] tracking-[0.5em] uppercase">Scanning Risk Nodes...</p>
    </div>
  );

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12 p-4">
      <Toaster theme="dark" position="top-right" richColors />
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <ShieldAlert className="text-rose-500 w-8 h-8" />
            Credit Surveillance
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            Real-time Risk Analysis <span className="text-rose-500/50">|</span> Op ID: {currentUserId}
          </p>
        </motion.div>

        <div className="flex flex-wrap gap-3">
           <div className="relative w-full sm:w-72 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-rose-500 transition-colors" />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Scan Credit Profile..." 
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-rose-500/50 outline-none transition-all font-bold uppercase"
              />
           </div>
           <button className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500/20 transition-all">
              <TrendingDown size={14} /> Critical Defaulters ({stats.riskNodes})
           </button>
        </div>
      </div>

      

      {/* Exposure Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Market Exposure', value: stats.exposure, icon: TrendingUp, color: 'text-blue-500' },
          { label: 'Risk Nodes', value: stats.riskNodes, icon: AlertTriangle, color: 'text-amber-500' },
          { label: 'Operator Clearance', value: 'Level 4', icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Data Integrity', value: 'Verified', icon: History, color: 'text-rose-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-[2rem] backdrop-blur-md">
            <stat.icon className={cn("w-5 h-5 mb-3", stat.color)} />
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-xl font-black text-white italic tracking-tighter">PKR {stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Credit Matrix Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-950/40 border border-white/[0.08] rounded-[2.5rem] overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1100px]">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.01]">
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Partner Entity</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Credit Limit</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Utilization</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Health Index</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Risk Status</th>
                <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Protocol Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredNodes.map((node, idx) => (
                  <motion.tr layout key={node.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-white/[0.03] hover:bg-white/[0.01] transition-colors group">
                    <td className="p-6">
                      <div className="flex flex-col">
                         <span className="text-sm font-black text-white uppercase italic">{node.entity}</span>
                         <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mt-1">Ref ID: {node.id}</span>
                      </div>
                    </td>
                    <td className="p-6 text-xs font-mono font-bold text-slate-400">PKR {node.limit}</td>
                    <td className="p-6 text-sm font-black text-white italic">PKR {node.used}</td>
                    <td className="p-6">
                      <div className="flex items-center gap-3 w-32">
                         <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${node.health}%` }} className={cn("h-full rounded-full", node.health > 70 ? "bg-emerald-500" : node.health > 40 ? "bg-amber-500" : "bg-rose-500")} />
                         </div>
                         <span className="text-[10px] font-black text-white">{node.health}%</span>
                      </div>
                    </td>
                    <td className="p-6">
                      <div className={cn("text-[8px] font-black px-3 py-1 rounded-full border w-fit uppercase tracking-widest", node.risk === 'Low' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : node.risk === 'Medium' ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse")}>
                        {node.risk} Risk
                      </div>
                    </td>
                    <td className="p-6">
                      <div className="flex items-center justify-center gap-2">
                         <button onClick={() => { setEditingNode(node); setIsModalOpen(true); }} className="p-2 hover:bg-blue-500/20 rounded-xl text-slate-500 hover:text-blue-400 transition-all"><Edit3 size={16} /></button>
                         <button 
                          onClick={() => toggleSupplyStatus(node.id, node.status)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[9px] font-black transition-all border uppercase",
                            node.status === 'Active' ? "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500 hover:text-white" : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
                          )}
                         >
                            {node.status === 'Active' ? <Lock size={12}/> : <Unlock size={12}/>}
                            {node.status === 'Active' ? 'Stop Supply' : 'Restore'}
                         </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Advisory Section */}
      <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-[2.5rem] flex items-center gap-6 shadow-inner">
          <div className="p-4 bg-amber-500/10 rounded-2xl"><Info className="text-amber-500" size={24} /></div>
          <div>
            <h4 className="text-white text-xs font-black uppercase tracking-widest">Risk Mitigation Advisory</h4>
            <p className="text-slate-500 text-[10px] font-bold uppercase leading-relaxed mt-1">
              Supply blockade is <span className="text-rose-500 underline">mandatory</span> for entities exceeding 90% utilization. Current Operator clearance allows manual limit adjustments up to PKR 5M.
            </p>
          </div>
      </div>

      {/* --- EDIT CREDIT MODAL --- */}
      <AnimatePresence>
        {isModalOpen && editingNode && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
            <motion.form 
              onSubmit={handleUpdateCredit}
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 shadow-3xl"
            >
              <h2 className="text-xl font-black text-white italic uppercase mb-6 flex items-center gap-3">
                <CreditCard className="text-blue-500" /> Adjust Credit Matrix
              </h2>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase">Partner Entity</label>
                  <input readOnly value={editingNode.entity} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-slate-400 font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase">Revised Credit Limit (PKR)</label>
                  <input required value={editingNode.limit} onChange={e => setEditingNode({...editingNode, limit: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-bold outline-none focus:border-blue-500" />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase">Risk Calibration</label>
                  <select value={editingNode.risk} onChange={e => setEditingNode({...editingNode, risk: e.target.value as any})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-bold outline-none focus:border-blue-500">
                    <option value="Low">Low Risk</option>
                    <option value="Medium">Medium Risk</option>
                    <option value="Critical">Critical Risk</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-white/5 rounded-2xl font-black text-[10px] text-slate-500 uppercase hover:bg-white/10 transition-all">Abort</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase shadow-lg flex items-center justify-center gap-2">
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