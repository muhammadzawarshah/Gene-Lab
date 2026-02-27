"use client";

import React, { useState, useCallback } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Shield, KeyRound, Eye, EyeOff, 
  CheckCircle2, AlertTriangle, ArrowRight,
  ShieldCheck, Lock, Activity, Loader2
} from 'lucide-react';
import { cn } from "@/lib/utils";

export default function ChangePassword() {
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  // --- Secure Config ---
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const currentUserId = Cookies.get('userId');
  const authToken = Cookies.get('auth_token');

  const vaultApi = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'x-api-key': API_KEY,
      'x-user-id': currentUserId
    }
  });

  // --- Password Strength Logic ---
  const getStrength = useCallback(() => {
    if (formData.new.length === 0) return 0;
    let strength = 0;
    if (formData.new.length >= 10) strength += 1; // Minimum 10 chars for safety
    if (/[A-Z]/.test(formData.new)) strength += 1;
    if (/[0-9]/.test(formData.new)) strength += 1;
    if (/[^A-Za-z0-9]/.test(formData.new)) strength += 1;
    return strength;
  }, [formData.new]);

  const strength = getStrength();

  // --- Secure Submission ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Basic Integrity Checks
    if (formData.new !== formData.confirm) {
      return toast.error("VALIDATION ERROR", { description: "New access keys do not match." });
    }
    if (strength < 3) {
      return toast.warning("SECURITY RISK", { description: "Password complexity index too low." });
    }
    if (!currentUserId) {
      return toast.error("AUTH_FAILURE", { description: "Unauthorized access detected." });
    }

    try {
      setLoading(true);

      // 2. Transmitting to Secure Backend Node
      const response = await vaultApi.post('/auth/change-password', {
        uid: currentUserId,
        oldPassword: formData.current,
        newPassword: formData.new
      });

      if (response.status === 200) {
        setSuccess(true);
        toast.success("PROTOCOL SUCCESS", { description: "Password re-encryption complete." });
        setFormData({ current: '', new: '', confirm: '' });
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || "Encryption update intercepted.";
      toast.error("SECURITY ALERT", { description: errorMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans flex items-center justify-center">
      <Toaster position="top-right" theme="dark" richColors />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl bg-white/[0.01] border border-white/5 rounded-[3rem] p-8 md:p-12 backdrop-blur-3xl relative overflow-hidden shadow-2xl"
      >
        <Shield className="absolute -right-10 -top-10 w-48 h-48 text-white/[0.02] -rotate-12 pointer-events-none" />

        <div className="mb-10 text-center">
          <div className="inline-flex p-4 bg-blue-600/10 rounded-2xl mb-6">
            <Lock className="text-blue-500 w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white italic uppercase tracking-tight">Security <span className="text-blue-500">Upgrade</span></h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] mt-2">Nexus Authentication Protocol Alpha-9</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-6">
          {/* Current Password */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Authorized Current Password</label>
            <div className="relative group">
              <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type={showCurrent ? "text" : "password"}
                required
                value={formData.current}
                onChange={(e) => setFormData({...formData, current: e.target.value})}
                className="w-full bg-[#050b1d] border border-white/5 rounded-2xl pl-14 pr-12 py-4 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-800"
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700 hover:text-white transition-colors"
              >
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="h-[1px] bg-white/5 my-4" />

          {/* New Password */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">New Nexus Access Key</label>
            <div className="relative group">
              <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type={showNew ? "text" : "password"}
                required
                value={formData.new}
                onChange={(e) => setFormData({...formData, new: e.target.value})}
                className="w-full bg-[#050b1d] border border-white/5 rounded-2xl pl-14 pr-12 py-4 text-xs font-bold text-white outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-800"
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700 hover:text-white transition-colors"
              >
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            
            {/* Strength Meter */}
            <div className="flex gap-1.5 mt-3 px-1">
              {[1, 2, 3, 4].map((step) => (
                <div 
                  key={step} 
                  className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-500",
                    strength >= step ? (strength <= 2 ? "bg-rose-500" : strength === 3 ? "bg-amber-500" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]") : "bg-white/5"
                  )} 
                />
              ))}
            </div>
            <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mt-2 flex items-center gap-2 italic">
               <Activity size={10} /> Complexity Index: {strength === 0 ? 'Empty' : strength <= 2 ? 'Weak' : strength === 3 ? 'Medium' : 'Ultra-Secure'}
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Re-confirm New Access Key</label>
            <input 
              type="password"
              required
              value={formData.confirm}
              onChange={(e) => setFormData({...formData, confirm: e.target.value})}
              className={cn(
                "w-full bg-[#050b1d] border rounded-2xl px-6 py-4 text-xs font-bold text-white outline-none transition-all placeholder:text-slate-800",
                formData.confirm && formData.new !== formData.confirm ? "border-rose-500/50" : "border-white/5 focus:border-blue-500/50"
              )}
              placeholder="••••••••"
            />
            {formData.confirm && formData.new !== formData.confirm && (
              <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-2 flex items-center gap-2">
                <AlertTriangle size={10} /> Keys do not match
              </p>
            )}
          </div>

          <button 
            type="submit"
            disabled={loading || strength < 3 || formData.new !== formData.confirm}
            className="group w-full relative mt-8 overflow-hidden rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-400 group-hover:scale-105 transition-transform duration-500" />
            <div className="relative py-5 flex items-center justify-center gap-3 text-white text-[10px] font-black uppercase tracking-[0.3em] italic">
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>Synchronize New Password <ArrowRight size={14} /></>
              )}
            </div>
          </button>
        </form>

        {/* Success Overlay */}
        <AnimatePresence>
          {success && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 bg-[#020617] flex flex-col items-center justify-center p-8 z-50 text-center"
            >
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="text-emerald-500 w-10 h-10" />
              </div>
              <h2 className="text-xl font-black text-white italic uppercase tracking-tight mb-2">Encryption Updated</h2>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-8 leading-relaxed">
                Your new access key has been propagated across the nexus node network.
              </p>
              <button 
                onClick={() => setSuccess(false)}
                className="px-8 py-3 bg-white text-black text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all active:scale-95"
              >
                Return to Core
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}