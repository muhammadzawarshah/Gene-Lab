"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
  Wallet, Loader2, Search, ChevronDown,
  FileText, Receipt, ShieldCheck, Truck
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

const sanitizeString = (str: string) => str.replace(/[<>]/g, "").trim();

export default function FullSecurePayment() {
  const authToken = Cookies.get('auth_token');

  const [invoices, setInvoices] = useState<any[]>([]);
  const [availableDns, setAvailableDns] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isInvOpen, setIsInvOpen] = useState(false);
  const [invSearch, setInvSearch] = useState("");
  const invRef = useRef<HTMLDivElement>(null);

  const [amountReceived, setAmountReceived] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState("");

  const authHeaders = { Authorization: `Bearer ${authToken}` };

  const fetchInvoices = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/finance/getinvoice`, {
        headers: authHeaders
      });
      setInvoices(res.data.data || []);
    } catch {
      toast.error("Database connection error.");
    }
  }, [authToken]);

  const fetchDns = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/finance/invoice/dns/available`, {
        headers: authHeaders
      });
      setAvailableDns(res.data.data || []);
    } catch {
      // non-critical, silently ignore
    }
  }, [authToken]);

  useEffect(() => {
    fetchInvoices();
    fetchDns();
  }, [fetchInvoices, fetchDns]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (invRef.current && !invRef.current.contains(e.target as Node)) setIsInvOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredInvoices = useMemo(() => {
    const term = invSearch.toLowerCase().trim();
    return invoices.filter(inv => {
      const balanceAmount = Number(inv.balanceAmount ?? 0);
      const normalizedStatus = String(inv.status || "").toUpperCase();
      const matchesSearch =
        inv.cust_inv_id?.toString().includes(term) ||
        inv.party?.name?.toLowerCase().includes(term);
      return matchesSearch && balanceAmount > 0 && normalizedStatus !== "PAID";
    });
  }, [invSearch, invoices]);

  const filteredDns = useMemo(() => {
    const term = invSearch.toLowerCase().trim();
    return availableDns.filter(dn =>
      dn.delivery_number?.toLowerCase().includes(term) ||
      dn.salesorder?.party?.name?.toLowerCase().includes(term)
    );
  }, [invSearch, availableDns]);

  const handleSelect = async (inv: any) => {
    setIsInvOpen(false);
    setInvSearch("");
    setIsFetching(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/finance/specificinvoice/${inv.cust_inv_id}`,
        { headers: authHeaders }
      );
      setSelectedInvoice(res.data.data);
      setAmountReceived("");
    } catch {
      toast.error("Failed to load invoice details.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleDnSelect = async (dn: any) => {
    setIsInvOpen(false);
    setInvSearch("");
    setIsFetching(true);
    try {
      // Auto-generate invoice from DN, then load it for payment
      const genRes = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/finance/invoices/generate/${dn.delivery_number}`,
        { userId: Cookies.get('user_id') },
        { headers: authHeaders }
      );
      const invoiceId = genRes.data.data.cust_inv_id;
      const detRes = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/finance/specificinvoice/${invoiceId}`,
        { headers: authHeaders }
      );
      setSelectedInvoice(detRes.data.data);
      setAmountReceived("");
      toast.success("Invoice generated from Delivery Note.");
      fetchInvoices();
      fetchDns();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to generate invoice from Delivery Note.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleSubmit = async () => {
    const amount = parseFloat(amountReceived);
    if (!selectedInvoice) return toast.error("Please select an invoice first.");
    if (isNaN(amount) || amount <= 0) return toast.error("Please enter a valid amount.");

    const tId = toast.loading("Securing Transaction...");
    setIsSubmitting(true);

    try {
      const payload = {
        invoiceId: selectedInvoice.cust_inv_id,
        amount: amount,
        payment_date: paymentDate,
        remarks: sanitizeString(remarks),
        narration: sanitizeString(remarks),
        userId: Cookies.get('user_id'),
        method: "CASH",
      };

      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/finance/payments/receive`,
        payload,
        { headers: authHeaders }
      );

      toast.success("Payment Processed Successfully!", { id: tId });
      setSelectedInvoice(null);
      setAmountReceived("");
      setRemarks("");
      fetchInvoices();
      fetchDns();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Transaction Rejected.", { id: tId });
    } finally {
      setIsSubmitting(false);
    }
  };

  const labelClass = "text-[10px] font-black text-slate-500 uppercase mb-2 block ml-2 tracking-widest";
  const inputStyle = "bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-blue-500 outline-none w-full text-sm transition-all shadow-inner";

  const hasResults = filteredInvoices.length > 0 || filteredDns.length > 0;

  return (
    <div className="text-slate-300 p-4 md:p-12 font-sans selection:bg-blue-500/30">
      <Toaster richColors theme="dark" position="top-center" />
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 border-b border-white/5 pb-10">
          <div className="flex items-center gap-6">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-xl shadow-blue-500/20 ring-1 ring-blue-400/20">
              <Wallet className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                FINANCE <span className="text-blue-500">COLLECTION</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] mt-2 uppercase">Secure Ledger Entry Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
            <ShieldCheck className="text-emerald-500" size={18} />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">SQL Injection Protected</span>
          </div>
        </header>

        {/* Invoice / DN Selector */}
        <div className="relative mb-12" ref={invRef}>
          <label className={labelClass}>Step 1: Select Invoice or Delivery Note</label>
          <div
            onClick={() => setIsInvOpen(!isInvOpen)}
            className={`w-full bg-[#0f172a] border ${isInvOpen ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.1)]' : 'border-slate-800'} rounded-2xl py-6 px-8 flex justify-between items-center text-white cursor-pointer transition-all hover:border-slate-700`}
          >
            <div className="flex items-center gap-5">
              <Receipt className={selectedInvoice ? "text-blue-500" : "text-slate-600"} size={24} />
              <div>
                <span className={selectedInvoice ? "text-xl font-black italic text-blue-400" : "text-lg text-slate-500"}>
                  {selectedInvoice ? `INVOICE #${selectedInvoice.cust_inv_id}` : "Find Invoice or Delivery Note..."}
                </span>
                {selectedInvoice && (
                  <p className="text-[10px] font-black text-slate-500 uppercase">{selectedInvoice.party?.name}</p>
                )}
              </div>
            </div>
            <ChevronDown size={20} className={isInvOpen ? "rotate-180 text-blue-500" : "text-slate-600"} />
          </div>

          {isInvOpen && (
            <div className="absolute z-999 mt-3 w-full bg-[#0f172a] border border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
              {/* Search */}
              <div className="p-5 bg-white/5 border-b border-white/5">
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 text-slate-500" size={18} />
                  <input
                    autoFocus
                    className="w-full bg-slate-900/80 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white outline-none focus:ring-2 ring-blue-500/50"
                    placeholder="Search by ID, name, or DN number..."
                    value={invSearch}
                    onChange={(e) => setInvSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {/* Invoices Section */}
                {filteredInvoices.length > 0 && (
                  <>
                    <div className="px-8 py-2 text-[9px] font-black text-blue-400 uppercase tracking-widest bg-blue-500/5 border-b border-white/5">
                      Invoices
                    </div>
                    {filteredInvoices.map((inv) => (
                      <div
                        key={inv.cust_inv_id}
                        onClick={() => handleSelect(inv)}
                        className="px-8 py-5 hover:bg-blue-600 group cursor-pointer border-b border-white/5 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/20">
                            <FileText size={16} className="text-slate-400 group-hover:text-white" />
                          </div>
                          <div>
                            <p className="font-black text-slate-200 group-hover:text-white uppercase">#{inv.cust_inv_id}</p>
                            <p className="text-[10px] text-slate-500 group-hover:text-blue-100 font-bold">{inv.party?.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-black text-white">
                            PKR {parseFloat(inv.balanceAmount ?? inv.total_amount ?? 0).toLocaleString()}
                          </p>
                          <p className="text-[9px] font-black uppercase text-slate-500 group-hover:text-blue-100">{inv.status}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Delivery Notes Section */}
                {filteredDns.length > 0 && (
                  <>
                    <div className="px-8 py-2 text-[9px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/5 border-b border-white/5">
                      Delivery Notes — Click to Auto-Generate Invoice
                    </div>
                    {filteredDns.map((dn) => (
                      <div
                        key={dn.delv_note_id}
                        onClick={() => handleDnSelect(dn)}
                        className="px-8 py-5 hover:bg-amber-600/80 group cursor-pointer border-b border-white/5 flex justify-between items-center"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center group-hover:bg-white/20">
                            <Truck size={16} className="text-amber-400 group-hover:text-white" />
                          </div>
                          <div>
                            <p className="font-black text-slate-200 group-hover:text-white uppercase">
                              DN #{dn.delivery_number}
                            </p>
                            <p className="text-[10px] text-slate-500 group-hover:text-amber-100 font-bold">
                              {dn.salesorder?.party?.name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-black text-white">
                            PKR {parseFloat(dn.salesorder?.total_amount ?? 0).toLocaleString()}
                          </p>
                          <p className="text-[9px] font-black uppercase text-amber-500 group-hover:text-amber-100">
                            Delivery Note
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {/* Empty state */}
                {!hasResults && (
                  <div className="px-8 py-16 text-center text-[10px] text-slate-600 font-black uppercase tracking-widest">
                    No pending invoices or delivery notes found.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Invoice Detail & Payment Form */}
        {isFetching ? (
          <div className="py-24 flex flex-col items-center">
            <Loader2 className="animate-spin text-blue-500" size={48} />
            <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mt-4">Loading...</p>
          </div>
        ) : selectedInvoice && (
          <div className="space-y-10">
            <div className="bg-[#0f172a]/30 border border-white/5 rounded-[2.5rem] overflow-hidden">
              <div className="px-10 py-7 border-b border-white/5 flex justify-between items-center">
                <h2 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Audit Trail Breakdown</h2>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-slate-500 uppercase bg-black/40 border-b border-white/5">
                    <th className="px-10 py-5">Product</th>
                    <th className="px-10 py-5 text-center">Qty</th>
                    <th className="px-10 py-5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {selectedInvoice.customerinvoiceline?.map((line: any) => (
                    <tr key={line.cust_inv_line_id}>
                      <td className="px-10 py-5 font-bold text-slate-200 text-sm">{line.product?.name}</td>
                      <td className="px-10 py-5 text-center font-mono text-slate-400">{line.quantity}</td>
                      <td className="px-10 py-5 text-right font-mono font-black text-white">
                        PKR {parseFloat(line.line_total).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-blue-600/5">
                    <td colSpan={2} className="px-10 py-8 text-right text-[11px] font-black text-slate-500 uppercase">Grand Total</td>
                    <td className="px-10 py-8 text-right font-mono text-3xl font-black text-white">
                      PKR {parseFloat(selectedInvoice.total_amount).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-stretch">
              <div className="md:col-span-8 space-y-6 bg-white/2 p-10 rounded-[2.5rem] border border-white/5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className={labelClass}>Collection Date</label>
                    <input
                      type="date"
                      className={inputStyle}
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className={labelClass}>Amount Received (PKR)</label>
                    <input
                      type="number"
                      className={`${inputStyle} text-lg font-black text-blue-400`}
                      placeholder="0.00"
                      value={amountReceived}
                      onChange={(e) => setAmountReceived(e.target.value)}
                    />
                  </div>
                </div>
                <textarea
                  rows={2}
                  className={`${inputStyle} rounded-[1.5rem] py-4 resize-none`}
                  placeholder="Remarks..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>

              <div className="md:col-span-4 flex flex-col justify-between p-1 bg-white/2 rounded-[2.5rem] border border-white/5">
                <div className="p-8">
                  <p className="text-[11px] text-slate-400 italic">Verify amount before posting.</p>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !amountReceived}
                  className="w-full bg-white text-black py-8 rounded-[2rem] font-black text-xs uppercase hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30"
                >
                  {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : "POST TO LEDGER"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
