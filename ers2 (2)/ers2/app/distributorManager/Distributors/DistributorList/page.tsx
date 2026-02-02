"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Users, Search, UserPlus, MapPin, 
  ShieldCheck, Trash2, Star, KeyRound,
  Building2, Save, Loader2, Edit3, ExternalLink
} from 'lucide-react';
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

export default function DistributorListPage() {
  const [distributors, setDistributors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any>(null);

  const currentUserId = Cookies.get('userId');
  const authToken = Cookies.get('auth_token');

  const secureApi = useMemo(() => axios.create({
    baseURL: API_BASE,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'x-api-key': API_KEY,
      'x-user-id': currentUserId
    }
  }), [authToken, currentUserId]);

  const sanitize = (val: string) => val?.replace(/[<>{}[\]\\^`|]/g, "").trim() || "";

  const fetchDistributors = async () => {
    setIsLoading(true);
    try {
      const res = await secureApi.get('/api/v1/users/');
      const rawData = Array.isArray(res.data) ? res.data : (res.data.data || []);
      
      const filtered = rawData
        .filter((u: any) => u.role === 'WAREHOUSE_CUSTOMER')
        .map((u: any) => ({
          id: u.user_id,
          name: u.username,
          contact: u.email,
          region: u.region || "General Zone",
          rating: 4.8,
          creditLimit: "2.5M",
          creditUsed: "0.8M",
          status: u.is_active ? 'Active' : 'Inactive'
        }));

      setDistributors(filtered);
    } catch (err) {
      toast.error("NETWORK_FAILURE", { description: "Could not sync with distributor nodes." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDistributors(); }, []);

  // --- ADD ACTION ---
  const handleAddDistributor = async (payload: any) => {
    const tId = toast.loading("ONBOARDING_NEW_ENTITY...");
    try {
      await secureApi.post('/api/v1/users/register', { 
        ...payload, 
        role: 'WAREHOUSE_CUSTOMER'
      });
      toast.success("NEW_NODE_ONLINE", { id: tId });
      closeAndRefresh();
    } catch (err) {
      toast.error("ONBOARDING_FAILED", { description: "Email already exists or invalid data." });
      toast.dismiss(tId);
    }
  };

  // --- UPDATE ACTION ---
  const handleUpdateDistributor = async (id: any, payload: any) => {
    const tId = toast.loading("UPDATING_ENTITY_METADATA...");
    try {
      // Edit mein password optional hota hai, agar khali hai to payload se hata do
      const updateData = { ...payload };
      if (!updateData.password) delete updateData.password;

      await secureApi.post(`/api/v1/users/${id}`, updateData);
      toast.success("NODE_CONFIG_UPDATED", { id: tId });
      closeAndRefresh();
    } catch (err) {
      toast.error("UPDATE_REJECTED", { id: tId });
    }
  };

  const closeAndRefresh = async () => {
    await fetchDistributors();
    setIsModalOpen(false);
    setEditingEntity(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      username: sanitize(editingEntity.name),
      email: sanitize(editingEntity.contact),
      password: editingEntity.password, // Added Password
      is_active: editingEntity.status === 'Active',
      region: sanitize(editingEntity.region)
    };

    if (editingEntity.isNew) {
      handleAddDistributor(payload);
    } else {
      handleUpdateDistributor(editingEntity.id, payload);
    }
  };

  const filteredDistributors = useMemo(() => {
    return distributors.filter(d => 
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      d.contact?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [distributors, searchTerm]);

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#020617] gap-4">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      <p className="text-blue-500 font-black text-[10px] tracking-[0.5em] uppercase">Accessing Partner Grid...</p>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 p-6 min-h-screen">
      <Toaster theme="dark" position="top-right" richColors />

      {/* Header Area */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <Building2 className="text-blue-500 w-10 h-10" />
            Partner Network
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            Node: {currentUserId} <span className="text-blue-500/50">//</span> Entity Count: {distributors.length}
          </p>
        </motion.div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter Registry..." 
              className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-xs text-white outline-none focus:border-blue-500/50 w-full sm:w-80 transition-all font-bold uppercase tracking-wider"
            />
          </div>
          <button 
            onClick={() => { 
              setEditingEntity({ isNew: true, name: '', contact: '', password: '', region: '', status: 'Active' }); 
              setIsModalOpen(true); 
            }}
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
          >
            <UserPlus size={14} /> Add Distributor
          </button>
        </div>
      </div>

      {/* Grid Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredDistributors.map((dist) => (
            <motion.div
              layout
              key={dist.id}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              className="group relative bg-slate-900/40 border border-white/[0.08] p-6 rounded-[2.5rem] hover:bg-white/[0.04] transition-all hover:border-blue-500/30 overflow-hidden backdrop-blur-xl"
            >
              {/* Card content remains same as your original style */}
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20">
                  <Users className="text-blue-400" size={20} />
                </div>
                <span className={cn("text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest border", dist.status === 'Active' ? "border-emerald-500/20 text-emerald-500 bg-emerald-500/5" : "border-rose-500/20 text-rose-500 bg-rose-500/5")}>
                  {dist.status}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-white italic tracking-tighter uppercase group-hover:text-blue-400 transition-colors truncate">{dist.name}</h3>
                  <div className="flex items-center gap-2 mt-1 text-slate-500">
                    <MapPin size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">{dist.region}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-3 border-y border-white/[0.05]">
                  <div>
                    <p className="text-[8px] font-black text-slate-600 uppercase">System UID</p>
                    <p className="text-xs font-black text-blue-500 italic">#{dist.id}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-600 uppercase">Rating</p>
                    <div className="flex items-center gap-1"><Star size={10} className="text-amber-500 fill-amber-500" /><span className="text-xs font-black text-white">{dist.rating}</span></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black uppercase text-slate-500">
                    <span>Credit Usage</span>
                    <span className="text-white">{dist.creditUsed} / {dist.creditLimit}</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 w-[35%] shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button onClick={() => { setEditingEntity({ ...dist, isNew: false, password: '' }); setIsModalOpen(true); }} className="flex-1 bg-white/5 hover:bg-white/10 text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5 transition-all">Edit Node</button>
                  <button className="p-2.5 bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-xl transition-all border border-blue-600/20"><ExternalLink size={14}/></button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* --- MODAL --- */}
      <AnimatePresence>
        {isModalOpen && editingEntity && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-2xl" />
            <motion.form 
              onSubmit={handleSubmit}
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[3rem] p-10 shadow-3xl"
            >
              <h2 className="text-2xl font-black text-white italic uppercase mb-8 flex items-center gap-3">
                <ShieldCheck className="text-blue-500" /> {editingEntity.isNew ? "Create Node" : "Entity Config"}
              </h2>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Distributor Name (Username)</label>
                  <input required value={editingEntity.name} onChange={e => setEditingEntity({...editingEntity, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-xs text-white font-bold focus:border-blue-500 outline-none transition-all" />
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Address (Login ID)</label>
                  <input required type="email" value={editingEntity.contact} onChange={e => setEditingEntity({...editingEntity, contact: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-xs text-white font-bold focus:border-blue-500 outline-none transition-all" />
                </div>

                {/* --- PASSWORD FIELD --- */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    {editingEntity.isNew ? "System Password" : "Reset Password (Leave blank to keep same)"}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                      required={editingEntity.isNew} 
                      type="password"
                      value={editingEntity.password} 
                      onChange={e => setEditingEntity({...editingEntity, password: e.target.value})} 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-5 text-xs text-white font-bold focus:border-blue-500 outline-none transition-all" 
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Operating Status</label>
                    <select value={editingEntity.status} onChange={e => setEditingEntity({...editingEntity, status: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-xs text-white font-bold outline-none appearance-none">
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Region</label>
                    <input value={editingEntity.region} onChange={e => setEditingEntity({...editingEntity, region: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 px-5 text-xs text-white font-bold outline-none" placeholder="e.g. Sindh" />
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-10">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-white/5 rounded-2xl font-black text-[10px] text-slate-500 uppercase tracking-widest hover:text-white transition-all">Discard</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2">
                  <Save size={14} /> {editingEntity.isNew ? "Create Distributor" : "Commit Changes"}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}