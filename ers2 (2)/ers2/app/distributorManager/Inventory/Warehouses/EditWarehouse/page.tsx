"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Warehouse, Save, X, MapPin, 
  Gauge, Activity, Edit3, Trash2, 
  Search, Settings2, Loader2, ShieldAlert, ChevronDown
} from 'lucide-react';

// --- Types ---
interface Province {
  id: number;
  name: string;
}

interface WarehouseNode {
  id: string;
  name: string;
  address: string; 
  location_id: number;
  capacity: number;
  status: 'Optimal' | 'Critical' | 'Maintenance';
}

export default function WarehouseManager() {
  const [warehouses, setWarehouses] = useState<WarehouseNode[]>([]);
  const [provinces, setProvinces] = useState<Province[]>([]); 
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseNode | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const token = Cookies.get('virtue_token') || Cookies.get('auth_token');

  const secureApi = useMemo(() => axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
    }
  }), [token, API_KEY]);

  // 1. Fetch All Data (Locations + Warehouses)
  const initializeDashboard = async () => {
    try {
      setIsLoading(true);
      
      // Parallel requests taake time bache
      const [whRes, provinceRes] = await Promise.all([
        secureApi.get('/api/v1/warehouse/list'),
        // NOTE: Agar aapki provinces ki alag API hai to yahan path change karein
        // Agar nahi hai, to hum warehouse list se hi nikalenge lekin behtar logic se
        secureApi.get('/api/v1/province/all').catch(() => null) 
      ]);

      // --- Handle Provinces ---
      if (provinceRes && provinceRes.data.success) {
        // Agar backend ki alag API mil gayi
        setProvinces(provinceRes.data.data.map((p: any) => ({
          id: p.province_id || p.id,
          name: p.name
        })));
      } else {
        // Fallback: Agar alag API nahi hai, to warehouse data se extract karein
        const provinceMap = new Map();
        whRes.data.data.forEach((item: any) => {
          if (item.province) {
            provinceMap.set(item.province.province_id, item.province.name);
          }
        });
        setProvinces(Array.from(provinceMap).map(([id, name]) => ({ id, name })));
      }

      // --- Handle Warehouses ---
      const mapped = whRes.data.data.map((wh: any) => ({
        id: wh.warehouse_id,
        name: wh.name,
        address: wh.province?.name || "Unknown Region", 
        location_id: wh.location,
        capacity: wh.capacity || 75,
        status: 'Optimal'
      }));
      setWarehouses(mapped);

    } catch (err) {
      toast.error("INITIALIZATION_FAILED", { description: "Could not sync matrix." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { initializeDashboard(); }, []);

  // 2. Update Node
  const handleUpdateSave = async () => {
    if (!selectedWarehouse) return;
    setIsSaving(true);
    const toastId = toast.loading("SYNCING_METADATA...");

    try {
      const payload = {
        name: selectedWarehouse.name.trim(),
        location: selectedWarehouse.location_id, 
        capacity: selectedWarehouse.capacity
      };

      await secureApi.put(`/api/v1/warehouse/update/${selectedWarehouse.id}`, payload);
      
      const newProvince = provinces.find(p => p.id === selectedWarehouse.location_id);
      const updatedNode = {
        ...selectedWarehouse,
        address: newProvince ? newProvince.name : selectedWarehouse.address
      };

      setWarehouses(prev => prev.map(w => w.id === selectedWarehouse.id ? updatedNode : w));
      toast.success("NODE_RECONFIGURED", { id: toastId });
      setIsEditModalOpen(false);
    } catch (err) {
      toast.error("UPDATE_REJECTED", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  const filteredWarehouses = useMemo(() => {
    return warehouses.filter(wh => wh.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, warehouses]);

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#020617] gap-4">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      <p className="text-blue-500 font-black uppercase tracking-[0.4em] text-xs italic">Syncing World Nodes...</p>
    </div>
  );

  return (
    <div className="min-h-screen text-slate-200 p-4 md:p-8 font-sans bg-[#020617]">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3 italic">
            <Warehouse className="text-blue-500 w-10 h-10 p-2 bg-blue-500/10 rounded-2xl" />
            INVENTORY NODES
          </h1>
        </motion.div>
        
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Nodes..." 
            className="bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500/50 w-full md:w-64 transition-all" 
          />
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredWarehouses.map((wh) => (
            <motion.div 
              layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} key={wh.id}
              className="group bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-7 hover:border-blue-500/30 transition-all backdrop-blur-md relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <Warehouse size={24} />
                </div>
                <button onClick={() => { setSelectedWarehouse(wh); setIsEditModalOpen(true); }} className="p-2.5 bg-white/5 hover:bg-blue-600 hover:text-white rounded-xl transition-all">
                  <Edit3 size={16} />
                </button>
              </div>

              <h3 className="text-xl font-black text-white tracking-tight uppercase italic truncate">{wh.name}</h3>
              <p className="text-slate-500 text-[10px] font-bold uppercase flex items-center gap-1 mt-1">
                <MapPin size={12} className="text-blue-500" /> {wh.address}
              </p>

              <div className="mt-8 space-y-3">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <span>Capacity</span>
                  <span className="text-blue-400">{wh.capacity}%</span>
                </div>
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${wh.capacity}%` }} className="h-full bg-blue-500 rounded-full" />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* --- EDIT MODAL --- */}
      <AnimatePresence>
        {isEditModalOpen && selectedWarehouse && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditModalOpen(false)} className="absolute inset-0 bg-[#020617]/95 backdrop-blur-md" />
            
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-blue-600/5">
                <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                  <Settings2 className="text-blue-500" /> Reconfigure Node
                </h2>
                <button onClick={() => setIsEditModalOpen(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-all"><X size={20} /></button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Name Input */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Node Name</label>
                    <input 
                      type="text" 
                      value={selectedWarehouse.name}
                      onChange={(e) => setSelectedWarehouse({...selectedWarehouse, name: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-sm text-white focus:border-blue-500 outline-none transition-all font-bold"
                    />
                  </div>

                  {/* Province Dropdown */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Deployment Region</label>
                    <div className="relative">
                      <select 
                        value={selectedWarehouse.location_id}
                        onChange={(e) => setSelectedWarehouse({...selectedWarehouse, location_id: parseInt(e.target.value)})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-sm text-white focus:border-blue-500 outline-none transition-all font-bold appearance-none cursor-pointer"
                      >
                        {provinces.length > 0 ? provinces.map((prov) => (
                          <option key={prov.id} value={prov.id} className="bg-[#0f172a] text-white">
                            {prov.name}
                          </option>
                        )) : (
                          <option disabled className="bg-[#0f172a] text-white">No regions found</option>
                        )}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Capacity Slider */}
                <div className="p-6 bg-blue-600/5 rounded-[2rem] border border-blue-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Gauge size={20} className="text-blue-400" />
                    <div>
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">Payload Capacity</p>
                      <p className="text-[9px] text-slate-500 font-bold uppercase">{selectedWarehouse.capacity}% Utilization</p>
                    </div>
                  </div>
                  <input 
                    type="range" min="0" max="100" 
                    value={selectedWarehouse.capacity}
                    onChange={(e) => setSelectedWarehouse({...selectedWarehouse, capacity: parseInt(e.target.value)})}
                    className="w-32 h-1.5 bg-white/10 rounded-full appearance-none accent-blue-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-8 bg-black/40 flex items-center justify-between border-t border-white/5">
                <div className="flex items-center gap-2 text-rose-500/50 text-[8px] font-black uppercase tracking-widest">
                   <ShieldAlert size={14} /> Authorized Access Only
                </div>
                <button 
                  onClick={handleUpdateSave}
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl transition-all flex items-center gap-3 disabled:opacity-50"
                >
                  {isSaving ? <Activity className="animate-spin" size={16} /> : <Save size={16} />}
                  {isSaving ? 'Synchronizing...' : 'Commit Changes'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}