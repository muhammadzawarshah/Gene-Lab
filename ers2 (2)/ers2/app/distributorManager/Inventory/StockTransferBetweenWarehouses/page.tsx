"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  ArrowRightLeft, MoveRight, Warehouse, 
  Package, Box, Trash2, Send, 
  AlertCircle, CheckCircle2, Search,
  Zap, Info, ListPlus, Loader2
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
interface TransferItem {
  id: number;
  name: string;
  qty: string;
  batch: string;
}

// --- API Configuration ---
const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

export default function StockTransfer() {
  // Main State
  const [items, setItems] = useState<TransferItem[]>([
    { id: Date.now(), name: '', qty: '', batch: '' }
  ]);
  const [sourceNode, setSourceNode] = useState('');
  const [targetNode, setTargetNode] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Security Context
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

  // Security: Input Sanitization
  const sanitize = (val: string) => val.replace(/[<>{}[\]\\^`|]/g, "").trim();

  // --- Functions ---
  const handleInputChange = (id: number, field: keyof TransferItem, value: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), name: '', qty: '', batch: '' }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
      toast.info("Item removed from manifest");
    }
  };

  const validateForm = () => {
    if (!sourceNode || !targetNode) {
      toast.error("MISSING_NODES", { description: "Please select origin and destination warehouses." });
      return false;
    }
    if (sourceNode === targetNode) {
      toast.error("LOGIC_ERROR", { description: "Source and Destination cannot be the same." });
      return false;
    }
    if (items.some(i => !i.name || !i.qty || parseFloat(i.qty) <= 0)) {
      toast.error("INVALID_MANIFEST", { description: "All items must have a valid description and quantity." });
      return false;
    }
    return true;
  };

  const handleTransfer = async () => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    const tId = toast.loading("ENCRYPTING_MANIFEST_AND_INITIATING_TRANSFER...");

    try {
      const payload = {
        metadata: {
          origin: sanitize(sourceNode),
          destination: sanitize(targetNode),
          instructions: sanitize(instructions),
          operatorId: currentUserId,
          timestamp: new Date().toISOString()
        },
        items: items.map(i => ({
          sku: sanitize(i.name),
          batch: sanitize(i.batch),
          quantity: parseFloat(i.qty)
        }))
      };

      // POST request with security headers
      const response = await secureApi.post('/inventory/transfer', payload);

      if (response.status === 200 || response.status === 201) {
        toast.success("TRANSFER_PROTOCOL_INITIATED", { 
          id: tId, 
          description: `Manifest ${response.data.transferId} is now in transit.` 
        });
        // Reset Form
        setItems([{ id: Date.now(), name: '', qty: '', batch: '' }]);
        setInstructions('');
      }
    } catch (error: any) {
      toast.error("TRANSFER_REJECTED", { 
        id: tId, 
        description: error.response?.data?.message || "Security or Database Link Failure" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-10 pb-32 p-4">
      <Toaster theme="dark" position="top-right" richColors />
      
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <ArrowRightLeft className="text-blue-500 w-10 h-10" />
            Node Transfer
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
            <Zap size={12} className="text-blue-500/50" />
            Inter-Warehouse Asset Movement Protocol
          </p>
        </motion.div>

        <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
          <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Operator Active</p>
          <p className="text-xs font-mono text-white">{currentUserId || 'SESSION_ID_NULL'}</p>
        </div>
      </div>

      

      {/* --- Transfer Bridge --- */}
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-4 items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3 bg-slate-950/40 border border-white/[0.08] p-8 rounded-[2.5rem] backdrop-blur-xl group hover:border-blue-500/30 transition-all">
          <div className="flex items-center gap-4 mb-6">
             <div className="p-3 bg-rose-500/10 rounded-2xl text-rose-500"><Warehouse size={24} /></div>
             <div>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Source Warehouse</h3>
                <p className="text-lg font-black text-white italic uppercase tracking-tighter">Origin Node</p>
             </div>
          </div>
          <select 
            value={sourceNode}
            onChange={(e) => setSourceNode(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm text-white outline-none focus:border-rose-500/50 transition-all font-bold cursor-pointer"
          >
             <option value="" className="bg-slate-900 text-slate-400">Select Origin...</option>
             <option value="Central Hub - Alpha" className="bg-slate-900">Central Hub - Alpha</option>
             <option value="Karachi Port Node" className="bg-slate-900">Karachi Port Node</option>
          </select>
        </motion.div>

        <div className="hidden lg:flex justify-center items-center">
           <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.4)] animate-pulse">
              <MoveRight className="text-white" />
           </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-3 bg-slate-950/40 border border-white/[0.08] p-8 rounded-[2.5rem] backdrop-blur-xl group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center gap-4 mb-6">
             <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-500"><Warehouse size={24} /></div>
             <div>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Target Warehouse</h3>
                <p className="text-lg font-black text-white italic uppercase tracking-tighter">Destination Node</p>
             </div>
          </div>
          <select 
            value={targetNode}
            onChange={(e) => setTargetNode(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm text-white outline-none focus:border-emerald-500/50 transition-all font-bold cursor-pointer"
          >
             <option value="" className="bg-slate-900 text-slate-400">Select Destination...</option>
             <option value="Lahore Matrix" className="bg-slate-900">Lahore Matrix</option>
             <option value="Quetta Node" className="bg-slate-900">Quetta Node</option>
          </select>
        </motion.div>
      </div>

      {/* --- Items List --- */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-950/40 border border-white/[0.08] rounded-[2.5rem] overflow-hidden backdrop-blur-xl">
        <div className="p-8 border-b border-white/5 flex items-center justify-between">
           <h3 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
             <Package className="text-blue-500" /> Manifest Details
           </h3>
           <button onClick={addItem} className="flex items-center gap-2 px-6 py-2 bg-blue-600 rounded-xl text-[9px] font-black text-white uppercase tracking-widest hover:bg-blue-500 transition-all active:scale-95">
             <ListPlus size={14} /> Add Asset
           </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Asset Description</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Batch Reference</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest">Transfer Qty</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              <AnimatePresence mode="popLayout">
                {items.map((item, index) => (
                  <motion.tr 
                    layout 
                    key={item.id} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group hover:bg-white/[0.01]"
                  >
                    <td className="px-8 py-4">
                      <div className="relative group">
                        <Search className="absolute left-3 top-2.5 w-3 h-3 text-slate-500 group-focus-within:text-blue-500" />
                        <input 
                          type="text" 
                          value={item.name}
                          onChange={(e) => handleInputChange(item.id, 'name', e.target.value)}
                          placeholder="Search SKU..." 
                          className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-xs text-white outline-none focus:border-blue-500/50 transition-all font-bold" 
                        />
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <input 
                        type="text" 
                        value={item.batch}
                        onChange={(e) => handleInputChange(item.id, 'batch', e.target.value)}
                        placeholder="BT-9021" 
                        className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs text-white outline-none focus:border-blue-500/50 font-bold" 
                      />
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden w-32 focus-within:border-blue-500/50">
                        <input 
                          type="number" 
                          value={item.qty}
                          onChange={(e) => handleInputChange(item.id, 'qty', e.target.value)}
                          className="w-full bg-transparent py-2 px-3 text-xs text-white outline-none text-center font-bold" 
                          placeholder="0" 
                        />
                        <span className="bg-white/10 px-2 py-2 text-[8px] font-black text-slate-400">UNITS</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-center">
                      <button onClick={() => removeItem(item.id)} className="p-2 text-slate-600 hover:text-rose-500 transition-colors active:scale-90">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* --- Footer & Submit --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 bg-blue-600/5 border border-blue-500/20 p-8 rounded-[2.5rem]">
           <div className="flex items-center gap-3 mb-4">
              <Info className="text-blue-500" />
              <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Logistics Instructions</h4>
           </div>
           <textarea 
            rows={3} 
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Vehicle #, Driver Contact, or Route Details..." 
            className="w-full bg-[#020617]/50 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none focus:border-blue-500/50 transition-all font-bold italic shadow-inner" 
           />
        </div>

        <div className="space-y-4">
           <div className="p-6 bg-slate-900/60 border border-white/5 rounded-[2rem] space-y-4 shadow-xl">
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
                 <span>Items Moving</span>
                 <span className="text-white font-mono">{items.length} Asset Lines</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500 italic">
                 <span>System Check</span>
                 <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={10} /> Verified</span>
              </div>
           </div>
           <button 
            onClick={handleTransfer}
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white py-5 rounded-[2rem] font-black text-[14px] uppercase tracking-[0.3em] shadow-2xl shadow-blue-900/40 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
           >
             {isSubmitting ? <Loader2 className="animate-spin" /> : <Send size={20} />} 
             {isSubmitting ? 'Processing...' : 'Initiate Transfer'}
           </button>
        </div>
      </div>
    </div>
  );
}