"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Search, Clock, CheckCircle2, MessageSquare, 
  MoreVertical, AlertTriangle, Calendar,
  ArrowUpRight, Download, Mail, Trash2, Loader2, ShieldCheck
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
interface PendingPayment {
  id: string;
  client: string;
  amount: number;
  dueDate: string;
  priority: 'High' | 'Medium' | 'Low';
  contact: string;
}

export default function PendingPayments() {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAction, setActiveAction] = useState<string | null>(null);

  // --- Backend Config ---
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = Cookies.get('auth_token');
  const userId = Cookies.get('userId');

  // --- FETCH DATA FROM BACKEND ---
  const fetchPendingPayments = async () => {
    setIsLoading(true);
    try {
      if (!token) throw new Error("Unauthorized");
      const response = await axios.get(`${API_BASE_URL}/accounts/pending`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { userId } // Sending userId for ownership verification
      });
      setPayments(response.data);
    } catch (err: any) {
      toast.error("VAULT ACCESS DENIED", { 
        description: err.response?.data?.message || "Failed to fetch outstanding records." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPendingPayments(); }, []);

  // --- SECURITY: SANITIZE SEARCH (Anti-Injection) ---
  const safeSearch = useMemo(() => {
    return searchTerm.replace(/[<>'"\/\\;]/g, ""); // Stripping dangerous characters
  }, [searchTerm]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => 
      p.client.toLowerCase().includes(safeSearch.toLowerCase()) || p.id.includes(safeSearch)
    );
  }, [safeSearch, payments]);

  // --- FUNCTIONS ---

  const calculateAging = (date: string) => {
    const diff = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 3600 * 24));
    return diff > 0 ? `${diff} Days Overdue` : "Due Soon";
  };

  const handleMarkAsPaid = async (id: string) => {
    const toastId = toast.loading("UPDATING LEDGER...");
    try {
      await axios.post(`${API_BASE_URL}/accounts/mark-paid`, 
        { invoiceId: id, processedBy: userId },
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      
      setPayments(prev => prev.filter(p => p.id !== id));
      toast.success("PAYMENT VERIFIED", { id: toastId, description: "Moved to paid archive." });
      setActiveAction(null);
    } catch (err) {
      toast.error("TRANSACTION FAILED", { id: toastId });
    }
  };

  const handleCancelInvoice = async (id: string) => {
    if(!confirm("Are you sure? This will void the invoice forever.")) return;
    
    const toastId = toast.loading("VOID IN PROGRESS...");
    try {
      await axios.delete(`${API_BASE_URL}/accounts/void-invoice/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
        data: { userId }
      });
      
      setPayments(prev => prev.filter(p => p.id !== id));
      toast.success("INVOICE VOIDED", { id: toastId });
      setActiveAction(null);
    } catch (err) {
      toast.error("VOID ACTION REJECTED", { id: toastId });
    }
  };

  const handleDownloadReport = () => {
    // CSV Injection Protection: Prefixing data with ' to prevent Excel from executing it
    const headers = "Invoice ID,Client,Amount,Due Date,Status\n";
    const rows = filteredPayments.map(p => {
      const safeClient = p.client.replace(/^[=+\-@]/, "'$&"); 
      return `${p.id},${safeClient},${p.amount},${p.dueDate},Pending`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Risk_Assessment_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.info("REPORT GENERATED", { description: "Secure CSV saved to your device." });
  };

  const handleWhatsApp = (payment: PendingPayment) => {
    const msg = `Respected ${payment.client}, a payment of PKR ${payment.amount.toLocaleString()} is pending (Ref: ${payment.id}). Please clear it soon. Thanks!`;
    window.open(`https://wa.me/${payment.contact}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const totalPending = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans" onClick={() => setActiveAction(null)}>
      <Toaster position="top-center" theme="dark" richColors />

      {/* HEADER & TOTALS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
            Outstanding <span className="text-rose-500">Receivables</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2 italic">
            Risk Analysis • {filteredPayments.length} Overdue Envelopes
          </p>
        </motion.div>

        <div className="bg-[#050b1d] border border-white/5 p-6 rounded-[2.5rem] flex items-center gap-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10"><ShieldCheck size={40} /></div>
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase mb-1 tracking-widest">Total Liability</p>
            <p className="text-2xl font-black text-rose-500 italic tracking-tighter">PKR {totalPending.toLocaleString()}</p>
          </div>
          <div className="w-[2px] h-10 bg-white/5" />
          <button 
            onClick={(e) => { e.stopPropagation(); handleDownloadReport(); }}
            className="p-4 bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all border border-white/5 hover:border-white/20 hover:scale-105 active:scale-95 shadow-xl"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-[#050b1d] border border-white/5 rounded-[2.5rem] p-4 mb-8 shadow-2xl">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
          <input 
            type="text" 
            placeholder="SCAN CLIENT OR INVOICE PROTOCOL..."
            className="w-full bg-[#020617] border border-white/10 rounded-[1.8rem] py-5 pl-16 pr-6 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-rose-500/50 transition-all placeholder:text-slate-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* DATA LISTING */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-rose-500" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600">Syncing with Mainframe...</p>
          </div>
        ) : (
          <AnimatePresence mode='popLayout'>
            {filteredPayments.map((p) => (
              <motion.div
                key={p.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-[#050b1d] border border-white/5 hover:border-white/20 p-6 md:p-8 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-6 transition-all shadow-xl hover:shadow-rose-500/5"
              >
                <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className={cn(
                    "p-6 rounded-[2rem] shrink-0 transition-all shadow-inner",
                    p.priority === 'High' ? "bg-rose-500/10 text-rose-500 shadow-rose-500/5" : "bg-amber-500/10 text-amber-500 shadow-amber-500/5"
                  )}>
                    <Clock size={28} className={p.priority === 'High' ? "animate-pulse" : ""} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-black text-white italic uppercase tracking-tighter group-hover:text-rose-500 transition-colors">{p.client}</h3>
                      <span className="text-[9px] font-black px-3 py-1 bg-white/5 rounded-lg text-slate-600 uppercase tracking-widest border border-white/5">{p.id}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                      <span className="flex items-center gap-1.5"><Calendar size={14} /> Due: {p.dueDate}</span>
                      <span className={cn(
                        "flex items-center gap-1.5 px-3 py-1 rounded-full",
                        calculateAging(p.dueDate).includes("Overdue") ? "bg-rose-500/5 text-rose-500" : "bg-slate-500/5 text-slate-500"
                      )}>
                        <AlertTriangle size={14} /> {calculateAging(p.dueDate)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-10 w-full md:w-auto border-t md:border-none border-white/5 pt-6 md:pt-0">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-600 uppercase mb-1 tracking-widest">Locked Amount</p>
                    <p className="text-2xl font-black text-white italic tracking-tighter">PKR {p.amount.toLocaleString()}</p>
                  </div>

                  <div className="flex items-center gap-3 relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleWhatsApp(p); }}
                      className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10 hover:scale-110 active:scale-95"
                    >
                      <MessageSquare size={20} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(p.id); }}
                      className="p-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20 hover:scale-110 active:scale-95"
                    >
                      <CheckCircle2 size={20} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveAction(activeAction === p.id ? null : p.id); }}
                      className="p-4 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 transition-all border border-white/5"
                    >
                      <MoreVertical size={20} />
                    </button>

                    <AnimatePresence>
                      {activeAction === p.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, y: 15 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.9, y: 15 }}
                          className="absolute right-0 top-20 z-[100] w-56 bg-[#0f172a] border border-white/10 rounded-[1.8rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-3 backdrop-blur-xl"
                        >
                          <button 
                            onClick={() => { toast.info("ENCRYPTING INVOICE...", { description: `Sending PDF to ${p.client}` }); setActiveAction(null); }}
                            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-white/5 rounded-2xl text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all tracking-widest"
                          >
                            <Mail size={14} className="text-blue-500" /> Email PDF
                          </button>
                          <button 
                            onClick={() => { toast.loading("FETCHING AUDIT TRAIL..."); setActiveAction(null); }}
                            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-white/5 rounded-2xl text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all tracking-widest"
                          >
                            <ArrowUpRight size={14} className="text-amber-500" /> Payment History
                          </button>
                          <div className="h-[1px] bg-white/5 my-2 mx-2" />
                          <button 
                            onClick={() => handleCancelInvoice(p.id)}
                            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-rose-500/10 rounded-2xl text-[9px] font-black uppercase text-rose-500 transition-all tracking-widest"
                          >
                            <Trash2 size={14} /> Void Invoice
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* EMPTY STATE */}
        {!isLoading && filteredPayments.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-40 text-center">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-800 border border-white/5 shadow-inner">
              <CheckCircle2 size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-500 uppercase italic tracking-tighter">Zero Debt Detected</h3>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em] mt-3 italic">All active receivables have been cleared</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}