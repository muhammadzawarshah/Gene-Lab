"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  FileText, Search, Filter, ArrowUpRight, 
  CheckCircle2, AlertCircle, CreditCard,
  Download, Calendar, Landmark, X, Loader2, ShieldCheck
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
type InvoiceStatus = 'Unpaid' | 'Partially Paid' | 'Paid' | 'All';

interface Invoice {
  id: string;
  poRef: string;
  dueDate: string;
  totalAmount: string;
  paidAmount: string;
  balance: string;
  status: Exclude<InvoiceStatus, 'All'>;
}

const statusStyles: Record<Exclude<InvoiceStatus, 'All'>, { text: string; bg: string; dot: string }> = {
  'Unpaid': { text: 'text-rose-400', bg: 'bg-rose-500/10', dot: 'bg-rose-500' },
  'Partially Paid': { text: 'text-amber-400', bg: 'bg-amber-500/10', dot: 'bg-amber-500' },
  'Paid': { text: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<InvoiceStatus>('All');
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Security Config ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const currentUserId = Cookies.get('userId');
  const token = Cookies.get('auth_token');

  const secureApi = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'x-user-id': currentUserId,
      'Content-Type': 'application/json'
    }
  });

  // --- Fetch Invoices from Backend ---
  const fetchInvoices = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      // Sanitize input before sending to prevent Query String Injection
      const sanitizedSearch = encodeURIComponent(searchQuery.trim());
      const res = await secureApi.get(`/finance/invoices?userId=${currentUserId}&status=${activeFilter}&search=${sanitizedSearch}`);
      setInvoices(res.data);
    } catch (err: any) {
      toast.error("LEDGER ERROR", { description: "Failed to sync financial data with central bank." });
    } finally {
      setLoading(false);
    }
  }, [activeFilter, searchQuery, currentUserId]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchInvoices();
    }, 400); // Protection against Rapid Request Flooding
    return () => clearTimeout(delayDebounceFn);
  }, [fetchInvoices]);

  // --- Secure PDF Download Logic ---
  const handleDownload = async (id: string) => {
    try {
      setIsDownloading(id);
      const response = await secureApi.get(`/finance/generate-invoice-pdf/${id}`, {
        responseType: 'blob', // Securely handle binary file data
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${id}_VIRTUE_OS.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success("DECRYPTION COMPLETE", { description: "Encrypted Invoice PDF generated successfully." });
    } catch (err) {
      toast.error("DOWNLOAD FAILED", { description: "Integrity check failed during PDF generation." });
    } finally {
      setIsDownloading(null);
    }
  };

  const totalOutstanding = useMemo(() => {
    return invoices
      .filter(i => i.status !== 'Paid')
      .reduce((acc, curr) => acc + parseFloat(curr.balance.replace(/,/g, '')), 0);
  }, [invoices]);

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* --- FINANCIAL OVERVIEW HEADER --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-2xl shadow-blue-900/20"
        >
          <div className="relative z-10 flex flex-col md:flex-row justify-between h-full">
            <div>
              <p className="text-blue-100/60 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Total Payable Balance</p>
              <h1 className="text-4xl font-black text-white italic tracking-tighter mb-4">
                PKR {totalOutstanding.toLocaleString()}
              </h1>
              <div className="flex gap-4">
                <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-white border border-white/10 flex items-center gap-2">
                   <ShieldCheck size={12} className="text-blue-200" /> Secure Financial Node
                </span>
                <span className="px-3 py-1 bg-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-300 border border-emerald-500/20">Active Line</span>
              </div>
            </div>
            <div className="mt-6 md:mt-0 flex items-end">
               <button className="px-6 py-3 bg-white text-blue-900 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-blue-50 transition-all shadow-xl shadow-black/20">
                 Settlement Portal <ArrowUpRight size={14} />
               </button>
            </div>
          </div>
          <Landmark className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/5 -rotate-12 pointer-events-none" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-center backdrop-blur-md"
        >
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4">Last Verified Transaction</p>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
              <CheckCircle2 className="text-emerald-500 w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white italic tracking-tighter">Verified</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Audit Trail Synced 100%</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* --- CONTROLS --- */}
      <div className="max-w-7xl mx-auto mb-8 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/[0.02] border border-white/5 p-4 rounded-[2rem]">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH BY ID OR PO REFERENCE..." 
              className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl py-3 pl-14 pr-10 text-[10px] font-black tracking-widest outline-none focus:border-blue-500/50 transition-all text-white placeholder:text-slate-700"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex p-1 bg-[#0a0f1d] border border-white/10 rounded-2xl overflow-x-auto no-scrollbar">
            {['All', 'Unpaid', 'Partially Paid', 'Paid'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f as InvoiceStatus)}
                className={cn(
                  "px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  activeFilter === f ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* --- INVOICE LEDGER --- */}
        <div className="grid grid-cols-1 gap-4 min-h-[400px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
               <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
               <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Verifying Blockchain Ledger...</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {invoices.length > 0 ? invoices.map((inv, index) => {
                const style = statusStyles[inv.status] || statusStyles['Unpaid'];
                return (
                  <motion.div
                    key={inv.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group bg-[#050b1d] border border-white/5 rounded-[2rem] p-6 hover:border-blue-500/30 transition-all flex flex-wrap lg:flex-nowrap items-center justify-between gap-6"
                  >
                    <div className="flex items-center gap-6 w-full lg:w-auto lg:min-w-[250px]">
                      <div className="p-4 bg-white/[0.02] rounded-2xl group-hover:bg-blue-600/10 transition-colors">
                        <CreditCard className="text-slate-500 group-hover:text-blue-500 transition-colors" size={24} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-white italic tracking-tighter">{inv.id}</h4>
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
                          Ref: <span className="text-blue-500/80">{inv.poRef}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-8 px-6 border-l border-white/5">
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Due</p>
                        <p className="text-sm font-black text-white italic">PKR {inv.totalAmount}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Paid</p>
                        <p className="text-sm font-black text-emerald-500 italic">PKR {inv.paidAmount}</p>
                      </div>
                      <div className="hidden md:block">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Balance</p>
                        <p className={cn("text-sm font-black italic", inv.balance === "0" ? "text-slate-600" : "text-rose-500 underline decoration-rose-500/30 underline-offset-4")}>
                          PKR {inv.balance}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-10 w-full lg:w-auto justify-between lg:justify-end">
                      <div className="text-right">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Due Date</p>
                          <div className="flex items-center gap-2 justify-end text-xs font-bold text-slate-400 italic">
                            <Calendar size={12} className="text-slate-600" /> {inv.dueDate}
                          </div>
                      </div>

                      <div className={cn("px-4 py-2 rounded-xl flex items-center gap-3 border border-white/5", style.bg)}>
                          <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", style.dot)} />
                          <span className={cn("text-[10px] font-black uppercase tracking-widest italic", style.text)}>{inv.status}</span>
                      </div>

                      <button 
                        onClick={() => handleDownload(inv.id)}
                        disabled={isDownloading === inv.id}
                        className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-slate-500 hover:text-white hover:bg-white/5 transition-all min-w-[50px] flex items-center justify-center"
                      >
                        {isDownloading === inv.id ? <Loader2 size={18} className="animate-spin text-blue-500" /> : <Download size={18} />}
                      </button>
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="text-center py-20 border border-dashed border-white/10 rounded-[3rem] w-full">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">No synchronization found for this filter</p>
                </div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      <div className="mt-12 max-w-7xl mx-auto p-6 rounded-3xl bg-rose-500/5 border border-rose-500/10 flex items-center gap-4">
        <AlertCircle className="text-rose-500 w-5 h-5 shrink-0" />
        <p className="text-[10px] font-bold text-rose-500/80 uppercase tracking-widest italic leading-relaxed">
          Critical Notice: All transactions are logged under the 2026 Procurement Act. Discrepancies should be reported to the Finance Node Alpha immediately.
        </p>
      </div>
    </div>
  );
}