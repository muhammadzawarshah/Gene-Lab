"use client";

import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { AnimatePresence, motion } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  ShieldCheck, Mail, Building2, Save, 
  Fingerprint, Loader2, ShieldAlert, Globe, Smartphone,
  User, Languages, Phone
} from 'lucide-react';
import { cn } from "@/lib/utils";

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
    role: 'Administrator',
    hub: 'Primary Node',
    twoFactor: false,
  });

  // --- GET DATA FROM COOKIE SAFELY ---
  const getAuthData = () => {
    try {
      const userCookie = Cookies.get('user'); // Aapki cookie ka naam 'user' hai
      const token = Cookies.get('auth_token'); // Make sure login pe ye set ho raha ho
      
      if (!userCookie) return { uid: null, token: token };
      
      const userData = JSON.parse(decodeURIComponent(userCookie));
      return { uid: userData.id, token: token, email: userData.useremail, role: userData.role };
    } catch (e) {
      return { uid: null, token: null };
    }
  };

  const loadProfile = useCallback(async () => {
    const { uid, token, email, role } = getAuthData();

    if (!uid) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE}/api/v1/users/iduser/${uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-key': API_KEY,
          'x-user-id': uid
        }
      });

      const data = response.data.data || response.data;
      
      setProfile({
        fullName: data.full_name || data.username || 'Authorized User',
        email: data.email || email || 'N/A',
        phone: data.phone_number || '',
        language: data.language || 'English (International)',
        role: data.role || role || 'User',
        hub: data.hub_name || 'Central Hub',
        twoFactor: !!data.is_active
      });
    } catch (err) {
      // Fallback: Agar API fail ho jaye toh cookie wala data dikha do
      setProfile(prev => ({ ...prev, email: email || '', role: role || '' }));
      toast.error("Node synchronization failed, using cached data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { uid, token } = getAuthData();

    if (!uid) return toast.error("Session expired. Please login.");

    setIsSaving(true);
    const toastId = toast.loading("SYNCHRONIZING...");

    try {
      await axios.patch(`${API_BASE}/api/v1/users/${uid}`, {
        full_name: profile.fullName,
        phone_number: profile.phone,
        language: profile.language,
        is_active: profile.twoFactor // Using this as a proxy for the toggle in this example
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-api-key': API_KEY,
          'x-user-id': uid
        }
      });
      toast.success("IDENTITY UPDATED", { id: toastId });
    } catch (err) {
      toast.error("DATABASE REJECTED UPDATE", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // --- RENDER (UI REMAINING SAME) ---
  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#020617]">
      <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
      <p className="mt-6 text-blue-500 font-black text-[10px] tracking-[0.5em] uppercase italic"> Establishing Secure Link... </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-6 md:p-12">
      <Toaster theme="dark" position="top-right" richColors />

      <div className="max-w-6xl mx-auto mb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter">
            Profile <span className="text-blue-600 font-outline-2">Settings</span>
          </h1>
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.4em] mt-2">Authorized Access Only</p>
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4">
          <div className="bg-slate-900/40 border border-white/[0.05] rounded-[2.5rem] p-8 backdrop-blur-xl">
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center text-3xl font-black italic text-white mb-6 shadow-2xl">
                {profile.fullName ? profile.fullName.substring(0, 2).toUpperCase() : '??'}
              </div>
              <h2 className="text-xl font-black text-white uppercase italic tracking-tight truncate w-full text-center">{profile.fullName}</h2>
              <p className="text-blue-500 text-[9px] font-black uppercase tracking-widest mt-1 bg-blue-500/10 px-3 py-1 rounded-full">{profile.role}</p>

              <div className="w-full h-px bg-white/5 my-8" />
              
              <div className="w-full space-y-4">
                <div className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5 overflow-hidden">
                  <Mail size={16} className="text-blue-500 flex-shrink-0" />
                  <p className="text-[10px] font-bold text-slate-400 truncate uppercase">{profile.email}</p>
                </div>
                <div className="flex items-center gap-4 p-4 bg-white/[0.02] rounded-2xl border border-white/5">
                  <Building2 size={16} className="text-blue-500" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{profile.hub}</p>
                </div>
              </div>

              <button 
                onClick={() => { Cookies.remove('user'); Cookies.remove('auth_token'); window.location.href='/login'; }}
                className="mt-10 w-full py-4 rounded-xl border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
              >
                Terminate Session
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="bg-slate-900/40 border border-white/[0.05] rounded-[3rem] backdrop-blur-xl overflow-hidden shadow-2xl">
            <div className="flex bg-white/[0.02] border-b border-white/5 p-2">
              <button onClick={() => setActiveTab('account')} className={cn("flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all", activeTab === 'account' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-slate-300")}>Identity Node</button>
              <button onClick={() => setActiveTab('security')} className={cn("flex-1 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all", activeTab === 'security' ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-slate-300")}>Security Keys</button>
            </div>

            <div className="p-8 md:p-12">
              <AnimatePresence mode="wait">
                {activeTab === 'account' ? (
                  <motion.div key="acc" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><User size={14}/> Full Legal Name</label>
                        <input type="text" value={profile.fullName} onChange={e => setProfile({...profile, fullName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white font-bold outline-none focus:border-blue-500 transition-all" />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Phone size={14}/> Secure Contact</label>
                        <input type="text" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white font-bold outline-none focus:border-blue-500 transition-all" />
                      </div>
                      <div className="space-y-3 md:col-span-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Languages size={14}/> System Dialect</label>
                        <select value={profile.language} onChange={e => setProfile({...profile, language: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white font-bold outline-none cursor-pointer focus:border-blue-500 appearance-none">
                          <option value="English (International)">English (International)</option>
                          <option value="Urdu (Standard)">Urdu (Standard)</option>
                          <option value="Arabic (KSA)">Arabic (KSA)</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="sec" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                    <div className="p-8 bg-blue-600/5 border border-blue-500/20 rounded-[2rem] flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="p-4 bg-blue-600 rounded-2xl shadow-lg"><Fingerprint className="text-white" size={28} /></div>
                        <div>
                          <h4 className="text-white font-black uppercase text-sm italic tracking-tight">Two-Factor Auth</h4>
                          <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">Status: {profile.twoFactor ? 'Protocol Active' : 'Protocol Inactive'}</p>
                        </div>
                      </div>
                      <button onClick={() => setProfile({...profile, twoFactor: !profile.twoFactor})} className={cn("w-14 h-7 rounded-full flex items-center px-1 transition-all", profile.twoFactor ? "bg-blue-600" : "bg-slate-800")}>
                        <div className={cn("w-5 h-5 bg-white rounded-full transition-all", profile.twoFactor ? "ml-7" : "ml-0")} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-16 pt-10 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 italic">Audit Log Active</span>
                </div>
                <button disabled={isSaving} onClick={handleUpdate} className="w-full md:w-auto px-14 py-5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50">
                  {isSaving ? <Loader2 className="animate-spin inline mr-2" size={18} /> : <Save className="inline mr-2" size={18} />}
                  Sync Identity
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}