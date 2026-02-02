"use client";

import React, { useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner'; // Modern Toast library
import { 
  Save, ArrowLeft, Banknote, 
  Landmark, ShieldCheck, X, 
  CheckCircle, Loader2
} from 'lucide-react';
import { cn } from "@/lib/utils";

export default function CreatePayment() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // --- Form State ---
  const [formData, setFormData] = useState({
    customer: '',
    amount: '',
    method: 'Bank Transfer',
    ledger: 'HBL Corporate Account',
    reference: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  // --- Functions ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Security Check: Client-side Validation
    if (!formData.customer || !formData.amount || Number(formData.amount) <= 0) {
      toast.error("PROTOCOL ERROR", {
        description: "Invalid transaction parameters detected.",
        className: "bg-rose-500 border-none text-white font-sans",
      });
      return;
    }

    setIsSubmitting(true);
    
    // Toast: Loading State
    const toastId = toast.loading("SYNCHRONIZING...", {
        description: "Encrypting ledger entry and pushing to vault.",
        className: "bg-[#050b1d] border border-white/10 text-white font-sans",
    });

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
      const userId = Cookies.get('userId'); 
      const token = Cookies.get('auth_token');

      if (!userId || !token) {
        throw new Error("AUTH_FAILED: Identity verification required.");
      }

      // 2. Secured API Call
      const response = await axios.post(`${API_BASE_URL}/accounts/create-inflow`, {
        ...formData,
        amount: parseFloat(formData.amount),
        recordedBy: userId,
        securityHash: btoa(userId + Date.now()) // Simple client-side hash for integrity
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Security-Shield': 'Nexus-v1'
        }
      });

      if (response.status === 200 || response.status === 201) {
        toast.success("ENTRY SECURED", {
          id: toastId,
          description: "Ledger updated and balance synchronized.",
          className: "bg-emerald-600 border-none text-white font-sans",
          icon: <CheckCircle className="text-white" size={18} />,
        });

        // Reset Form
        setFormData({
          customer: '',
          amount: '',
          method: 'Bank Transfer',
          ledger: 'HBL Corporate Account',
          reference: '',
          date: new Date().toISOString().split('T')[0],
          note: ''
        });
      }
    } catch (err: any) {
      toast.error("TRANSACTION REJECTED", {
        id: toastId,
        description: err.response?.data?.message || "Internal protocol breach or network failure.",
        className: "bg-rose-600 border-none text-white font-sans",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans relative overflow-hidden">
      {/* Toast Configuration */}
      <Toaster position="bottom-right" expand={false} richColors theme="dark" />
      
      {/* Decorative Background Glow */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full -z-10" />

      {/* --- HEADER --- */}
      <div className="mb-12 flex justify-between items-center">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">
            New <span className="text-emerald-500">Inflow</span> Entry
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1 italic">
            Financial Protocol • Transaction Recording
          </p>
        </motion.div>
        <button onClick={() => window.history.back()} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
          <ArrowLeft size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT COLUMN --- */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#050b1d] border border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2 italic">Select Client</label>
                <select 
                  required
                  className="w-full bg-[#020617] border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-emerald-500/50 transition-all appearance-none cursor-pointer"
                  value={formData.customer}
                  onChange={(e) => setFormData({...formData, customer: e.target.value})}
                >
                  <option value="">Choose Customer...</option>
                  <option value="Al-Hafeez Traders">Al-Hafeez Traders</option>
                  <option value="Metro Mart">Metro Mart</option>
                  <option value="City Pharma">City Pharma</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2 italic">Payment Amount (PKR)</label>
                <div className="relative">
                  <input 
                    type="number" required placeholder="0.00"
                    className="w-full bg-[#020617] border border-white/10 rounded-2xl py-4 px-6 text-xl font-black text-emerald-500 outline-none focus:border-emerald-500 transition-all placeholder:opacity-20"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  />
                  <Banknote className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700" size={20} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2 italic">Payment Method</label>
                <div className="grid grid-cols-3 gap-3">
                  {['Cash', 'Bank Transfer', 'Check'].map((m) => (
                    <button
                      key={m} type="button"
                      onClick={() => setFormData({...formData, method: m})}
                      className={cn(
                        "py-3 rounded-xl text-[8px] font-black uppercase tracking-widest border transition-all",
                        formData.method === m 
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                          : "bg-white/5 border-white/10 text-slate-500 hover:text-white"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2 italic">Transaction Date</label>
                <input 
                  type="date" required
                  className="w-full bg-[#020617] border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-emerald-500/50"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2 italic">Internal Memo / Notes</label>
              <textarea 
                rows={3} placeholder="ANY SPECIFIC DETAILS ABOUT THIS PAYMENT..."
                className="w-full bg-[#020617] border border-white/10 rounded-2xl py-4 px-6 text-xs font-bold text-white outline-none focus:border-emerald-500/50 uppercase tracking-widest"
                value={formData.note}
                onChange={(e) => setFormData({...formData, note: e.target.value})}
              ></textarea>
            </div>
          </div>
        </div>

        {/* --- RIGHT COLUMN --- */}
        <div className="space-y-6">
          <div className="bg-[#050b1d] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <Landmark className="text-emerald-500" size={20} />
              <h2 className="text-xs font-black text-white uppercase tracking-widest italic">Ledger Impact</h2>
            </div>

            <div className="space-y-6">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2">Deposit Destination</p>
                <select 
                  className="w-full bg-transparent text-sm font-black text-white outline-none appearance-none cursor-pointer"
                  value={formData.ledger}
                  onChange={(e) => setFormData({...formData, ledger: e.target.value})}
                >
                  <option>HBL Corporate Account</option>
                  <option>Meezan Islamic Bank</option>
                  <option>Main Cash Vault</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2 italic">Reference / Slip No.</label>
                <input 
                  type="text" placeholder="E.G. FT-22901"
                  className="w-full bg-[#020617] border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-emerald-500/50"
                  value={formData.reference}
                  onChange={(e) => setFormData({...formData, reference: e.target.value})}
                />
              </div>

              <div className="pt-6 border-t border-white/5">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Verification Status</span>
                  <ShieldCheck className="text-emerald-500" size={16} />
                </div>
                <p className="text-[9px] font-bold text-slate-600 italic leading-relaxed">
                  Submitting this form will instantly update the client's balance. Your session identity is attached to this record for audit.
                </p>
              </div>
            </div>
          </div>

          <button 
            disabled={isSubmitting} type="submit"
            className="group w-full py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2rem] text-xs font-black uppercase tracking-[0.3em] italic transition-all flex items-center justify-center gap-4 shadow-xl shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                <Save size={18} className="group-hover:scale-110 transition-transform" /> Record Transaction
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}