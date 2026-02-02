"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Search, FileSpreadsheet, 
  Calendar as CalendarIcon, MoreHorizontal,
  List, LayoutGrid, Printer, RotateCcw, Info, X, Loader2, ShieldCheck
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

  // --- Backend Config ---
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = Cookies.get('auth_token');
  const userId = Cookies.get('userId');

  // --- FETCH DATA FROM SECURE API ---
  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      if (!token || !userId) throw new Error("AUTH_MISSING");

      const response = await axios.get(`${API_BASE_URL}/accounts/history`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { 
          requesterId: userId,
          // Security: Backend should use these to filter data at DB level
          startDate: dateRange.start,
          endDate: dateRange.end 
        }
      });
      setData(response.data);
    } catch (err) {
      toast.error("DATA FETCH FAILED", { description: "Secure vault connection interrupted." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchHistory(); }, [dateRange]);

  // --- PRINT SLIP ---
  const handlePrint = (txn: Transaction) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <body style="font-family: sans-serif; padding: 40px; background: #fafafa;">
            <div style="border: 2px solid #000; padding: 20px; border-radius: 10px;">
              <h1 style="color: #2563eb; margin:0;">NEXUS RECEIPT</h1>
              <p style="font-size: 10px; color: #666;">SECURE TRANSACTION LOG</p>
              <hr style="border: 1px dashed #ccc; margin: 20px 0;"/>
              <p><strong>TXN ID:</strong> ${txn.id}</p>
              <p><strong>DATE:</strong> ${txn.date}</p>
              <p><strong>CLIENT:</strong> ${txn.customer.toUpperCase()}</p>
              <p><strong>TOTAL AMOUNT:</strong> PKR ${txn.amount.toLocaleString()}</p>
              <p><strong>STATUS:</strong> ${txn.status}</p>
              <div style="margin-top: 40px; font-size: 10px; text-align: center;">Verified by Nexus Protocol</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  // --- EXPORT CSV (Sanitized for Excel Injection protection) ---
  const handleExportCSV = () => {
    const headers = "ID,Date,Customer,Amount,Method,Status\n";
    const csvContent = filteredData.map(t => {
      // Prevent CSV Injection (Commonly starts with =, +, -, @)
      const cleanCustomer = t.customer.replace(/^[=+\-@]/, "");
      return `${t.id},${t.date},${cleanCustomer},${t.amount},${t.method},${t.status}`;
    }).join("\n");
    
    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Nexus_Export_${new Date().getTime()}.csv`);
    link.click();
    toast.success("EXPORT SUCCESSFUL", { description: "Ledger saved to local storage." });
  };

  // --- REFUND (POST REQUEST) ---
  const handleRefund = async (id: string) => {
    const toastId = toast.loading("PROCESSING REFUND...");
    try {
      await axios.post(`${API_BASE_URL}/accounts/refund`, 
        { transactionId: id, adminId: userId },
        { headers: { 'Authorization': `Bearer ${token}` }}
      );
      
      setData(prev => prev.map(t => t.id === id ? { ...t, status: 'Refunded' } : t));
      toast.success("REFUND FINALIZED", { id: toastId });
      setActiveMenu(null);
    } catch (err) {
      toast.error("REFUND DENIED", { id: toastId });
    }
  };

  // --- FILTER & SEARCH (With XSS protection) ---
  const filteredData = useMemo(() => {
    const cleanSearch = search.replace(/[<>'"\/]/g, ""); // Anti-XSS filter
    return data.filter(txn => 
      (txn.customer.toLowerCase().includes(cleanSearch.toLowerCase()) || txn.id.includes(cleanSearch))
    );
  }, [search, data]);

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans" onClick={() => setActiveMenu(null)}>
      <Toaster position="bottom-right" richColors theme="dark" />
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
            Payment <span className="text-blue-500">Archive</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2 italic">
            Financial Ledger • Protocol v2.0
          </p>
        </motion.div>
        
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={(e) => { e.stopPropagation(); handleExportCSV(); }}
            className="flex items-center gap-3 px-6 py-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-[9px] font-black uppercase tracking-widest text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/5"
          >
            <FileSpreadsheet size={16} /> Export Ledger
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
              placeholder="SEARCH CLIENT OR ID..." 
              className="w-full bg-[#020617] border border-white/10 rounded-xl py-4 pl-12 pr-4 text-[10px] font-black text-white outline-none focus:border-blue-500 uppercase tracking-widest transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <input type="date" className="bg-[#020617] border border-white/10 rounded-xl py-4 px-4 text-[10px] font-bold text-white outline-none focus:border-blue-500" onChange={(e) => setDateRange({...dateRange, start: e.target.value})} />
          <input type="date" className="bg-[#020617] border border-white/10 rounded-xl py-4 px-4 text-[10px] font-bold text-white outline-none focus:border-blue-500" onChange={(e) => setDateRange({...dateRange, end: e.target.value})} />
          <div className="flex gap-2 p-1 bg-[#020617] rounded-xl border border-white/5">
            <button onClick={() => setViewMode('table')} className={cn("flex-1 flex justify-center py-2 rounded-lg transition-all", viewMode === 'table' ? "bg-white/10 text-white" : "text-slate-600")}><List size={18} /></button>
            <button onClick={() => setViewMode('grid')} className={cn("flex-1 flex justify-center py-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white/10 text-white" : "text-slate-600")}><LayoutGrid size={18} /></button>
          </div>
        </div>
      </div>

      {/* DATA LISTING */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4 opacity-30">
          <Loader2 className="animate-spin text-blue-500" size={40} />
          <p className="text-[10px] font-black uppercase tracking-[0.5em]">Synchronizing Archive...</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {viewMode === 'table' ? (
            <motion.div key="table" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-[#050b1d] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-white/5 bg-white/[0.01]">
                    <tr>
                      <th className="px-8 py-7 text-[9px] font-black text-slate-500 uppercase tracking-widest">Transaction Details</th>
                      <th className="px-8 py-7 text-[9px] font-black text-slate-500 uppercase tracking-widest">Customer Entity</th>
                      <th className="px-8 py-7 text-[9px] font-black text-slate-500 uppercase tracking-widest">Settlement</th>
                      <th className="px-8 py-7 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Protocol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredData.map((txn) => (
                      <tr key={txn.id} className="hover:bg-white/[0.02] transition-colors relative group">
                        <td className="px-8 py-6">
                          <p className="text-xs font-black text-white italic tracking-tighter">{txn.id}</p>
                          <p className="text-[9px] font-bold text-slate-600 uppercase mt-1">{txn.date}</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-sm font-black text-slate-300 uppercase italic tracking-tighter group-hover:text-blue-400 transition-colors">{txn.customer}</p>
                          <span className="text-[8px] px-2 py-0.5 bg-white/5 rounded-full text-slate-500 font-bold uppercase">{txn.category}</span>
                        </td>
                        <td className="px-8 py-6">
                          <p className={cn("text-sm font-black italic", txn.status === 'Refunded' ? "text-rose-500" : "text-emerald-500")}>
                            PKR {txn.amount.toLocaleString()}
                          </p>
                        </td>
                        <td className="px-8 py-6 text-right relative">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === txn.id ? null : txn.id); }}
                            className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-slate-500 hover:text-white"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          
                          <AnimatePresence>
                            {activeMenu === txn.id && (
                              <motion.div initial={{ opacity: 0, scale: 0.9, x: 10 }} animate={{ opacity: 1, scale: 1, x: 0 }} className="absolute right-24 top-4 z-[99] w-48 bg-[#0f172a] border border-white/10 rounded-[1.5rem] p-2 text-left shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                <button onClick={() => setSelectedTxn(txn)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"><Info size={14} className="text-blue-500"/> Details</button>
                                <button onClick={() => handlePrint(txn)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"><Printer size={14} className="text-emerald-500"/> Print Slip</button>
                                <div className="h-[1px] bg-white/5 my-1" />
                                <button onClick={() => { if(confirm("REVERSE TRANSACTION?")) handleRefund(txn.id); }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-500/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-rose-500 transition-all"><RotateCcw size={14}/> Void / Refund</button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredData.map(txn => (
                <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={txn.id} className="bg-[#050b1d] border border-white/5 p-8 rounded-[3rem] group relative hover:border-blue-500/30 transition-all shadow-xl">
                  <div className="flex justify-between items-start mb-6">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{txn.id}</p>
                    <span className={cn("text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em]", txn.status === 'Completed' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>{txn.status}</span>
                  </div>
                  <h3 className="text-xl font-black text-white italic mb-2 uppercase tracking-tighter">{txn.customer}</h3>
                  <p className="text-2xl font-black text-emerald-500 italic tracking-tighter mb-4">PKR {txn.amount.toLocaleString()}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{txn.date} • {txn.method}</p>
                  <button onClick={() => setSelectedTxn(txn)} className="absolute bottom-8 right-8 p-4 bg-blue-500/10 rounded-2xl text-blue-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-500 hover:text-white"><Info size={20}/></button>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      )}

      {/* DETAIL MODAL (Cyber-Glass Style) */}
      <AnimatePresence>
        {selectedTxn && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#050b1d] border border-white/10 p-12 rounded-[3.5rem] w-full max-w-lg relative shadow-[0_0_100px_rgba(37,99,235,0.1)]">
              <button onClick={() => setSelectedTxn(null)} className="absolute top-10 right-10 text-slate-500 hover:text-white transition-colors"><X size={24} /></button>
              
              <div className="flex items-center gap-4 mb-8">
                <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-500"><ShieldCheck size={28} /></div>
                <div>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">Record Detail</h2>
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-1 italic">Verified by Nexus Finance</p>
                </div>
              </div>

              <div className="space-y-4 text-sm bg-white/[0.02] p-8 rounded-[2rem] border border-white/5">
                <div className="flex justify-between border-b border-white/5 pb-4"><span className="text-slate-500 uppercase font-black text-[9px] tracking-widest italic">Client Name</span><span className="text-white font-black italic">{selectedTxn.customer}</span></div>
                <div className="flex justify-between border-b border-white/5 pb-4"><span className="text-slate-500 uppercase font-black text-[9px] tracking-widest italic">Methodology</span><span className="text-white font-black italic">{selectedTxn.method}</span></div>
                <div className="flex justify-between border-b border-white/5 pb-4"><span className="text-slate-500 uppercase font-black text-[9px] tracking-widest italic">Current Status</span><span className={cn("font-black italic uppercase", selectedTxn.status === 'Completed' ? "text-emerald-500" : "text-rose-500")}>{selectedTxn.status}</span></div>
                <div className="flex justify-between pt-2"><span className="text-slate-500 uppercase font-black text-[9px] tracking-widest italic">Net Total</span><span className="text-xl font-black text-blue-500 italic">PKR {selectedTxn.amount.toLocaleString()}</span></div>
              </div>
              
              <div className="flex gap-4 mt-8">
                <button onClick={() => { handlePrint(selectedTxn); setSelectedTxn(null); }} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase italic tracking-[0.2em] shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all">Download Receipt</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}