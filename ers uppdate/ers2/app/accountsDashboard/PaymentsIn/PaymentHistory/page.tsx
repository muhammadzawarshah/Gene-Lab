"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
  Wallet, Search, Eye, X, Loader2,
  ArrowDownLeft, Hash, CalendarDays, CreditCard, FileText
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PaymentReportComponent } from '@/components/layout/PaymentReportComponent';

const methodColor: Record<string, string> = {
  CASH:         'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  BANK:         'text-blue-400 bg-blue-500/10 border-blue-500/20',
  CHEQUE:       'text-amber-400 bg-amber-500/10 border-amber-500/20',
  ONLINE:       'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export default function PaymentsInHistory() {
  const authToken = Cookies.get('auth_token');
  const headers   = { Authorization: `Bearer ${authToken}` };

  const [payments,  setPayments]  = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState<any>(null);

  const fetchPayments = useCallback(async () => {
    if (!authToken) { toast.error("Session expired."); return; }
    setIsLoading(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/finance/payments`,
        { headers }
      );
      const all: any[] = res.data.data || [];
      // Payments IN = RECEIPT type only
      setPayments(all.filter(p => p.payment_type === 'RECEIPT'));
    } catch {
      toast.error("Failed to load payments");
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return payments;
    return payments.filter(p =>
      p.payment_number?.toLowerCase().includes(term) ||
      p.party?.name?.toLowerCase().includes(term) ||
      p.reference_number?.toLowerCase().includes(term)
    );
  }, [search, payments]);

  const totalReceived = useMemo(
    () => filtered.reduce((s, p) => s + Number(p.amount || 0), 0),
    [filtered]
  );

  const thCls = "px-5 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-black/40 border-b border-white/5 text-left";
  const tdCls = "px-5 py-4 text-sm border-b border-white/5 whitespace-nowrap";

  return (
    <div className="text-slate-300 p-4 md:p-10 font-sans min-h-screen">
      <Toaster richColors theme="dark" position="top-right" />

      <div className="max-w-[1400px] mx-auto space-y-8">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/5">
          <div className="flex items-center gap-5">
            <div className="bg-emerald-600/10 border border-emerald-500/20 p-4 rounded-2xl">
              <ArrowDownLeft className="text-emerald-400" size={26} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                Payments <span className="text-emerald-500">Received</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] mt-1 uppercase">
                {payments.length} transactions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {/* Total */}
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl px-6 py-3">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total Received</p>
              <p className="text-xl font-black text-emerald-400 italic">PKR {totalReceived.toLocaleString()}</p>
            </div>
            {/* Search */}
            <div className="relative group">
              <Search className="absolute left-4 top-3.5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={16} />
              <input
                className="bg-[#0f172a] border border-slate-800 rounded-2xl py-3 pl-11 pr-5 text-sm text-white outline-none w-72 focus:border-emerald-500 transition-all"
                placeholder="Search by number, party, ref..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-[#0f172a]/40 border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr>
                  <th className={thCls + " w-12 text-center"}>S#</th>
                  <th className={thCls}><div className="flex items-center gap-2"><Hash size={11} /> Payment No</div></th>
                  <th className={thCls}>Party / Customer</th>
                  <th className={thCls}><div className="flex items-center gap-2"><CalendarDays size={11} /> Date</div></th>
                  <th className={thCls}><div className="flex items-center gap-2"><CreditCard size={11} /> Method</div></th>
                  <th className={thCls}><div className="flex items-center gap-2"><FileText size={11} /> Reference</div></th>
                  <th className={thCls + " text-right text-emerald-400"}>Amount</th>
                  <th className={thCls + " text-center w-16"}>View</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-24 text-center">
                      <Loader2 className="animate-spin text-emerald-500 mx-auto" size={36} />
                      <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-3 font-black">Loading...</p>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-20 text-center text-slate-600 text-xs font-bold uppercase tracking-widest">
                      No payment records found
                    </td>
                  </tr>
                ) : filtered.map((p, i) => (
                  <tr key={p.payment_id} className="hover:bg-emerald-500/[0.03] transition-colors group">
                    <td className="px-5 py-4 text-center text-xs font-mono text-slate-600">{i + 1}</td>
                    <td className={tdCls}>
                      <span className="font-black text-slate-200">{p.payment_number || `PMT-${p.payment_id}`}</span>
                    </td>
                    <td className={tdCls}>
                      <span className="text-slate-300 font-bold">{p.party?.name || '—'}</span>
                    </td>
                    <td className={tdCls}>
                      <span className="text-slate-400 font-mono text-xs">
                        {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-GB') : '—'}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span className={cn(
                        "text-[9px] font-black px-2.5 py-1 rounded-full uppercase border",
                        methodColor[p.method] || 'text-slate-400 bg-white/5 border-white/10'
                      )}>
                        {p.method || '—'}
                      </span>
                    </td>
                    <td className={tdCls}>
                      <span className="text-slate-500 text-xs font-mono">{p.reference_number || '—'}</span>
                    </td>
                    <td className={tdCls + " text-right"}>
                      <span className="font-black text-emerald-400 font-mono">
                        PKR {Number(p.amount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button
                        onClick={() => setSelected(p)}
                        className="p-2 bg-white/5 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
                      >
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-white/5 bg-emerald-500/5 shrink-0">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Payment Detail</p>
                <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                  {selected.payment_number || `PMT-${selected.payment_id}`}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    const printContent = document.getElementById('payment-report-print');
                    if (printContent) {
                      const originalContent = document.body.innerHTML;
                      document.body.innerHTML = printContent.outerHTML;
                      window.print();
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all"
                >
                  Print Report
                </button>
                <button onClick={() => setSelected(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>
            </div>
            {/* Body */}
            <div className="p-8 flex-1 overflow-y-auto space-y-6">
              {/* Preview Form */}
              <div className="hidden border border-white/10 rounded-xl p-4 bg-white/5">
                {[
                  { label: 'Party',     value: selected.party?.name },
                  { label: 'Date',      value: selected.payment_date ? new Date(selected.payment_date).toLocaleDateString('en-GB') : '—' },
                  { label: 'Method',    value: selected.method },
                  { label: 'Reference', value: selected.reference_number },
                  { label: 'Type',      value: selected.payment_type },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center py-2 border-b border-white/[0.04]">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{row.label}</span>
                    <span className="text-sm font-bold text-slate-200">{row.value || '—'}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount</span>
                  <span className="text-2xl font-black text-emerald-400 italic">
                    PKR {Number(selected.amount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* PDF Preview (Print Form) */}
              <div className="w-full bg-white rounded-lg overflow-hidden flex justify-center p-4">
                 <PaymentReportComponent payment={selected} />
              </div>
            </div>

            <div className="px-8 pb-8 shrink-0">
              <button
                onClick={() => setSelected(null)}
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

