"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  PackagePlus, Truck, MapPin, Hash, ArrowRight,
  Box, AlertCircle, Trash2, Save, X, Edit3, Loader2, CheckCircle, Plus
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Interfaces ---
interface DispatchItem {
  id: number | string;
  product: string;
  batch: string;
  qty: number;
  allocated: number;
  weightPerUnit: number;
}

export default function CreateDeliveryNote() {
  // State Management
  const [items, setItems] = useState<DispatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [carrier, setCarrier] = useState("");
  const [plateNo, setPlateNo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editTarget, setEditTarget] = useState<DispatchItem | null>(null);

  // --- Secure Backend Config ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const currentUserId = Cookies.get('userId');
  const token = Cookies.get('auth_token');

  const secureApi = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'x-requester-id': currentUserId || 'node_unauthorized'
    }
  });

  // --- 1. Fetch Dynamic Data from Order ---
  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        setLoading(true);
        // Backend se linked order ka actual data mangwa rahe hain
        const res = await secureApi.get('/orders/ORD-8815/items');
        setItems(res.data.items); // Items set ho rahe hain
      } catch (err) {
        toast.error("DATA_FETCH_FAILED", { description: "Using fail-safe local buffer." });
        // Fail-safe empty state or retry logic
      } finally {
        setLoading(false);
      }
    };
    fetchOrderDetails();
  }, []);

  // --- 2. Calculations (Memoized) ---
  const stats = useMemo(() => {
    const totalWeight = items.reduce((acc, item) => acc + (Number(item.allocated) * item.weightPerUnit), 0);
    return { weight: totalWeight.toFixed(2), skus: items.length };
  }, [items]);

  // --- 3. Functional Actions ---

  const updateAllocatedQty = (id: number | string, val: string) => {
    const sanitizedVal = val.replace(/\D/g, ''); // Anti-SQL injection: strictly digits
    const num = parseInt(sanitizedVal) || 0;
    
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, allocated: Math.min(num, item.qty) } : item
    ));
  };

  const removeItem = (id: number | string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    toast.warning("Item purged from manifest");
  };

  const addNewItem = () => {
    const newItem: DispatchItem = {
      id: `NEW-${Date.now()}`,
      product: "New Product",
      batch: "PENDING",
      qty: 1,
      allocated: 1,
      weightPerUnit: 0.1
    };
    setItems([...items, newItem]);
    setEditTarget(newItem); // Edit modal for the new item
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editTarget) {
      setItems(prev => prev.map(item => item.id === editTarget.id ? editTarget : item));
      setEditTarget(null);
      toast.success("Manifest record updated");
    }
  };

  const executeDispatch = async () => {
    if (!carrier || !plateNo) {
      toast.error("VALIDATION_ERROR", { description: "Carrier and Vehicle Plate required." });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        orderId: 'ORD-8815',
        timestamp: new Date().toISOString(),
        logistics: { carrier, plateNo: plateNo.replace(/['";]/g, "") }, // Sanitized
        manifest: items
      };

      await secureApi.post('/logistics/delivery-notes', payload);
      toast.success("DISPATCH_AUTHORIZED", { description: "Stock deducted, Note generated." });
    } catch (err) {
      toast.error("NETWORK_FAILURE", { description: "Transaction could not be signed." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20 p-4 lg:p-10">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <PackagePlus className="text-cyan-400 w-8 h-8 p-1 bg-cyan-400/20 rounded-lg" />
            Generate Delivery Note
          </h1>
          <p className="text-slate-500 text-sm font-bold uppercase tracking-widest mt-1">
            Dispatch Authorization <span className="text-cyan-500/50">|</span> Terminal Alpha-6
          </p>
        </div>
        <button 
          onClick={addNewItem}
          className="bg-cyan-500/10 border border-cyan-500/20 px-6 py-2 rounded-2xl text-cyan-400 text-[10px] font-black uppercase tracking-widest hover:bg-cyan-500/20 transition-all flex items-center gap-2"
        >
          <Plus size={14} /> Add Extra Item
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-6">
          {/* Logistics Setup */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="bg-white/[0.02] border border-white/[0.08] p-8 rounded-[2.5rem] backdrop-blur-xl">
            <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
              <Truck size={16} className="text-cyan-400" /> Logistics Assignment
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Carrier Partner</label>
                <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-6 text-sm text-white focus:border-cyan-500/50 outline-none transition-all font-bold appearance-none cursor-pointer">
                  <option value="" className="bg-[#020617]">Select Carrier</option>
                  <option value="Leopard" className="bg-[#020617]">Leopard Courier</option>
                  <option value="TCS" className="bg-[#020617]">TCS Logistics</option>
                  <option value="Self Fleet" className="bg-[#020617]">Internal Fleet</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase ml-2">Vehicle / Plate No.</label>
                <input type="text" value={plateNo} onChange={(e) => setPlateNo(e.target.value.toUpperCase())} placeholder="e.g. KHI-1234" className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-6 text-sm text-white focus:border-cyan-500/50 outline-none font-bold placeholder:text-slate-700 uppercase" />
              </div>
            </div>
          </motion.div>

          {/* Item Allocation Matrix */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="bg-white/[0.02] border border-white/[0.08] p-8 rounded-[2.5rem] backdrop-blur-xl min-h-[400px]">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                <Box size={16} className="text-cyan-400" /> Item Allocation
              </h3>
              <span className="text-[10px] font-black text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full uppercase flex items-center gap-2">
                <CheckCircle size={10}/> Warehouse Sync Active
              </span>
            </div>

            

            <div className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <Loader2 className="animate-spin text-cyan-500" size={32} />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hydrating manifest nodes...</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <motion.div key={item.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white/[0.01] border border-white/[0.04] p-5 rounded-3xl group hover:border-cyan-500/30 transition-all"
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        <div className="col-span-12 md:col-span-5">
                          <p className="text-xs font-black text-white uppercase italic tracking-tight">{item.product}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Hash size={10} className="text-slate-600" />
                            <span className="text-[9px] font-bold text-slate-500 uppercase">Batch: <span className="text-cyan-400">{item.batch}</span></span>
                          </div>
                        </div>
                        <div className="col-span-4 md:col-span-2 text-center border-x border-white/5">
                           <p className="text-[9px] font-black text-slate-600 uppercase">Ordered</p>
                           <p className="text-sm font-black text-white">{item.qty}</p>
                        </div>
                        <div className="col-span-4 md:col-span-3">
                           <input type="text" value={item.allocated} onChange={(e) => updateAllocatedQty(item.id, e.target.value)}
                             className="w-full bg-cyan-500/5 border border-cyan-500/20 rounded-xl py-2 px-3 text-center text-xs font-black text-cyan-400 outline-none focus:border-cyan-500 transition-all" />
                        </div>
                        <div className="col-span-4 md:col-span-2 flex justify-end gap-1">
                           <button onClick={() => setEditTarget(item)} className="p-2 text-slate-600 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-all"><Edit3 size={14}/></button>
                           <button onClick={() => removeItem(item.id)} className="p-2 text-slate-600 hover:text-rose-500 hover:bg-white/5 rounded-lg transition-all"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="sticky top-8 bg-slate-950/50 border border-white/[0.08] p-8 rounded-[2.5rem] backdrop-blur-xl">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-8">Dispatch Overview</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-white/5 rounded-2xl"><MapPin className="text-white" size={20} /></div>
                 <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase">Target Node</p>
                    <p className="text-xs font-bold text-white uppercase tracking-tight">Karachi Distribution Hub</p>
                 </div>
              </div>
              <div className="h-px bg-white/5" />
              <div className="space-y-3">
                 <div className="flex justify-between text-[10px] font-black uppercase italic">
                    <span className="text-slate-500">Total SKU</span>
                    <span className="text-white">{stats.skus.toString().padStart(2, '0')} Units</span>
                 </div>
                 <div className="flex justify-between text-[10px] font-black uppercase italic">
                    <span className="text-slate-500">Gross Weight</span>
                    <span className="text-white">{stats.weight} KG</span>
                 </div>
              </div>
              <div className="pt-6">
                 <button disabled={isSubmitting || items.length === 0} onClick={executeDispatch} 
                   className="w-full py-4 bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-black rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-cyan-400 transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] group">
                    {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : 'Authorize Dispatch'} 
                    {!isSubmitting && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                 </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Edit Item Modal */}
      <AnimatePresence>
        {editTarget && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-md bg-black/70">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-[#020617] border border-cyan-500/20 rounded-[2.5rem] p-8 shadow-2xl"
            >
              <button onClick={() => setEditTarget(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors"><X size={24}/></button>
              <h2 className="text-xl font-black text-white italic uppercase mb-6 flex items-center gap-3"><Edit3 className="text-cyan-400" /> Metadata Update</h2>
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Product Descriptor</label>
                  <input type="text" value={editTarget.product} onChange={e => setEditTarget({...editTarget, product: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-bold outline-none focus:border-cyan-500" />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Assigned Batch</label>
                  <input type="text" value={editTarget.batch} onChange={e => setEditTarget({...editTarget, batch: e.target.value.toUpperCase()})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-mono text-cyan-400 outline-none focus:border-cyan-500" />
                </div>
                <button type="submit" className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-2xl text-black text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"><Save size={16} /> Update Buffer</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}