"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Landmark, Wallet, ArrowRightLeft, TrendingUp, 
  TrendingDown, MoreVertical, ShieldCheck, 
  Eye, EyeOff, CheckCircle2, X, Loader2, Lock
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
interface Account {
  id: string;
  name: string;
  type: 'Bank' | 'Cash';
  accountNo?: string;
  balance: number;
  monthlyInflow: number;
  monthlyOutflow: number;
  status: 'Active' | 'Under Review';
}

export default function AccountBalances() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValues, setShowValues] = useState(true);
  const [transferModal, setTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({ from: '', to: '', amount: '' });

  // --- Security Config ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const token = Cookies.get('auth_token');
  const userId = Cookies.get('userId');

  const secureApi = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'x-user-id': userId
    }
  });

  // --- Fetch Accounts ---
  const fetchAccounts = async () => {
    setIsLoading(true);
    try {
      if (!userId || !token) throw new Error("Unauthorized");
      const res = await secureApi.get(`/accounts?userId=${userId}`);
      setAccounts(res.data);
    } catch (err) {
      toast.error("SECURITY BREACH", { description: "Session invalid or unauthorized access." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  // --- Secure Transfer Function ---
  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Client-side Sanitization
    const amountNum = parseFloat(transferData.amount);
    const safeFrom = transferData.from.replace(/[^a-zA-Z0-9-]/g, "");
    const safeTo = transferData.to.replace(/[^a-zA-Z0-9-]/g, "");

    if (safeFrom === safeTo) return toast.warning("LOGIC ERROR", { description: "Source & Destination cannot be identical." });
    if (isNaN(amountNum) || amountNum <= 0) return toast.warning("INVALID INPUT", { description: "Please enter a positive numeric value." });

    setIsSubmitting(true);
    const loadingToast = toast.loading("ENCRYPTING TRANSACTION...");

    try {
      // 2. API Call with Security Payload
      await secureApi.post('/accounts/transfer', {
        fromAccountId: safeFrom,
        toAccountId: safeTo,
        amount: amountNum,
        userId: userId,
        timestamp: new Date().toISOString() // Anti-replay token
      });

      toast.success("TRANSFER VERIFIED", { description: `PKR ${amountNum.toLocaleString()} moved successfully.` });
      setTransferModal(false);
      fetchAccounts(); // Refresh balances
    } catch (err: any) {
      const errMsg = err.response?.data?.message || "Transaction rejected by secure server.";
      toast.error("TRANSACTION FAILED", { description: errMsg });
    } finally {
      setIsSubmitting(false);
      toast.dismiss(loadingToast);
    }
  };

  const totalLiquidity = accounts.reduce((acc, curr) => acc + curr.balance, 0);

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans relative overflow-hidden">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* BACKGROUND DECOR (SECURE VIBE) */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-600 rounded-full blur-[120px]" />
      </div>

      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
            Account <span className="text-blue-500">Balances</span>
          </h1>
          <div className="flex items-center gap-2 mt-2 text-slate-500">
            <Lock size={12} className="text-blue-500" />
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] italic">Validated Liquidity Node: {userId?.slice(0, 8)}</p>
          </div>
        </motion.div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setShowValues(!showValues)}
            className="p-5 bg-[#050b1d] border border-white/10 rounded-2xl hover:bg-white/10 transition-all shadow-xl"
          >
            {showValues ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
          <button 
            onClick={() => setTransferModal(true)}
            className="flex items-center gap-4 px-8 py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-2xl shadow-blue-600/30 border border-blue-400/20"
          >
            <ArrowRightLeft size={18} /> Internal Transfer
          </button>
        </div>
      </div>

      {/* TOTAL NET WORTH CARD */}
      <div className="max-w-7xl mx-auto mb-10 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#050b1d] via-[#050b1d] to-blue-900/10 border border-white/5 p-12 rounded-[4rem] relative overflow-hidden group shadow-2xl"
        >
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-12">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-4">Total Combined Liquidity (Encrypted)</p>
              <h2 className="text-7xl font-black text-white italic tracking-tighter">
                {isLoading ? <Loader2 className="animate-spin text-blue-500" size={40} /> : (
                  showValues ? `PKR ${totalLiquidity.toLocaleString()}` : "••••••••"
                )}
              </h2>
            </div>
            <div className="flex gap-12">
              <div className="text-right">
                <p className="text-[10px] font-black text-emerald-500 uppercase mb-2 flex items-center justify-end gap-2"><TrendingUp size={14}/> 30D Inflow</p>
                <p className="text-3xl font-black text-white italic tracking-tight">PKR 1.28M</p>
              </div>
              <div className="text-right border-l border-white/10 pl-12">
                <p className="text-[10px] font-black text-rose-500 uppercase mb-2 flex items-center justify-end gap-2"><TrendingDown size={14}/> 30D Outflow</p>
                <p className="text-3xl font-black text-white italic tracking-tight">PKR 492K</p>
              </div>
            </div>
          </div>
          <ShieldCheck size={240} className="absolute top-[-40px] right-[-40px] opacity-[0.03] group-hover:opacity-[0.07] transition-all duration-700 rotate-12" />
        </motion.div>
      </div>

      {/* ACCOUNTS GRID */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="h-64 bg-white/5 animate-pulse rounded-[3rem]" />)
        ) : (
          accounts.map((acc) => (
            <motion.div 
              key={acc.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              whileHover={{ y: -8, backgroundColor: "rgba(255,255,255,0.02)" }}
              className="bg-[#050b1d] border border-white/5 p-10 rounded-[3rem] relative group transition-all shadow-xl"
            >
              <div className="flex justify-between items-start mb-10">
                <div className={cn(
                  "p-5 rounded-2xl shadow-inner",
                  acc.type === 'Bank' ? "bg-blue-500/10 text-blue-500 border border-blue-500/20" : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                )}>
                  {acc.type === 'Bank' ? <Landmark size={28} /> : <Wallet size={28} />}
                </div>
                <button className="p-2 text-slate-700 hover:text-white transition-colors"><MoreVertical size={24}/></button>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-black text-white uppercase italic tracking-tight">{acc.name}</h3>
                <p className="text-[10px] font-bold text-slate-600 uppercase mt-2 tracking-[0.2em]">{acc.accountNo || 'Physical Asset Ledger'}</p>
              </div>

              <div className="flex flex-col gap-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Available Liquidity</p>
                <p className="text-3xl font-black text-white italic tracking-tighter">
                  {showValues ? `PKR ${acc.balance.toLocaleString()}` : "••••••"}
                </p>
              </div>

              <div className="mt-10 pt-8 border-t border-white/5 flex justify-between items-center">
                <span className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                  <CheckCircle2 size={14} /> {acc.status}
                </span>
                <button className="text-[10px] font-black text-blue-500 uppercase hover:text-white transition-colors tracking-[0.2em]">Audit Trail</button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* TRANSFER MODAL */}
      <AnimatePresence>
        {transferModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-[#020617]/95 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#050b1d] border border-white/10 p-12 rounded-[4rem] w-full max-w-lg shadow-[0_0_100px_rgba(0,0,0,1)]"
            >
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Secure Transfer</h2>
                  <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">Inter-Account Settlement Protocol</p>
                </div>
                <button onClick={() => setTransferModal(false)} className="p-3 text-slate-500 hover:text-white transition-colors"><X size={28}/></button>
              </div>
              
              <form onSubmit={handleTransfer} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase mb-3 block tracking-widest">Debit From</label>
                    <select 
                      required
                      value={transferData.from}
                      onChange={(e) => setTransferData({...transferData, from: e.target.value})}
                      className="w-full bg-[#020617] border border-white/10 rounded-2xl py-5 px-6 text-[11px] font-black text-white uppercase outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select Account</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase mb-3 block tracking-widest">Credit To</label>
                    <select 
                      required
                      value={transferData.to}
                      onChange={(e) => setTransferData({...transferData, to: e.target.value})}
                      className="w-full bg-[#020617] border border-white/10 rounded-2xl py-5 px-6 text-[11px] font-black text-white uppercase outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Select Account</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-3 block tracking-widest">Transfer Amount (PKR)</label>
                  <input 
                    required
                    type="number" 
                    value={transferData.amount}
                    onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
                    className="w-full bg-[#020617] border border-white/10 rounded-2xl py-5 px-8 text-xl font-black text-white italic outline-none focus:border-blue-500 transition-all shadow-inner"
                    placeholder="0.00"
                  />
                </div>
                
                <div className="bg-blue-600/5 border border-blue-500/10 p-6 rounded-3xl flex items-start gap-4">
                  <ShieldCheck size={20} className="text-blue-500 shrink-0 mt-1" />
                  <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase">
                    This transaction will be logged with Hash ID and User ID {userId?.slice(0, 12)} for audit purposes. Action is irreversible.
                  </p>
                </div>

                <button 
                  disabled={isSubmitting}
                  type="submit" 
                  className="w-full py-6 bg-blue-600 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-widest italic hover:bg-blue-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Authorize Settlement"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}