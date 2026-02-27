"use client";

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  User, Building2, MapPin, Phone, Mail, 
  ShieldCheck, CreditCard, Edit3, Save, X,
  Key, LogOut, Zap, Fingerprint,
  ArrowUpRight, Loader2
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Profile Interface ---
interface UserProfile {
  name: string;
  businessName: string;
  email: string;
  phone: string;
  address: string;
  distributorId: string;
  creditLimit: string;
  usedCredit: string;
}

export default function AccountInfo() {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    businessName: "",
    email: "",
    phone: "",
    address: "",
    distributorId: "",
    creditLimit: "0",
    usedCredit: "0"
  });

  // --- Auth & API Config ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const currentUserId = Cookies.get('userId');
  const authToken = Cookies.get('auth_token');

  const secureInstance = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'x-api-key': API_KEY,
      'x-user-id': currentUserId,
      'Content-Type': 'application/json'
    }
  });

  // --- Fetch Profile Logic ---
  const fetchProfile = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      const res = await secureInstance.get(`/auth/profile/${currentUserId}`);
      setProfile(res.data);
    } catch (err: any) {
      toast.error("DATA SYNC ERROR", { 
        description: "Could not retrieve encrypted profile from Nexus Node." 
      });
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // --- Secure Save Logic ---
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // 1. Client-side Sanitization (SQL Injection Prevention)
      const sanitizedData = {
        ...profile,
        name: profile.name.replace(/[<>"{};]/g, ""), 
        businessName: profile.businessName.replace(/[<>"{};]/g, ""),
        address: profile.address.replace(/[<>"{};]/g, "")
      };

      // 2. API Call
      await secureInstance.put(`/auth/profile/update`, sanitizedData);
      
      toast.success("PROFILE UPDATED", { 
        description: "Your credentials have been re-encrypted and stored." 
      });
      setIsEditing(false);
    } catch (err) {
      toast.error("UPDATE FAILED", { 
        description: "Integrity check failed. Please verify your connection." 
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Decrypting Identity...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans bg-[#020617]">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-3xl rotate-3 flex items-center justify-center shadow-2xl shadow-blue-500/20">
              <User className="text-white w-10 h-10 -rotate-3" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-1.5 rounded-xl border-4 border-[#020617]">
              <ShieldCheck className="text-white w-3 h-3" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">{profile.name}</h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <Fingerprint size={12} className="text-blue-500" /> DIST ID: {profile.distributorId}
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          {isEditing && (
            <button 
              onClick={() => setIsEditing(false)}
              className="px-6 py-4 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black text-[10px] uppercase tracking-widest"
            >
              <X size={16} />
            </button>
          )}
          <button 
            disabled={saving}
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={cn(
              "px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3",
              isEditing ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "bg-white/5 border border-white/10 hover:bg-white/10"
            )}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : isEditing ? <><Save size={16} /> Commit Changes</> : <><Edit3 size={16} /> Edit Profile</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- LEFT: MAIN INFO --- */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 md:p-12"
          >
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-10 flex items-center gap-3">
              <Building2 size={14} /> Business Credentials
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  disabled={!isEditing}
                  value={profile.name}
                  onChange={(e) => setProfile({...profile, name: e.target.value})}
                  className="w-full bg-[#050b1d] border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all disabled:opacity-30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Business Name</label>
                <input 
                   disabled={!isEditing}
                   value={profile.businessName}
                   onChange={(e) => setProfile({...profile, businessName: e.target.value})}
                   className="w-full bg-[#050b1d] border border-white/5 rounded-2xl px-5 py-4 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all disabled:opacity-30"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Contact Email</label>
                <div className="relative">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                  <input 
                    disabled={!isEditing}
                    value={profile.email}
                    onChange={(e) => setProfile({...profile, email: e.target.value})}
                    className="w-full bg-[#050b1d] border border-white/5 rounded-2xl pl-14 pr-5 py-4 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all disabled:opacity-30"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Phone Nexus</label>
                <div className="relative">
                  <Phone className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700" />
                  <input 
                    disabled={!isEditing}
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    className="w-full bg-[#050b1d] border border-white/5 rounded-2xl pl-14 pr-5 py-4 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all disabled:opacity-30"
                  />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Warehouse Address</label>
                <div className="relative">
                  <MapPin className="absolute left-5 top-4 w-4 h-4 text-slate-700" />
                  <textarea 
                    disabled={!isEditing}
                    value={profile.address}
                    onChange={(e) => setProfile({...profile, address: e.target.value})}
                    rows={3}
                    className="w-full bg-[#050b1d] border border-white/5 rounded-2xl pl-14 pr-5 py-4 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all disabled:opacity-30 resize-none"
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] p-8 relative overflow-hidden group shadow-2xl shadow-blue-500/10"
          >
            <Zap className="absolute right-[-20px] top-[-20px] w-40 h-40 text-white/10 -rotate-12" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-md">
                  <CreditCard className="text-white w-4 h-4" />
                </div>
                <h4 className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Credit Liquidity</h4>
              </div>
              <p className="text-[9px] font-black text-blue-100/60 uppercase mb-1">Total Limit</p>
              <h2 className="text-3xl font-black text-white italic tracking-tighter mb-6">PKR {parseFloat(profile.creditLimit).toLocaleString()}</h2>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-black uppercase">
                  <span className="text-blue-100/60">Utilization</span>
                  <span className="text-white">
                    {Math.round((parseFloat(profile.usedCredit) / parseFloat(profile.creditLimit)) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(parseFloat(profile.usedCredit) / parseFloat(profile.creditLimit)) * 100}%` }}
                    className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8 space-y-4 backdrop-blur-md"
          >
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
               <ShieldCheck size={12} className="text-blue-500" /> Security Node
            </h4>
            
            <button className="w-full flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-blue-500/10 hover:border-blue-500/30 transition-all group">
              <div className="flex items-center gap-4">
                <Key className="text-slate-500 group-hover:text-blue-500" size={18} />
                <span className="text-[10px] font-black text-white uppercase tracking-widest">Rotate Password</span>
              </div>
              <ArrowUpRight size={14} className="text-slate-700" />
            </button>

            <button 
              onClick={() => {
                Cookies.remove('userId');
                Cookies.remove('auth_token');
                window.location.href = '/login';
              }}
              className="w-full flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl hover:bg-rose-500/10 transition-all group"
            >
              <div className="flex items-center gap-4">
                <LogOut className="text-rose-500" size={18} />
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Terminate Session</span>
              </div>
            </button>
          </motion.div>

        </div>
      </div>
    </div>
  );
}