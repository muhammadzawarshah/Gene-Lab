"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Clock, CheckCircle2, XCircle, Eye, 
  Search, Filter, Landmark, 
  Calendar, AlertCircle, FileStack, Loader2
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<PendingPayment | null>(null);

  // --- Backend Config ---
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchPendingPayments = async () => {
      try {
        setLoading(true);
        const userId = Cookies.get('userId');
        const token = Cookies.get('auth_token');

        if (!userId) {
          setError("Auth Session Expired.");
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/accounts/pending-payments`, {
          params: { userId },
          headers: { 'Authorization': `Bearer ${token}` }
        });

        setPayments(response.data);
      } catch (err: any) {
        console.error("Fetch Error:", err);
        setError(err.response?.data?.message || "Sync Failed");
      } finally {
        setLoading(false);
      }
    };

    fetchPendingPayments();
  }, [API_BASE_URL]);

  const handleAction = async (paymentId: string, action: 'approve' | 'reject') => {
    try {
      const token = Cookies.get('auth_token');
      await axios.post(`${API_BASE_URL}/accounts/verify-payment`, {
        paymentId,
        action,
        userId: Cookies.get('userId')
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      // Update local state after success
      setPayments(prev => prev.filter(p => p.id !== paymentId));
      setSelectedPayment(null);
    } catch (err) {
      alert("Action failed. Please try again.");
    }
  };

  const filteredPayments = payments.filter(p => 
    p.customer.toLowerCase().includes(search.toLowerCase()) || p.id.includes(search)
  );

  const totalPendingAmount = filteredPayments.reduce((acc, curr) => acc + curr.amount, 0);

  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#020617]">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="text-amber-500 mb-4">
        <Loader2 size={48} />
      </motion.div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 italic">Verifying Nexus Protocols...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-10 text-slate-300 font-sans">
      
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
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-4 bg-amber-500/10 border border-amber-500/20 px-6 py-3 rounded-2xl items-center">
          <Clock className="text-amber-500 animate-spin-slow" size={20} />
          <div>
            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Total Pending</p>
            <p className="text-lg font-black text-white italic">PKR {totalPendingAmount.toLocaleString()}</p>
          </div>
        </motion.div>
      </div>

      {/* --- CONTROLS --- */}
      <div className="bg-white/[0.02] border border-white/5 p-4 rounded-[2.5rem] mb-8 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
          <input 
            type="text" placeholder="FILTER BY CUSTOMER, ID OR REFERENCE..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#050b1d] border border-white/5 rounded-2xl py-4 pl-16 pr-6 text-[10px] font-black uppercase tracking-widest outline-none focus:border-amber-500/50 text-white"
          />
        </div>
        <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3">
          <Filter size={14} /> Advanced Filters
        </button>
      </div>

      {/* --- PENDING LIST --- */}
      <div className="grid grid-cols-1 gap-4">
        {error && <p className="text-rose-500 font-black uppercase text-xs italic text-center p-10">{error}</p>}
        <AnimatePresence mode='popLayout'>
          {filteredPayments.map((payment, index) => (
            <motion.div
              key={payment.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: index * 0.1 }}
              className="group bg-[#050b1d] border border-white/5 rounded-[2.5rem] p-6 hover:border-amber-500/30 transition-all flex flex-wrap lg:flex-nowrap items-center justify-between gap-8"
            >
              <div className="flex items-center gap-6 min-w-[250px]">
                <div className="w-14 h-14 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center justify-center">
                  <Landmark className="text-amber-500" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white uppercase italic tracking-tighter">{payment.customer}</h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <AlertCircle size={10} /> {payment.id} • {payment.method}
                  </p>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-8 px-6 border-l border-white/5">
                <div>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Amount</p>
                  <p className="text-sm font-black text-white tracking-tight">PKR {payment.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Reference No</p>
                  <p className="text-xs font-bold text-slate-400 italic">#{payment.referenceNo}</p>
                </div>
                <div className="hidden md:block">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1 italic">Received Date</p>
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar size={12} />
                    <span className="text-[10px] font-bold">{payment.submittedDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedPayment(payment)} className="p-4 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                  <Eye size={18} />
                </button>
                <div className="flex gap-2">
                  <button onClick={() => handleAction(payment.id, 'approve')} className="flex items-center gap-2 px-6 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[9px] font-black text-emerald-500 uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all">
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button onClick={() => handleAction(payment.id, 'reject')} className="flex items-center gap-2 px-6 py-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-[9px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all">
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {!loading && filteredPayments.length === 0 && (
          <p className="text-center py-20 text-slate-700 font-black uppercase tracking-widest italic opacity-20">All Clear • No Pending Verifications</p>
        )}
      </div>

      {/* --- QUICK PREVIEW MODAL --- */}
      <AnimatePresence>
        {selectedPayment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-xl bg-black/60">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-2xl bg-[#020617] border border-white/10 rounded-[3rem] p-10 relative overflow-hidden shadow-2xl">
              <button onClick={() => setSelectedPayment(null)} className="absolute right-8 top-8 text-slate-500 hover:text-white transition-colors">
                <XCircle size={24} />
              </button>

              <div className="flex items-center gap-4 mb-10">
                <div className="p-4 bg-amber-500/10 rounded-2xl text-amber-500"><FileStack size={28} /></div>
                <div>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Verification Detail</h2>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Process ID: {selectedPayment.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-10 bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Client</p>
                  <p className="text-white font-black italic">{selectedPayment.customer}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Method</p>
                  <p className="text-white font-black italic">{selectedPayment.method}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Ref Number</p>
                  <p className="text-white font-black italic">{selectedPayment.referenceNo}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">Amount</p>
                  <p className="text-emerald-500 font-black italic text-xl">PKR {selectedPayment.amount.toLocaleString()}</p>
                </div>
              </div>

              <div className="h-48 bg-black/40 rounded-[2rem] border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 text-slate-600">
                {selectedPayment.attachment ? (
                   <>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400">Digital Attachment Found</p>
                    <button className="text-[9px] font-black text-white bg-white/5 px-6 py-2 rounded-lg uppercase hover:bg-white/10">Preview Receipt</button>
                   </>
                ) : (
                  <p className="text-[10px] font-bold uppercase tracking-widest">No Digital Proof Attached</p>
                )}
              </div>

              <div className="mt-10 flex gap-4">
                <button onClick={() => handleAction(selectedPayment.id, 'approve')} className="flex-1 py-5 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest italic hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20">
                  Confirm Transaction
                </button>
                <button onClick={() => handleAction(selectedPayment.id, 'reject')} className="flex-1 py-5 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest italic hover:bg-white/10 transition-all">
                  Reject & Notify
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}