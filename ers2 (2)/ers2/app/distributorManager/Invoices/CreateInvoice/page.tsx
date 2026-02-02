"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  FileText, Receipt, Download, Printer, 
  Send, ShieldCheck, Briefcase, 
  Trash2, Edit3, X, Save, Plus, Loader2, Percent
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
  total: number;
}

interface InvoiceData {
  id: string;
  refOrder: string;
  distributor: string;
  items: InvoiceItem[];
  status: 'Draft' | 'Sent';
}

export default function CreateInvoicePage() {
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editItemIdx, setEditItemIdx] = useState<number | null>(null);

  // --- API Configuration ---
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const currentUserId = Cookies.get('userId');
  const token = Cookies.get('auth_token');

  const secureApi = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'x-user-node': currentUserId
    }
  });

  // --- Sanitize Input (Security) ---
  const sanitizeInput = (str: string) => str.replace(/[<>{}[\]\\^`|]/g, "").trim();

  // --- Data Fetching ---
  useEffect(() => {
    const fetchInvoiceTemplate = async () => {
      try {
        setLoading(true);
        // Fetching real order data to convert into invoice
        const res = await secureApi.get('/orders/latest-pending');
        setInvoice(res.data);
      } catch (err) {
        toast.error("DATA_FETCH_FAILURE", { description: "Security node blocked the request or record not found." });
      } finally {
        setLoading(false);
      }
    };
    fetchInvoiceTemplate();
  }, []);

  // --- Calculations ---
  const totals = useMemo(() => {
    if (!invoice) return { subtotal: 0, tax: 0, grand: 0 };
    const subtotal = invoice.items.reduce((acc, item) => acc + (item.qty * item.price), 0);
    const tax = subtotal * 0.17; // 17% Standard GST
    return { subtotal, tax, grand: subtotal + tax - discount };
  }, [invoice, discount]);

  // --- Core Functions ---

  const handleUpdateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    if (!invoice) return;
    const updatedItems = [...invoice.items];
    const sanitizedValue = typeof value === 'string' ? sanitizeInput(value) : value;
    
    updatedItems[index] = { 
      ...updatedItems[index], 
      [field]: sanitizedValue,
      total: field === 'qty' || field === 'price' 
        ? (field === 'qty' ? value : updatedItems[index].qty) * (field === 'price' ? value : updatedItems[index].price)
        : updatedItems[index].total
    };
    setInvoice({ ...invoice, items: updatedItems });
  };

  const handleDeleteItem = (index: number) => {
    if (!invoice || invoice.items.length <= 1) {
      toast.warning("MINIMUM_REQUIREMENT", { description: "Invoice must have at least one asset node." });
      return;
    }
    const filtered = invoice.items.filter((_, i) => i !== index);
    setInvoice({ ...invoice, items: filtered });
    toast.info("ITEM_REMOVED");
  };

  const handleAuthorizeAndSend = async () => {
    if (!invoice) return;
    setIsSyncing(true);
    try {
      const payload = { ...invoice, ...totals, discount, authorizedBy: currentUserId };
      await secureApi.post('/billing/authorize', payload);
      
      toast.success("INVOICE_MINTED", { description: `Authorized & Sent to ${invoice.distributor}` });
      setInvoice(prev => prev ? { ...prev, status: 'Sent' } : null);
    } catch (err) {
      toast.error("PROTOCOL_ERROR", { description: "Authorization failed. Check network integrity." });
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-black text-blue-500 font-black animate-pulse uppercase tracking-[0.5em]">Initializing Secure Mint...</div>;

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20 p-6">
      <Toaster position="top-right" theme="dark" richColors />

      {/* Financial Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <Receipt className="text-amber-400 w-8 h-8 p-1 bg-amber-400/20 rounded-lg" />
            Financial Mint
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            Invoice Protocol <span className="text-amber-500/50">|</span> REF: {invoice?.id}
          </p>
        </motion.div>
        
        <div className="flex gap-3">
           <button onClick={() => window.print()} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all">
              <Printer size={20} />
           </button>
           <button className="p-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white transition-all">
              <Download size={20} />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Billing Details */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div className="bg-white/[0.02] border border-white/[0.08] p-8 rounded-[2.5rem] backdrop-blur-xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                 <div className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-widest">
                    <Briefcase size={14} /> Billed To
                 </div>
                 <input 
                  value={invoice?.distributor} 
                  onChange={(e) => setInvoice(prev => prev ? {...prev, distributor: sanitizeInput(e.target.value)} : null)}
                  className="bg-transparent text-xl font-black text-white uppercase italic outline-none focus:text-amber-400 border-b border-transparent focus:border-amber-500/20 w-full"
                 />
              </div>
              <div className="md:text-right space-y-2">
                 <p className="text-white font-bold text-sm">Order Ref: <span className="text-amber-400 font-mono">#{invoice?.refOrder}</span></p>
                 <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Auth User Node: {currentUserId}</p>
              </div>
            </div>
          </motion.div>

          {/* Billing Matrix (CRUD Table) */}
          <div className="bg-slate-950/40 border border-white/[0.08] rounded-[2.5rem] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/[0.05]">
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Description</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Qty</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Aggregate</th>
                  <th className="p-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {invoice?.items.map((item, i) => (
                    <motion.tr key={i} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                      <td className="p-6">
                         <input 
                           value={item.name} 
                           onChange={(e) => handleUpdateItem(i, 'name', e.target.value)}
                           className="bg-transparent text-sm font-black text-white italic uppercase outline-none focus:text-amber-500 w-full" 
                         />
                      </td>
                      <td className="p-6">
                        <input 
                          type="number"
                          value={item.qty} 
                          onChange={(e) => handleUpdateItem(i, 'qty', Number(e.target.value))}
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm font-mono text-amber-400 outline-none w-20" 
                        />
                      </td>
                      <td className="p-6 text-right text-sm font-black text-white italic">PKR {item.total.toLocaleString()}</td>
                      <td className="p-6 text-center">
                        <button onClick={() => handleDeleteItem(i)} className="p-2 hover:bg-rose-500/20 text-slate-600 hover:text-rose-500 rounded-xl transition-all">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Terminal */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-amber-500/10 via-slate-950 to-slate-950 border border-amber-500/20 p-8 rounded-[2.5rem] shadow-2xl relative">
            <h3 className="text-xs font-black text-amber-500 uppercase tracking-[0.3em] mb-8">Ledger Breakdown</h3>

            <div className="space-y-5">
               <div className="flex justify-between text-xs font-bold uppercase italic text-slate-500">
                  <span>Gross Assets</span>
                  <span className="text-white font-mono">PKR {totals.subtotal.toLocaleString()}</span>
               </div>
               <div className="flex justify-between text-xs font-bold uppercase italic text-slate-500">
                  <span>GST (17%)</span>
                  <span className="text-white font-mono">PKR {totals.tax.toLocaleString()}</span>
               </div>
               
               <div className="pt-2">
                  <label className="text-[9px] font-black text-amber-500/50 uppercase ml-1 block mb-2">Discount Adjustment</label>
                  <div className="flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                    <Percent size={14} className="text-slate-600 mr-2" />
                    <input 
                      type="number" 
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="bg-transparent text-sm font-mono text-white outline-none w-full"
                    />
                  </div>
               </div>

               <div className="h-px bg-white/10 my-4" />

               <div className="text-right">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Net Payable</span>
                  <span className="text-3xl font-black text-white italic tracking-tighter">PKR {totals.grand.toLocaleString()}</span>
               </div>

               <button 
                onClick={handleAuthorizeAndSend}
                disabled={isSyncing || invoice?.status === 'Sent'}
                className={cn(
                  "w-full mt-6 py-4 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 transition-all",
                  invoice?.status === 'Sent' ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/20" : "bg-amber-500 text-black hover:bg-amber-400"
                )}
               >
                 {isSyncing ? <Loader2 className="animate-spin" /> : (invoice?.status === 'Sent' ? "Authorized & Locked" : "Authorize & Send")}
                 <Send size={16} />
               </button>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/[0.08] p-6 rounded-[2rem] flex items-start gap-4">
             <div className="p-2 bg-emerald-500/10 rounded-lg">
                <ShieldCheck className="text-emerald-500" size={18} />
             </div>
             <div>
                <p className="text-[10px] font-black text-white uppercase tracking-wider">Compliance Mode</p>
                <p className="text-[9px] text-slate-600 font-bold uppercase mt-1">FBR Signed. Node: {currentUserId}</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}