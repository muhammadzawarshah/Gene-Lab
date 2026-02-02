"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Search, FileSpreadsheet, FileText, 
  MoreHorizontal, ChevronLeft, ChevronRight,
  List, LayoutGrid, Printer, RotateCcw, Info, X, CheckCircle, Loader2
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
interface Transaction {
  id: string;
  date: string;
  customer: string;
  amount: number;
  method: 'Bank' | 'Cash' | 'Online';
  status: 'Completed' | 'Refunded';
  category: 'Sales' | 'Advance' | 'Credit';
}

export default function PaymentHistory() {
  const [data, setData] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = Cookies.get('auth_token');
  const userId = Cookies.get('userId');

  // --- 1. FETCH DATA FROM BACKEND ---
  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      if (!token || !userId) throw new Error("Authentication Required");

      const response = await axios.get(`${API_BASE_URL}/accounts/history`, {
        params: { 
          userId, 
          search: search.replace(/['"--]/g, ""), // Basic Sanitization against SQL Injection characters
          startDate: dateRange.start,
          endDate: dateRange.end 
        },
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setData(response.data);
    } catch (err: any) {
      toast.error("DATA FETCH FAILED", {
        description: "Could not establish secure connection to archive.",
        className: "bg-rose-600 border-none text-white font-sans",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchHistory();
    }, 500); // Debounce to prevent API spamming
    return () => clearTimeout(delayDebounce);
  }, [search, dateRange]);

  // --- 2. SECURE REFUND FUNCTION ---
  const handleRefund = async (id: string) => {
    const toastId = toast.loading("PROCESSING REFUND...");
    try {
      await axios.patch(`${API_BASE_URL}/accounts/refund/${id}`, 
        { processedBy: userId },
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      
      setData(prev => prev.map(t => t.id === id ? { ...t, status: 'Refunded' } : t));
      toast.success("TRANSACTION REFUNDED", { id, className: "bg-emerald-600 text-white" });
      setActiveMenu(null);
    } catch (err) {
      toast.error("REFUND DENIED", { id: toastId, className: "bg-rose-600 text-white" });
    }
  };

  // --- 3. PRINT & EXPORT ---
  const handlePrint = (txn: Transaction) => {
    toast.info("PREPARING ENCRYPTED SLIP...");
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Receipt - ${txn.id}</title></head>
          <body style="font-family: sans-serif; padding: 40px; color: #333; background: #fff;">
            <div style="border: 4px double #eee; padding: 30px; border-radius: 20px;">
              <h1 style="text-align: center; color: #1e293b; letter-spacing: -1px;">NEXUS PROTOCOL RECEIPT</h1>
              <p style="text-align: center; font-size: 10px; color: #64748b; text-transform: uppercase;">Verified by Audit ID: ${userId}</p>
              <hr style="border: 1px solid #f1f5f9; margin: 20px 0;" />
              <div style="display: flex; justify-content: space-between;">
                <span><strong>ID:</strong> ${txn.id}</span>
                <span><strong>Date:</strong> ${txn.date}</span>
              </div>
              <h2 style="color: #059669; font-size: 24px; margin-top: 20px;">PKR ${txn.amount.toLocaleString()}</h2>
              <p><strong>Customer:</strong> ${txn.customer}</p>
              <p><strong>Method:</strong> ${txn.method}</p>
              <p><strong>Status:</strong> ${txn.status}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-10 text-slate-300 font-sans" onClick={() => setActiveMenu(null)}>
      <Toaster position="bottom-right" theme="dark" richColors />
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
            Payment <span className="text-blue-500">Archive</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2 italic">Historical Data Ledger • Audit Ready</p>
        </motion.div>
        
        <div className="flex gap-3">
          <button onClick={fetchHistory} className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all text-blue-500">
             <RotateCcw size={18} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button className="flex items-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20">
            <FileSpreadsheet size={16} /> Export Audit
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-[#050b1d] border border-white/5 rounded-[2.5rem] p-6 mb-8 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
            <input 
              type="text" 
              placeholder="SEARCH BY ID OR NAME..." 
              className="w-full bg-[#020617] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-[10px] font-bold uppercase text-white outline-none focus:border-blue-500 transition-all" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          <input type="date" className="bg-[#020617] border border-white/10 rounded-xl py-3 px-4 text-[10px] font-bold text-white outline-none focus:border-blue-500" onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
          <input type="date" className="bg-[#020617] border border-white/10 rounded-xl py-3 px-4 text-[10px] font-bold text-white outline-none focus:border-blue-500" onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
          <div className="flex gap-2 p-1 bg-[#020617] rounded-xl border border-white/5">
            <button onClick={() => setViewMode('table')} className={cn("flex-1 flex justify-center py-2 rounded-lg transition-all", viewMode === 'table' ? "bg-blue-600 text-white" : "text-slate-600")}><List size={18} /></button>
            <button onClick={() => setViewMode('grid')} className={cn("flex-1 flex justify-center py-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-blue-600 text-white" : "text-slate-600")}><LayoutGrid size={18} /></button>
          </div>
        </div>
      </div>

      {/* MAIN DATA LIST */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 className="animate-spin text-blue-500" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">Decrypting Ledger...</p>
          </div>
        ) : (
          <motion.div key={viewMode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={viewMode === 'table' ? "bg-[#050b1d] border border-white/5 rounded-[2.5rem] overflow-visible" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"}>
            {viewMode === 'table' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Hash ID</th>
                      <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Counter-Party</th>
                      <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Amount (PKR)</th>
                      <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] text-right">Ops</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.map((txn) => (
                      <tr key={txn.id} className="group hover:bg-white/[0.02] transition-all">
                        <td className="px-8 py-6">
                          <p className="text-xs font-black text-white uppercase">{txn.id}</p>
                          <p className="text-[9px] font-bold text-slate-600">{txn.date}</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-black text-slate-300 italic uppercase group-hover:text-blue-400 transition-all">{txn.customer}</p>
                          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-tighter">{txn.method} • {txn.category}</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className={cn("text-sm font-black italic", txn.status === 'Refunded' ? "text-rose-500" : "text-emerald-500")}>
                            {txn.status === 'Refunded' ? '-' : ''} {txn.amount.toLocaleString()}
                          </p>
                        </td>
                        <td className="px-8 py-6 text-right relative">
                          <button onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === txn.id ? null : txn.id); }} className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-slate-400"><MoreHorizontal size={16} /></button>
                          <AnimatePresence>
                            {activeMenu === txn.id && (
                              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute right-24 top-0 z-[100] w-48 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl p-2 text-left backdrop-blur-xl">
                                <button onClick={() => setSelectedTxn(txn)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:text-white"><Info size={14} className="text-blue-500" /> Details</button>
                                <button onClick={() => handlePrint(txn)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:text-white"><Printer size={14} className="text-emerald-500" /> Print Slip</button>
                                {txn.status !== 'Refunded' && (
                                  <button onClick={() => handleRefund(txn.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-500/10 rounded-xl text-[9px] font-black uppercase text-rose-500"><RotateCcw size={14} /> Refund</button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              data.map((txn) => (
                <div key={txn.id} className="bg-[#050b1d] border border-white/5 p-8 rounded-[2.5rem] hover:border-blue-500/30 transition-all group relative">
                   <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500 w-fit mb-6"><FileText size={20} /></div>
                   <h3 className="text-xl font-black text-white italic uppercase">{txn.customer}</h3>
                   <p className="text-[10px] font-bold text-slate-600 uppercase mb-6 tracking-widest">{txn.date} • {txn.id}</p>
                   <div className="flex justify-between items-end">
                      <p className={cn("text-xl font-black italic", txn.status === 'Refunded' ? "text-rose-500 line-through" : "text-emerald-500")}>PKR {txn.amount.toLocaleString()}</p>
                      <button onClick={() => handlePrint(txn)} className="p-2 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Printer size={16}/></button>
                   </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DETAILS MODAL */}
      <AnimatePresence>
        {selectedTxn && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#050b1d] border border-white/10 p-10 rounded-[3rem] w-full max-w-lg relative">
              <button onClick={() => setSelectedTxn(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
              <CheckCircle className="text-emerald-500 mb-6" size={48} />
              <h2 className="text-2xl font-black text-white italic uppercase">Protocol Verify</h2>
              <div className="space-y-4 bg-white/5 p-6 rounded-2xl border border-white/5 mt-6">
                <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-500">Hash ID</span><span className="text-white">{selectedTxn.id}</span></div>
                <div className="flex justify-between text-[10px] font-black uppercase"><span className="text-slate-500">Client</span><span className="text-white">{selectedTxn.customer}</span></div>
                <div className="flex justify-between text-[10px] font-black uppercase pt-4 border-t border-white/10"><span className="text-slate-500">Net Amount</span><span className="text-xl text-emerald-500 italic">PKR {selectedTxn.amount.toLocaleString()}</span></div>
              </div>
              <button onClick={() => { handlePrint(selectedTxn); setSelectedTxn(null); }} className="w-full mt-8 py-4 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-[0.3em] hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/20">Authorize Print</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}