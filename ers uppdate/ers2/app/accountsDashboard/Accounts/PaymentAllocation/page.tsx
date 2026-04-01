"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';
import { Loader2, Link2, Search, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Allocation {
  allocation_id: number;
  payment_id: number;
  payment_number: string;
  payment_type: string;
  payment_method: string;
  payment_date: string;
  party: string;
  allocated_amount: number;
  remarks: string | null;
  invoice_ref: string;
  invoice_total: number;
}

const METHOD_BADGE: Record<string, string> = {
  CASH:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  BANK:   'bg-blue-500/10   text-blue-400   border-blue-500/20',
  CHEQUE: 'bg-amber-500/10  text-amber-400  border-amber-500/20',
  ONLINE: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export default function PaymentAllocation() {
  const [data, setData]     = useState<Allocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const API     = process.env.NEXT_PUBLIC_API_URL;
  const headers = { Authorization: `Bearer ${Cookies.get('auth_token')}` };

  useEffect(() => {
    axios.get(`${API}/api/v1/finance/payment-allocations`, { headers })
      .then(r => setData(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return data.filter(d =>
      (d.party?.toLowerCase() ?? '').includes(term) ||
      (d.payment_number?.toLowerCase() ?? '').includes(term) ||
      (d.invoice_ref?.toLowerCase() ?? '').includes(term)
    );
  }, [search, data]);

  const totalAllocated = filtered.reduce((s, d) => s + d.allocated_amount, 0);
  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2 });

  return (
    <div className="p-4 md:p-10 text-slate-300 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
            Payment <span className="text-blue-500">Allocations</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1 italic">
            Invoice Matching • {filtered.length} Records
          </p>
        </motion.div>
        <div className="bg-[#050b1d] border border-white/5 rounded-2xl px-6 py-3 text-right">
          <p className="text-[8px] font-black text-slate-600 uppercase">Total Allocated</p>
          <p className="text-lg font-black text-white italic">PKR {fmt(totalAllocated)}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
        <input
          type="text"
          placeholder="Search by party, payment no, or invoice..."
          className="w-full bg-[#050b1d] border border-white/10 rounded-[1.5rem] py-4 pl-14 pr-6 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-blue-500/50 transition-all"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-32 gap-4">
          <Loader2 className="animate-spin text-blue-500" size={40} />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Loading Allocations...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-32 text-center">
          <Link2 size={48} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-600 font-black uppercase text-[10px] tracking-widest">No Allocations Found</p>
        </div>
      ) : (
        <div className="bg-[#050b1d] border border-white/5 rounded-[2.5rem] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-white/5">
                  {['Date', 'Payment #', 'Party', 'Type', 'Method', 'Invoice Ref', 'Inv Total', 'Allocated', 'Remarks'].map(h => (
                    <th key={h} className="text-left px-5 py-4 text-[8px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a, i) => (
                  <motion.tr key={a.allocation_id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-all">
                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                      {new Date(a.payment_date).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-5 py-4 font-black text-blue-400 whitespace-nowrap">{a.payment_number}</td>
                    <td className="px-5 py-4 font-black text-white uppercase italic whitespace-nowrap max-w-[120px] truncate">{a.party}</td>
                    <td className="px-5 py-4">
                      <span className={cn("flex items-center gap-1 text-[8px] font-black px-2 py-1 rounded-lg border w-fit whitespace-nowrap",
                        a.payment_type === 'RECEIPT'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20')}>
                        {a.payment_type === 'RECEIPT' ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}
                        {a.payment_type}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={cn("text-[8px] font-black px-2 py-1 rounded-lg border uppercase",
                        METHOD_BADGE[a.payment_method] || 'bg-white/5 text-slate-400 border-white/10')}>
                        {a.payment_method}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-black text-amber-400 whitespace-nowrap">{a.invoice_ref}</td>
                    <td className="px-5 py-4 text-right text-slate-400 whitespace-nowrap">{fmt(a.invoice_total)}</td>
                    <td className="px-5 py-4 text-right font-black text-emerald-400 whitespace-nowrap">{fmt(a.allocated_amount)}</td>
                    <td className="px-5 py-4 text-slate-500 max-w-[120px] truncate">{a.remarks || '—'}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
