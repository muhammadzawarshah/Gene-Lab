"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'sonner';
import { 
  ChevronDown, Receipt, DollarSign, ShieldCheck, 
  Loader2, Lock, Wallet, BadgeCheck, UserCircle
} from 'lucide-react';

// --- TYPES ---
interface InvoiceReference {
  id: number;
  invoiceNumber: string;
  supplierName: string;
  totalAmount: number;
  balanceAmount: number;
}

export default function CreatePayment() {
  const [invoiceList, setInvoiceList] = useState<InvoiceReference[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [paidAmount, setPaidAmount] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remarks, setRemarks] = useState("");

  // --- AUTH & CONFIG ---
  const token = Cookies.get('auth_token');
  const currentUserId = Cookies.get('user_id'); 
  const currentUserName = Cookies.get('user_name') || "Authorized Operator";
  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  const api = useMemo(() => axios.create({
    baseURL: API_BASE,
    headers: { Authorization: `Bearer ${token}` }
  }), [token, API_BASE]);

  // 1. FETCH INVOICES (With Double-Nesting Fix)
  const fetchInvoices = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/api/v1/finance/purchaselist');
      
      // Aapke console log ke mutabiq data res.data.data.data mein hai
      let extractedData = [];
      if (res.data?.data?.data && Array.isArray(res.data.data.data)) {
        extractedData = res.data.data.data;
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        extractedData = res.data.data;
      }

      setInvoiceList(extractedData);
    } catch (err) {
      console.error("Fetch Error:", err);
      toast.error("Security Access Error: Could not fetch ledger");
      setInvoiceList([]);
    }
  }, [api, token]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // 2. FETCH SPECIFIC INVOICE
  const fetchInvoiceDetails = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/finance/specificinvoice/${id}`);
      console.log(res.data.data)
      // Yahan check kar lena agar backend specific invoice ko bhi nest kar raha hai
      const data = res.data?.data?.data || res.data?.data || res.data;
      setInvoiceData(data);
      setPaidAmount(""); 
    } catch (err) {
      toast.error("Integrity Error: Invoice data missing");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (selectedInvoiceId) fetchInvoiceDetails(selectedInvoiceId);
    else setInvoiceData(null);
  }, [selectedInvoiceId, fetchInvoiceDetails]);

  // 3. SUBMIT PAYMENT
  const handlePayment = async () => {
    
    const amount = Number(paidAmount);
    // Flexible balance check based on backend field names
    const balance = invoiceData?.balanceDue || invoiceData?.balanceAmount || 0;

    setSubmitting(true);
    const toastId = toast.loading("Processing Settlement...");
    
    try {
      const payload = {
        invoiceId: Number(selectedInvoiceId),
        amount: amount,
        method: "CASH",
        remarks: remarks || `Payment by ${currentUserName}`,
        narration: remarks || `Supplier payment for Invoice #${selectedInvoiceId}`,
        userId: currentUserId
      };

      await api.post('/api/v1/finance/payments/purchase', payload);

      toast.success("Payment Hashed & Saved", { id: toastId });
      setSelectedInvoiceId("");
      setInvoiceData(null);
      fetchInvoices();
    } catch (err) {
      toast.error("Transaction Refused", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="text-white p-6 md:p-12 pb-32 font-sans">
      <Toaster position="top-right" theme="dark" richColors />

      {/* HEADER SECTION */}
      <div className="mb-12 border-l-4 border-emerald-500 pl-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter flex items-center gap-4">
            <Wallet className="text-emerald-500" size={44} />
            Sales <span className="text-emerald-500">Forge</span>
          </h1>
          <div className="flex items-center gap-4 mt-3">
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] italic flex items-center gap-2">
              <ShieldCheck size={14} className="text-emerald-500" /> Secure Financial Node
            </p>
            <div className="h-1 w-1 bg-slate-700 rounded-full" />
            <p className="text-[10px] text-emerald-500/50 uppercase font-black flex items-center gap-2">
              <UserCircle size={14} /> {currentUserName}
            </p>
          </div>
        </div>

        {/* INVOICE SELECTOR */}
        <div className="relative w-full md:w-[450px]">
          <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-3 block ml-2 text-right">Invoice Vault Access</label>
          <div className="relative group">
            <select 
              className="w-full bg-slate-900 border border-white/10 rounded-2xl py-5 pl-6 pr-12 text-xs font-black appearance-none outline-none focus:border-emerald-500 transition-all cursor-pointer uppercase tracking-wider group-hover:border-white/20"
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
            >
              <option value="">-- SELECT UNPAID INVOICE --</option>
              {Array.isArray(invoiceList) && invoiceList.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} | {inv.supplierName} | Bal: {inv.balanceAmount}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          </div>
        </div>
      </div>

      {invoiceData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* LEFT: PRODUCT TABLE */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/40 border border-white/5 rounded-[3.5rem] p-10">
               <div className="flex justify-between items-end mb-10 border-b border-white/5 pb-8">
                  <div>
                    <h2 className="text-3xl font-black italic uppercase text-white">
                      {invoiceData.cust_invoice_number || `INV-${invoiceData.cust_inv_id}`}
                    </h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase">Status: {invoiceData.status}</p>
                  </div>
                  <div className="text-right">
                    <h2 className="text-2xl font-black uppercase text-blue-400 italic">{invoiceData.party?.name}</h2>
                  </div>
               </div>

               <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="p-4 text-[10px] font-black text-slate-500 uppercase">Description</th>
                      <th className="p-4 text-[10px] font-black text-slate-500 uppercase text-center">Qty</th>
                      <th className="p-4 text-[10px] font-black text-slate-500 uppercase text-right">Unit Price</th>
                      <th className="p-4 text-[10px] font-black text-slate-500 uppercase text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                     {/* Yahan customerinvoiceline map ho raha hai */}
                     {(invoiceData.customerinvoiceline || []).map((line: any, idx: number) => (
                      <tr key={idx} className="border-b border-white/[0.02]">
                        <td className="p-4">
                          <p className="text-[9px] font-black text-slate-500 uppercase">
                            {line.product?.productcategory?.category || 'General'}
                          </p>
                          <p className="text-xs font-bold text-white uppercase">{line.product?.name}</p>
                        </td>
                        <td className="p-4 text-center text-xs font-black">{line.quantity}</td>
                        <td className="p-4 text-right text-xs font-mono text-slate-400">PKR {line.unit_price}</td>
                        <td className="p-4 text-right text-xs font-black text-emerald-400">PKR {line.line_total}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
            </div>
          </div>
          {/* RIGHT: SETTLEMENT PANEL */}
          <div className="lg:col-span-1 space-y-6">
             <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[4rem] p-10 shadow-3xl">
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-8 italic">Financial Settlement</p>
                
                <div className="space-y-6 mb-10">
                  <div className="flex justify-between items-center opacity-40">
                    <span className="text-[10px] font-black uppercase">Total Billing:</span>
                    <span className="text-md font-mono">PKR {Number(invoiceData.total_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center pb-6 border-b border-white/10">
                    <span className="text-[11px] font-black text-slate-400 uppercase">Net Outstanding:</span>
                    <span className="text-3xl font-black text-rose-500 italic tracking-tighter">
                      PKR {(invoiceData.balanceDue || invoiceData.balanceAmount || 0).toLocaleString()}
                    </span>
                  </div>

                  <div className="pt-4">
                    <label className="text-[10px] font-black text-emerald-500 uppercase mb-3 block ml-2">Deposit Amount (PKR)</label>
                    <div className="relative group">
                      <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-emerald-500" size={24} />
                      <input 
                        type="number" 
                        value={paidAmount}
                        onChange={(e) => setPaidAmount(e.target.value === "" ? "" : Math.abs(Number(e.target.value)))}
                        placeholder="0.00"
                        className="w-full bg-slate-950 border-2 border-white/5 rounded-[2rem] py-6 pl-16 pr-6 text-3xl font-black text-white outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div className="pt-4">
                      <label className="text-[10px] font-black text-emerald-500 uppercase mb-3 block ml-2">Remarks (Optional)</label>
                      <textarea
                        rows={2}
                        className="w-full bg-slate-950 border-2 border-white/5 rounded-[1.5rem] py-4 px-6 text-sm text-white outline-none focus:border-emerald-500 transition-all resize-none shadow-inner"
                        placeholder="Enter payment remarks..."
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handlePayment}
                  disabled={submitting || !paidAmount}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-7 rounded-[2rem] font-black uppercase text-xs tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-20 shadow-2xl shadow-emerald-500/20"
                >
                  {submitting ? <Loader2 className="animate-spin" /> : <BadgeCheck size={20} />}
                  Commit Transaction
                </button>
             </div>
          </div>
        </div>
      ) : (
        <div className="mt-20 flex flex-col items-center justify-center py-48 border-2 border-dashed border-white/5 rounded-[5rem] bg-white/[0.01]">
          <Lock size={60} className="text-slate-800 animate-pulse mb-6" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600 italic text-center">
            Vault Encryption Active <br/> <span className="text-[8px] opacity-50 mt-2 block">Awaiting Ledger Authentication</span>
          </p>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex flex-col items-center justify-center gap-6">
          <Loader2 className="animate-spin text-emerald-500" size={60} />
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[1em] animate-pulse">Syncing Ledger...</p>
        </div>
      )}
    </div>
  );
}