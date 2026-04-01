"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import {
  Search, FileText, Printer, Send, Eye,
  MoreVertical, CheckCircle, Truck,
  Download, Mail, Trash2, ExternalLink, Loader2, Lock, X
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { CustInvoiceReportComponent } from '@/components/layout/CustInvoiceReportComponent';

// --- Types ---
interface Invoice {
  cust_inv_id: number;
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
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isFetchingInvoice, setIsFetchingInvoice] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = Cookies.get('auth_token');
  const userId = Cookies.get('userId') || Cookies.get('user_id');

  const secureApi = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Secure-Auth-ID': userId,
    }
  });

  // --- FETCH LIST ---
  const fetchInvoices = async () => {
    setIsLoading(true);
    try {
      const response = await secureApi.get(`/api/v1/finance/getinvoice`);
      const raw: any[] = response.data.data || [];
      setInvoices(raw.map(inv => ({
        cust_inv_id:  inv.cust_inv_id,
        id:           inv.cust_invoice_number || `INV-${inv.cust_inv_id}`,
        client:       inv.party?.name || 'Unknown',
        amount:       Number(inv.total_amount || 0),
        items:        inv.customerinvoiceline?.length ?? 0,
        deliveryDate: inv.cust_invoice_date ? new Date(inv.cust_invoice_date).toLocaleDateString('en-GB') : '—',
        status:       inv.status === 'PAID' ? 'Delivered' : inv.status === 'POSTED' ? 'Invoiced' : 'Pending',
        contact:      inv.party?.phone || '',
      })));
    } catch (err: any) {
      toast.error("Failed to load invoices");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  // --- VIEW INVOICE (fetch full details) ---
  const handleViewInvoice = async (inv: Invoice) => {
    setIsFetchingInvoice(true);
    setSelectedInvoice(null);
    try {
      const res = await secureApi.get(`/api/v1/finance/sales/specific/${inv.cust_inv_id}`);
      const data = res.data.data || res.data;
      setSelectedInvoice(data);
    } catch {
      toast.error("Could not load invoice details");
    } finally {
      setIsFetchingInvoice(false);
    }
  };

  // --- PRINT ---
  const handlePrint = () => {
    const printContent = document.getElementById('invoice-print-area');
    if (printContent) {
      const originalContent = document.body.innerHTML;
      document.body.innerHTML = printContent.outerHTML;
      window.print();
      window.location.reload();
    }
  };

  // --- WHATSAPP ---
  const handleWhatsApp = (inv: Invoice) => {
    const text = `Invoice from Gene Laboratories: ${inv.client}. ID: ${inv.id}, Total: PKR ${inv.amount.toLocaleString()}. Status: ${inv.status}.`;
    window.open(`https://wa.me/${inv.contact}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // --- DELETE ---
  const handleDelete = async (id: string) => {
    const toastId = toast.loading("Deleting record...");
    try {
      await secureApi.delete(`/sales/invoices/${id}`, { data: { userId } });
      setInvoices(prev => prev.filter(i => i.id !== id));
      toast.success("Record deleted", { id: toastId });
      setActiveMenu(null);
    } catch {
      toast.error("Delete failed", { id: toastId });
    }
  };

  // --- EXPORT CSV ---
  const handleExport = () => {
    const csvData = "Invoice ID,Client,Amount,Items,Date,Status\n" +
      filteredInvoices.map(i => {
        const safeClient = i.client.replace(/^[=+\-@]/, "'");
        return `${i.id},${safeClient},${i.amount},${i.items},${i.deliveryDate},${i.status}`;
      }).join("\n");
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Sales_Invoices_${new Date().getTime()}.csv`;
    link.click();
    toast.info("CSV exported");
  };

  // --- SEARCH FILTER ---
  const safeSearch = useMemo(() => search.replace(/[${};\"']/g, ""), [search]);

  const filteredInvoices = useMemo(() => {
    const term = safeSearch.toLowerCase();
    return invoices.filter(i =>
      (i.client?.toLowerCase() ?? '').includes(term) ||
      (i.id?.toLowerCase() ?? '').includes(term)
    );
  }, [safeSearch, invoices]);

  return (
    <div className="p-4 md:p-10 text-slate-300 font-sans" onClick={() => setActiveMenu(null)}>
      <Toaster position="top-right" theme="dark" richColors />

      {/* HEADER */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
            Sales <span className="text-blue-500">Invoices</span>
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Lock size={12} className="text-blue-500/50" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] italic">
              Billing Engine • UID: {userId?.slice(0,8)}
            </p>
          </div>
        </motion.div>

        <button
          onClick={(e) => { e.stopPropagation(); handleExport(); }}
          className="flex items-center gap-3 px-8 py-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-blue-500 hover:text-white transition-all text-blue-400 shadow-lg shadow-blue-500/5"
        >
          <Download size={16} /> Export Data
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="bg-[#050b1d] border border-white/5 rounded-[2.5rem] p-4 mb-8 shadow-2xl overflow-hidden relative">
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
          <input
            type="text"
            placeholder="Search by client or invoice number..."
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
            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600">Loading Invoices...</p>
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
                      <span className="flex items-center gap-1.5"><Truck size={14} /> Date: {inv.deliveryDate}</span>
                      <span className="flex items-center gap-1.5"><CheckCircle size={14} className="text-emerald-500"/> {inv.items} Items</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-10 w-full md:w-auto border-t md:border-none border-white/5 pt-6 md:pt-0">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-600 uppercase mb-1 tracking-widest">Gross Receivable</p>
                    <p className="text-2xl font-black text-white italic tracking-tighter">PKR {inv.amount.toLocaleString()}</p>
                  </div>

                  <div className="flex items-center gap-3 relative">
                    {/* VIEW / PRINT */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleViewInvoice(inv); }}
                      className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl hover:bg-blue-500 hover:text-white transition-all border border-blue-500/20 shadow-xl"
                      title="View & Print Invoice"
                    >
                      <Eye size={20} />
                    </button>

                    {/* WHATSAPP */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleWhatsApp(inv); }}
                      className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10"
                    >
                      <Send size={20} />
                    </button>

                    {/* MORE */}
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
                            <Mail size={16} className="text-blue-500" /> Send Email
                          </button>
                          <button className="w-full flex items-center gap-4 px-4 py-4 hover:bg-white/5 rounded-2xl text-[9px] font-black uppercase text-slate-400 hover:text-white transition-all tracking-[0.2em]">
                            <ExternalLink size={16} className="text-amber-500" /> Audit Trail
                          </button>
                          <div className="h-[1px] bg-white/5 my-2 mx-2" />
                          <button
                            onClick={() => handleDelete(inv.id)}
                            className="w-full flex items-center gap-4 px-4 py-4 hover:bg-rose-500/10 rounded-2xl text-[9px] font-black uppercase text-rose-500 transition-all tracking-[0.2em]"
                          >
                            <Trash2 size={16} /> Delete Record
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
            <h3 className="text-2xl font-black text-slate-500 uppercase italic tracking-tighter">No Invoices Found</h3>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-[0.4em] mt-3">Ready for new transactions</p>
          </motion.div>
        )}
      </div>

      {/* INVOICE DETAIL MODAL */}
      {(isFetchingInvoice || selectedInvoice) && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[2rem] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-blue-500/5 shrink-0">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Invoice Detail</p>
                <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                  {selectedInvoice?.cust_invoice_number || (selectedInvoice ? `INV-${selectedInvoice.cust_inv_id}` : 'Loading...')}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {selectedInvoice && (
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    <Printer size={14} /> Print Invoice
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
                  <Loader2 className="animate-spin text-blue-500" size={36} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Loading Invoice...</p>
                </div>
              ) : (
                <div className="w-full bg-white rounded-lg overflow-hidden flex justify-center p-4">
                  <CustInvoiceReportComponent data={selectedInvoice} />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-8 pb-8 shrink-0">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black text-slate-400 uppercase transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
