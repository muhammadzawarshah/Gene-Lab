"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  User, Building2, MapPin, Phone, Mail, 
  ShieldCheck, CreditCard, Edit3, Save, 
  Key, LogOut, Zap, Fingerprint,
  ArrowUpRight, Loader2, Lock,
  X
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
interface UserProfile {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  address: string;
  distributorId: string;
  creditLimit: string;
  usedCredit: string;
  utilization: number;
}

export default function AccountInfo() {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    businessName: "",
    email: "",
    phone: "",
    address: "",
    distributorId: "",
    creditLimit: "0",
    usedCredit: "0",
    utilization: 0
  });

  // --- Security & Config ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const currentUserId = Cookies.get('userId');
  const token = Cookies.get('auth_token');

  const secureApi = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'x-user-id': currentUserId
    }
  });

  // --- Initial Data Fetch ---
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        if (!currentUserId) throw new Error("UNAUTHORIZED");
        const response = await secureApi.get(`/user/profile/${currentUserId}`);
        setProfile(response.data);
      } catch (err) {
        toast.error("AUTH ERROR", { description: "Failed to authenticate secure session." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // --- Secure Logic: Handle Save ---
  const handleSave = async () => {
    // 1. Data Sanitization (Anti-Injection)
    const sanitize = (str: string) => str.replace(/[<>{}[]$]/g, "").trim();

    const sanitizedData = {
      ...profile,
      name: sanitize(profile.name),
      businessName: sanitize(profile.businessName),
      address: sanitize(profile.address),
      phone: profile.phone.replace(/[^\d+-\s]/g, "") // Allow only phone chars
    };

    setIsSaving(true);
    const loadingToast = toast.loading("SYNCING WITH NEXUS...");

    try {
      await secureApi.put(`/user/profile/update`, {
        uid: currentUserId,
        data: sanitizedData
      });

      toast.success("PROFILE ENCRYPTED", { description: "Your business credentials have been updated." });
      setIsEditing(false);
    } catch (err) {
      toast.error("SYNC FAILED", { description: "Secure server rejected the update." });
    } finally {
      setIsSaving(false);
      toast.dismiss(loadingToast);
    }
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans relative">
      <Toaster position="top-right" theme="dark" richColors />

      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-3xl rotate-3 flex items-center justify-center shadow-2xl shadow-blue-500/20 transition-transform hover:rotate-0 duration-500">
              <User className="text-white w-10 h-10 -rotate-3 group-hover:rotate-0" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-1.5 rounded-xl border-4 border-[#020617]">
              <ShieldCheck className="text-white w-3 h-3" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">{profile.name}</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Fingerprint size={12} className="text-blue-500" /> NODE ID: {profile.distributorId}
            </p>
          </div>
        </motion.div>

        <button 
          disabled={isSaving}
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          className={cn(
            "px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3",
            isEditing 
              ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
              : "bg-white/5 border border-white/10 hover:bg-white/10"
          )}
        >
          {isSaving ? <Loader2 className="animate-spin" size={16} /> : (
            isEditing ? <><Save size={16} /> Secure Save</> : <><Edit3 size={16} /> Edit Credentials</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT: MAIN INFO --- */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Lock size={120} />
            </div>

            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-10 flex items-center gap-3">
              <Building2 size={14} /> Identity Authentication
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Legal Principal</label>
                <input 
                  disabled={!isEditing}
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className="w-full bg-[#050b1d] border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all disabled:opacity-30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Entity Name</label>
                <input 
                   disabled={!isEditing}
                   value={profile.businessName}
                   onChange={(e) => setProfile({...profile, businessName: e.target.value})}
                   className="w-full bg-[#050b1d] border border-white/5 rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all disabled:opacity-30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Encrypted Email</label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                  <input 
                    disabled={!isEditing}
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    className="w-full bg-[#050b1d] border border-white/5 rounded-2xl pl-16 pr-6 py-4 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all disabled:opacity-30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Nexus Line</label>
                <div className="relative">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                  <input 
                    disabled={!isEditing}
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    className="w-full bg-[#050b1d] border border-white/5 rounded-2xl pl-16 pr-6 py-4 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all disabled:opacity-30"
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Warehouse Geo-Location</label>
                <div className="relative">
                  <MapPin className="absolute left-6 top-5 w-4 h-4 text-slate-700" />
                  <textarea 
                    disabled={!isEditing}
                    value={profile.address}
                    onChange={(e) => setProfile({...profile, address: e.target.value})}
                    rows={3}
                    className="w-full bg-[#050b1d] border border-white/5 rounded-2xl pl-16 pr-6 py-5 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all disabled:opacity-30 resize-none"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* --- RIGHT: FINANCIALS & SECURITY --- */}
        <div className="space-y-8">
          
          {/* Credit Limit Card */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-blue-600 to-blue-900 rounded-[2.5rem] p-10 relative overflow-hidden group shadow-2xl"
          >
            <Zap className="absolute right-[-30px] top-[-30px] w-48 h-48 text-white/10 -rotate-12 group-hover:rotate-0 transition-transform duration-1000" />
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                  <CreditCard className="text-white w-5 h-5" />
                </div>
                <h4 className="text-[11px] font-black text-blue-100 uppercase tracking-widest">Financial Liquidity</h4>
              </div>
              <p className="text-[10px] font-black text-blue-100/60 uppercase mb-2">Maximum Credit Cap</p>
              <h2 className="text-4xl font-black text-white italic tracking-tighter mb-8">PKR {profile.creditLimit}</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase">
                  <span className="text-blue-100/60">Limit Utilization</span>
                  <span className="text-white">{profile.utilization}%</span>
                </div>
                <div className="h-3 bg-black/20 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${profile.utilization}%` }}
                    className="h-full bg-gradient-to-r from-blue-200 to-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
            className="bg-[#050b1d] border border-white/5 rounded-[2.5rem] p-10 space-y-5"
          >
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Security Protocol</h4>
            
            <button className="w-full flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-blue-500/10 hover:border-blue-500/30 transition-all group">
              <div className="flex items-center gap-5">
                <Key className="text-slate-500 group-hover:text-blue-500 transition-colors" size={20} />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Rotate Cipher</span>
              </div>
              <ArrowUpRight size={16} className="text-slate-700 group-hover:text-blue-500" />
            </button>

            <button 
              onClick={() => {
                Cookies.remove('auth_token');
                Cookies.remove('userId');
                window.location.href = '/login';
              }}
              className="w-full flex items-center justify-between p-5 bg-rose-500/5 border border-rose-500/10 rounded-2xl hover:bg-rose-500/10 hover:border-rose-500/30 transition-all group"
            >
              <div className="flex items-center gap-5">
                <LogOut className="text-rose-500" size={20} />
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Terminate Access</span>
              </div>
              <X size={16} className="text-rose-900 group-hover:text-rose-500" />
            </button>
          </motion.div>

        </div>
      </div>
    </div>
  );
}