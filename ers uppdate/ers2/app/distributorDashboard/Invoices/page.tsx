"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import {
  Search, ArrowUpRight, CheckCircle2, AlertCircle, CreditCard,
  Download, Calendar, Landmark, X, Loader2, ShieldCheck
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
type InvoiceStatus = 'Unpaid' | 'Partially Paid' | 'Paid' | 'All';

// Backend structure ke mutabiq Interface
interface Invoice {
  cust_inv_id: number;
  cust_invoice_number: string | null;
  cust_invoice_date: string;
  total_amount: string;
  status: string;
  so_id: number;
}

const statusStyles: Record<string, { text: string; bg: string; dot: string }> = {
  'Unpaid': { text: 'text-rose-400', bg: 'bg-rose-500/10', dot: 'bg-rose-500' },
  'PAID': { text: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
  'Paid': { text: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-500' },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<InvoiceStatus>('All');
  const [isDownloading, setIsDownloading] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Auth & Security ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = Cookies.get('auth_token');
  
  const currentUserId = useMemo(() => {
    const raw = Cookies.get('virtue_user');
    if (!raw) return null;
    try {
      return JSON.parse(decodeURIComponent(raw)).id;
    } catch { return null; }
  }, []);

  const secureApi = useMemo(() => axios.create({
    baseURL: API_URL,
    headers: { 'Authorization': `Bearer ${token}` }
  }), [token, API_URL]);

  // --- Fetch Logic ---
  const fetchInvoices = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const res = await secureApi.get(`/api/v1/finance/specificcustomerinvoice/${currentUserId}`);
      // Backend data ko state mein save karna
      setInvoices(res.data.data || []);
    } catch (err) {
      toast.error("LEDGER ERROR", { description: "Failed to sync financial data." });
    } finally {
      setLoading(false);
    }
  }, [currentUserId, secureApi]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // --- Calculations ---
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv.cust_invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            inv.cust_inv_id.toString().includes(searchQuery);
      const matchesFilter = activeFilter === 'All' || inv.status.toLowerCase() === activeFilter.toLowerCase();
      return matchesSearch && matchesFilter;
    });
  }, [invoices, searchQuery, activeFilter]);

  const totalOutstanding = useMemo(() => {
    return invoices
      .filter(i => i.status !== 'PAID' && i.status !== 'Paid')
      .reduce((acc, curr) => acc + parseFloat(curr.total_amount), 0);
  }, [invoices]);

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans bg-black">
      <Toaster position="top-right" theme="dark" richColors />

      {/* HEADER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-blue-800 p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl shadow-blue-900/20">
          <div className="relative z-10 flex flex-col md:flex-row justify-between h-full">
            <div>
              <p className="text-blue-100/60 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Account Receivable</p>
              <h1 className="text-4xl font-black text-white italic tracking-tighter mb-4">
                PKR {totalOutstanding.toLocaleString()}
              </h1>
              <div className="flex gap-4">
                <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold text-white border border-white/10 flex items-center gap-2">
                  <ShieldCheck size={12} /> Secure Financial Node
                </span>
              </div>
            </div>
          </div>
          <Landmark className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/5 -rotate-12 pointer-events-none" />
        </motion.div>

        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-center">
          <p className="text-slate-500 text-[10px] font-black uppercase mb-4">Node Identity</p>
          <div className="flex items-center gap-4">
            <CheckCircle2 className="text-emerald-500 w-6 h-6" />
            <div>
              <h3 className="text-xl font-black text-white italic">ID: {currentUserId}</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase">System Verified</p>
            </div>
          </div>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row gap-4 justify-between bg-white/[0.02] p-4 rounded-[2rem] border border-white/5">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="SEARCH INVOICE ID..."
            className="w-full bg-black border border-white/10 rounded-2xl py-3 pl-14 pr-10 text-[10px] font-black tracking-widest text-white outline-none focus:border-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex bg-black border border-white/10 rounded-2xl p-1">
          {['All', 'Unpaid', 'Paid'].map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f as InvoiceStatus)}
              className={cn(
                "px-6 py-2 rounded-xl text-[9px] font-black uppercase transition-all",
                activeFilter === f ? "bg-blue-600 text-white" : "text-slate-500"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* INVOICE LIST */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="flex flex-col items-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Syncing Ledger...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredInvoices.map((inv) => {
              const style = statusStyles[inv.status] || statusStyles['Unpaid'];
              return (
                <motion.div
                  key={inv.cust_inv_id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-[#050b1d] border border-white/5 rounded-[2rem] p-6 flex flex-wrap lg:flex-nowrap items-center justify-between gap-6 hover:border-blue-500/30 transition-all"
                >
                  <div className="flex items-center gap-6 min-w-[200px]">
                    <div className="p-4 bg-white/[0.02] rounded-2xl">
                      <CreditCard className="text-blue-500" size={24} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-white italic">#{inv.cust_inv_id}</h4>
                      <p className="text-[10px] font-bold text-slate-600 uppercase">
                        SO: {inv.so_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-8 border-l border-white/5 px-6">
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Total Billing</p>
                      <p className="text-sm font-black text-white">PKR {Number(inv.total_amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Invoice Date</p>
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <Calendar size={12} /> {new Date(inv.cust_invoice_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className={cn("px-4 py-2 rounded-xl flex items-center gap-3 border border-white/5", style.bg)}>
                      <div className={cn("w-1.5 h-1.5 rounded-full", style.dot)} />
                      <span className={cn("text-[10px] font-black uppercase italic", style.text)}>{inv.status}</span>
                    </div>

                    
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}