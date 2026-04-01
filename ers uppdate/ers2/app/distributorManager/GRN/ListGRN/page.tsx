"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
  Search, Eye, Calendar, Warehouse,
  Hash, X, Loader2, Plus, Edit3, Save,
  Tag, Truck, BadgeDollarSign, CalendarDays
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { GRNReportComponent } from '@/components/layout/GRNReportComponent';
import Link from 'next/link';
import { format } from 'date-fns';

export default function GRNListPage() {
  const authToken = Cookies.get('auth_token');

  // --- STATES ---
  const [grnList, setGrnList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [viewGRN, setViewGRN] = useState<any>(null);
  const [editGRN, setEditGRN] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Invoice generation
  const [invoiceGRN, setInvoiceGRN]     = useState<any>(null); // GRN to invoice
  const [narration, setNarration]       = useState('');
  const [isInvoicing, setIsInvoicing]   = useState(false);
  const userId = Cookies.get('userId') || Cookies.get('user_id');

  // 1. Fetch GRN Data
  const fetchGRNs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/grn/`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log(res.data)
      setGrnList(res.data.data || res.data || []);
    } catch (err) {
      toast.error("Backend se data nahi mil saka!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken) fetchGRNs();
  }, [authToken]);

  // 2. Update Function
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/purchase/grn/${editGRN.grn_id}`, {
        status: editGRN.status,
        remarks: editGRN.remarks
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      toast.success("GRN Status update ho gaya!");
      setEditGRN(null);
      fetchGRNs();
    } catch (err) {
      toast.error("Update fail ho gaya!");
    } finally {
      setIsUpdating(false);
    }
  };

  // 3. Generate Invoice
  const handleGenerateInvoice = async () => {
    if (!invoiceGRN) return;
    setIsInvoicing(true);
    const tId = toast.loading('Generating invoice...');
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/finance/invoice/generate/${invoiceGRN.grn_id}`,
        { narration: narration.trim() || undefined, userId },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      toast.success('Invoice generated successfully!', { id: tId });
      setInvoiceGRN(null);
      setNarration('');
      fetchGRNs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Invoice generation failed', { id: tId });
    } finally {
      setIsInvoicing(false);
    }
  };

  const filteredData = grnList.filter(item => {
    const matchesSearch =
      item.grn_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.purchaseorder?.party?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.grnline?.some((l: any) => l.batch?.batch_number?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-widest";
  const thClass = `px-4 py-5 ${labelClass} bg-white/[0.02] border-b border-white/5`;

  return (
    <div className="text-slate-300 p-6 md:p-10 font-sans min-h-screen bg-[#0b1224]">
      <Toaster richColors theme="dark" position="top-right" />

      <div className="max-w-[1700px] mx-auto">
        {/* --- HEADER --- */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
              GRN <span className="text-blue-600">RECORDS</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.4em] uppercase mt-2">Inventory Management Protocol v2.0</p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0f172a] border border-slate-800 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-blue-500"
            >
              <option value="ALL">ALL STATUS</option>
              <option value="received">RECEIVED</option>
              <option value="pending">PENDING</option>
            </select>

            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500" size={18} />
              <input
                type="text"
                placeholder="Search GRN, Supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#0f172a] border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-sm text-white outline-none w-full md:w-72 transition-all focus:border-blue-500/50"
              />
            </div>

            <Link href="/distributorManager/GRN/NewGRN">
              <button className="flex items-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 text-sm font-black uppercase tracking-[0.2em] text-white hover:bg-blue-500 transition-all active:scale-95">
                <Plus size={16} strokeWidth={3} />
                <span>Create New</span>
              </button>
            </Link>
          </div>
        </div>

        {/* --- TABLE --- */}
        <div className="bg-[#0f172a]/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1100px]">
              <thead>
                <tr>
                  <th className={thClass}>GRN & Supplier</th>
                  <th className={thClass}>Batch Info</th>
                  <th className={thClass}>MFG Date</th>
                  <th className={thClass}>Expiry Date</th>
                  <th className={thClass}>Discount</th>
                  <th className={thClass}>Net Total</th>
                  <th className={thClass}>Status</th>
                  <th className={`px-6 py-5 text-right ${labelClass} bg-white/[0.02] border-b border-white/5`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={8} className="py-32 text-center"><Loader2 className="animate-spin inline text-blue-600" size={40} /></td></tr>
                ) : filteredData.map((grn) => (
                  <tr key={grn.grn_id} className="group hover:bg-white/[0.02] transition-all">
                    <td className="px-4 py-6">
                      <div className="flex flex-col">
                        <span className="text-white font-black uppercase italic tracking-tighter">{grn.grn_number}</span>
                        <span className="text-[10px] text-slate-500 font-bold mt-1 uppercase truncate max-w-[180px]">{grn.purchaseorder?.party?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-6">
                      <span className="text-[11px] text-blue-400 font-mono font-bold bg-blue-400/5 border border-blue-400/10 px-2 py-1 rounded">
                        {grn.grnline?.[0]?.batch?.batch_number || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-6">
                      <span className="text-xs font-bold text-slate-400 italic">
                        {grn.grnline?.[0]?.batch?.manufacturing_date ? format(new Date(grn.grnline[0].batch.manufacturing_date), 'dd-MM-yyyy') : '---'}
                      </span>
                    </td>
                    <td className="px-4 py-6">
                      <span className="text-xs font-bold text-red-400/80 italic">
                        {grn.grnline?.[0]?.batch?.expiry_date ? format(new Date(grn.grnline[0].batch.expiry_date), 'dd-MM-yyyy') : '---'}
                      </span>
                    </td>
                    <td className="px-4 py-6 font-mono text-xs font-bold text-red-400">
                      PKR {grn.discount || 0}
                    </td>
                    <td className="px-4 py-6 font-mono text-xs font-black text-emerald-400">
                      PKR {grn.nettotal || 0}
                    </td>
                    <td className="px-4 py-6">
                      <span className={`text-[9px] font-black px-3 py-1.5 rounded-lg border uppercase tracking-tighter ${grn.status === 'received' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-blue-500 border-blue-500/20 bg-blue-500/5'
                        }`}>
                        {grn.status}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => setViewGRN(grn)} className="bg-slate-800 p-2.5 rounded-xl hover:bg-blue-600 text-white transition-all" title="View GRN"><Eye size={16} /></button>
                        <button
                          onClick={() => { setInvoiceGRN(grn); setNarration(''); }}
                          className="bg-slate-800 p-2.5 rounded-xl hover:bg-emerald-600 text-white transition-all"
                          title="Generate Invoice"
                        ><BadgeDollarSign size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- VIEW MODAL (Report) --- */}
      <AnimatePresence>
        {viewGRN && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl relative">

              {/* Modal Toolbar (Sticky) */}
              <div className="sticky top-0 z-10 p-4 bg-slate-900 flex justify-between items-center rounded-t-[2rem]">
                <h3 className="text-white font-black italic uppercase ml-4">GRN Report Preview</h3>
                <div className="flex gap-4">
                  <button
                    onClick={() => window.print()}
                    className="px-6 py-2 bg-emerald-500 text-black text-[10px] font-black uppercase rounded-xl hover:bg-emerald-400 transition-all"
                  >
                    Print PDF
                  </button>
                  <button
                    onClick={() => setViewGRN(null)}
                    className="p-2 bg-white/10 text-white rounded-full hover:bg-red-500 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Report Content Area */}
              <div className="p-6 bg-gray-100 rounded-b-[2rem]">
                <div id="printable-area">
                  <GRNReportComponent data={viewGRN} />
                </div>
              </div>

            </div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT MODAL --- */}
      <AnimatePresence>
        {editGRN && (
          <div className="fixed inset-0 flex items-center justify-center z-[110] p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditGRN(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 shadow-2xl">
              <h2 className="text-2xl font-black text-white italic uppercase mb-8">Update <span className="text-amber-500">GRN</span></h2>
              <form onSubmit={handleUpdate} className="space-y-6">
                <div>
                  <label className={labelClass}>Operational Status</label>
                  <select
                    value={editGRN.status}
                    onChange={(e) => setEditGRN({ ...editGRN, status: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 outline-none focus:border-amber-500 transition-all text-white font-bold"
                  >
                    <option value="pending">PENDING</option>
                    <option value="received">RECEIVED</option>
                    <option value="cancelled">CANCELLED</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Remarks</label>
                  <textarea
                    value={editGRN.remarks || ""}
                    onChange={(e) => setEditGRN({ ...editGRN, remarks: e.target.value })}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 outline-none focus:border-amber-500 transition-all text-slate-200"
                    placeholder="Enter process notes..."
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setEditGRN(null)} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-white/5 hover:bg-white/10">Cancel</button>
                  <button type="submit" disabled={isUpdating} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-amber-600 text-white flex items-center justify-center gap-2 hover:bg-amber-500 transition-all">
                    {isUpdating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Update
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- GENERATE INVOICE MODAL --- */}
      <AnimatePresence>
        {invoiceGRN && (
          <div className="fixed inset-0 flex items-center justify-center z-[110] p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => !isInvoicing && setInvoiceGRN(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 shadow-2xl">

              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                  <BadgeDollarSign size={22} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Generate Invoice</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    GRN: {invoiceGRN.grn_number} &bull; {invoiceGRN.purchaseorder?.party?.name}
                  </p>
                </div>
              </div>

              <div className="my-6 h-px bg-white/5" />

              {/* Narration */}
              <div className="mb-6">
                <label className={labelClass + ' mb-2 block'}>Narration / Description <span className="text-slate-600">(optional)</span></label>
                <textarea
                  rows={4}
                  value={narration}
                  onChange={e => setNarration(e.target.value)}
                  placeholder="e.g. Purchase invoice for batch GRN-2024-001 received from supplier..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 outline-none focus:border-emerald-500 transition-all text-slate-200 text-sm resize-none"
                />
              </div>

              {/* Posted by (read-only info) */}
              <div className="mb-8 px-4 py-3 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Posted By</span>
                <span className="text-[10px] font-black text-slate-300 uppercase">{userId || 'System'}</span>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  disabled={isInvoicing}
                  onClick={() => setInvoiceGRN(null)}
                  className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-white/5 hover:bg-white/10 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateInvoice}
                  disabled={isInvoicing}
                  className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-emerald-600 text-white flex items-center justify-center gap-2 hover:bg-emerald-500 transition-all disabled:opacity-40"
                >
                  {isInvoicing ? <Loader2 size={16} className="animate-spin" /> : <BadgeDollarSign size={16} />}
                  {isInvoicing ? 'Generating...' : 'Generate Invoice'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}