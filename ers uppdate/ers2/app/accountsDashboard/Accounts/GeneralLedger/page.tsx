"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, BookOpen, ChevronRight, ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GLAccount {
  gl_account_id: number;
  gl_account_code: string;
  name: string;
  type: string;
  parent_account_id: number | null;
  is_control_account: boolean;
  parent_name: string | null;
  balance: { opening_balance: number; debit_total: number; credit_total: number; closing_balance: number };
}

interface LedgerLine {
  journal_line_id: number;
  date: string;
  journal_number: string;
  journal_type: string;
  narration: string | null;
  party: string | null;
  debit: number;
  credit: number;
  running_balance: number;
}

const TYPE_COLOR: Record<string, string> = {
  ASSET:     'text-blue-400  bg-blue-500/10  border-blue-500/20',
  LIABILITY: 'text-rose-400  bg-rose-500/10  border-rose-500/20',
  EQUITY:    'text-amber-400 bg-amber-500/10 border-amber-500/20',
  INCOME:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  EXPENSE:   'text-orange-400 bg-orange-500/10 border-orange-500/20',
};

export default function GeneralLedger() {
  const [accounts, setAccounts]       = useState<GLAccount[]>([]);
  const [selected, setSelected]       = useState<GLAccount | null>(null);
  const [lines, setLines]             = useState<LedgerLine[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingLines, setLoadingLines] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const headers = { Authorization: `Bearer ${Cookies.get('auth_token')}` };

  useEffect(() => {
    axios.get(`${API}/api/v1/finance/ledger`, { headers })
      .then(r => setAccounts(r.data.data || []))
      .finally(() => setLoadingList(false));
  }, []);

  const openAccount = async (acc: GLAccount) => {
    setSelected(acc);
    setLoadingLines(true);
    const r = await axios.get(`${API}/api/v1/finance/ledger/${acc.gl_account_id}`, { headers });
    setLines(r.data.data?.lines || []);
    setLoadingLines(false);
  };

  const fmt = (n: number) => Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2 });

  // ── Account List ──────────────────────────────────────────
  if (!selected) return (
    <div className="p-4 md:p-10 text-slate-300 font-sans">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-10">
        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">
          General <span className="text-blue-500">Ledger</span>
        </h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1 italic">Chart of Accounts • Current Period</p>
      </motion.div>

      {loadingList ? (
        <div className="flex flex-col items-center py-32 gap-4">
          <Loader2 className="animate-spin text-blue-500" size={40} />
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Loading Accounts...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {accounts.map((acc, i) => (
            <motion.div
              key={acc.gl_account_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => !acc.is_control_account && openAccount(acc)}
              className={cn(
                "flex items-center justify-between px-6 py-5 rounded-[2rem] border transition-all",
                acc.is_control_account
                  ? "bg-[#050b1d] border-white/5 opacity-70"
                  : "bg-[#050b1d] border-white/5 hover:border-blue-500/30 cursor-pointer hover:bg-[#060d22]"
              )}
            >
              <div className="flex items-center gap-5">
                <span className="text-[10px] font-black text-slate-600 w-10 shrink-0">{acc.gl_account_code}</span>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className={cn("text-sm font-black uppercase italic tracking-tighter",
                      acc.is_control_account ? "text-slate-400" : "text-white")}>{acc.name}</h3>
                    <span className={cn("text-[8px] font-black px-2 py-0.5 rounded-lg border uppercase",
                      TYPE_COLOR[acc.type] || 'text-slate-500 bg-white/5 border-white/10')}>
                      {acc.type}
                    </span>
                    {acc.is_control_account && (
                      <span className="text-[8px] font-black px-2 py-0.5 rounded-lg bg-white/5 border border-white/10 text-slate-500 uppercase">Control</span>
                    )}
                  </div>
                  {acc.parent_name && (
                    <p className="text-[9px] text-slate-600 uppercase mt-0.5">Under: {acc.parent_name}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className="text-right hidden md:block">
                  <p className="text-[9px] text-slate-600 uppercase">Debit</p>
                  <p className="text-sm font-black text-white italic">{fmt(acc.balance.debit_total)}</p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-[9px] text-slate-600 uppercase">Credit</p>
                  <p className="text-sm font-black text-white italic">{fmt(acc.balance.credit_total)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] text-slate-600 uppercase">Balance</p>
                  <p className={cn("text-base font-black italic",
                    acc.balance.closing_balance >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    PKR {fmt(acc.balance.closing_balance)}
                  </p>
                </div>
                {!acc.is_control_account && <ChevronRight size={16} className="text-slate-600" />}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Ledger Lines ──────────────────────────────────────────
  return (
    <div className="p-4 md:p-10 text-slate-300 font-sans">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => setSelected(null)}
          className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">
            {selected.gl_account_code} — {selected.name}
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-1 italic">
            {selected.type} • {lines.length} Entries
          </p>
        </div>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Opening Balance', value: selected.balance.opening_balance, color: 'text-white' },
          { label: 'Total Debit',     value: selected.balance.debit_total,     color: 'text-blue-400' },
          { label: 'Total Credit',    value: selected.balance.credit_total,    color: 'text-rose-400' },
          { label: 'Closing Balance', value: selected.balance.closing_balance,
            color: selected.balance.closing_balance >= 0 ? 'text-emerald-400' : 'text-rose-400' },
        ].map((item, i) => (
          <div key={i} className="bg-[#050b1d] border border-white/5 rounded-[2rem] p-6">
            <p className="text-[9px] text-slate-600 uppercase font-black tracking-widest mb-2">{item.label}</p>
            <p className={cn("text-xl font-black italic", item.color)}>PKR {fmt(item.value)}</p>
          </div>
        ))}
      </div>

      {/* Journal Lines Table */}
      <div className="bg-[#050b1d] border border-white/5 rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                <th className="text-left px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Journal #</th>
                <th className="text-left px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                <th className="text-left px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Narration</th>
                <th className="text-right px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Debit</th>
                <th className="text-right px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Credit</th>
                <th className="text-right px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Balance</th>
              </tr>
            </thead>
            <tbody>
              {loadingLines ? (
                <tr><td colSpan={7} className="py-20 text-center">
                  <Loader2 className="animate-spin text-blue-500 mx-auto" size={28} />
                </td></tr>
              ) : lines.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-slate-600 text-[10px] font-black uppercase tracking-widest">
                  No Entries Found
                </td></tr>
              ) : lines.map((line, i) => (
                <motion.tr key={line.journal_line_id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-all">
                  <td className="px-6 py-4 text-slate-400">{new Date(line.date).toLocaleDateString('en-GB')}</td>
                  <td className="px-6 py-4 text-blue-400 font-bold">{line.journal_number}</td>
                  <td className="px-6 py-4">
                    <span className="text-[8px] font-black px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400 uppercase">
                      {line.journal_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 max-w-[200px] truncate">{line.narration || line.party || '—'}</td>
                  <td className="px-6 py-4 text-right font-black text-blue-400">{line.debit > 0 ? fmt(line.debit) : '—'}</td>
                  <td className="px-6 py-4 text-right font-black text-rose-400">{line.credit > 0 ? fmt(line.credit) : '—'}</td>
                  <td className={cn("px-6 py-4 text-right font-black italic",
                    line.running_balance >= 0 ? "text-emerald-400" : "text-rose-400")}>
                    {fmt(line.running_balance)}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
