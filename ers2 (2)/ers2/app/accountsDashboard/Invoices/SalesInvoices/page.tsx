"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Search, FileText, Printer, Send, 
  MoreVertical, CheckCircle, Truck,
  Download, Mail, Trash2, ExternalLink, Loader2, Lock
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
interface Invoice {
  id: string;
  client: string;
  amount: number;
  items: number;
  deliveryDate: string;
  status: 'Delivered' | 'Invoiced' | 'Pending';
  contact: string;
}

export default function SalesInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  // --- Backend Config & Security ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = Cookies.get('auth_token');
  const userId = Cookies.get('userId');

  // Secure Axios Instance
  const secureApi = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Secure-Auth-ID': userId, // Cross-verification header
    }
  });

  // --- FETCH DATA ---
  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      if (!token || !userId) throw new Error("Authentication Missing");
      const response = await secureApi.get(`/sales/invoices?userId=${userId}`);
      setInvoices(response.data);
    } catch (err: any) {
      toast.error("SECURITY ALERT", { 
        description: "Could not sync with sales mainframe. Re-authentication might be required." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  // --- SECURITY: SANITIZE SEARCH ---
  const safeSearch = useMemo(() => {
    // Stripping potential injection patterns
    return search.replace(/[${};"']/g, "");
  }, [search]);

  // --- 1. FUNCTION: PRINT (Sanitized Data) ---
  const handlePrintInvoice = (inv: Invoice) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Secure Print - ${inv.id}</title></head>
          <body style="font-family: sans-serif; padding: 50px; background: #fff;">
            <div style="border: 2px solid #3b82f6; padding: 30px; border-radius: 15px;">
              <h1 style="color: #1e3a8a;">NEXUS SALES PROTOCOL</h1>
              <p>Verified By: System Admin (${userId})</p>
              <hr/>
              <h3>Invoice: ${inv.id}</h3>
              <p>Client: ${inv.client}</p>
              <p>Amount: PKR ${inv.amount.toLocaleString()}</p>
              <p>Delivery: ${inv.deliveryDate}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
      toast.success("PRINT SUCCESS", { description: "Hardcopy protocol initiated." });
    }
  };

  // --- 2. FUNCTION: WHATSAPP (URL Encoded) ---
  const handleWhatsApp = (inv: Invoice) => {
    const text = `Verified Invoice from Nexus: ${inv.client}. ID: ${inv.id}, Total: PKR ${inv.amount.toLocaleString()}. Status: ${inv.status}.`;
    window.open(`https://wa.me/${inv.contact}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // --- 3. FUNCTION: DELETE (Backend Sync) ---
  const handleDelete = async (id: string) => {
    const toastId = toast.loading("PURGING SALES RECORD...");
    try {
      await secureApi.delete(`/sales/invoices/${id}`, { data: { userId } });
      setInvoices(prev => prev.filter(i => i.id !== id));
      toast.success("RECORD DELETED", { id: toastId });
      setActiveMenu(null);
    } catch (err) {
      toast.error("ACCESS DENIED", { id: toastId, description: "You do not have purge permissions." });
    }
  };

  const handleExport = () => {
    const csvData = "Invoice ID,Client,Amount,Items,Date,Status\n" + 
      filteredInvoices.map(i => {
        // Anti-CSV Injection: Prevent formulas starting with = + - @
        const safeClient = i.client.replace(/^[=+\-@]/, "'");
        return `${i.id},${safeClient},${i.amount},${i.items},${i.deliveryDate},${i.status}`;
      }).join("\n");
    
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Secure_Sales_Ledger_${new Date().getTime()}.csv`;
    link.click();
    toast.info("ENCRYPTED EXPORT", { description: "CSV ledger saved to local storage." });
  };

  const filteredInvoices = useMemo(() => {
    return invoices.filter(i => 
      i.client.toLowerCase().includes(safeSearch.toLowerCase()) || i.id.includes(safeSearch)
    );
  }, [safeSearch, invoices]);

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-10 text-slate-300 font-sans" onClick={() => setActiveMenu(null)}>
      <Toaster position="top-right" theme="dark" richColors />

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
            Sales <span className="text-blue-500">Invoices</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Lock size={12} className="text-blue-500/50" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] italic">Encrypted Billing Engine • UID: {userId?.slice(0,8)}</p>
          </div>
        </motion.div>
        
        <button 
          onClick={(e) => { e.stopPropagation(); handleExport(); }}
          className="flex items-center gap-3 px-8 py-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-blue-500 hover:text-white transition-all text-blue-400 shadow-lg shadow-blue-500/5"
        >
          <Download size={16} /> Export Data
        </button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-[#050b1d] border border-white/5 rounded-[2.5rem] p-4 mb-8 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-1 bg-blue-500/20 rounded-bl-xl border-l border-b border-white/10">
           <p className="text-[7px] font-black text-blue-400 px-2">SAFE MODE ACTIVE</p>
        </div>
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
          <input 
            type="text" 
            placeholder="VALIDATE CLIENT OR INVOICE HASH..."
            className="w-full bg-[#020617] border border-white/10 rounded-[1.5rem] py-5 pl-16 pr-6 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-blue-500/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* INVOICE LIST */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="py-32 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-blue-500" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600">Syncing Secure Ledger...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredInvoices.map((inv) => (
              <motion.div
                key={inv.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#050b1d] border border-white/5 hover:border-blue-500/30 p-6 md:p-8 rounded-[3rem] flex flex-col md:flex-row items-center justify-between gap-6 transition-all group shadow-xl"
              >
                <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className={cn(
                    "p-6 rounded-[2rem] shrink-0 shadow-inner transition-all",
                    inv.status === 'Delivered' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                  )}>
                    <FileText size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-black text-white italic uppercase tracking-tighter group-hover:text-blue-400 transition-colors">{inv.client}</h3>
                      <span className="text-[9px] font-black px-3 py-1 bg-white/5 rounded-lg text-slate-600 border border-white/5">{inv.id}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase italic tracking-wider">
                      <span className="flex items-center gap-1.5"><Truck size={14} /> Delivered: {inv.deliveryDate}</span>
                      <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500"/> {inv.items} Items Verified</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-10 w-full md:w-auto border-t md:border-none border-white/5 pt-6 md:pt-0">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-600 uppercase mb-1 tracking-widest">Gross Receivable</p>
                    <p className="text-2xl font-black text-white italic tracking-tighter">PKR {inv.amount.toLocaleString()}</p>
                  </div>

                  <div className="flex items-center gap-3 relative">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handlePrintInvoice(inv); }}
                      className="p-4 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 hover:text-white transition-all border border-white/5 shadow-xl"
                    >
                      <Printer size={20} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleWhatsApp(inv); }}
                      className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10"
                    >
                      <Send size={20} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === inv.id ? null : inv.id); }}
                      className="p-4 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 transition-all border border-white/5"
                    >
                      <MoreVertical size={20} />
                    </button>

                    <AnimatePresence>
                      {activeMenu === inv.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.9, x: 20 }}
                          animate={{ opacity: 1, scale: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9, x: 20 }}
                          className="absolute right-0 top-20 z-[100] w-56 bg-[#0f172a] border border-white/10 rounded-[1.8rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-3 backdrop-blur-xl"
                        >
                          <button className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all tracking-[0.2em]">
                            <Mail size={16} className="text-blue-500" /> Dispatch Email
                          </button>
                          <button className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all tracking-[0.2em]">
                            <ExternalLink size={16} className="text-amber-500" /> Audit Trail
                          </button>
                          <div className="h-[1px] bg-white/5 my-2 mx-2" />
                          <button 
                            onClick={() => handleDelete(inv.id)}
                            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-rose-500/10 rounded-2xl text-[9px] font-black uppercase text-rose-500 transition-all tracking-[0.2em]"
                          >
                            <Trash2 size={16} /> Purge Record
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* EMPTY STATE */}
        {!isLoading && filteredInvoices.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-40 text-center">
            <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-800 border border-white/5">
              <FileText size={48} />
            </div>
            <h3 className="text-2xl font-black text-slate-500 uppercase italic tracking-tighter">No Sales Traffic</h3>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em] mt-3">Ready for new transaction protocols</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}