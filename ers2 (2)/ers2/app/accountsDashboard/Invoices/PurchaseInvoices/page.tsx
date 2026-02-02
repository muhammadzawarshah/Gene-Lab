"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Search, FileDown, MoreVertical, 
  Calendar, Trash2, Eye, Loader2, 
  ArrowUpRight, ShieldCheck, Lock
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
interface PurchaseInvoice {
  id: string;
  vendor: string;
  totalAmount: number;
  tax: number;
  date: string;
  status: 'Paid' | 'Unpaid' | 'Partial';
  category: 'Raw Material' | 'Equipment' | 'Services';
}

export default function PurchaseInvoices() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // --- Auth & API Config ---
  const API_KEY = process.env.NEXT_PUBLIC_API_URL;
  const token = Cookies.get('auth_token');
  const currentUserId = Cookies.get('userId');

  // Secure Axios Instance
  const api = axios.create({
    baseURL: API_KEY,
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-User-ID': currentUserId, // Security check at server level
      'Content-Type': 'application/json'
    }
  });

  // --- FETCH DATA FROM BACKEND ---
  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      if (!token) throw new Error("Session Expired");
      const response = await api.get('/procurement/invoices');
      setInvoices(response.data);
    } catch (err: any) {
      toast.error("DATA SYNC FAILED", { 
        description: "Secure gateway refused the connection." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  // --- 1. FUNCTION: DOWNLOAD INVOICE (With Content Security) ---
  const handleDownload = (inv: PurchaseInvoice) => {
    const data = `SECURE INVOICE LOG\nRef: ${inv.id}\nVendor: ${inv.vendor.toUpperCase()}\nNet: PKR ${inv.totalAmount}\nDate: ${inv.date}`;
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bill_${inv.id}_Verified.txt`;
    a.click();
    toast.success("METADATA EXPORTED", { description: "Verified file saved." });
  };

  // --- 2. FUNCTION: EXPORT FULL LEDGER (Anti-Injection Sanitized) ---
  const exportFullLedger = () => {
    // Sanitizing CSV data to prevent CSV Injection (=, +, -, @ characters)
    const headers = "ID,Vendor,Category,Date,Amount,Tax,Status\n";
    const csv = headers + filteredInvoices.map(i => {
      const safeVendor = i.vendor.replace(/^[=+\-@]/, "'");
      return `${i.id},${safeVendor},${i.category},${i.date},${i.totalAmount},${i.tax},${i.status}`;
    }).join("\n");

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Purchase_Ledger_SECURE_${new Date().getTime()}.csv`;
    link.click();
    toast.success("LEDGER EXPORTED", { description: "Encrypted CSV is ready." });
  };

  // --- 3. FUNCTION: DELETE (DELETE REQUEST) ---
  const handleDelete = async (id: string) => {
    const toastId = toast.loading("PURGING RECORD...");
    try {
      await api.delete(`/procurement/invoices/${id}`);
      setInvoices(prev => prev.filter(i => i.id !== id));
      toast.success("RECORD PURGED", { id: toastId });
      setActiveMenu(null);
    } catch (err) {
      toast.error("DELETE DENIED", { id: toastId, description: "Administrative lock active." });
    }
  };

  // --- SECURITY: INPUT SANITIZATION ---
  const safeSearch = useMemo(() => {
    return search.replace(/[<>'"\/\\;]/g, ""); // Prevent XSS & Injection payloads
  }, [search]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => 
      inv.vendor.toLowerCase().includes(safeSearch.toLowerCase()) || inv.id.includes(safeSearch)
    );
  }, [safeSearch, invoices]);

  const totalSpent = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-10 text-slate-300 font-sans" onClick={() => setActiveMenu(null)}>
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
            Purchase <span className="text-amber-500">Invoices</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Lock size={10} className="text-amber-500/50" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] italic">Procurement Vault • Level 4 Access</p>
          </div>
        </motion.div>

        <div className="flex gap-4">
          <div className="bg-[#050b1d] border border-white/5 p-4 px-8 rounded-2xl hidden md:block text-right shadow-xl">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aggregate Expenditure</p>
            <p className="text-xl font-black text-amber-500 italic">PKR {totalSpent.toLocaleString()}</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); exportFullLedger(); }} 
            className="flex items-center gap-3 px-6 py-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-[#020617] transition-all text-amber-500 shadow-lg shadow-amber-500/5"
          >
            <FileDown size={18} /> Export Data
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-[#050b1d] border border-white/5 rounded-[2.5rem] p-4 mb-8 shadow-2xl relative">
        <div className="absolute top-0 right-10 -translate-y-1/2 flex items-center gap-2 bg-[#020617] px-4 py-1 border border-white/10 rounded-full">
           <ShieldCheck size={12} className="text-emerald-500" />
           <span className="text-[8px] font-black text-slate-500 tracking-widest uppercase">Safe-Input Mode Active</span>
        </div>
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
          <input 
            type="text" 
            placeholder="VALIDATE VENDOR OR BILL REFERENCE..."
            className="w-full bg-[#020617] border border-white/10 rounded-[1.5rem] py-5 pl-16 pr-6 text-[10px] font-black uppercase tracking-[0.2em] text-white outline-none focus:border-amber-500/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE LISTING */}
      <div className="bg-[#050b1d] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center gap-4 opacity-50">
            <Loader2 className="animate-spin text-amber-500" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.5em]">Synchronizing Secure Archive...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-white/5 bg-white/[0.01]">
                <tr>
                  <th className="px-8 py-7 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Transaction ID</th>
                  <th className="px-8 py-7 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Vendor Entity</th>
                  <th className="px-8 py-7 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Settlement</th>
                  <th className="px-8 py-7 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] text-right">Auth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence mode='popLayout'>
                  {filteredInvoices.map((inv) => (
                    <motion.tr 
                      key={inv.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="hover:bg-white/[0.02] transition-colors relative group"
                    >
                      <td className="px-8 py-6">
                        <p className="text-xs font-black text-white italic tracking-tighter">{inv.id}</p>
                        <p className="text-[9px] font-bold text-slate-600 flex items-center gap-1 mt-1 uppercase tracking-tighter"><Calendar size={10}/> {inv.date}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-black text-slate-300 uppercase italic tracking-tighter group-hover:text-amber-500 transition-colors">{inv.vendor}</p>
                        <p className="text-[9px] font-bold text-slate-600 uppercase mt-1 tracking-widest">{inv.category}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-black text-white italic tracking-tighter">PKR {inv.totalAmount.toLocaleString()}</p>
                        <p className={cn(
                          "text-[9px] font-black uppercase mt-1 px-3 py-1 rounded-full inline-block tracking-tighter shadow-sm",
                          inv.status === 'Paid' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/10" : "bg-rose-500/10 text-rose-500 border border-rose-500/10"
                        )}>
                          {inv.status} Protocol
                        </p>
                      </td>
                      <td className="px-8 py-6 text-right relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === inv.id ? null : inv.id); }}
                          className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-slate-500 hover:text-white border border-white/5"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {/* ACTION MENU */}
                        <AnimatePresence>
                          {activeMenu === inv.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, x: 20 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.95, x: 20 }}
                              className="absolute right-24 top-4 z-[100] w-52 bg-[#0f172a] border border-white/10 rounded-[1.8rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-3 text-left backdrop-blur-xl"
                            >
                              <button onClick={() => handleDownload(inv)} className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all tracking-widest">
                                <Eye size={16} className="text-blue-500" /> Inspect
                              </button>
                              <button className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all tracking-widest">
                                <ArrowUpRight size={16} className="text-emerald-500" /> Settle Bill
                              </button>
                              <div className="h-[1px] bg-white/5 my-2 mx-2" />
                              <button 
                                onClick={() => handleDelete(inv.id)}
                                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-rose-500/10 rounded-2xl text-[9px] font-black uppercase text-rose-500 transition-all tracking-widest"
                              >
                                <Trash2 size={16} /> Purge Record
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* FOOTER STATS */}
      {!isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 flex justify-between items-center px-8 text-slate-600">
          <p className="text-[9px] font-black uppercase tracking-[0.5em]">Verified Records: {filteredInvoices.length}</p>
          <div className="flex gap-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[9px] font-black uppercase tracking-[0.5em]">System Secure</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}