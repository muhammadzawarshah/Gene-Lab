"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Warehouse, Plus, Search, MapPin, 
  ExternalLink, Trash2, Loader2
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- API CONFIG ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

export default function WarehouseListPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // --- AUTH & SECURITY HEADERS ---
  const currentUserId = Cookies.get('userId');
  const authToken = Cookies.get('virtue_token') || Cookies.get('auth_token');

  const secureApi = useMemo(() => axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'x-api-key': API_KEY,
      'x-node-user-id': currentUserId
    }
  }), [authToken, currentUserId]);

  // --- FETCH NODES ---
  const fetchNodes = async () => {
    try {
      setIsLoading(true);
      const res = await secureApi.get('/api/v1/warehouse/list');
      setWarehouses(res.data.data);
    } catch (err: any) {
      toast.error("DATA_FETCH_FAILED", { description: "Matrix connection unstable." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchNodes(); }, []);

  // --- DELETE FUNCTION (FIXED FOR SPECIFIC ID) ---
  const handleDelete = async (warehouseId: number) => {
    if (!confirm("Confirm node decommissioning? This action is irreversible.")) return;
    
    const tId = toast.loading("PURGING_NODE...");
    try {
      // API call with the specific warehouse_id
      await secureApi.delete(`/api/v1/warehouse/delete/${warehouseId}`);
      
      // Frontend state update: Filter out only the node that was deleted
      setWarehouses(prev => prev.filter(w => w.warehouse_id !== warehouseId));
      
      toast.success("NODE_PURGED_SUCCESSFULLY", { id: tId });
    } catch (err) {
      toast.error("PURGE_REJECTED", { id: tId });
    }
  };

  // --- CREATE FUNCTION ---
  const handleCreate = async () => {
    const tId = toast.loading("INITIALIZING_NEW_NODE...");
    try {
      const res = await secureApi.post('/api/v1/warehouse/create', {
        name: "NEW_NODE_" + Math.floor(Math.random() * 1000),
        location: 1, // Default location ID
        capacity: 0,
        status: "Optimal"
      });
      
      // Refresh list to show new node
      fetchNodes();
      toast.success("NODE_ONLINE", { id: tId });
    } catch (err) {
      toast.error("INIT_FAILED", { id: tId });
    }
  };

  // Search Filter (Search by name or province name)
  const filteredNodes = useMemo(() => {
    return warehouses.filter(w => 
      w.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      w.province?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, warehouses]);

  if (isLoading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em]">Loading Network...</span>
    </div>
  );

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10 px-4">
      <Toaster theme="dark" position="top-right" richColors />
      
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <Warehouse className="text-blue-500 w-8 h-8" />
            Node Network
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">
            Active Infrastructure <span className="text-blue-500/50">//</span> Auth: {currentUserId}
          </p>
        </motion.div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter Nodes..." 
              className="w-full sm:w-64 bg-white/5 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-blue-500/50 outline-none transition-all font-bold uppercase"
            />
          </div>
          <button onClick={handleCreate} className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]">
            <Plus size={14} /> Initialize New Node
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredNodes.map((wh) => (
            <motion.div 
              layout
              key={wh.warehouse_id} // FIXED: Using warehouse_id as unique key
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="group relative bg-slate-950/40 border border-white/[0.08] rounded-[2.5rem] p-6 hover:border-blue-500/30 transition-all backdrop-blur-xl overflow-hidden"
            >
              <div className="flex justify-between items-start mb-6">
                <div className={cn(
                  "p-3 rounded-2xl border",
                  "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                )}>
                  <Warehouse size={20} />
                </div>
                {/* FIXED: Passing specific warehouse_id to delete */}
                <button 
                  onClick={() => handleDelete(wh.warehouse_id)} 
                  className="p-2 hover:bg-rose-500/10 rounded-xl text-slate-600 hover:text-rose-500 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="space-y-1 mb-6">
                <h3 className="text-lg font-black text-white uppercase italic tracking-tighter truncate">{wh.name}</h3>
                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold uppercase">
                  <MapPin size={10} className="text-blue-500" /> {wh.province?.name || "Global Sector"}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest">
                  <span className="text-slate-500">Occupancy</span>
                  <span className="text-blue-400">{wh.capacity || 0}%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${wh.capacity || 0}%` }}
                    className="h-full bg-blue-500"
                  />
                </div>
              </div>

              <div className="mt-6">
                <button className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 rounded-xl text-[9px] font-black uppercase transition-all">
                  View Node Details <ExternalLink size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}