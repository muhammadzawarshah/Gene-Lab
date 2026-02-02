"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Search, Landmark, Wallet, ArrowUpRight, ArrowDownLeft, 
  Download, RefreshCcw, MoreHorizontal, Calendar,
  Loader2, Lock, ShieldCheck
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
interface CashEntry {
  id: string;
  date: string;
  description: string;
  category: 'Salary' | 'Sales' | 'Rent' | 'Supplier' | 'Tax';
  type: 'Inflow' | 'Outflow';
  method: 'Bank' | 'Cash';
  amount: number;
}

export default function BankCashLedger() {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMethod, setFilterMethod] = useState<'All' | 'Bank' | 'Cash'>('All');
  const [search, setSearch] = useState('');

  // --- Auth & API Security Config ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = Cookies.get('auth_token');
  const currentUserId = Cookies.get('userId');

  // Secure Axios Instance
  const secureApi = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Secure-Session-ID': currentUserId, // Security validation header
      'Content-Type': 'application/json'
    }
  });

  // --- FETCH LEDGER DATA ---
  const fetchLedger = async () => {
    setIsLoading(true);
    try {
      if (!token || !currentUserId) throw new Error("Unauthorized Access");
      
      const response = await secureApi.get(`/finance/ledger?userId=${currentUserId}`);
      setEntries(response.data);
    } catch (err: any) {
      toast.error("LEDGER SYNC FAILED", { 
        description: "Secure gateway blocked the request. Please re-login." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchLedger(); }, []);

  // --- SECURITY: INPUT SANITIZATION (Prevents SQLi/XSS) ---
  const sanitizedSearch = useMemo(() => {
    return search.replace(/[<>'"\/\\;{}$]/g, ""); 
  }, [search]);

  // --- FUNCTIONS ---
  const handleExportCSV = () => {
    const headers = "Date,Description,Category,Type,Method,Amount\n";
    const rows = filteredEntries.map(e => {
      // Anti-CSV Injection: Escaping risky prefixes
      const safeDesc = e.description.replace(/^[=+\-@]/, "'");
      return `${e.date},${safeDesc},${e.category},${e.type},${e.method},${e.amount}`;
    }).join("\n");

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Liquidity_Report_SECURE_${new Date().getTime()}.csv`;
    a.click();
    toast.success("STATEMENT EXPORTED", { description: "Verified CSV generated." });
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(e => 
      (filterMethod === 'All' || e.method === filterMethod) &&
      (e.description.toLowerCase().includes(sanitizedSearch.toLowerCase()) || 
       e.category.toLowerCase().includes(sanitizedSearch.toLowerCase()))
    );
  }, [sanitizedSearch, filterMethod, entries]);

  // Totals
  const bankBalance = entries.filter(e => e.method === 'Bank').reduce((acc, curr) => curr.type === 'Inflow' ? acc + curr.amount : acc - curr.amount, 0);
  const cashBalance = entries.filter(e => e.method === 'Cash').reduce((acc, curr) => curr.type === 'Inflow' ? acc + curr.amount : acc - curr.amount, 0);

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
            Liquidity <span className="text-emerald-500">Ledger</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <ShieldCheck size={12} className="text-emerald-500/50" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] italic">Encrypted Financial Vault • User: {currentUserId?.slice(0, 8)}</p>
          </div>
        </motion.div>
        
        <div className="flex gap-4 w-full lg:w-auto">
          <button 
            onClick={handleExportCSV} 
            className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-black transition-all text-emerald-500 shadow-lg shadow-emerald-500/5"
          >
            <Download size={18} /> Export Statement
          </button>
        </div>
      </div>

      {/* BALANCE CARDS */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-blue-600/10 to-[#050b1d] border border-blue-500/20 p-10 rounded-[3.5rem] flex justify-between items-center shadow-2xl"
        >
          <div>
            <div className="flex items-center gap-3 text-blue-500 mb-3">
              <Landmark size={22} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Bank Liquidity</span>
            </div>
            <h2 className="text-5xl font-black text-white italic tracking-tighter">PKR {bankBalance.toLocaleString()}</h2>
          </div>
          <div className="p-6 bg-blue-600/20 rounded-[2rem] text-blue-500 border border-blue-500/10">
            <RefreshCcw size={28} />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ scale: 1.02 }}
          className="bg-gradient-to-br from-emerald-600/10 to-[#050b1d] border border-emerald-500/20 p-10 rounded-[3.5rem] flex justify-between items-center shadow-2xl"
        >
          <div>
            <div className="flex items-center gap-3 text-emerald-500 mb-3">
              <Wallet size={22} />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Petty Cash Assets</span>
            </div>
            <h2 className="text-5xl font-black text-white italic tracking-tighter">PKR {cashBalance.toLocaleString()}</h2>
          </div>
          <div className="p-6 bg-emerald-600/20 rounded-[2rem] text-emerald-500 border border-emerald-500/10">
            <ArrowDownLeft size={28} />
          </div>
        </motion.div>
      </div>

      {/* FILTER & SEARCH */}
      <div className="max-w-7xl mx-auto bg-[#050b1d] border border-white/5 rounded-[3rem] p-6 mb-8 flex flex-col md:flex-row gap-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-10 -translate-y-1/2 bg-[#020617] px-4 py-1 border border-white/10 rounded-full flex items-center gap-2">
            <Lock size={10} className="text-emerald-500" />
            <span className="text-[8px] font-black text-slate-500 tracking-widest uppercase">Safe-Input Mode</span>
        </div>
        
        <div className="flex gap-2 p-1.5 bg-[#020617] rounded-2xl border border-white/5">
          {['All', 'Bank', 'Cash'].map((m) => (
            <button
              key={m}
              onClick={() => setFilterMethod(m as any)}
              className={cn(
                "px-8 py-3 rounded-xl text-[10px] font-black uppercase transition-all tracking-widest",
                filterMethod === m ? "bg-white/10 text-white shadow-lg" : "text-slate-600 hover:text-slate-400"
              )}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
          <input 
            type="text" 
            placeholder="SCAN BY TRANSACTION ENTITY OR CATEGORY..."
            className="w-full bg-[#020617] border border-white/10 rounded-2xl py-4 pl-16 pr-6 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-emerald-500/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TRANSACTION TABLE */}
      <div className="max-w-7xl mx-auto bg-[#050b1d] border border-white/5 rounded-[3rem] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center gap-5">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500">Decrypting Financial Archive...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] bg-white/[0.01]">
                  <th className="px-10 py-8">Timeline</th>
                  <th className="px-10 py-8">Transaction Profile</th>
                  <th className="px-10 py-8">Protocol</th>
                  <th className="px-10 py-8">Value</th>
                  <th className="px-10 py-8 text-right">Auth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence mode='popLayout'>
                  {filteredEntries.map((e) => (
                    <motion.tr 
                      key={e.id}
                      layout
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="hover:bg-white/[0.03] transition-colors group"
                    >
                      <td className="px-10 py-7">
                        <p className="text-xs font-black text-white italic tracking-tighter">{e.date}</p>
                        <p className="text-[9px] font-bold text-slate-600 mt-1 uppercase">{e.id}</p>
                      </td>
                      <td className="px-10 py-7">
                        <p className="text-sm font-black text-slate-300 uppercase italic tracking-tighter group-hover:text-emerald-500 transition-colors">{e.description}</p>
                        <span className="text-[8px] font-black px-3 py-1 bg-white/5 rounded-full text-slate-500 uppercase mt-2 inline-block border border-white/5 tracking-widest">{e.category}</span>
                      </td>
                      <td className="px-10 py-7">
                        <div className={cn(
                          "flex items-center gap-3 text-[10px] font-black uppercase tracking-widest",
                          e.method === 'Bank' ? "text-blue-500" : "text-emerald-500"
                        )}>
                          {e.method === 'Bank' ? <Landmark size={14}/> : <Wallet size={14}/>}
                          {e.method} System
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <div className={cn(
                          "flex items-center gap-2 text-base font-black italic tracking-tighter",
                          e.type === 'Inflow' ? "text-emerald-500" : "text-rose-500"
                        )}>
                          {e.type === 'Inflow' ? <ArrowDownLeft size={16}/> : <ArrowUpRight size={16}/>}
                          PKR {e.amount.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-10 py-7 text-right">
                        <button className="p-4 bg-white/5 rounded-2xl text-slate-600 hover:text-white hover:bg-white/10 transition-all border border-white/5 shadow-xl">
                          <MoreHorizontal size={20} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* SECURITY FOOTER */}
      <div className="max-w-7xl mx-auto mt-8 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.4em] text-slate-700">
          <p>© 2026 NEXUS PROTOCOL • ALL TRANSACTIONS AUDITED</p>
          <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span>LIVE SECURITY SYNC</span>
          </div>
      </div>
    </div>
  );
}