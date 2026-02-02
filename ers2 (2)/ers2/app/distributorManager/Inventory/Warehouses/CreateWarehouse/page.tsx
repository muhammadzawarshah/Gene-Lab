"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Warehouse, Loader2, MapPin, ChevronRight, Zap, Globe, Shield
} from 'lucide-react';

export default function CreateWarehouse() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locations, setLocations] = useState<any[]>([]); 
  const [formData, setFormData] = useState({
    name: '',
    provinceId: '',
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const token = Cookies.get('virtue_token') || Cookies.get('auth_token');

  const secureApi = useMemo(() => axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
    }
  }), [token, API_URL, API_KEY]);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await secureApi.get('/api/v1/province/all');
        setLocations(res.data?.data || []);
      } catch (err) {
        toast.error("Failed to load provinces.");
      }
    };
    fetchLocations();
  }, [secureApi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.provinceId) {
      return toast.error("Please fill all fields.");
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Initializing node...");

    try {
      const payload = {
        name: formData.name.trim(),
        locationId: Number(formData.provinceId),
      };

      await secureApi.post('/api/v1/warehouse/create', payload);
      toast.success("Warehouse created successfully", { id: toastId });
      setFormData({ name: '', provinceId: '' });
    } catch (err: any) {
      // Backend error handle karne ke liye
      const errorMsg = err.response?.data?.message || "Null constraint violation: Missing Field";
      toast.error(errorMsg, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className=" text-slate-200 flex flex-col items-center justify-center p-6 relative">
      {/* 1. Toaster Moved to top-right with higher z-index */}
      <Toaster 
        position="top-right" 
        theme="dark" 
        richColors 
        closeButton
        toastOptions={{
          style: { zIndex: 9999, marginTop: '20px' }
        }}
      />
      
      {/* Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[480px] space-y-8"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <motion.div 
            initial={{ scale: 0.8 }} 
            animate={{ scale: 1 }}
            className="inline-flex p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-2"
          >
            <Warehouse className="text-blue-500 w-8 h-8" />
          </motion.div>
          <h1 className="text-3xl font-black uppercase tracking-tighter text-white">
            New <span className="text-blue-600">Warehouse</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">
            Logistics Protocol 2026
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] p-8 rounded-[2.5rem] backdrop-blur-3xl shadow-2xl relative overflow-hidden">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Input Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Warehouse Designation
              </label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input 
                  required
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. HUB ALPHA"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:border-blue-500/50 focus:bg-blue-500/5 outline-none transition-all font-bold"
                />
              </div>
            </div>

            {/* Select Province */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                Territory
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <select 
                  required
                  value={formData.provinceId}
                  onChange={e => setFormData({...formData, provinceId: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-sm text-white focus:border-blue-500/50 outline-none transition-all font-bold appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#020617]">Select Province</option>
                  {locations.map((loc: any) => (
                    <option key={loc.province_id} value={loc.province_id} className="bg-[#020617]">
                      {loc.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                  <ChevronRight size={16} className="rotate-90" />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full relative group bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-4"
            >
              <AnimatePresence mode="wait">
                {isSubmitting ? (
                  <motion.div key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={18} /> Processing
                  </motion.div>
                ) : (
                  <motion.div key="t" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                    Initialize Node <Zap size={16} fill="currentColor" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </form>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-center gap-6 opacity-30 group">
          <div className="flex items-center gap-2 text-white">
            <Globe size={14} />
            <span className="text-[9px] font-bold uppercase tracking-tighter">Global-Net</span>
          </div>
          <div className="w-1 h-1 bg-slate-500 rounded-full" />
          <div className="text-[9px] font-bold uppercase tracking-tighter text-white">Secure SSL</div>
        </div>
      </motion.div>
    </div>
  );
}