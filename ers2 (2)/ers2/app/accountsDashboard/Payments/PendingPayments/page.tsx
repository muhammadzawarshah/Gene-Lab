"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Clock, CheckCircle2, XCircle, Eye, 
  Search, Landmark, 
  FileStack, X, Loader2, ShieldCheck
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
interface PendingPayment {
  id: string;
  customer: string;
  amount: number;
  method: 'Bank Transfer' | 'Check' | 'Cash';
  submittedDate: string;
  referenceNo: string;
  attachment: boolean;
}

export default function PendingPayments() {
  const [payments, setPayments] = useState<PendingPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // --- Auth Context ---
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = Cookies.get('auth_token');
  const userId = Cookies.get('userId');

  // --- 1. Fetch Pending Payments ---
  const fetchPending = async () => {
    setIsLoading(true);
    try {
      if (!token || !userId) throw new Error("UNAUTHORIZED_ACCESS");

      const response = await axios.get(`${API_BASE_URL}/accounts/pending`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { auditorId: userId } // Security: Linking request to current auditor
      });
      setPayments(response.data);
    } catch (err: any) {
      toast.error("PROTOCOL ERROR", {
        description: "Failed to fetch pending queue from secure vault.",
        className: "bg-rose-600 border-none text-white font-sans",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  // --- 2. Action: Approve Transaction ---
  const handleApprove = async (id: string) => {
    setProcessingId(id);
    const toastId = toast.loading("AUTHORIZING...", { className: "bg-[#050b1d] text-white" });

    try {
      // Security: Sending userId ensures only authorized personnel sign the transaction
      await axios.post(`${API_BASE_URL}/accounts/approve`, 
        { transactionId: id, approvedBy: userId },
        { headers: { 'Authorization': `Bearer ${token}` }}
      );

      setPayments(prev => prev.filter(p => p.id !== id));
      toast.success("TRANSACTION CLEARED", {
        id: toastId,
        description: `Entry ${id} has been merged into the ledger.`,
        className: "bg-emerald-600 border-none text-white font-sans",
      });
    } catch (err) {
      toast.error("AUTHORIZATION DENIED", {
        id: toastId,
        className: "bg-rose-600 border-none text-white font-sans",
      });
    } finally {
      setProcessingId(null);
    }
  };

  // --- 3. Action: Reject Transaction ---
  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await axios.post(`${API_BASE_URL}/accounts/reject`, 
        { transactionId: id, rejectedBy: userId },
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      setPayments(prev => prev.filter(p => p.id !== id));
      toast.info("ENTRY REJECTED", { className: "bg-rose-500 text-white font-black" });
    } catch (err) {
      toast.error("REJECTION FAILED");
    } finally {
      setProcessingId(null);
    }
  };

  // --- Search Logic (Sanitized) ---
  const filteredPayments = useMemo(() => {
    const cleanSearch = search.replace(/[<>]/g, ""); // Anti-XSS/Injection sanitization
    return payments.filter(p => 
      p.customer.toLowerCase().includes(cleanSearch.toLowerCase()) || p.id.includes(cleanSearch)
    );
  }, [search, payments]);

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans relative">
      <Toaster position="bottom-right" richColors theme="dark" />
      
      {/* --- HEADER --- */}
      <div className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">
            Payment <span className="text-amber-500">Verification</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1 italic">
            Awaiting Clearance • Nexus Finance Protocol
          </p>
        </motion.div>
        
        <div className="flex gap-4 bg-amber-500/10 border border-amber-500/20 px-6 py-3 rounded-2xl items-center shadow-lg shadow-amber-500/5">
          <Clock className="text-amber-500 animate-pulse" size={20} />
          <div>
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Awaiting Action</p>
            <p className="text-lg font-black text-white italic">{payments.length} Transactions</p>
          </div>
        </div>
      </div>

      {/* --- SEARCH BAR --- */}
      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-[2.5rem] mb-8 shadow-2xl">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
          <input 
            type="text"
            placeholder="FILTER BY CUSTOMER OR TRANSACTION ID..."
            className="w-full bg-[#050b1d] border border-white/5 rounded-2xl py-5 pl-16 pr-6 text-[10px] font-black uppercase tracking-widest outline-none focus:border-amber-500/50 text-white transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* --- QUEUE LIST --- */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
            <Loader2 className="animate-spin text-amber-500" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Syncing Secure Vault...</p>
          </div>
        ) : (
          <AnimatePresence mode='popLayout'>
            {filteredPayments.map((payment) => (
              <motion.div
                key={payment.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="group bg-[#050b1d] border border-white/5 rounded-[2.5rem] p-6 hover:border-amber-500/30 transition-all flex flex-wrap lg:flex-nowrap items-center justify-between gap-8 relative overflow-hidden"
              >
                {processingId === payment.id && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-10 flex items-center justify-center border-2 border-amber-500/20 rounded-[2.5rem]">
                      <Loader2 className="text-amber-500 animate-spin" size={30} />
                  </div>
                )}

                <div className="flex items-center gap-6 min-w-[280px]">
                  <div className="w-14 h-14 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center justify-center group-hover:bg-amber-500/10 transition-colors">
                    <Landmark className="text-amber-500" size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">{payment.customer}</h3>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <ShieldCheck size={10} className="text-amber-500" /> {payment.id} • {payment.method}
                    </p>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-8 px-6 border-l border-white/5">
                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Amount</p>
                    <p className="text-sm font-black text-white">PKR {payment.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Ref No.</p>
                    <p className="text-xs font-bold text-amber-500/70 italic">#{payment.referenceNo}</p>
                  </div>
                  <div className="hidden md:flex flex-col">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Date</p>
                    <span className="text-[10px] font-bold text-slate-500">{payment.submittedDate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedPayment(payment)}
                    className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all shadow-sm"
                  >
                    <Eye size={18} />
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleApprove(payment.id)}
                      className="flex items-center gap-2 px-6 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[9px] font-black text-emerald-500 uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all hover:shadow-lg hover:shadow-emerald-500/20"
                    >
                      <CheckCircle2 size={14} /> Clear
                    </button>
                    <button 
                      onClick={() => { if(confirm("ABORT TRANSACTION?")) handleReject(payment.id); }}
                      className="flex items-center gap-2 px-6 py-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[9px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all"
                    >
                      <XCircle size={14} /> Void
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* --- DETAILED VIEW MODAL --- */}
      <AnimatePresence>
        {selectedPayment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-2xl bg-black/80">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-2xl bg-[#020617] border border-white/10 rounded-[3rem] p-10 relative shadow-[0_0_100px_rgba(245,158,11,0.05)]"
            >
              <button onClick={() => setSelectedPayment(null)} className="absolute right-8 top-8 text-slate-500 hover:text-white transition-colors">
                <X size={24} />
              </button>

              <div className="flex items-center gap-4 mb-10">
                <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500"><FileStack size={28} /></div>
                <div>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Identity & Receipt</h2>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">Verification ID: {selectedPayment.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-10 bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Submitted By</p>
                  <p className="text-white font-black italic uppercase">{selectedPayment.customer}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Settlement Amount</p>
                  <p className="text-emerald-500 font-black italic text-2xl tracking-tighter">PKR {selectedPayment.amount.toLocaleString()}</p>
                </div>
              </div>

              <div className="h-48 bg-[#050b1d] rounded-[2rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-4 text-slate-600 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-amber-500/20" />
                {selectedPayment.attachment ? (
                   <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-2">Digital Proof Detected</p>
                      <button className="text-[9px] font-bold text-slate-400 underline uppercase tracking-widest hover:text-white transition-colors italic">View Scan_Payload.pdf</button>
                   </div>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-30">No Digital Scan Provided</span>
                )}
              </div>

              <div className="mt-10 flex gap-4">
                <button 
                  onClick={() => { handleApprove(selectedPayment.id); setSelectedPayment(null); }}
                  className="flex-1 py-5 bg-amber-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] italic hover:bg-amber-500 transition-all shadow-xl shadow-amber-600/20"
                >
                  Verify & Clear Transaction
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}