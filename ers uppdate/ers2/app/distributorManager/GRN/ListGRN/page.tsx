"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
  Search, Eye, Calendar, Warehouse,
  Hash, X, FileText, ChevronRight,
  Loader2, Plus, Edit3, Package, Save
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { format } from 'date-fns';

export default function GRNListPage() {
  const authToken = Cookies.get('auth_token');

  // --- STATES ---
  const [grnList, setGrnList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  
  // Modals State
  const [viewGRN, setViewGRN] = useState<any>(null);
  const [editGRN, setEditGRN] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 1. Fetch GRN Data
  const fetchGRNs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/grn/`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setGrnList(res.data || []);
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
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/grn/${editGRN.grn_id}`, {
        status: editGRN.status,
        remarks: editGRN.remarks
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      toast.success("GRN successfully update ho gaya!");
      setEditGRN(null);
      fetchGRNs(); // Refresh list
    } catch (err) {
      toast.error("Update fail ho gaya!");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredData = grnList.filter(item => {
    const matchesSearch = 
      item.grn_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.purchaseorder?.party?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-widest";

  return (
    <div className="text-slate-300 p-6 md:p-10 font-sans overflow-x-hidden">
      <Toaster richColors theme="dark" position="top-right" />

      <div className="max-w-7xl mx-auto">
        {/* --- TOP BAR (As it was) --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
              GRN <span className="text-blue-600">INVENTORY</span>
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="h-1 w-12 bg-blue-600 rounded-full"></span>
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.4em] uppercase">Total: {filteredData.length}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#0f172a] border border-slate-800 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-blue-500"
            >
              <option value="ALL">ALL STATUS</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="PENDING">PENDING</option>
            </select>

            <div className="relative group">
              <Search className="absolute left-4 top-4 text-slate-500 group-focus-within:text-blue-500" size={20} />
              <input
                type="text"
                placeholder="Search GRN or Supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#0f172a] border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-sm text-white outline-none w-full md:w-80 transition-all"
              />
            </div>

            <Link href="/distributorManager/GRN/NewGRN">
              <button className="group relative flex items-center gap-3 rounded-full bg-blue-600 px-8 py-4 text-sm font-black uppercase tracking-[0.2em] text-white hover:bg-blue-500 transition-all">
                <Plus size={16} strokeWidth={3} />
                <span>New GRN</span>
              </button>
            </Link>
          </div>
        </div>

        {/* --- TABLE SECTION --- */}
        <div className="bg-[#0f172a]/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] border-b border-white/5">
                  <th className={`px-8 py-6 ${labelClass}`}>GRN Info</th>
                  <th className={`px-8 py-6 ${labelClass}`}>Supplier</th>
                  <th className={`px-8 py-6 ${labelClass}`}>Status</th>
                  <th className={`px-8 py-6 text-right ${labelClass}`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin inline text-blue-600" size={30} /></td></tr>
                ) : filteredData.map((grn) => (
                  <tr key={grn.grn_id} className="group hover:bg-blue-600/[0.04] transition-all">
                    <td className="px-8 py-6">
                      <p className="text-white font-bold">{grn.grn_number}</p>
                      <p className="text-[10px] text-slate-500 font-mono">#{grn.grn_id}</p>
                    </td>
                    <td className="px-8 py-6 text-sm font-semibold">{grn.purchaseorder?.party?.name}</td>
                    <td className="px-8 py-6">
                      <span className={`text-[9px] font-black px-3 py-1 rounded-lg border ${grn.status === 'COMPLETED' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-blue-500 border-blue-500/20 bg-blue-500/5'}`}>
                        {grn.status}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setViewGRN(grn)} className="bg-slate-800 p-2.5 rounded-xl hover:bg-blue-600 text-white"><Eye size={16} /></button>
                        <button onClick={() => setEditGRN({...grn})} className="bg-slate-800 p-2.5 rounded-xl hover:bg-amber-600 text-white"><Edit3 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- VIEW MODAL (POPUP) --- */}
      <AnimatePresence>
        {viewGRN && (
          <div className="fixed inset-0 flex items-center justify-center z-[110] p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewGRN(null)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[3rem] p-8 shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-white italic uppercase">GRN <span className="text-blue-600">Details</span></h2>
                <button onClick={() => setViewGRN(null)} className="p-2 hover:bg-white/5 rounded-full"><X size={20}/></button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 p-4 rounded-2xl">
                  <p className={labelClass}>Supplier</p>
                  <p className="text-white font-bold">{viewGRN.purchaseorder?.party?.name}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl">
                  <p className={labelClass}>Status</p>
                  <p className="text-blue-500 font-bold">{viewGRN.status}</p>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto rounded-2xl border border-white/5 bg-black/20">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-slate-900 shadow-xl">
                    <tr className="text-slate-500 uppercase text-[9px]">
                      <th className="p-4 text-left">Product</th>
                      <th className="p-4 text-center">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {viewGRN.grnline?.map((line: any) => (
                      <tr key={line.grn_line_id}>
                        <td className="p-4 text-white font-medium">{line.product?.name} <br/> <span className="text-[10px] text-slate-500 font-mono">{line.batch?.batch_number}</span></td>
                        <td className="p-4 text-center text-blue-400 font-bold">{line.received_qty} {line.uom?.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- EDIT MODAL (POPUP) --- */}
      <AnimatePresence>
        {editGRN && (
          <div className="fixed inset-0 flex items-center justify-center z-[110] p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditGRN(null)} className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-[3rem] p-10 shadow-2xl">
              <h2 className="text-2xl font-black text-white italic uppercase mb-8">Quick <span className="text-amber-500">Update</span></h2>
              <form onSubmit={handleUpdate} className="space-y-6">
                <div>
                  <label className={labelClass}>Operational Status</label>
                  <select 
                    value={editGRN.status}
                    onChange={(e) => setEditGRN({...editGRN, status: e.target.value})}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 outline-none focus:border-amber-500 transition-all"
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Admin Remarks</label>
                  <textarea 
                    value={editGRN.remarks || ""}
                    onChange={(e) => setEditGRN({...editGRN, remarks: e.target.value})}
                    rows={3}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 outline-none focus:border-amber-500 transition-all resize-none"
                    placeholder="Update notes for this registry..."
                  />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setEditGRN(null)} className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-white/5 hover:bg-white/10">Cancel</button>
                  <button type="submit" disabled={isUpdating} className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest bg-amber-600 text-white flex items-center justify-center gap-2 hover:bg-amber-500 disabled:opacity-50">
                    {isUpdating ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}