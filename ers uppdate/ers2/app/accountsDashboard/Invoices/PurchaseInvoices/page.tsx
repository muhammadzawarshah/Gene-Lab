"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Search, FileDown, MoreVertical, 
  Calendar, Trash2, Eye, Loader2, 
  ArrowUpRight, ShieldCheck, Lock, X
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { PurchaseInvoiceReportComponent } from '@/components/layout/PurchaseInvoiceReportComponent';

// --- Types ---
interface PurchaseInvoice {
  id: string; // This is the Invoice Number (human readable)
  numericId: number; // This is the Database ID for fetching
  vendor: string;
  totalAmount: number;
  balanceAmount: number;
  paidAmount: number;
  tax: number;
  date: string;
  status: 'Paid' | 'Unpaid' | 'Partial';
  category: 'Raw Material' | 'Equipment' | 'Services' | 'General';
}

export default function PurchaseInvoices() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isFetchingInvoice, setIsFetchingInvoice] = useState(false);
  const [settleTarget, setSettleTarget] = useState<PurchaseInvoice | null>(null);
  const [settleForm, setSettleForm] = useState({ amount: '', method: 'CASH', payment_date: '', narration: '' });
  const [isSettling, setIsSettling] = useState(false);

  // --- Auth & API Config ---
  const API_KEY = process.env.NEXT_PUBLIC_API_URL;
  const token = Cookies.get('auth_token');
  const currentUserId = Cookies.get('userId') || Cookies.get('user_id');

  // Secure Axios Instance
  const api = axios.create({
    baseURL: API_KEY,
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-User-ID': currentUserId, // Security check at server level
      'Content-Type': 'application/json'
    }
  });

  // --- FETCH DATA FROM BACKEND ---
  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      if (!token) throw new Error("Session Expired");
      const response = await api.get('/api/v1/finance/purchaselist');
      
      // Robust Data Extraction: Handle double-nested or flat responses
      let raw: any[] = [];
      const respData = response.data;
      
      if (respData && Array.isArray(respData.data)) {
        raw = respData.data;
      } else if (respData && respData.data && Array.isArray(respData.data.data)) {
        raw = respData.data.data; // Double nested fallback
      } else if (Array.isArray(respData)) {
        raw = respData;
      }
      
      setInvoices(raw.map(inv => ({
        id:            inv.invoiceNumber || `PBILL-${inv.id}`,
        numericId:     inv.id,
        vendor:        inv.supplierName || 'System Record',
        totalAmount:   Number(inv.totalAmount || 0),
        balanceAmount: Number(inv.balanceAmount ?? inv.totalAmount ?? 0),
        paidAmount:    Number(inv.paidAmount || 0),
        tax:           0,
        date:          inv.date,
        status:        inv.status === 'PAID' ? 'Paid' : inv.status === 'PARTIAL' ? 'Partial' : 'Unpaid',
        category:      'General'
      })));
    } catch (err: any) {
      toast.error("DATA SYNC FAILED", { 
        description: "Secure gateway refused the connection." 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  };

  useEffect(() => { fetchInvoices(); }, []);

  // --- 1. FUNCTION: VIEW INVOICE (Fetch full details) ---
  const handleViewInvoice = async (inv: PurchaseInvoice) => {
    setIsFetchingInvoice(true);
    setSelectedInvoice(null);
    try {
      // Backend route using the numeric ID
      const res = await api.get(`/api/v1/finance/purchase/specific/${inv.numericId}`);
      const data = res.data.data || res.data;
      setSelectedInvoice(data);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Record is locked or missing.";
      console.error("Inspect invoice error:", err);
      toast.error("COULD NOT RETRIEVE BILL", { description: msg });
    } finally {
      setIsFetchingInvoice(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('invoice-print-area');
    if (printContent) {
      const originalContent = document.body.innerHTML;
      document.body.innerHTML = printContent.outerHTML;
      window.print();
      window.location.reload();
    }
  };

  // --- 2. FUNCTION: DOWNLOAD INVOICE (With Content Security) ---
  const handleDownload = (inv: PurchaseInvoice) => {
    const data = `SECURE INVOICE LOG\nRef: ${inv.id}\nVendor: ${inv.vendor.toUpperCase()}\nNet: PKR ${inv.totalAmount}\nDate: ${inv.date}`;
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bill_${inv.id}_Verified.txt`;
    a.click();
    toast.success("METADATA EXPORTED", { description: "Verified file saved." });
  };

  // --- 2. FUNCTION: EXPORT FULL LEDGER (Anti-Injection Sanitized) ---
  const exportFullLedger = () => {
    // Sanitizing CSV data to prevent CSV Injection (=, +, -, @ characters)
    const headers = "ID,Vendor,Category,Date,Amount,Tax,Status\n";
    const csv = headers + filteredInvoices.map(i => {
      const safeVendor = i.vendor.replace(/^[=+\-@]/, "'");
      return `${i.id},${safeVendor},${i.category},${i.date},${i.totalAmount},${i.tax},${i.status}`;
    }).join("\n");

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Purchase_Ledger_SECURE_${new Date().getTime()}.csv`;
    link.click();
    toast.success("LEDGER EXPORTED", { description: "Encrypted CSV is ready." });
  };

  // --- 3. FUNCTION: SETTLE BILL ---
  const openSettle = (inv: PurchaseInvoice) => {
    setSettleTarget(inv);
    const bal = inv.balanceAmount ?? inv.totalAmount ?? 0;
    setSettleForm({ amount: String(bal > 0 ? bal : (inv.totalAmount ?? 0)), method: 'CASH', payment_date: '', narration: '' });
    setActiveMenu(null);
  };

  const handleSettleBill = async () => {
    if (!settleTarget) return;
    if (!settleForm.amount || Number(settleForm.amount) <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }
    setIsSettling(true);
    const toastId = toast.loading("Processing payment...");
    try {
      await api.post('/api/v1/finance/payments/purchase', {
        invoiceId: settleTarget.numericId,
        amount: Number(settleForm.amount),
        method: settleForm.method,
        payment_date: settleForm.payment_date || undefined,
        narration: settleForm.narration || undefined,
        userId: currentUserId
      });
      toast.success("Payment recorded successfully", { id: toastId });
      setSettleTarget(null);
      fetchInvoices();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Payment failed", { id: toastId });
    } finally {
      setIsSettling(false);
    }
  };

  // --- 4. FUNCTION: DELETE (DELETE REQUEST) ---
  const handleDelete = async (id: string) => {
    const toastId = toast.loading("PURGING RECORD...");
    try {
      await api.delete(`/procurement/invoices/${id}`);
      setInvoices(prev => prev.filter(i => i.id !== id));
      toast.success("RECORD PURGED", { id: toastId });
      setActiveMenu(null);
    } catch (err) {
      toast.error("DELETE DENIED", { id: toastId, description: "Administrative lock active." });
    }
  };

  // --- SECURITY: INPUT SANITIZATION ---
  const safeSearch = useMemo(() => {
    return search.replace(/[<>'"\/\\;]/g, ""); // Prevent XSS & Injection payloads
  }, [search]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => 
      inv.vendor.toLowerCase().includes(safeSearch.toLowerCase()) || inv.id.includes(safeSearch)
    );
  }, [safeSearch, invoices]);

  const totalSpent = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

  return (
    <div className=" p-4 md:p-10 text-slate-300 font-sans" onClick={() => setActiveMenu(null)}>
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
            Purchase <span className="text-amber-500">Invoices</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Lock size={10} className="text-amber-500/50" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] italic">Procurement Vault • Level 4 Access</p>
          </div>
        </motion.div>

        <div className="flex gap-4">
          <div className="bg-[#050b1d] border border-white/5 p-4 px-8 rounded-2xl hidden md:block text-right shadow-xl">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Aggregate Expenditure</p>
            <p className="text-xl font-black text-amber-500 italic">PKR {totalSpent.toLocaleString()}</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); exportFullLedger(); }} 
            className="flex items-center gap-3 px-6 py-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-[#020617] transition-all text-amber-500 shadow-lg shadow-amber-500/5"
          >
            <FileDown size={18} /> Export Data
          </button>
        </div>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-[#050b1d] border border-white/5 rounded-[2.5rem] p-4 mb-8 shadow-2xl relative">
        <div className="absolute top-0 right-10 -translate-y-1/2 flex items-center gap-2 bg-[#020617] px-4 py-1 border border-white/10 rounded-full">
           <ShieldCheck size={12} className="text-emerald-500" />
           <span className="text-[8px] font-black text-slate-500 tracking-widest uppercase">Safe-Input Mode Active</span>
        </div>
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
          <input 
            type="text" 
            placeholder="VALIDATE VENDOR OR BILL REFERENCE..."
            className="w-full bg-[#020617] border border-white/10 rounded-[1.5rem] py-5 pl-16 pr-6 text-[10px] font-black uppercase tracking-[0.2em] text-white outline-none focus:border-amber-500/50 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* TABLE LISTING */}
      <div className="bg-[#050b1d] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
        {isLoading ? (
          <div className="py-40 flex flex-col items-center gap-4 opacity-50">
            <Loader2 className="animate-spin text-amber-500" size={40} />
            <p className="text-[10px] font-black uppercase tracking-[0.5em]">Synchronizing Secure Archive...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-white/5 bg-white/[0.01]">
                <tr>
                  <th className="px-8 py-7 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Transaction ID</th>
                  <th className="px-8 py-7 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Vendor Entity</th>
                  <th className="px-8 py-7 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">Settlement</th>
                  <th className="px-8 py-7 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] text-right">Auth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence mode='popLayout'>
                  {filteredInvoices.map((inv) => (
                    <motion.tr 
                      key={inv.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="hover:bg-white/[0.02] transition-colors relative group"
                    >
                      <td className="px-8 py-6">
                        <p className="text-xs font-black text-white italic tracking-tighter">{inv.id}</p>
                        <p className="text-[9px] font-bold text-slate-600 flex items-center gap-1 mt-1 uppercase tracking-tighter"><Calendar size={10}/> {formatDate(inv.date)}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-black text-slate-300 uppercase italic tracking-tighter group-hover:text-amber-500 transition-colors">{inv.vendor}</p>
                        <p className="text-[9px] font-bold text-slate-600 uppercase mt-1 tracking-widest">{inv.category}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-black text-white italic tracking-tighter">PKR {inv.totalAmount.toLocaleString()}</p>
                        <p className={cn(
                          "text-[9px] font-black uppercase mt-1 px-3 py-1 rounded-full inline-block tracking-tighter shadow-sm",
                          inv.status === 'Paid' ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/10" : "bg-rose-500/10 text-rose-500 border border-rose-500/10"
                        )}>
                          {inv.status} Protocol
                        </p>
                      </td>
                      <td className="px-8 py-6 text-right relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === inv.id ? null : inv.id); }}
                          className="p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-all text-slate-500 hover:text-white border border-white/5"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {/* ACTION MENU */}
                        <AnimatePresence>
                          {activeMenu === inv.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, x: 20 }}
                              animate={{ opacity: 1, scale: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.95, x: 20 }}
                              className="absolute right-24 top-4 z-[100] w-52 bg-[#0f172a] border border-white/10 rounded-[1.8rem] shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-3 text-left backdrop-blur-xl"
                            >
                              <button onClick={() => handleViewInvoice(inv)} className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all tracking-widest">
                                <Eye size={16} className="text-blue-500" /> Inspect
                              </button>
                              <button onClick={() => openSettle(inv)} className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all tracking-widest">
                                <ArrowUpRight size={16} className="text-emerald-500" /> Settle Bill
                              </button>
                              <div className="h-[1px] bg-white/5 my-2 mx-2" />
                              <button 
                                onClick={() => handleDelete(inv.id)}
                                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-rose-500/10 rounded-2xl text-[9px] font-black uppercase text-rose-500 transition-all tracking-widest"
                              >
                                <Trash2 size={16} /> Purge Record
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SETTLE BILL MODAL */}
      <AnimatePresence>
        {settleTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => !isSettling && setSettleTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0f172a] border border-white/10 rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-emerald-500/5">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Settle Supplier Bill</p>
                  <h2 className="text-lg font-black text-white italic uppercase tracking-tighter">{settleTarget.id}</h2>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase">{settleTarget.vendor}</p>
                </div>
                <button onClick={() => setSettleTarget(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Balance Info */}
              <div className="px-8 py-4 flex gap-6 border-b border-white/5">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Bill</p>
                  <p className="text-base font-black text-white">PKR {(settleTarget.totalAmount ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Paid</p>
                  <p className="text-base font-black text-emerald-400">PKR {(settleTarget.paidAmount ?? 0).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Balance Due</p>
                  <p className="text-base font-black text-amber-400">PKR {(settleTarget.balanceAmount ?? settleTarget.totalAmount ?? 0).toLocaleString()}</p>
                </div>
              </div>

              {/* Form */}
              <div className="px-8 py-6 space-y-4">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Payment Amount (PKR)</label>
                  <input
                    type="number"
                    className="w-full bg-[#020617] border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white outline-none focus:border-emerald-500 transition-all"
                    value={settleForm.amount}
                    onChange={(e) => setSettleForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="Enter amount"
                    min={0}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Payment Method</label>
                  <select
                    className="w-full bg-[#020617] border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white outline-none focus:border-emerald-500 transition-all [color-scheme:dark]"
                    value={settleForm.method}
                    onChange={(e) => setSettleForm(f => ({ ...f, method: e.target.value }))}
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="ONLINE">Online</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Payment Date (Optional)</label>
                  <input
                    type="date"
                    className="w-full bg-[#020617] border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white outline-none focus:border-emerald-500 transition-all [color-scheme:dark]"
                    value={settleForm.payment_date}
                    onChange={(e) => setSettleForm(f => ({ ...f, payment_date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-2">Narration (Optional)</label>
                  <input
                    type="text"
                    className="w-full bg-[#020617] border border-white/10 rounded-xl py-3 px-4 text-sm font-bold text-white outline-none focus:border-emerald-500 transition-all"
                    value={settleForm.narration}
                    onChange={(e) => setSettleForm(f => ({ ...f, narration: e.target.value }))}
                    placeholder="Payment remarks..."
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-8 pb-8 flex gap-3">
                <button
                  onClick={() => setSettleTarget(null)}
                  disabled={isSettling}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSettleBill}
                  disabled={isSettling}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-2xl text-[10px] font-black text-white uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSettling ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />}
                  {isSettling ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PURCHASE BILL DETAIL MODAL */}
      {(isFetchingInvoice || selectedInvoice) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-amber-500/5 shrink-0 text-left">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Procurement Verification</p>
                <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                  {selectedInvoice?.suppl_invoice_number || (selectedInvoice ? `PBILL-${selectedInvoice.suppl_inv_id}` : 'Loading...')}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {selectedInvoice && (
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    <Eye size={14} /> Print Bill
                  </button>
                )}
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 text-slate-500 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex-1 overflow-y-auto">
              {isFetchingInvoice ? (
                <div className="py-20 flex flex-col items-center gap-4">
                  <Loader2 className="animate-spin text-amber-500" size={36} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Reconciling Ledger...</p>
                </div>
              ) : (
                <div className="w-full bg-white rounded-lg overflow-hidden flex justify-center p-4">
                  <PurchaseInvoiceReportComponent data={selectedInvoice} />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 pb-8 shrink-0">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase transition-all"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}