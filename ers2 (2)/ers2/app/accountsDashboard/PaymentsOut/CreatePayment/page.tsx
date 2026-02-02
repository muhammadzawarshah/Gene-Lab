"use client";

import React, { useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  User, DollarSign, Calendar, CreditCard, 
  ArrowLeft, CheckCircle2, Send,
  FileText, ShieldCheck, Loader2
} from 'lucide-react';
import { cn } from "@/lib/utils";

export default function CreatePayment() {
  const [formData, setFormData] = useState({
    customer: '',
    amount: '',
    category: 'Sales',
    method: 'Bank',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastRef, setLastRef] = useState('');

  // --- Backend Config ---
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = Cookies.get('auth_token');
  const userId = Cookies.get('userId');

  // --- Functions ---

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    // Security: Basic sanitization to prevent special characters for SQL Injection in inputs
    const sanitizedValue = value.replace(/['"--<>]/g, ""); 
    setFormData(prev => ({ ...prev, [name]: sanitizedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!formData.customer || !formData.amount) {
        return toast.error("VALIDATION ERROR", { description: "Client and Amount are mandatory fields." });
    }

    if (!token || !userId) {
        return toast.error("SECURITY BREACH", { description: "Session expired or invalid. Please login again." });
    }

    setIsSubmitting(true);
    const toastId = toast.loading("ENCRYPTING & SENDING...");

    try {
      const response = await axios.post(`${API_BASE_URL}/accounts/create-payment`, {
        ...formData,
        recordedBy: userId, // Current user from cookies
        timestamp: new Date().toISOString(),
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      setLastRef(response.data.referenceId || `NEX-${Math.floor(Math.random() * 900000)}`);
      setShowSuccess(true);
      toast.success("PAYMENT RECORDED", { id: toastId });

      // Reset Form
      setTimeout(() => {
        setShowSuccess(false);
        setFormData({
          customer: '',
          amount: '',
          category: 'Sales',
          method: 'Bank',
          date: new Date().toISOString().split('T')[0],
          note: ''
        });
      }, 4000);

    } catch (error: any) {
      console.error("Submission Error:", error);
      toast.error("TRANSACTION FAILED", {
        id: toastId,
        description: error.response?.data?.message || "Internal Server Protocol Error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* HEADER */}
      <div className="mx-auto mb-12 flex justify-between items-end">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <button className="flex items-center gap-2 text-slate-500 hover:text-white transition-all text-[10px] font-black uppercase mb-4 tracking-widest">
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
          <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
            New <span className="text-blue-500">Transaction</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2 italic">Nexus Financial Core • Secure Entry</p>
        </motion.div>
        
        <div className="hidden md:block text-right">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Security Status</p>
          <p className="text-xs font-bold text-emerald-500 flex items-center gap-2 justify-end">
             <ShieldCheck size={14} /> AES-256 Bit Encrypted
          </p>
        </div>
      </div>

      <div className="mx-auto">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* MAIN FORM */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-[#050b1d] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                
                {/* Client Name */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Client / Payee Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input 
                      required
                      name="customer"
                      value={formData.customer}
                      onChange={handleInputChange}
                      placeholder="ENTER CLIENT NAME..." 
                      className="w-full bg-[#020617] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all" 
                    />
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Amount (PKR)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500" size={16} />
                    <input 
                      required
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      placeholder="0.00" 
                      className="w-full bg-[#020617] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-black text-emerald-500 outline-none focus:border-emerald-500 transition-all" 
                    />
                  </div>
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Effective Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
                    <input 
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full bg-[#020617] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all" 
                    />
                  </div>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Classification</label>
                  <select 
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className="w-full bg-[#020617] border border-white/10 rounded-2xl py-4 px-4 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="Sales">Sales Revenue</option>
                    <option value="Advance">Advance Payment</option>
                    <option value="Credit">Credit Settlement</option>
                  </select>
                </div>
              </div>

              {/* Note */}
              <div className="mt-6 space-y-2 relative z-10">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 italic">Transaction Memo</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-4 text-slate-600" size={16} />
                  <textarea 
                    name="note"
                    value={formData.note}
                    onChange={handleInputChange}
                    rows={3} 
                    placeholder="ENTER INTERNAL AUDIT NOTES..." 
                    className="w-full bg-[#020617] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-blue-500 transition-all resize-none" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SIDEBAR: METHOD & SUBMIT */}
          <div className="space-y-6">
            <div className="bg-[#050b1d] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic mb-4 block">Settlement Method</label>
              <div className="grid grid-cols-1 gap-3">
                {['Bank', 'Cash', 'Online'].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setFormData({...formData, method: m as any})}
                    className={cn(
                      "flex items-center justify-between px-6 py-4 rounded-2xl border transition-all uppercase text-[10px] font-black",
                      formData.method === m 
                        ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" 
                        : "bg-[#020617] border-white/5 text-slate-500 hover:border-white/20"
                    )}
                  >
                    {m} {formData.method === m && <ShieldCheck size={14} />}
                  </button>
                ))}
              </div>

              <div className="mt-10 pt-8 border-t border-white/5">
                <div className="flex justify-between mb-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">System Fee</span>
                  <span className="text-xs font-black text-white">PKR 0.00</span>
                </div>
                <div className="flex justify-between mb-8">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Net Total</span>
                  <span className="text-lg font-black text-emerald-500 italic tracking-tighter">PKR {Number(formData.amount).toLocaleString()}</span>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className={cn(
                    "w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all",
                    isSubmitting ? "bg-slate-800 cursor-wait text-slate-500" : "bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/30"
                  )}
                >
                  {isSubmitting ? <><Loader2 className="animate-spin" size={16} /> Finalizing...</> : <><Send size={16} /> Authorize Payment</>}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* SUCCESS MODAL */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
              className="bg-[#050b1d] border border-white/10 p-12 rounded-[3.5rem] text-center max-w-sm shadow-[0_0_50px_rgba(37,99,235,0.1)]"
            >
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black text-white italic uppercase mb-2">Authenticated</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8 italic">Transaction securely pushed to ledger</p>
              <div className="text-xs font-black text-blue-500 bg-blue-500/5 py-4 rounded-2xl mb-4 border border-blue-500/10 tracking-[0.2em]">
                REF: {lastRef}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}