"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'sonner';
import { 
  ChevronDown, DollarSign, ShieldCheck, 
  Loader2, Lock, Wallet, BadgeCheck, UserCircle
} from 'lucide-react';

// --- TYPES ---
interface InvoiceReference {
  id: number;
  invoiceNumber: string;
  supplierName: string;
  totalAmount: number;
  balanceAmount: number;
  status: string;
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

  // Only show invoices with balance > 0 and not fully PAID
  const openInvoiceOptions = useMemo(() => {
    return invoiceList.filter((invoice: any) => {
      const balanceAmount = Number(invoice.balanceAmount ?? 0);
      const normalizedStatus = String(invoice.status || "").toUpperCase();
      return balanceAmount > 0 && normalizedStatus !== "PAID";
    });
  }, [invoiceList]);

  // 1. FETCH ALL PURCHASE INVOICES FOR DROPDOWN
  const fetchInvoices = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/api/v1/finance/purchaselist');
      let extractedData: any[] = [];
      if (res.data?.data?.data && Array.isArray(res.data.data.data)) {
        extractedData = res.data.data.data;
      } else if (res.data?.data && Array.isArray(res.data.data)) {
        extractedData = res.data.data;
      } else if (Array.isArray(res.data)) {
        extractedData = res.data;
      }
      setInvoiceList(extractedData);
    } catch (err) {
      console.error("Fetch Error:", err);
      toast.error("Could not fetch purchase invoices");
      setInvoiceList([]);
    }
  }, [api, token]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  // 2. FETCH SPECIFIC PURCHASE/SUPPLIER INVOICE DETAILS
  const fetchInvoiceDetails = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      // Correct endpoint for Supplier/Purchase Invoice
      const res = await api.get(`/api/v1/finance/purchase/specific/${id}`);
      console.log('Purchase Invoice Data:', res.data);
      const data = res.data?.data?.data || res.data?.data || res.data;
      setInvoiceData(data);
      setPaidAmount("");
    } catch (err) {
      console.error("Invoice fetch error:", err);
      toast.error("Could not load invoice details");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (selectedInvoiceId) fetchInvoiceDetails(selectedInvoiceId);
    else setInvoiceData(null);
  }, [selectedInvoiceId, fetchInvoiceDetails]);

  // 3. SUBMIT SUPPLIER PAYMENT
  const handlePayment = async () => {
    const amount = Number(paidAmount);
    if (!amount || amount <= 0) return toast.error("Valid amount darj karein");

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

      toast.success("Payment Saved Successfully", { id: toastId });
      setSelectedInvoiceId("");
      setInvoiceData(null);
      setPaidAmount("");
      setRemarks("");
      fetchInvoices();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Transaction Failed", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="text-white p-6 md:p-12 pb-32 font-sans">
      <Toaster position="top-right" theme="dark" richColors />

      {/* PAGE HEADER */}
      <div className="mb-12 border-l-4 border-emerald-500 pl-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter flex items-center gap-4">
            <Wallet className="text-emerald-500" size={44} />
            Payment <span className="text-emerald-500">Out</span>
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

        {/* INVOICE DROPDOWN SELECTOR */}
        <div className="relative w-full md:w-[450px]">
          <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-3 block ml-2 text-right">
            Select Purchase Invoice
          </label>
          <div className="relative group">
            <select
              className="w-full bg-slate-900 border border-white/10 rounded-2xl py-5 pl-6 pr-12 text-xs font-black appearance-none outline-none focus:border-emerald-500 transition-all cursor-pointer uppercase tracking-wider group-hover:border-white/20"
              value={selectedInvoiceId}
              onChange={(e) => setSelectedInvoiceId(e.target.value)}
            >
              <option value="">-- SELECT UNPAID INVOICE --</option>
              {Array.isArray(openInvoiceOptions) && openInvoiceOptions.map((inv: any) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber || `PINV-${inv.id}`} | {inv.supplierName} | Bal: PKR {Number(inv.balanceAmount).toLocaleString()}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          </div>
        </div>
      </div>

      {/* INVOICE DETAILS + PAYMENT PANEL */}
      {invoiceData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* LEFT: INVOICE LINE ITEMS TABLE */}
          <div className="lg:col-span-2">
            <div className="bg-slate-900/40 border border-white/5 rounded-[3.5rem] p-10">

              {/* Invoice Header */}
              <div className="flex justify-between items-end mb-10 border-b border-white/5 pb-8">
                <div>
                  <h2 className="text-3xl font-black italic uppercase text-white">
                    {invoiceData.suppl_invoice_number || `PINV-${invoiceData.suppl_inv_id}`}
                  </h2>
                  <p className="text-[10px] font-black text-slate-500 uppercase mt-1">
                    Status: <span className="text-emerald-400">{invoiceData.status}</span>
                  </p>
                </div>
                <div className="text-right">
                  <h2 className="text-2xl font-black uppercase text-blue-400 italic">
                    {invoiceData.party?.name || 'Supplier'}
                  </h2>
                  <p className="text-[10px] text-slate-500 uppercase">
                    {invoiceData.party?.email || ''}
                  </p>
                </div>
              </div>

              {/* Supplier Invoice Lines Table */}
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase">Product</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase text-center">Qty</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase text-right">Unit Price</th>
                    <th className="p-4 text-[10px] font-black text-slate-500 uppercase text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoiceData.supplierinvoiceline || []).length > 0 ? (
                    (invoiceData.supplierinvoiceline || []).map((line: any, idx: number) => (
                      <tr key={idx} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                        <td className="p-4">
                          <p className="text-xs font-bold text-white uppercase">
                            {line.product?.name || 'Unknown Product'}
                          </p>
                          <p className="text-[9px] font-mono text-slate-500">
                            {line.product?.sku_code || ''}
                          </p>
                        </td>
                        <td className="p-4 text-center text-xs font-black text-slate-300">
                          {Number(line.quantity)}
                        </td>
                        <td className="p-4 text-right text-xs font-mono text-slate-400">
                          PKR {Number(line.unit_price).toLocaleString()}
                        </td>
                        <td className="p-4 text-right text-xs font-black text-emerald-400">
                          PKR {Number(line.line_total).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-600 text-xs italic">
                        No line items found for this invoice
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT: PAYMENT SETTLEMENT PANEL */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[4rem] p-10 shadow-3xl">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-8 italic">
                Financial Settlement
              </p>

              <div className="space-y-6 mb-10">
                {/* Subtotal — backend calculated lineSubtotal */}
                <div className="flex justify-between items-center opacity-60">
                  <span className="text-[10px] font-black uppercase">Invoice Subtotal:</span>
                  <span className="text-md font-mono">
                    PKR {Number(invoiceData.lineSubtotal || invoiceData.total_amount || 0).toLocaleString()}
                  </span>
                </div>

                {/* Transport Charges — resolved from invoice or GRN fallback */}
                {Number(invoiceData.resolvedTransport || 0) > 0 && (
                  <div className="flex justify-between items-center opacity-80">
                    <span className="text-[10px] font-black uppercase text-indigo-400">Transport (+):</span>
                    <span className="text-md font-mono text-indigo-400">
                      PKR {Number(invoiceData.resolvedTransport).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Discount — resolved from invoice or GRN fallback */}
                {Number(invoiceData.resolvedDiscount || 0) > 0 && (
                  <div className="flex justify-between items-center opacity-80">
                    <span className="text-[10px] font-black uppercase text-orange-400">Discount (-):</span>
                    <span className="text-md font-mono text-orange-400">
                      PKR {Number(invoiceData.resolvedDiscount).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Already Paid */}
                <div className="flex justify-between items-center opacity-60">
                  <span className="text-[10px] font-black uppercase text-slate-400">Already Paid:</span>
                  <span className="text-md font-mono text-slate-400">
                    PKR {Number(invoiceData.totalPaid || 0).toLocaleString()}
                  </span>
                </div>

                 {/* Net Outstanding — backend balanceDue (includes transport) */}
                <div className="flex justify-between items-center pb-6 border-b border-white/10">
                  <span className="text-[11px] font-black text-slate-400 uppercase">Net Outstanding:</span>
                  <span className="text-3xl font-black text-rose-500 italic tracking-tighter">
                    PKR {Number(invoiceData.balanceDue ?? invoiceData.balanceAmount ?? 0).toLocaleString()}
                  </span>
                </div>

                {/* Amount Input */}
                <div className="pt-4">
                  <label className="text-[10px] font-black text-emerald-500 uppercase mb-3 block ml-2">
                    Deposit Amount (PKR)
                  </label>
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

                  {/* Remarks */}
                  <div className="pt-4">
                    <label className="text-[10px] font-black text-emerald-500 uppercase mb-3 block ml-2">
                      Remarks (Optional)
                    </label>
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

              {/* Submit Button */}
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
        /* EMPTY STATE */
        <div className="mt-20 flex flex-col items-center justify-center py-48 border-2 border-dashed border-white/5 rounded-[5rem] bg-white/[0.01]">
          <Lock size={60} className="text-slate-800 animate-pulse mb-6" />
          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600 italic text-center">
            Select an Invoice Above <br />
            <span className="text-[8px] opacity-50 mt-2 block">Awaiting Invoice Selection</span>
          </p>
        </div>
      )}

      {/* LOADING OVERLAY */}
      {loading && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex flex-col items-center justify-center gap-6">
          <Loader2 className="animate-spin text-emerald-500" size={60} />
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[1em] animate-pulse">
            Syncing Ledger...
          </p>
        </div>
      )}
    </div>
  );
}
