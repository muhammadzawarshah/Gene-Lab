"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Search, User, Download, FileText, 
  ArrowUpRight, Printer, Wallet, History, MessageSquare,
  Loader2, ShieldCheck, Lock, AlertTriangle
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
interface LedgerEntry {
  id: string;
  date: string;
  type: 'Invoice' | 'Payment' | 'Return';
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBalance: number;
  lastActive: string;
}

export default function CustomerLedger() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<Record<string, LedgerEntry[]>>({});
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // --- Security Config ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = Cookies.get('auth_token');
  const userId = Cookies.get('userId');

  const secureApi = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Secure-Client-ID': userId,
    }
  });

  // --- Fetch Customers ---
  useEffect(() => {
    const fetchAccounts = async () => {
      setIsLoading(true);
      try {
        if (!userId || !token) throw new Error("Security Violation: Unauthorized Access");
        const res = await secureApi.get(`/customers/ledger-summary?userId=${userId}`);
        setCustomers(res.data);
      } catch (err: any) {
        toast.error("ENCRYPTION ERROR", { description: "Session might be expired. Re-authenticate." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  // --- Fetch Ledger Entries for Selected Customer ---
  useEffect(() => {
    if (selectedCustomer && !ledgerEntries[selectedCustomer.id]) {
      const fetchDetails = async () => {
        try {
          // Sanitized ID param
          const safeId = selectedCustomer.id.replace(/[^a-zA-Z0-9-]/g, "");
          const res = await secureApi.get(`/customers/ledger/${safeId}?userId=${userId}`);
          setLedgerEntries(prev => ({ ...prev, [selectedCustomer.id]: res.data }));
        } catch (err) {
          toast.error("ACCESS DENIED", { description: "Record is locked or unavailable." });
        }
      };
      fetchDetails();
    }
  }, [selectedCustomer]);

  // --- Security: Search Sanitization ---
  const safeSearch = useMemo(() => {
    return search.replace(/[${};"']/g, ""); // Stripping dangerous characters
  }, [search]);

  // --- Functions ---
  const handleExportLedger = (customer: Customer) => {
    const entries = ledgerEntries[customer.id] || [];
    const csvHeader = "Date,Description,Type,Debit,Credit,Balance\n";
    const csvRows = entries.map(e => {
      // Prevent CSV Injection (starts with =, +, -, @)
      const safeDesc = e.description.replace(/^[=+\-@]/, "'");
      return `${e.date},${safeDesc},${e.type},${e.debit},${e.credit},${e.balance}`;
    }).join("\n");
    
    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SECURE_LEDGER_${customer.name}_${new Date().getTime()}.csv`;
    link.click();
    toast.success("LEDGER EXPORTED", { description: "Verified file downloaded." });
  };

  const handleWhatsAppStatement = (customer: Customer) => {
    const text = `Verified Statement: Salaam ${customer.name}, your balance at Nexus is PKR ${customer.totalBalance.toLocaleString()}. Ref: ${userId?.slice(0, 5)}`;
    window.open(`https://wa.me/${customer.phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(safeSearch.toLowerCase()) || c.id.includes(safeSearch)
    );
  }, [safeSearch, customers]);

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
            Client <span className="text-blue-500">Ledger</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <ShieldCheck size={12} className="text-blue-500/60" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] italic">Validated Financial Stream • Session: {userId?.slice(0, 8)}</p>
          </div>
        </motion.div>
        
        <div className="relative w-full md:w-96 shadow-2xl">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
          <input 
            type="text" 
            placeholder="VALIDATE ACCOUNT HASH..." 
            className="w-full bg-[#050b1d] border border-white/10 rounded-2xl py-5 pl-16 pr-6 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-blue-500 transition-all shadow-inner"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* CUSTOMER LIST (LEFT) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-2 mb-4">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Lock size={10} className="text-blue-500" /> Active Protocol Accounts
            </h2>
            {isLoading && <Loader2 size={14} className="animate-spin text-blue-500" />}
          </div>

          <div className="h-[calc(100vh-300px)] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
            {filteredCustomers.map(customer => (
              <motion.div 
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                whileHover={{ x: 5, backgroundColor: "rgba(255,255,255,0.03)" }}
                className={cn(
                  "p-8 rounded-[2.5rem] border cursor-pointer transition-all flex items-center justify-between group relative overflow-hidden",
                  selectedCustomer?.id === customer.id 
                    ? "bg-blue-600 border-blue-400 text-white shadow-2xl shadow-blue-600/30" 
                    : "bg-[#050b1d] border-white/5 hover:border-white/10"
                )}
              >
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-inner",
                    selectedCustomer?.id === customer.id ? "bg-white/20" : "bg-white/5"
                  )}>
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase italic tracking-tighter group-hover:tracking-normal transition-all">{customer.name}</h3>
                    <p className={cn("text-[10px] font-black mt-1", selectedCustomer?.id === customer.id ? "text-blue-100" : "text-slate-600")}>
                      NET: PKR {customer.totalBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
                {customer.totalBalance > 0 && selectedCustomer?.id !== customer.id && (
                  <div className="absolute top-0 right-10">
                    <div className="bg-rose-500/20 text-rose-500 text-[8px] font-black px-3 py-1 rounded-b-lg border-b border-rose-500/30">DEBT</div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* LEDGER DETAILS (RIGHT) */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedCustomer ? (
              <motion.div 
                key={selectedCustomer.id}
                initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }}
                className="bg-[#050b1d] border border-white/5 rounded-[4rem] overflow-hidden shadow-2xl h-full flex flex-col"
              >
                {/* ACCOUNT SUMMARY */}
                <div className="p-10 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-gradient-to-b from-white/[0.02] to-transparent">
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-blue-600/10 rounded-[2rem] flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-inner">
                      <Wallet size={36} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">{selectedCustomer.name}</h2>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-white/10 pr-3">ID: {selectedCustomer.id}</span>
                        <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{selectedCustomer.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleWhatsAppStatement(selectedCustomer)} className="p-5 bg-emerald-500/10 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-xl">
                      <MessageSquare size={20} />
                    </button>
                    <button onClick={() => handleExportLedger(selectedCustomer)} className="p-5 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 hover:text-white transition-all border border-white/5">
                      <Download size={20} />
                    </button>
                    <button onClick={() => window.print()} className="p-5 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 hover:text-white transition-all border border-white/5">
                      <Printer size={20} />
                    </button>
                  </div>
                </div>

                {/* LEDGER TABLE */}
                <div className="p-6 flex-1 overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-[#050b1d] z-10">
                      <tr className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] border-b border-white/5">
                        <th className="px-8 py-6">Timestamp</th>
                        <th className="px-8 py-6">Narration</th>
                        <th className="px-8 py-6 text-rose-500">Debit (+)</th>
                        <th className="px-8 py-6 text-emerald-500">Credit (-)</th>
                        <th className="px-8 py-6">Account Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {!ledgerEntries[selectedCustomer.id] ? (
                        <tr>
                          <td colSpan={5} className="py-20 text-center">
                            <Loader2 className="animate-spin mx-auto text-blue-500 mb-4" size={32} />
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600">Decrypting Entries...</p>
                          </td>
                        </tr>
                      ) : (
                        ledgerEntries[selectedCustomer.id].map((entry) => (
                          <tr key={entry.id} className="hover:bg-white/[0.03] transition-colors group">
                            <td className="px-8 py-8 text-[11px] font-black text-slate-500 uppercase italic">{entry.date}</td>
                            <td className="px-8 py-8">
                              <p className="text-xs font-black text-slate-200 uppercase tracking-tight group-hover:text-white transition-colors">{entry.description}</p>
                              <p className="text-[9px] font-bold text-slate-700 uppercase mt-1">Ref: {entry.id}</p>
                            </td>
                            <td className="px-8 py-8 text-xs font-black text-rose-500 italic">
                              {entry.debit > 0 ? `+ ${entry.debit.toLocaleString()}` : '—'}
                            </td>
                            <td className="px-8 py-8 text-xs font-black text-emerald-500 italic">
                              {entry.credit > 0 ? `- ${entry.credit.toLocaleString()}` : '—'}
                            </td>
                            <td className="px-8 py-8">
                              <span className="text-xs font-black text-white px-4 py-2 bg-white/5 rounded-xl border border-white/5 tracking-tighter shadow-inner">
                                PKR {entry.balance.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* FOOTER ACTION */}
                <div className="p-10 bg-white/[0.01] border-t border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">System Status: Integrity Verified</p>
                  </div>
                  <button className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2 hover:gap-6 transition-all group">
                    View Forensic Audit Trail <ArrowUpRight size={14} className="group-hover:text-white" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[600px] border-2 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center text-slate-700 bg-white/[0.01]">
                <div className="relative mb-8">
                  <User size={80} className="opacity-10" />
                  <AlertTriangle size={24} className="absolute bottom-0 right-0 text-amber-500/20" />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-600">No Target Selected</h3>
                <p className="text-[9px] font-bold uppercase tracking-[0.4em] mt-3">Select a client profile to initiate financial handshake</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}