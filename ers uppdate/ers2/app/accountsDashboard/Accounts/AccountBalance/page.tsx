"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion } from 'framer-motion';
import { Loader2, Scale, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BalanceEntry {
  gl_account_id: number;
  code: string;
  name: string;
  type: string;
  opening_balance: number;
  debit_total: number;
  credit_total: number;
  closing_balance: number;
  period: string;
}

const TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE'] as const;

const TYPE_STYLE: Record<string, { color: string; bg: string; border: string; label: string }> = {
  ASSET:     { color: 'text-blue-400',    bg: 'bg-blue-500/5',    border: 'border-blue-500/20',    label: 'Assets' },
  LIABILITY: { color: 'text-rose-400',    bg: 'bg-rose-500/5',    border: 'border-rose-500/20',    label: 'Liabilities' },
  EQUITY:    { color: 'text-amber-400',   bg: 'bg-amber-500/5',   border: 'border-amber-500/20',   label: 'Equity' },
  INCOME:    { color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', label: 'Income' },
  EXPENSE:   { color: 'text-orange-400',  bg: 'bg-orange-500/5',  border: 'border-orange-500/20',  label: 'Expenses' },
};

export default function AccountBalance() {
  const [data, setData]     = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const API     = process.env.NEXT_PUBLIC_API_URL;
  const headers = { Authorization: `Bearer ${Cookies.get('auth_token')}` };

  useEffect(() => {
    axios.get(`${API}/api/v1/finance/account-balance`, { headers })
      .then(r => setData(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  // In accounting, amounts are always shown as absolute values.
  // The column colour (green = debit-side, red = credit-side) communicates
  // which side the balance is on — a raw minus sign is never used.
  const fmt = (n: number) => Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2 });

  const grouped = TYPES.reduce((acc, t) => {
    acc[t] = data.filter(d => d.type === t);
    return acc;
  }, {} as Record<string, BalanceEntry[]>);

  const totalDebit  = data.reduce((s, d) => s + d.debit_total, 0);
  const totalCredit = data.reduce((s, d) => s + d.credit_total, 0);

  const exportCSV = () => {
    const rows = ['Code,Name,Type,Opening,Debit,Credit,Closing', ...data.map(d =>
      `${d.code},${d.name},${d.type},${d.opening_balance},${d.debit_total},${d.credit_total},${d.closing_balance}`
    )];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a'); a.href = url;
    a.download = `trial-balance-${new Date().toISOString().slice(0, 7)}.csv`;
    a.click();
  };

  return (
    <div className="p-4 md:p-10 text-slate-300 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
            Trial <span className="text-blue-500">Balance</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1 italic">
            Account Balances • {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </motion.div>
        <button onClick={exportCSV}
          className="flex items-center gap-3 px-6 py-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all">
          <Download size={16} /> Export CSV
        </button>
      </div>

      {/* Trial Balance Totals */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#050b1d] border border-blue-500/20 rounded-[2rem] p-6">
          <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-2">Total Debit</p>
          <p className="text-2xl font-black italic text-blue-400">PKR {fmt(totalDebit)}</p>
        </div>
        <div className="bg-[#050b1d] border border-rose-500/20 rounded-[2rem] p-6">
          <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-2">Total Credit</p>
          <p className="text-2xl font-black italic text-rose-400">PKR {fmt(totalCredit)}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center py-32 gap-4">
          <Loader2 className="animate-spin text-blue-500" size={40} />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Loading Balances...</p>
        </div>
      ) : data.length === 0 ? (
        <div className="py-32 text-center">
          <Scale size={48} className="text-slate-700 mx-auto mb-4" />
          <p className="text-slate-600 font-black uppercase text-[10px] tracking-widest">No Balances This Period</p>
          <p className="text-slate-700 text-[9px] mt-2">Post journal entries to see balances</p>
        </div>
      ) : (
        <div className="space-y-6">
          {TYPES.map(type => {
            const entries = grouped[type];
            if (!entries?.length) return null;
            const style = TYPE_STYLE[type];
            const sectionTotal = entries.reduce((s, e) => s + e.closing_balance, 0);

            return (
              <motion.div key={type} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                className={cn("border rounded-[2.5rem] overflow-hidden", style.border)}>
                {/* Section header */}
                <div className={cn("px-8 py-5 flex justify-between items-center", style.bg)}>
                  <h2 className={cn("text-sm font-black uppercase italic tracking-tighter", style.color)}>
                    {style.label}
                  </h2>
                  <span className={cn("text-sm font-black italic", style.color)}>
                    PKR {fmt(sectionTotal)}
                  </span>
                </div>

                {/* Account rows */}
                <div className="bg-[#050b1d]">
                  <div className="grid grid-cols-5 gap-4 px-8 py-3 border-b border-white/5">
                    {['Code', 'Account Name', 'Debit', 'Credit', 'Balance'].map(h => (
                      <span key={h} className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{h}</span>
                    ))}
                  </div>
                  {entries.map((entry, i) => (
                    <motion.div key={entry.gl_account_id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                      className="grid grid-cols-5 gap-4 px-8 py-4 border-b border-white/[0.03] hover:bg-white/[0.02] transition-all">
                      <span className="text-[10px] font-black text-slate-500">{entry.code}</span>
                      <span className="text-[11px] font-black text-white uppercase italic">{entry.name}</span>
                      <span className="text-[11px] font-black text-blue-400 text-right">
                        {entry.debit_total > 0 ? fmt(entry.debit_total) : '—'}
                      </span>
                      <span className="text-[11px] font-black text-rose-400 text-right">
                        {entry.credit_total > 0 ? fmt(entry.credit_total) : '—'}
                      </span>
                      <span className={cn("text-[11px] font-black italic text-right",
                        entry.closing_balance >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {fmt(entry.closing_balance)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
