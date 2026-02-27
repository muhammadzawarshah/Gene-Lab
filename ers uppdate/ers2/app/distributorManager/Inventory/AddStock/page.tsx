"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  PackagePlus, Save, Truck, Calendar, CheckCircle2,
  ChevronDown, Loader2, ShieldCheck, RefreshCcw
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

  // 1. Dropdown load karne ke liye (List all POs)
  useEffect(() => {
    const fetchOpenPOs = async () => {
      setIsLoadingPOs(true);
      try {
        const res = await secureApi.get('/api/v1/purchase/listpo');
        // Backend returns: res.data.data (which is an array of POs)
        setActivePOs(res.data.data.po || []);
      } catch (err) {
        toast.error("Failed to load active Purchase Orders");
      } finally {
        setIsLoadingPOs(false);
      }
    };
    fetchOpenPOs();
  }, []);

  // 2. PO select hone par backend se products (pol) uthane ke liye
  const handlePOSelection = async (poId: string) => {
    setPoRef(poId);
    if (!poId) {
      setRows([]);
      setVendor("");
      return;
    }

    const tId = toast.loading("Syncing PO Manifest...");
    try {
      const res = await secureApi.get(`/api/v1/purchase/order/${poId}/items`);
      
      // Aapke backend ka structure: res.data.data.po aur res.data.data.pol
      const { po, pol } = res.data.data;

      // Vendor name set karein
      setVendor(po.party?.party_name || "Supplier ID: " + po.party_id_supplier);

      // Backend array 'pol' ko 'rows' state mein map karein
      const manifest = pol.map((item: any) => ({
        id: item.po_line_id || Math.random(),
        product_id: item.product_id,
        // Product name agar relations mein hai toh varna ID fallback
        item_name: item.product?.name || "Product SKU: " + item.product_id.substring(0, 8),
        batch: '', 
        qty: item.quantity.toString(),
        unit: item.uom?.uom_name || 'Units',
        expiry: ''
      }));

      setRows(manifest);
      toast.success("Items loaded successfully", { id: tId });
    } catch (err) {
      console.error(err);
      toast.error("Error loading items", { id: tId });
      setRows([]);
    }
  };

  const handleInputChange = (id: string | number, field: keyof GRNRow, value: string) => {
    setRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handlePostGRN = async () => {
    if (!poRef || rows.length === 0) {
      toast.error("Please select a PO with items first.");
      return;
    }

    setIsPosting(true);
    const tId = toast.loading("COMMITTING STOCK...");

    try {
      const payload = {
        poId: parseInt(poRef),
        warehouseId: 1,
        items: rows.map(r => ({
          product_id: r.product_id,
          received_qty: parseFloat(r.qty),
          batch_number: r.batch.trim() || "N/A",
          expiry_date: r.expiry || null,
          manufacturing_date: Date.now()
        })),
        remarks
      };

      await secureApi.post('/api/v1/purchase/grn/receive', payload);
      
      toast.success("STOCK COMMITTED SUCCESSFULLY", { id: tId });
      setRows([]);
      setPoRef("");
      setVendor("");
      setRemarks("");
    } catch (err: any) {
      toast.error("FAILED TO COMMIT", { id: tId });
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
            Node: {node}
          </p>
        </motion.div>
      </div>

      {/* Metadata Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-slate-900/40 border border-white/[0.05] p-8 rounded-[2.5rem] backdrop-blur-xl grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-3">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Purchase Order</label>
            <div className="relative">
              <select 
                value={poRef}
                onChange={(e) => handlePOSelection(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-5 text-xs text-white outline-none focus:border-emerald-500 transition-all font-bold appearance-none"
              >
                <option value="">Select Open PO</option>
                {activePOs.map((po) => (
                  <option key={po.po_id} value={po.po_id} className="bg-slate-900">
                    PO #{po.po_id} — {po.party?.name || 'Loading...'}
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
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Supplier</label>
            <div className="relative">
              <Truck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/50" />
              <input 
                readOnly
                value={vendor}
                placeholder="Auto-filled from PO"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-xs text-white font-bold outline-none italic"
              />
            </div>
          </div>
        </div>

        <div className="bg-emerald-500/5 border border-emerald-500/10 p-8 rounded-[2.5rem] flex flex-col justify-center overflow-hidden text-center">
          <div className="flex items-center justify-center gap-2 mb-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest">
            <Calendar size={14} /> System Date
          </div>
          <h3 className="text-2xl font-black text-white italic tracking-tighter">11 FEB 2026</h3>
        </div>
      </div>

      {/* Line Items Table - Yahan Data Load hoga */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/40 border border-white/[0.05] rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest w-16">#</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Product Description</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Batch Number</th>
                <th className="px-8 py-6 text-[9px] font-black text-slate-500 uppercase tracking-widest">Qty</th>
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
                        <span className="text-xs font-bold text-white uppercase">{row.item_name}</span>
                        <span className="text-[9px] font-mono text-slate-500 tracking-tighter italic">ID: {row.product_id}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <input 
                        value={row.batch}
                        onChange={(e) => handleInputChange(row.id, 'batch', e.target.value)}
                        placeholder="ENTER BATCH" 
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-white outline-none focus:border-emerald-500 font-bold" 
                      />
                    </td>
                    <td className="px-8 py-4 w-44">
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-emerald-500">
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
                        className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-slate-400 outline-none focus:border-emerald-500 font-bold" 
                      />
                    </td>
                  </motion.tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-32 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-30">
                        <RefreshCcw size={40} className="animate-spin-slow text-slate-500" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em]">Waiting for Purchase Order Selection...</p>
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
          placeholder="Log any quality issues or receipt notes here..." 
          className="w-full bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 text-xs text-white outline-none focus:border-emerald-500 transition-all font-bold h-48" 
        />
        
        <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-10 flex flex-col justify-between shadow-2xl overflow-hidden">
           <div className="space-y-6">
              <div className="flex justify-between items-end border-b border-white/5 pb-6">
                  <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Manifest Summary</p>
                    <span className="text-3xl font-black text-white italic">{rows.length} Skus Loaded</span>
                  </div>
                  {poRef && <span className="text-[9px] font-black text-emerald-500 uppercase px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 flex items-center gap-2"><CheckCircle2 size={12}/> PO Verified</span>}
              </div>
              <div className="flex items-center gap-3 p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                <ShieldCheck className="text-emerald-500" size={16} />
                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Secure Handshake: {currentUserId || 'Operator'}</p>
              </div>
           </div>

           <button 
            disabled={isPosting || rows.length === 0}
            onClick={handlePostGRN}
            className="mt-10 w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white py-5 rounded-[2rem] font-black text-[13px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 active:scale-95"
           >
             {isPosting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />} 
             Finalize Stock Entry
           </button>
        </div>
      </div>
    </div>
  );
}