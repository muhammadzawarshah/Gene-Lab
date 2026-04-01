"use client";

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import {
  Search, User, Truck, Download, Printer, Wallet,
  MessageSquare, Loader2, Lock, AlertTriangle
} from 'lucide-react';
import { cn } from "@/lib/utils";

interface LedgerEntry {
  id: string;
  date: string;
  type: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface Party {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBalance: number;
  totalDue: number;
  type: 'CUSTOMER' | 'SUPPLIER';
}

type PartyFilter = 'ALL' | 'CUSTOMER' | 'SUPPLIER';

export default function PartyLedger() {
  const [customers, setCustomers]     = useState<Party[]>([]);
  const [suppliers, setSuppliers]     = useState<Party[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<Record<string, LedgerEntry[]>>({});
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [partyFilter, setPartyFilter] = useState<PartyFilter>('ALL');
  const [search, setSearch]           = useState('');
  const [isLoading, setIsLoading]     = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token   = Cookies.get('auth_token');

  const secureApi = useMemo(() => axios.create({
    baseURL: API_URL,
    headers: { 'Authorization': `Bearer ${token}` }
  }), [API_URL, token]);

  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      try {
        const [custRes, supplRes] = await Promise.all([
          secureApi.get('/api/v1/finance/parties/summary/CUSTOMER'),
          secureApi.get('/api/v1/finance/parties/summary/SUPPLIER'),
        ]);
        setCustomers((custRes.data || []).map((p: any) => ({ ...p, type: 'CUSTOMER' })));
        setSuppliers((supplRes.data || []).map((p: any) => ({ ...p, type: 'SUPPLIER' })));
      } catch {
        toast.error("Failed to load parties");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, [secureApi]);

  useEffect(() => {
    if (!selectedParty || ledgerEntries[selectedParty.id]) return;
    const fetchLedger = async () => {
      try {
        const safeId = selectedParty.id.replace(/[^a-zA-Z0-9-]/g, '');
        const res = await secureApi.get(`/api/v1/finance/parties/ledger/${safeId}`);
        setLedgerEntries(prev => ({ ...prev, [selectedParty.id]: res.data }));
      } catch {
        toast.error("Failed to load ledger");
      }
    };
    fetchLedger();
  }, [selectedParty, secureApi]);

  const allParties = useMemo(() => {
    const list = partyFilter === 'CUSTOMER' ? customers
               : partyFilter === 'SUPPLIER' ? suppliers
               : [...customers, ...suppliers];
    const safe = search.replace(/[${};"']/g, '').toLowerCase();
    return list.filter(p => p.name.toLowerCase().includes(safe));
  }, [customers, suppliers, partyFilter, search]);

  const handlePrint = () => {
    const el = document.getElementById('party-ledger-print-area');
    if (!el) return;
    const s = document.createElement('style');
    s.innerHTML = `@media print{body>*:not(#__pr__){display:none!important}#__pr__{display:block!important}}`;
    const d = document.createElement('div');
    d.id = '__pr__';
    d.innerHTML = el.outerHTML;
    document.head.appendChild(s);
    document.body.appendChild(d);
    window.print();
    document.head.removeChild(s);
    document.body.removeChild(d);
  };

  const handleExport = (party: Party) => {
    const entries = ledgerEntries[party.id] || [];
    const csv = "S.No,Invoice No,Date,Description,Debit,Credit,Balance\n" +
      entries.map((e, i) => {
        const safe = e.description.replace(/^[=+\-@]/, "'");
        return `${i + 1},${e.id},${e.date},${safe},${e.debit},${e.credit},${e.balance}`;
      }).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `Ledger_${party.name}_${Date.now()}.csv`;
    a.click();
    toast.success("Ledger exported");
  };

  const handleWhatsApp = (party: Party) => {
    const text = `Statement: ${party.name} — Balance: PKR ${(party.totalBalance || party.totalDue || 0).toLocaleString()}`;
    window.open(`https://wa.me/${party.phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const entries = selectedParty ? (ledgerEntries[selectedParty.id] ?? null) : null;

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-10 pb-24 text-slate-300">
      <Toaster position="top-right" theme="dark" richColors />

      {/* HEADER */}
      <div className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-l-8 border-emerald-600 pl-6">
        <div>
          <h1 className="text-5xl font-black text-white uppercase tracking-tighter italic leading-none">
            Party <span className="text-emerald-500">Ledger</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-3 flex items-center gap-2 italic">
            <Lock size={12} className="text-emerald-500" /> Customer & Supplier Financial Accounts
          </p>
        </div>
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder="Search party name..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold uppercase tracking-widest text-white outline-none focus:border-emerald-500 transition-all"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT: PARTY LIST */}
        <div className="lg:col-span-4 space-y-4">
          {/* Filter Tabs */}
          <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 mb-4">
            {(['ALL', 'CUSTOMER', 'SUPPLIER'] as PartyFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setPartyFilter(f)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all",
                  partyFilter === f ? "bg-emerald-600 text-white shadow" : "text-slate-500 hover:text-white"
                )}
              >{f}</button>
            ))}
          </div>

          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{allParties.length} parties</p>
            {isLoading && <Loader2 size={14} className="animate-spin text-emerald-500" />}
          </div>

          <div className="h-[calc(100vh-380px)] overflow-y-auto pr-2 space-y-3">
            {allParties.map(party => (
              <motion.div
                key={party.id}
                onClick={() => setSelectedParty(party)}
                whileHover={{ x: 4 }}
                className={cn(
                  "p-6 rounded-[2rem] border cursor-pointer transition-all flex items-center gap-4 relative overflow-hidden",
                  selectedParty?.id === party.id
                    ? "bg-emerald-600 border-emerald-400 text-white shadow-xl shadow-emerald-600/20"
                    : "bg-[#0f172a] border-white/5 hover:border-white/10"
                )}
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-colors",
                  selectedParty?.id === party.id ? "bg-white/20" : "bg-white/5"
                )}>
                  {party.type === 'SUPPLIER' ? <Truck size={20} /> : <User size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black uppercase italic tracking-tight truncate">{party.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                      party.type === 'SUPPLIER'
                        ? (selectedParty?.id === party.id ? "bg-black/20 text-amber-200" : "bg-amber-500/10 text-amber-400")
                        : (selectedParty?.id === party.id ? "bg-black/20 text-blue-200"  : "bg-blue-500/10 text-blue-400")
                    )}>{party.type}</span>
                    <span className={cn(
                      "text-[9px] font-bold",
                      selectedParty?.id === party.id ? "text-emerald-100" : "text-slate-600"
                    )}>
                      PKR {(party.totalBalance || party.totalDue || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                {(party.totalBalance > 0 || party.totalDue > 0) && selectedParty?.id !== party.id && (
                  <div className="absolute top-0 right-8">
                    <div className="bg-rose-500/20 text-rose-500 text-[7px] font-black px-2 py-0.5 rounded-b-lg border-b border-rose-500/30">DUE</div>
                  </div>
                )}
              </motion.div>
            ))}
            {!isLoading && allParties.length === 0 && (
              <p className="text-center text-slate-700 text-[10px] font-black uppercase py-16">No parties found</p>
            )}
          </div>
        </div>

        {/* RIGHT: LEDGER */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedParty ? (
              <motion.div
                id="party-ledger-print-area"
                key={selectedParty.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="bg-[#0f172a] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl flex flex-col"
              >
                {/* Party Header */}
                <div className="p-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-gradient-to-b from-white/[0.02] to-transparent">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center text-emerald-500 border border-emerald-500/20 shadow-inner">
                      <Wallet size={30} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">{selectedParty.name}</h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{selectedParty.phone || 'N/A'}</span>
                        <span className={cn(
                          "text-[8px] font-black uppercase px-2 py-0.5 rounded",
                          selectedParty.type === 'SUPPLIER' ? "bg-amber-500/10 text-amber-400" : "bg-blue-500/10 text-blue-400"
                        )}>{selectedParty.type}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    {selectedParty.phone && (
                      <button onClick={() => handleWhatsApp(selectedParty)} className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-lg">
                        <MessageSquare size={18} />
                      </button>
                    )}
                    <button onClick={() => handleExport(selectedParty)} className="p-4 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 transition-all border border-white/5">
                      <Download size={18} />
                    </button>
                    <button onClick={handlePrint} className="p-4 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 transition-all border border-white/5">
                      <Printer size={18} />
                    </button>
                  </div>
                </div>

                {/* Ledger Table */}
                <div className="p-6 flex-1 overflow-x-auto overflow-y-auto max-h-[520px]">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-[#0f172a] z-10">
                      <tr className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] border-b border-white/5">
                        <th className="px-3 py-5 w-10">S.No</th>
                        <th className="px-3 py-5">Invoice No</th>
                        <th className="px-6 py-5">Date</th>
                        <th className="px-6 py-5">Description</th>
                        <th className="px-6 py-5 text-rose-500">Debit (+)</th>
                        <th className="px-6 py-5 text-emerald-500">Credit (-)</th>
                        <th className="px-6 py-5">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {entries === null ? (
                        <tr>
                          <td colSpan={7} className="py-20 text-center">
                            <Loader2 className="animate-spin mx-auto text-emerald-500 mb-3" size={28} />
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">Loading entries...</p>
                          </td>
                        </tr>
                      ) : entries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-20 text-center text-[9px] font-black uppercase tracking-[0.5em] text-slate-700">No transactions found</td>
                        </tr>
                      ) : (
                        entries.map((entry, idx) => (
                          <tr key={`${entry.id}-${idx}`} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="px-3 py-6 text-[10px] font-black text-slate-600 text-center">{idx + 1}</td>
                            <td className="px-3 py-6">
                              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">{entry.id || '—'}</span>
                            </td>
                            <td className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase italic whitespace-nowrap">{entry.date}</td>
                            <td className="px-6 py-6">
                              <p className="text-xs font-black text-slate-200 uppercase tracking-tight group-hover:text-white transition-colors">{entry.description}</p>
                            </td>
                            <td className="px-6 py-6 text-xs font-black text-rose-400 italic">
                              {entry.debit > 0 ? `+ ${entry.debit.toLocaleString()}` : '—'}
                            </td>
                            <td className="px-6 py-6 text-xs font-black text-emerald-400 italic">
                              {entry.credit > 0 ? `- ${entry.credit.toLocaleString()}` : '—'}
                            </td>
                            <td className="px-6 py-6">
                              <span className="text-xs font-black text-white px-3 py-1.5 bg-white/5 rounded-xl border border-white/5 tracking-tighter">
                                PKR {entry.balance.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="px-8 py-5 bg-white/[0.01] border-t border-white/5 flex justify-between items-center">
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
                    {entries?.length ?? 0} entries
                  </p>
                  <p className="text-[10px] font-black text-emerald-500 uppercase italic">
                    Net Balance: PKR {Math.abs(selectedParty.totalBalance || selectedParty.totalDue || 0).toLocaleString()}
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[600px] border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-slate-700 bg-white/[0.01]">
                <AlertTriangle size={60} className="mb-6 opacity-10" />
                <h3 className="text-xl font-black uppercase italic tracking-tight">No Party Selected</h3>
                <p className="text-[9px] font-bold uppercase tracking-[0.4em] mt-3">Select a customer or supplier to view their ledger</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
