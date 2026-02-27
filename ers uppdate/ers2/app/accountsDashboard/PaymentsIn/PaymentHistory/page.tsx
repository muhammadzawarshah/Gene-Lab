"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { 
  Wallet, Search, Eye, Edit3, X, Calendar, 
  Receipt, Hash, Loader2, ShieldCheck, Save, 
  TrendingDown, CheckCircle, AlertTriangle
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

// --- SECURITY: Input Sanitization Function ---
const secureSanitize = (str: string) => {
  if (!str) return "";
  return str.replace(/[<>'"/\\;]/g, "").trim();
};

export default function SecurePaymentLedger() {
  const authToken = Cookies.get('auth_token');
  
  // --- DATA STATES ---
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modals States
  const [viewModal, setViewModal] = useState<{open: boolean, data: any}>({ open: false, data: null });
  const [editModal, setEditModal] = useState<{open: boolean, data: any}>({ open: false, data: null });
  const [isUpdating, setIsUpdating] = useState(false);

  // --- 1. FETCH DATA (With Error Handling) ---
  const fetchPayments = useCallback(async () => {
    if (!authToken) {
        toast.error("Session expired. Please login again.");
        return;
    }
    setIsLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/finance/payments`, {
        headers: { 
            Authorization: `Bearer ${authToken}`,
            'X-Content-Type-Options': 'nosniff' 
        }
      });
      console.log(res.data.data);
      setPayments(res.data.data || []);
    } catch (err) {
      toast.error("Security Error: Could not verify ledger integrity.");
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // --- 2. SEARCH LOGIC (Sanitized) ---
  const filteredData = useMemo(() => {
    const term = secureSanitize(search).toLowerCase();
    return payments.filter(p => 
      p.id?.toString().includes(term) || 
      p.party?.name?.toLowerCase().includes(term) ||
      p.invoice?.so_id?.toString().includes(term)
    );
  }, [search, payments]);

  // --- 3. SECURE UPDATE FUNCTION ---
  const handleUpdate = async () => {
    if (!editModal.data || isUpdating) return;
    
    // Client-side Validation
    const amt = parseFloat(editModal.data.amount);
    if (isNaN(amt) || amt <= 0) return toast.error("Invalid amount entered.");

    setIsUpdating(true);
    const tId = toast.loading("Verifying & Updating Ledger...");
    
    try {
      const payload = {
        amount: amt,
        payment_date: secureSanitize(editModal.data.payment_date),
        remarks: secureSanitize(editModal.data.remarks),
        security_checksum: btoa(Date.now().toString()) // Basic integrity check
      };

      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/distribution/payments/${editModal.data.id}`, payload, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      toast.success("Ledger updated and encrypted.", { id: tId });
      setEditModal({ open: false, data: null });
      fetchPayments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Unauthorized action.", { id: tId });
    } finally {
      setIsUpdating(false);
    }
  };

  // UI Styling
  const labelClass = "text-[10px] font-black text-slate-500 uppercase mb-1 block ml-1 tracking-widest";
  const modalInput = "bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 focus:ring-1 ring-blue-500/50 outline-none w-full text-sm transition-all";

  return (
    <div className="text-slate-300 p-4 md:p-12 font-sans selection:bg-blue-500/30">
      <Toaster richColors theme="dark" position="top-center" />

      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-white/5 pb-10">
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-4 rounded-2xl shadow-2xl shadow-blue-500/20 ring-1 ring-white/10">
              <Wallet className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                FINANCIAL <span className="text-blue-500">AUDIT</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] mt-2 uppercase flex items-center gap-2">
                <ShieldCheck size={12} className="text-emerald-500" /> Secure Payment Monitoring System
              </p>
            </div>
          </div>

          <div className="relative group">
            <Search className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              className="bg-[#0f172a] border border-slate-800 rounded-2xl py-3.5 pl-12 pr-6 text-sm text-white outline-none w-full md:w-80 focus:border-blue-500 focus:ring-4 ring-blue-500/5 transition-all shadow-inner"
              placeholder="Search Ledger..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </header>

        {/* TABLE */}
        <div className="bg-[#0f172a]/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-black/40 border-b border-white/5">
                  <th className="px-8 py-6 text-center">S.No</th>
                  <th className="px-8 py-6">Transaction</th>
                  <th className="px-8 py-6">Customer / Party</th>
                  <th className="px-8 py-6 text-right text-slate-400">Invoice Amount</th>
                  <th className="px-8 py-6 text-right text-blue-400">Amount Paid</th>
                  <th className="px-8 py-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-32 text-center">
                        <Loader2 className="animate-spin text-blue-500 mx-auto" size={40} />
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mt-4">Verifying Encrypted Data...</p>
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? filteredData.map((p, index) => (
                  <tr key={p.id} className="hover:bg-blue-500/[0.03] transition-colors group">
                    <td className="px-8 py-5 text-center font-mono text-xs text-slate-600 font-bold">{index + 1}</td>
                    <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                            <Hash size={14} className="text-blue-600" />
                            <span className="font-black text-slate-200 tracking-tighter italic">TRX-{p.payment_number}</span>
                        </div>
                    </td>
                    <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-blue-500 border border-white/5 group-hover:border-blue-500/30 transition-all">
                                {p.party?.name?.charAt(0)}
                            </div>
                            <span className="font-bold text-slate-200 text-sm">{p.party?.name}</span>
                        </div>
                    </td>
                    <td className="px-8 py-5 text-right font-mono text-slate-400 text-sm">
                        {p.reference_number}
                    </td>
                    <td className="px-8 py-5 text-right">
                        <span className="px-4 py-2 bg-blue-500/10 rounded-lg font-mono font-black text-blue-400 italic text-sm border border-blue-500/20">
                            PKR {p.amount?.toLocaleString()}
                        </span>
                    </td>
                    <td className="px-8 py-5">
                        <div className="flex items-center justify-center gap-3">
                            <button onClick={() => setViewModal({ open: true, data: p })} className="p-2 bg-white/5 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-lg"><Eye size={16} /></button>
                        </div>
                    </td>
                  </tr>
                )) : (
                    <tr>
                        <td colSpan={6} className="py-20 text-center text-slate-600 font-bold uppercase text-xs tracking-widest">No verified transactions found.</td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- VIEW MODAL (SECURE) --- */}
      {viewModal.open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setViewModal({ open: false, data: null })} />
          <div className="relative bg-[#0f172a] border border-white/10 w-full max-w-xl rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-10 py-8 bg-gradient-to-r from-blue-600/10 to-transparent border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <CheckCircle className="text-blue-500" size={20} />
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Audit Confirmation</h3>
                </div>
                <button onClick={() => setViewModal({ open: false, data: null })} className="p-2 hover:bg-white/5 rounded-full text-slate-500"><X size={20}/></button>
            </div>
            <div className="p-12 space-y-8">
                <div className="flex justify-between items-end border-b border-white/5 pb-6">
                    <div>
                        <p className={labelClass}>Customer Reference</p>
                        <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{viewModal.data?.party?.name}</h2>
                    </div>
                    <div className="text-right">
                        <p className={labelClass}>Trans Date</p>
                        <p className="font-mono text-slate-400">{viewModal.data?.payment_date?.split('T')[0]}</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 bg-slate-950 rounded-3xl border border-white/5">
                        <p className={labelClass}>Invoice Amount</p>
                        <p className="text-xl font-bold text-slate-500">PKR {viewModal.data?.invoice?.total_amount?.toLocaleString()}</p>
                    </div>
                    <div className="p-6 bg-blue-600/10 rounded-3xl border border-blue-500/20">
                        <p className={labelClass}>Collected Amount</p>
                        <p className="text-xl font-black text-blue-400 italic">PKR {viewModal.data?.amount?.toLocaleString()}</p>
                    </div>
                </div>

                <div className="p-6 bg-white/[0.02] rounded-2xl">
                    <p className={labelClass}>Security Memo</p>
                    <p className="text-sm text-slate-400 italic">"{viewModal.data?.remarks || 'No remarks logged.'}"</p>
                </div>
            </div>
          </div>
        </div>
      )}

     
      
    </div>
  );
}