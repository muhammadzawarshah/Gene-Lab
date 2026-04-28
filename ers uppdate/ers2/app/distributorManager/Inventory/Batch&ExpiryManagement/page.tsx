"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import {
  Hourglass, ShieldAlert, Calendar, Search,
  RefreshCcw, Edit3, Trash2, Loader2, Database,
  Plus, X, Save, ChevronDown, ChevronUp, Package, Eye, MapPin
} from 'lucide-react';
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface BatchRow {
  id: number;
  batch_number: string;
  expiry: string;
  mfg: string;
  status: 'Critical' | 'Warning' | 'Safe';
  daysLeft: number;
  province_name: string;
  location_id: number | null;
  items: { item_id: number; product_id: string; product_name: string; product_code: string; received_qty: number; available_qty: number }[];
}

const emptyForm = {
  batch_number: '',
  manufacturing_date: '',
  expiry_date: '',
};

function calcStatus(expiry: string): { status: 'Critical' | 'Warning' | 'Safe'; daysLeft: number } {
  if (!expiry || expiry === 'N/A') return { status: 'Safe', daysLeft: 999 };
  const diff = new Date(expiry).getTime() - Date.now();
  const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return { status: daysLeft <= 30 ? 'Critical' : daysLeft <= 90 ? 'Warning' : 'Safe', daysLeft };
}

function mapBatch(b: any): BatchRow {
  const expiry = b.expiry_date ? b.expiry_date.split('T')[0] : 'N/A';
  const { status, daysLeft } = calcStatus(expiry);
  return {
    id: b.batch_id,
    batch_number: b.batch_number,
    expiry,
    mfg: b.manufacturing_date ? b.manufacturing_date.split('T')[0] : 'N/A',
    province_name: b.province?.name || '—',
    location_id: b.location_id,
    status,
    daysLeft,
    items: (b.batchitem || []).map((i: any) => ({
      item_id: i.item_id,
      product_id: i.product_id,
      product_name: i.product?.name || '—',
      product_code: i.product?.sku_code || '—',
      received_qty: Number(i.received_quantity),
      available_qty: Number(i.available_quantity),
    })),
  };
}

const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white font-bold outline-none focus:border-rose-500 transition-all";
const labelCls = "block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1";

export default function ExpiryManagement() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [activeTab, setActiveTab] = useState<'Critical' | 'Warning' | 'Safe'>('Critical');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState<'create' | 'edit' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [viewBatch, setViewBatch] = useState<BatchRow | null>(null);

  const authToken = Cookies.get('auth_token');
  const currentUserId = Cookies.get('userId') || Cookies.get('user_id');
  const headers = { Authorization: `Bearer ${authToken}` };

  const fetchBatches = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/v1/batch`, { headers });
      setBatches((res.data.data || []).map(mapBatch));
    } catch {
      toast.error("Failed to load batches");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchBatches(); }, []);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await axios.post(`${API_BASE}/api/v1/batch`, {
        batch_number: form.batch_number,
        manufacturing_date: form.manufacturing_date || undefined,
        expiry_date: form.expiry_date || undefined,
      }, { headers });
      toast.success("Batch created");
      setShowModal(null);
      setForm(emptyForm);
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Create failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setIsSaving(true);
    try {
      await axios.put(`${API_BASE}/api/v1/batch/${editingId}`, {
        batch_number: form.batch_number,
        manufacturing_date: form.manufacturing_date || undefined,
        expiry_date: form.expiry_date || undefined,
      }, { headers });
      toast.success("Batch updated");
      setShowModal(null);
      fetchBatches();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this batch and all its products?")) return;
    const tId = toast.loading("Deleting...");
    try {
      await axios.delete(`${API_BASE}/api/v1/batch/${id}`, { headers });
      setBatches(prev => prev.filter(b => b.id !== id));
      toast.success("Batch deleted", { id: tId });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Delete failed", { id: tId });
    }
  };

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setShowModal('create'); };

  const openEdit = (row: BatchRow) => {
    setForm({
      batch_number: row.batch_number,
      manufacturing_date: row.mfg === 'N/A' ? '' : row.mfg,
      expiry_date: row.expiry === 'N/A' ? '' : row.expiry,
    });
    setEditingId(row.id);
    setShowModal('edit');
  };

  const toggleExpand = (id: number) => setExpandedRows(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // ── Filters ───────────────────────────────────────────────────────────────
  const filteredData = useMemo(() => batches.filter(b => {
    const matchesTab = b.status === activeTab;
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q || b.batch_number.toLowerCase().includes(q) ||
      b.items.some(i => i.product_name.toLowerCase().includes(q) || i.product_code.toLowerCase().includes(q));
    return matchesTab && matchesSearch;
  }), [batches, activeTab, searchTerm]);

  const counts = useMemo(() => ({
    Critical: batches.filter(b => b.status === 'Critical').length,
    Warning:  batches.filter(b => b.status === 'Warning').length,
    Safe:     batches.filter(b => b.status === 'Safe').length,
  }), [batches]);

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
      <p className="text-rose-500 font-black uppercase tracking-[0.4em] text-[10px]">Loading Batch Registry...</p>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20 p-4 min-h-screen">
      <Toaster theme="dark" position="top-right" richColors />

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <Hourglass className="text-rose-500 w-9 h-9 animate-pulse" />
            Batch & <span className="text-rose-600">Expiry</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            <ShieldAlert size={12} className="inline text-rose-500/50 mr-1" />
            Operator: {currentUserId || 'UNKNOWN'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-1 flex gap-1">
            {(['Critical', 'Warning', 'Safe'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                  activeTab === tab
                    ? tab === 'Critical' ? "bg-rose-600 text-white" : tab === 'Warning' ? "bg-orange-500 text-white" : "bg-emerald-600 text-white"
                    : "text-slate-500 hover:text-white"
                )}>
                {tab}
                <span className="bg-white/20 rounded-md px-1.5 py-0.5 text-[8px]">{counts[tab]}</span>
              </button>
            ))}
          </div>
          <button onClick={fetchBatches} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2">
            <RefreshCcw size={13} /> Refresh
          </button>
          <button onClick={openCreate} className="bg-rose-600 hover:bg-rose-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-rose-600/20">
            <Plus size={14} /> New Batch
          </button>
        </div>
      </div>

      {/* ── TABLE ──────────────────────────────────────────────────────── */}
      <div className="bg-slate-950/40 border border-white/[0.08] rounded-[2.5rem] overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
            <Database className="text-rose-500" size={18} /> Batch Registry
            <span className="text-[10px] font-mono text-slate-600 ml-2">({filteredData.length})</span>
          </h3>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-rose-500 transition-colors" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search batch or product..."
              className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-12 pr-6 text-xs text-white outline-none focus:border-rose-500/50 w-full md:w-64 font-bold transition-all" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest w-8"></th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Batch No</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Products</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Mfg Date</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Expiry</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Life</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest">Province</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              <AnimatePresence mode="popLayout">
                {filteredData.length > 0 ? filteredData.map(row => (
                  <React.Fragment key={row.id}>
                    {/* ── Batch header row ── */}
                    <motion.tr layout className="group hover:bg-white/[0.02] transition-all">
                      {/* expand toggle */}
                      <td className="px-4 py-5">
                        <button onClick={() => toggleExpand(row.id)}
                          className="p-1 text-slate-600 hover:text-rose-400 transition-colors">
                          {expandedRows.has(row.id) ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-black text-rose-400 uppercase tracking-wider">{row.batch_number}</span>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="text-[10px] font-black text-white bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-lg">
                          {row.items.length} {row.items.length === 1 ? 'product' : 'products'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Calendar size={12} className="text-slate-600" /> {row.mfg}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className={cn("flex items-center gap-2 text-xs font-bold",
                          row.status === 'Critical' ? 'text-rose-400' : row.status === 'Warning' ? 'text-orange-400' : 'text-emerald-400')}>
                          <Calendar size={12} /> {row.expiry}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="w-32 space-y-1">
                          <div className={cn("text-[8px] font-black uppercase flex justify-between",
                            row.status === 'Critical' ? 'text-rose-500' : row.status === 'Warning' ? 'text-orange-500' : 'text-emerald-500')}>
                            <span>{row.status}</span>
                            <span>{row.daysLeft > 0 ? `${row.daysLeft}d` : 'Expired'}</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, Math.max(0, (row.daysLeft / 365) * 100))}%` }}
                              className={cn("h-full", row.status === 'Critical' ? 'bg-rose-500' : row.status === 'Warning' ? 'bg-orange-500' : 'bg-emerald-500')}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[10px] text-slate-400">{row.province_name}</span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setViewBatch(row)} className="p-2 bg-white/5 hover:bg-emerald-600/30 rounded-xl text-slate-400 hover:text-emerald-400 transition-all" title="View Details">
                            <Eye size={13} />
                          </button>
                          <button onClick={() => openEdit(row)} className="p-2 bg-white/5 hover:bg-blue-600 rounded-xl text-slate-400 hover:text-white transition-all" title="Edit">
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => handleDelete(row.id)} className="p-2 bg-white/5 hover:bg-rose-600 rounded-xl text-slate-400 hover:text-white transition-all" title="Delete">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>

                    {/* ── Expanded product rows ── */}
                    <AnimatePresence>
                      {expandedRows.has(row.id) && (
                        <tr>
                          <td colSpan={8} className="px-0 py-0 bg-white/[0.01]">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <table className="w-full text-left">
                                <thead>
                                  <tr className="bg-white/[0.02]">
                                    <th className="pl-16 pr-6 py-3 text-[8px] font-black text-slate-600 uppercase tracking-widest">Product</th>
                                    <th className="px-6 py-3 text-[8px] font-black text-slate-600 uppercase tracking-widest">SKU</th>
                                    <th className="px-6 py-3 text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">Received</th>
                                    <th className="px-6 py-3 text-[8px] font-black text-slate-600 uppercase tracking-widest text-center">Available</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {row.items.map(item => (
                                    <tr key={item.item_id} className="border-t border-white/[0.03]">
                                      <td className="pl-16 pr-6 py-3 flex items-center gap-2">
                                        <Package size={12} className="text-rose-500/40 shrink-0" />
                                        <span className="text-xs font-bold text-slate-300">{item.product_name}</span>
                                      </td>
                                      <td className="px-6 py-3 font-mono text-[10px] text-slate-500">{item.product_code}</td>
                                      <td className="px-6 py-3 text-center text-xs font-black text-slate-300">{item.received_qty.toLocaleString()}</td>
                                      <td className="px-6 py-3 text-center">
                                        <span className={cn("text-xs font-black px-2 py-0.5 rounded-lg",
                                          item.available_qty > 0 ? "text-emerald-400 bg-emerald-500/10" : "text-rose-400 bg-rose-500/10")}>
                                          {item.available_qty.toLocaleString()}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                )) : (
                  <tr>
                    <td colSpan={8} className="py-24 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest italic">
                      No {activeTab} batches found
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between opacity-30 px-8">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em]">
          <ShieldAlert size={12} className="text-rose-500" /> Data Integrity Verified
        </div>
        <p className="text-[9px] font-mono">{new Date().toLocaleTimeString()}</p>
      </div>

      {/* ── VIEW DETAIL MODAL ──────────────────────────────────────────── */}
      <AnimatePresence>
        {viewBatch && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setViewBatch(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />

            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="relative w-full max-w-xl bg-[#0f172a] border border-white/10 rounded-[2.5rem] shadow-3xl overflow-hidden"
            >
              {/* Header */}
              <div className={cn("px-8 py-6 flex items-center justify-between",
                viewBatch.status === 'Critical' ? "bg-rose-600/10 border-b border-rose-500/20" :
                viewBatch.status === 'Warning'  ? "bg-orange-500/10 border-b border-orange-500/20" :
                                                   "bg-emerald-600/10 border-b border-emerald-500/20"
              )}>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Batch Details</p>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{viewBatch.batch_number}</h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest",
                    viewBatch.status === 'Critical' ? "bg-rose-600 text-white" :
                    viewBatch.status === 'Warning'  ? "bg-orange-500 text-white" : "bg-emerald-600 text-white"
                  )}>
                    {viewBatch.status} · {viewBatch.daysLeft > 0 ? `${viewBatch.daysLeft}d left` : 'Expired'}
                  </span>
                  <button onClick={() => setViewBatch(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Batch Meta */}
              <div className="px-8 py-6 grid grid-cols-3 gap-6 border-b border-white/5">
                <div>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Mfg Date</p>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <Calendar size={12} className="text-slate-500" /> {viewBatch.mfg}
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Expiry Date</p>
                  <div className={cn("flex items-center gap-1.5 text-xs font-bold",
                    viewBatch.status === 'Critical' ? 'text-rose-400' :
                    viewBatch.status === 'Warning'  ? 'text-orange-400' : 'text-emerald-400')}>
                    <Calendar size={12} /> {viewBatch.expiry}
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Province</p>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                    <MapPin size={12} className="text-slate-500" /> {viewBatch.province_name}
                  </div>
                </div>
              </div>

              {/* Products List */}
              <div className="px-8 py-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    Products in this Batch
                  </p>
                  <span className="text-[9px] font-black text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                    {viewBatch.items.length} {viewBatch.items.length === 1 ? 'product' : 'products'}
                  </span>
                </div>

                {viewBatch.items.length === 0 ? (
                  <p className="text-center text-[10px] text-slate-600 uppercase tracking-widest py-8">No products linked</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {viewBatch.items.map((item, idx) => (
                      <div key={item.item_id} className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                          <Package size={14} className="text-rose-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-white uppercase truncate">{item.product_name}</p>
                          <p className="text-[9px] font-mono text-slate-500 mt-0.5">{item.product_code}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Available</p>
                          <p className={cn("text-sm font-black",
                            item.available_qty > 0 ? "text-emerald-400" : "text-rose-400")}>
                            {item.available_qty.toLocaleString()}
                          </p>
                          <p className="text-[8px] text-slate-600">of {item.received_qty.toLocaleString()} received</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-8 pb-8">
                <button onClick={() => setViewBatch(null)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[10px] text-slate-400 uppercase tracking-widest transition-all">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CREATE / EDIT MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />

            <motion.form
              onSubmit={showModal === 'create' ? handleCreate : handleUpdate}
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[2.5rem] shadow-3xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 shrink-0">
                <h2 className="text-lg font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                  {showModal === 'create' ? <Plus className="text-rose-500" size={18} /> : <Edit3 className="text-rose-500" size={18} />}
                  {showModal === 'create' ? 'New Batch' : 'Edit Batch'}
                </h2>
                <button type="button" onClick={() => setShowModal(null)} className="p-2 text-slate-500 hover:text-rose-500 transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="overflow-y-auto flex-1 p-8 space-y-6">

                {/* Batch Header Fields */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className={labelCls}>Batch Number *</label>
                    <input required value={form.batch_number}
                      onChange={e => setForm({ ...form, batch_number: e.target.value })}
                      placeholder="e.g. BATCH-2024-001" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Manufacturing Date</label>
                    <input type="date" value={form.manufacturing_date}
                      onChange={e => setForm({ ...form, manufacturing_date: e.target.value })}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Expiry Date *</label>
                    <input type="date" required value={form.expiry_date}
                      onChange={e => setForm({ ...form, expiry_date: e.target.value })}
                      className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-4 px-8 py-6 border-t border-white/5 shrink-0">
                <button type="button" onClick={() => setShowModal(null)}
                  className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[10px] text-slate-400 uppercase transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-rose-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {isSaving
                    ? <Loader2 className="animate-spin" size={14} />
                    : <><Save size={13} /> {showModal === 'create' ? 'Create Batch' : 'Save Changes'}</>}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
