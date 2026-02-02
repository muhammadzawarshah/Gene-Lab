"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  PackagePlus, Plus, Trash2, Save, 
  Truck, Calendar, ScanLine, CheckCircle2,
  ChevronDown, Search, Loader2, ShieldCheck, RefreshCcw
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

interface GRNRow {
  id: string | number;
  product_id: string;
  item_name: string;
  batch: string;
  qty: string;
  unit: string;
  expiry: string;
}

export default function AddStockGRN() {
  const [rows, setRows] = useState<GRNRow[]>([]);
  const [activePOs, setActivePOs] = useState<any[]>([]);
  const [vendor, setVendor] = useState("");
  const [node, setNode] = useState("Central Hub - Alpha");
  const [poRef, setPoRef] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingPOs, setIsLoadingPOs] = useState(false);

  const currentUserId = Cookies.get('userId');
  const authToken = Cookies.get('auth_token');

  const secureApi = axios.create({
    baseURL: API_BASE,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'x-api-key': API_KEY,
      'x-user-id': currentUserId
    }
  });

  // 1. Load Dropdown on Mount
  useEffect(() => {
    const fetchOpenPOs = async () => {
      setIsLoadingPOs(true);
      try {
        const res = await secureApi.get('/purchase/orders/open');
        setActivePOs(res.data.data);
      } catch (err) {
        toast.error("Failed to load active Purchase Orders");
      } finally {
        setIsLoadingPOs(false);
      }
    };
    fetchOpenPOs();
  }, []);

  // 2. Fetch Items when PO is selected
  const handlePOSelection = async (poId: string) => {
    setPoRef(poId);
    if (!poId) {
      setRows([]);
      setVendor("");
      return;
    }

    const tId = toast.loading("Fetching PO Manifest...");
    try {
      const res = await secureApi.get(`/purchase/orders/${poId}/items`);
      const poData = res.data.data;

      setVendor(poData.supplier || "Unknown Supplier");

      const manifest = poData.items.map((item: any) => ({
        id: Math.random(),
        product_id: item.product_id,
        item_name: item.product_name,
        batch: '',
        qty: item.quantity.toString(),
        unit: item.uom_name || 'PCS',
        expiry: ''
      }));

      setRows(manifest);
      toast.success("Manifest Loaded", { id: tId });
    } catch (err) {
      toast.error("Error loading PO details", { id: tId });
      setRows([]);
    }
  };

  const handleInputChange = (id: string | number, field: keyof GRNRow, value: string) => {
    setRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handlePostGRN = async () => {
    if (!poRef || rows.length === 0) {
      toast.error("Validation Error", { description: "Please select a PO and ensure items are present." });
      return;
    }

    setIsPosting(true);
    const tId = toast.loading("COMMITTING STOCK TO LEDGER...");

    try {
      const payload = {
        po_id: parseInt(poRef),
        warehouse_id: node,
        items: rows.map(r => ({
          product_id: r.product_id,
          received_qty: parseFloat(r.qty),
          uom_id: r.unit,
          batch: r.batch.trim() || "N/A",
          expiry: r.expiry || null
        })),
        remarks
      };

      await secureApi.post('/purchase/receive-stock', payload);
      
      toast.success("STOCK_COMMITTED_SUCCESSFULLY", { id: tId });
      setRows([]);
      setPoRef("");
      setVendor("");
      setRemarks("");
    } catch (err: any) {
      toast.error("TRANSACTION_REJECTED", { 
        id: tId, 
        description: err.response?.data?.message || "Internal Protocol Failure" 
      });
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-32 p-4 text-slate-200">
      <Toaster theme="dark" position="top-right" richColors />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <PackagePlus className="text-emerald-500 w-10 h-10" />
            Stock Inward (GRN)
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> 
            Operator: {currentUserId || 'SESSION_UNSTABLE'}
          </p>
        </motion.div>
      </div>

      {/* Metadata Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3 bg-slate-900/40 border border-white/[0.05] p-8 rounded-[2.5rem] backdrop-blur-xl grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Reference PO #</label>
            <div className="relative">
              <select 
                value={poRef}
                onChange={(e) => handlePOSelection(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-5 text-xs text-white outline-none focus:border-emerald-500 transition-all font-bold appearance-none"
              >
                <option value="">Select Open PO</option>
                {activePOs.map((po) => (
                  <option key={po.id} value={po.id} className="bg-slate-900">
                    {po.po_number} — {po.vendor_name}
                  </option>
                ))}
              </select>
              {isLoadingPOs ? (
                <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500 animate-spin" />
              ) : (
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Auto-Detected Vendor</label>
            <div className="relative group">
              <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50 group-hover:text-emerald-500 transition-colors" />
              <input 
                readOnly
                value={vendor}
                placeholder="Vendor will auto-fill"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-xs text-slate-400 outline-none font-bold"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Destination Node</label>
            <div className="relative">
              <select 
                value={node}
                onChange={(e) => setNode(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-xs text-white outline-none focus:border-emerald-500 transition-all font-bold appearance-none"
              >
                <option value="Central Hub - Alpha" className="bg-slate-900">Central Hub - Alpha</option>
                <option value="Karachi Node 02" className="bg-slate-900">Karachi Node 02</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="bg-emerald-500/5 border border-emerald-500/10 p-8 rounded-[2.5rem] flex flex-col justify-center overflow-hidden">
          <div className="flex items-center gap-2 mb-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest">
            <Calendar size={14} /> System Date
          </div>
          <h3 className="text-2xl font-black text-white italic tracking-tighter">02 FEB 2026</h3>
        </motion.div>
      </div>

      {/* Line Items Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/40 border border-white/[0.05] rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">#</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Item Description</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Batch / Lot</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Receiving Qty</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Expiry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              <AnimatePresence mode="popLayout">
                {rows.length > 0 ? rows.map((row, index) => (
                  <motion.tr layout key={row.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="group hover:bg-white/[0.02] transition-all">
                    <td className="px-8 py-4 text-[10px] font-black text-slate-700 italic">{index + 1}</td>
                    <td className="px-8 py-4 min-w-[320px]">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-bold text-white">{row.item_name}</span>
                        <span className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter italic">UID: {row.product_id}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <input 
                        value={row.batch}
                        onChange={(e) => handleInputChange(row.id, 'batch', e.target.value)}
                        placeholder="ENTER BATCH" 
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white outline-none focus:border-emerald-500 font-bold italic" 
                      />
                    </td>
                    <td className="px-8 py-4 w-44">
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-emerald-500 transition-all">
                        <input 
                          type="number" 
                          value={row.qty}
                          onChange={(e) => handleInputChange(row.id, 'qty', e.target.value)}
                          className="w-full bg-transparent py-2.5 px-4 text-xs text-emerald-400 outline-none font-bold" 
                        />
                        <span className="px-3 text-[8px] font-black text-slate-500 uppercase border-l border-white/10">{row.unit}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <input 
                        type="date" 
                        value={row.expiry}
                        onChange={(e) => handleInputChange(row.id, 'expiry', e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-slate-400 outline-none focus:border-emerald-500 transition-all font-bold" 
                      />
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                        <RefreshCcw size={40} className="animate-spin-slow text-slate-500" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Waiting for PO Selection...</p>
                      </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Footer Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <textarea 
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="Quality inspection remarks or manifest notes..." 
          className="w-full bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 text-xs text-white outline-none focus:border-emerald-500 transition-all font-bold italic h-48" 
        />
        
        <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-10 flex flex-col justify-between relative shadow-2xl overflow-hidden">
           <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-white/5 pb-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Manifest Items</p>
                    <span className="text-3xl font-black text-white italic">{rows.length} Units</span>
                  </div>
                  {poRef && <span className="text-[9px] font-black text-emerald-500 uppercase px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 flex items-center gap-2"><CheckCircle2 size={12}/> Locked to PO</span>}
              </div>
              <div className="flex items-center gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                <ShieldCheck className="text-emerald-500" size={16} />
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Digitally Signed: {currentUserId || 'GUEST_USER'}</p>
              </div>
           </div>

           <button 
            disabled={isPosting || rows.length === 0}
            onClick={handlePostGRN}
            className="mt-10 w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-5 rounded-[2rem] font-black text-[13px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 active:scale-95 shadow-xl shadow-emerald-900/20"
           >
             {isPosting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
             Commit Stock to Ledger
           </button>
        </div>
      </div>
    </div>
  );
}