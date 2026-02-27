"use client";

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  User, ShieldCheck, Lock, Mail, Building2, MapPin, 
  Camera, Save, LogOut, Key, Fingerprint, Globe, 
  Smartphone, Loader2, ShieldAlert
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- API CONFIG ---
const API_BASE = process.env.NEXT_PUBLIC_API_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

export default function ProfileSettings() {
  const [activeTab, setActiveTab] = useState('account');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    language: 'English (International)',
    avatar: '',
    role: 'Administrator',
    location: '',
    hub: '',
    twoFactor: false,
    lastLogin: '',
    ip: ''
  });

  const [securityKeys, setSecurityKeys] = useState({
    currentKey: '',
    newKey: '',
    confirmKey: ''
  });

  // Auth Context
  const currentUserId = Cookies.get('userId');
  const authToken = Cookies.get('auth_token');

  // Secure Axios Instance
  const secureApi = axios.create({
    baseURL: API_BASE,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'x-api-key': API_KEY,
      'x-user-id': currentUserId
    }
  });

  // --- SECURITY: INPUT SANITIZATION ---
  const sanitize = (val: string) => val.replace(/[<>{}[\]\\^`|]/g, "").trim();

  // --- FETCH PROFILE DATA ---
  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await secureApi.get(`/admin/profile/${currentUserId}`);
      setProfile(res.data);
    } catch (err) {
      toast.error("IDENTITY_VERIFICATION_FAILED", { description: "Could not sync with node registry." });
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => { if (currentUserId) fetchProfile(); }, [fetchProfile]);

  // --- ACTIONS: UPDATE PROFILE ---
  const handleUpdateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const tId = toast.loading("SYNCHRONIZING_CORE_IDENTITY...");

    try {
      const payload = {
        fullName: sanitize(profile.fullName),
        phone: sanitize(profile.phone),
        language: profile.language,
        twoFactor: profile.twoFactor
      };

      await secureApi.patch(`/admin/profile/${currentUserId}`, payload);
      toast.success("NODE_REGISTRY_UPDATED", { id: tId });
    } catch (err) {
      toast.error("PATCH_REJECTED", { id: tId, description: "System validation failed." });
    } finally {
      setIsSaving(false);
    }
  };

  // --- ACTIONS: UPDATE SECURITY KEYS ---
  const handleKeyUpdate = async () => {
    if (securityKeys.newKey !== securityKeys.confirmKey) {
      return toast.error("KEY_MISMATCH", { description: "Confirmation key does not match." });
    }

    const tId = toast.loading("RE-ENCRYPTING_ACCESS_KEYS...");
    try {
      await secureApi.post('/auth/re-encrypt', {
        userId: currentUserId,
        oldKey: securityKeys.currentKey,
        newKey: securityKeys.newKey
      });
      setSecurityKeys({ currentKey: '', newKey: '', confirmKey: '' });
      toast.success("SECURITY_PROTOCOL_RE-ARMED", { id: tId });
    } catch (err) {
      toast.error("ENCRYPTION_FAILED", { id: tId });
    }
  };

  const handleLogout = () => {
    Cookies.remove('auth_token');
    Cookies.remove('userId');
    window.location.href = '/login';
  };

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      <p className="text-blue-500 font-black text-[10px] tracking-[0.5em] uppercase">Decrypting Identity Node...</p>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-20 p-4">
      <Toaster theme="dark" position="top-right" richColors />

      {/* --- Page Title --- */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
          <ShieldCheck className="text-blue-500 w-10 h-10" />
          Settings Center
        </h1>
        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
          Node Admin: <span className="text-blue-500">{currentUserId}</span> / Encryption Active
        </p>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* --- Left Panel: Identity Card --- */}
        <div className="xl:col-span-4 space-y-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-950/40 border border-white/[0.08] p-8 rounded-[3rem] backdrop-blur-xl relative overflow-hidden group">
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-32 h-32 rounded-full border-4 border-blue-600/20 p-1">
                  <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center text-4xl font-black italic text-white shadow-2xl overflow-hidden">
                    {profile.fullName.substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <button className="absolute bottom-1 right-1 p-2.5 bg-blue-600 rounded-full text-white border-4 border-slate-950 hover:scale-110 transition-all">
                  <Camera size={16} />
                </button>
              </div>

              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{profile.fullName}</h2>
              <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-1">{profile.role}</p>
              
              <div className="w-full h-px bg-white/5 my-6" />

              <div className="w-full space-y-4">
                <div className="flex items-center gap-4 text-slate-400">
                  <Mail size={16} className="text-blue-500/50" />
                  <span className="text-[11px] font-bold uppercase">{profile.email}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-400">
                  <Building2 size={16} className="text-blue-500/50" />
                  <span className="text-[11px] font-bold uppercase">{profile.hub}</span>
                </div>
                <div className="flex items-center gap-4 text-slate-400">
                  <MapPin size={16} className="text-blue-500/50" />
                  <span className="text-[11px] font-bold uppercase">{profile.location}</span>
                </div>
              </div>

              <button onClick={handleLogout} className="mt-8 w-full py-4 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center gap-2">
                <LogOut size={14} /> Terminate Session
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem]">
               <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Clearance</p>
               <h4 className="text-xl font-black text-white italic">LVL 4</h4>
            </div>
            <div className="bg-white/5 border border-white/5 p-6 rounded-[2rem]">
               <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Integrity</p>
               <h4 className="text-xl font-black text-white italic">Stable</h4>
            </div>
          </div>
        </div>

        {/* --- Right Panel: Settings Controls --- */}
        <div className="xl:col-span-8 space-y-6">
          <div className="bg-slate-950/40 border border-white/[0.08] rounded-[3rem] backdrop-blur-xl overflow-hidden shadow-2xl">
            {/* Tabs Navigation */}
            <div className="flex border-b border-white/5 px-4">
              {[
                { id: 'account', label: 'Core Identity', icon: User },
                { id: 'security', label: 'Encryption & Security', icon: Lock },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2",
                    activeTab === tab.id ? "border-blue-500 text-white bg-blue-500/5" : "border-transparent text-slate-500 hover:text-white"
                  )}
                >
                  <tab.icon size={14} /> {tab.label}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="p-10">
              <AnimatePresence mode="wait">
                {activeTab === 'account' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Full Identity Name</label>
                      <input type="text" value={profile.fullName} onChange={e => setProfile({...profile, fullName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-5 text-xs text-white outline-none focus:border-blue-500 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Secure Email (Read Only)</label>
                      <input type="email" readOnly value={profile.email} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-5 text-xs text-slate-500 font-bold outline-none cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Node Phone Contact</label>
                      <input type="text" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-5 text-xs text-white outline-none focus:border-blue-500 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Interface Language</label>
                      <select value={profile.language} onChange={e => setProfile({...profile, language: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-5 text-xs text-white outline-none focus:border-blue-500 font-bold appearance-none cursor-pointer">
                        <option value="English (International)" className="bg-slate-900">English (International)</option>
                        <option value="Urdu (Standard)" className="bg-slate-900">Urdu (Standard)</option>
                      </select>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'security' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                    <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <Fingerprint className="text-blue-500" size={24} />
                          <div>
                             <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Two-Factor Authentication</h4>
                             <p className="text-[9px] text-slate-500 uppercase font-bold italic">Currently: {profile.twoFactor ? 'Active' : 'Disabled'}</p>
                          </div>
                       </div>
                       <button 
                        onClick={() => setProfile({...profile, twoFactor: !profile.twoFactor})}
                        className={cn("w-12 h-6 rounded-full flex items-center px-1 transition-all", profile.twoFactor ? "bg-blue-600" : "bg-slate-800")}
                       >
                          <motion.div animate={{ x: profile.twoFactor ? 24 : 0 }} className="w-4 h-4 bg-white rounded-full shadow-lg" />
                       </button>
                    </div>

                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                          <Key size={14} /> Update Access Key (Password)
                       </h4>
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <input type="password" placeholder="Current Key" value={securityKeys.currentKey} onChange={e => setSecurityKeys({...securityKeys, currentKey: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-blue-500 font-bold" />
                          <input type="password" placeholder="New Key" value={securityKeys.newKey} onChange={e => setSecurityKeys({...securityKeys, newKey: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-blue-500 font-bold" />
                          <input type="password" placeholder="Confirm Key" value={securityKeys.confirmKey} onChange={e => setSecurityKeys({...securityKeys, confirmKey: e.target.value})} className="bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white outline-none focus:border-blue-500 font-bold" />
                       </div>
                       <button onClick={handleKeyUpdate} className="text-[9px] font-black text-blue-500 uppercase hover:underline">Re-calibrate Access Key</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-12 pt-8 border-t border-white/5 flex items-center justify-between">
                 <p className="text-[9px] text-slate-500 font-bold uppercase italic tracking-widest flex items-center gap-2">
                    <ShieldAlert size={14} className="text-blue-500 animate-pulse" /> 
                    All node updates are logged for security auditing.
                 </p>
                 <button 
                  disabled={isSaving}
                  onClick={handleUpdateNode}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-3.5 rounded-2xl font-black text-[11px] uppercase tracking-[0.3em] shadow-xl shadow-blue-600/20 transition-all active:scale-95 flex items-center gap-2"
                 >
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Update Node
                 </button>
              </div>
            </div>
          </div>

          {/* System Info Footnote */}
          <div className="flex flex-col md:flex-row gap-6">
             <div className="flex-1 bg-white/[0.01] border border-white/[0.05] p-6 rounded-[2rem] flex items-center gap-4">
                <Globe className="text-slate-700" size={24} />
                <div>
                   <p className="text-[8px] font-black text-slate-500 uppercase">System IP Address</p>
                   <p className="text-[10px] font-mono text-slate-300">{profile.ip}</p>
                </div>
             </div>
             <div className="flex-1 bg-white/[0.01] border border-white/[0.05] p-6 rounded-[2rem] flex items-center gap-4">
                <Smartphone className="text-slate-700" size={24} />
                <div>
                   <p className="text-[8px] font-black text-slate-500 uppercase">Node Last Access</p>
                   <p className="text-[10px] font-mono text-slate-300">{profile.lastLogin}</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}