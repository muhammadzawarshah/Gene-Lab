"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  History, Search, Filter, ArrowDownLeft, 
  CheckCircle2, Clock, Globe, Receipt,
  Calendar, ExternalLink, X, Wallet,
  AlertCircle, Loader2, ShieldCheck
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
type PaymentMethod = 'Bank Transfer' | 'Digital Wallet' | 'Direct Deposit';
type PaymentStatus = 'Verified' | 'Processing' | 'Flagged';

interface Payment {
  id: string;
  invoiceRef: string;
  date: string;
  amount: string;
  method: PaymentMethod;
  status: PaymentStatus;
  txnHash: string;
}

const statusConfig: Record<PaymentStatus, { text: string; bg: string; icon: any }> = {
  'Verified': { text: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
  'Processing': { text: 'text-blue-400', bg: 'bg-blue-500/10', icon: Clock },
  'Flagged': { text: 'text-rose-400', bg: 'bg-rose-500/10', icon: AlertCircle },
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<PaymentStatus | 'All'>('All');
  const [isLoading, setIsLoading] = useState(true);

  // --- Secure Authentication Config ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const currentUserId = Cookies.get('userId');
  const token = Cookies.get('auth_token');

  // --- Secure Axios Instance ---
  const vaultApi = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'x-user-id': currentUserId
    }
  });

  // --- Data Sync with Backend ---
  const syncPaymentVault = useCallback(async () => {
    if (!currentUserId || !token) {
      return toast.error("AUTH_FAILURE", { description: "Security token missing. Redirecting..." });
    }

    try {
      setIsLoading(true);
      // Neutralizing potential SQL symbols in search query
      const sanitizedQuery = searchQuery.replace(/['"--;]/g, "");
      
      const response = await vaultApi.get(`/payments/history`, {
        params: {
          uid: currentUserId,
          status: activeTab !== 'All' ? activeTab : undefined,
          q: encodeURIComponent(sanitizedQuery)
        }
      });

      setPayments(response.data);
    } catch (error: any) {
      console.error("Vault Error:", error);
      toast.error("SYNCHRONIZATION ERROR", { description: "Vault access denied or network intercepted." });
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, searchQuery, currentUserId, token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      syncPaymentVault();
    }, 500); // Debounce to prevent rapid-fire API attacks
    return () => clearTimeout(timer);
  }, [syncPaymentVault]);

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* --- PAGE HEADER --- */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 flex flex-col lg:flex-row items-center justify-between gap-8 bg-white/[0.01] border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-3xl"
      >
        <div className="flex items-center gap-6">
          <div className="p-4 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/20 -rotate-2">
            <History className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Payment <span className="text-emerald-500">Vault</span></h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
               <ShieldCheck size={12} className="text-emerald-500" /> Secure Encryption Node Active
            </p>
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <div className="px-6 py-3 bg-white/[0.02] border border-white/5 rounded-2xl">
            <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Total Settled</p>
            <p className="text-sm font-black text-white italic">PKR {payments.reduce((acc, p) => p.status === 'Verified' ? acc + parseFloat(p.amount.replace(/,/g, '')) : acc, 0).toLocaleString()}</p>
          </div>
          <div className="px-6 py-3 bg-white/[0.02] border border-white/5 rounded-2xl">
            <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Authenticated UID</p>
            <p className="text-sm font-black text-blue-500 italic uppercase tracking-tighter">{currentUserId?.slice(0, 10)}</p>
          </div>
        </div>
      </motion.div>

      {/* --- SEARCH & STATUS CONTROLS --- */}
      <div className="max-w-7xl mx-auto mb-8 space-y-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/[0.01] border border-white/5 p-4 rounded-[2rem]">
          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH BY TRANSACTION OR INV ID..." 
              className="w-full bg-[#0a0f1d] border border-white/10 rounded-2xl py-3 pl-14 pr-10 text-[10px] font-black tracking-widest outline-none focus:border-emerald-500/50 transition-all text-white placeholder:text-slate-700"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          <div className="flex p-1 bg-[#0a0f1d] border border-white/10 rounded-2xl overflow-x-auto no-scrollbar">
            {['All', 'Verified', 'Processing', 'Flagged'].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t as any)}
                className={cn(
                  "px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  activeTab === t ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* --- TRANSACTIONS LIST --- */}
        <div className="grid grid-cols-1 gap-4 min-h-[300px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
               <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
               <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Scanning Ledger Integrity...</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {payments.length > 0 ? payments.map((pay, index) => {
                const config = statusConfig[pay.status] || statusConfig['Processing'];
                return (
                  <motion.div
                    key={pay.id}
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative bg-[#050b1d] border border-white/5 rounded-[2rem] p-6 hover:border-emerald-500/30 transition-all"
                  >
                    <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-8">
                      <div className="flex items-center gap-6 min-w-[250px]">
                        <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 group-hover:bg-emerald-500/10 transition-colors">
                          <ArrowDownLeft className="text-emerald-500" size={24} />
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-white italic tracking-tighter">{pay.id}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Receipt size={10} className="text-slate-600" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase">{pay.invoiceRef}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-2 gap-8 px-6 border-l border-white/5">
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Settlement Via</p>
                          <div className="flex items-center gap-2">
                            <Wallet size={12} className="text-blue-500" />
                            <span className="text-xs font-bold text-white italic">{pay.method}</span>
                          </div>
                        </div>
                        <div className="hidden md:block">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Blockchain Hash</p>
                          <p className="text-[10px] font-mono text-slate-600 group-hover:text-emerald-500/60 transition-colors truncate max-w-[150px]">{pay.txnHash}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-10 min-w-[300px] justify-end">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Amount Settled</p>
                          <p className="text-lg font-black text-white italic tracking-widest">PKR {pay.amount}</p>
                        </div>

                        <div className={cn("px-4 py-2 rounded-xl flex items-center gap-3 border border-white/5", config.bg)}>
                          <config.icon size={14} className={cn("animate-pulse", config.text)} />
                          <span className={cn("text-[10px] font-black uppercase tracking-widest italic", config.text)}>{pay.status}</span>
                        </div>

                        <button 
                          onClick={() => window.open(`https://explorer.nexus.com/tx/${pay.txnHash}`, '_blank', 'noopener,noreferrer')}
                          className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                        >
                          <ExternalLink size={18} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="absolute top-2 right-8 flex items-center gap-2">
                      <Calendar size={10} className="text-slate-700" />
                      <span className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">{pay.date}</span>
                    </div>
                  </motion.div>
                );
              }) : (
                <div className="text-center py-20 bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem] w-full">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">Clearance Log Empty: No Transactions Found</p>
                </div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* --- INFO BOX --- */}
      <div className="mt-12 max-w-7xl mx-auto p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-4">
        <Globe className="text-blue-500 w-5 h-5 shrink-0" />
        <p className="text-[10px] font-bold text-blue-500/80 uppercase tracking-widest italic leading-relaxed">
          Nexus Security: Verified nodes are conducting cross-ledger audits. If a transaction is 'Flagged', please contact the Compliance Node Alpha with your Transaction Hash.
        </p>
      </div>
    </div>
  );
}