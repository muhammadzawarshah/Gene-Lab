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
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // --- Password Validation Logic ---
  const isValidPassword = useCallback(() => {
    const pw = formData.new;
    if (pw.length < 8) return false;
    if (!/[A-Z]/.test(pw)) return false;
    if (!/[a-z]/.test(pw)) return false;
    if (!/[0-9]/.test(pw)) return false;
    if (!/[^A-Za-z0-9]/.test(pw)) return false;
    return true;
  }, [formData.new]);

  const getStrengthMeter = useCallback(() => {
    if (formData.new.length === 0) return 0;
    let strength = 0;
    if (formData.new.length >= 8) strength += 1;
    if (/[A-Z]/.test(formData.new) && /[a-z]/.test(formData.new)) strength += 1;
    if (/[0-9]/.test(formData.new)) strength += 1;
    if (/[^A-Za-z0-9]/.test(formData.new)) strength += 1;
    return strength;
  }, [formData.new]);

  const strength = getStrengthMeter();
  const isValid = isValidPassword();

  // --- Secure Submission ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.new !== formData.confirm) {
      return toast.error("VALIDATION ERROR", { description: "New access keys do not match." });
    }
    if (!isValid) {
      return toast.warning("SECURITY RISK", { description: "Password must be at least 8 chars with uppercase, lowercase, number, and special character." });
    }

    const token = Cookies.get('auth_token');
    const userId = Cookies.get('userId') || Cookies.get('user_id');

    if (!token || !userId) {
      return toast.error("SESSION EXPIRED", { description: "Please re-login to update your password." });
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Updating password...");

    try {
      await axios.post(
        `${API_URL}/api/v1/users/changepassword/${userId}`,
        { currentPassword: formData.current, newPassword: formData.new },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("PASSWORD UPDATED", { description: "Your password has been changed successfully." });
      setSuccess(true);
      setFormData({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || err?.message || "Failed to update password.";
      toast.error("UPDATE FAILED", { description: errorMsg });
    } finally {
      setIsLoading(false);
      toast.dismiss(loadingToast);
    }
  };

  const userId = Cookies.get('userId') || Cookies.get('user_id');

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans flex items-center justify-center relative overflow-hidden bg-[#020617]">
      <Toaster position="top-right" theme="dark" richColors />

      {/* Background Glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl bg-white/[0.01] border border-white/5 rounded-[3.5rem] p-10 md:p-14 backdrop-blur-3xl relative overflow-hidden shadow-2xl"
      >
        <Shield className="absolute -right-12 -top-12 w-56 h-56 text-white/[0.02] -rotate-12 pointer-events-none" />

        <div className="mb-12 text-center relative z-10">
          <div className="inline-flex p-5 bg-blue-600/10 rounded-[2rem] mb-6 border border-blue-500/20 shadow-inner">
            <Lock className="text-blue-500 w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">Change <span className="text-blue-500">Password</span></h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-3 italic flex items-center justify-center gap-2">
            <Activity size={12} className="text-blue-500 animate-pulse" /> Gene Laboratories • User: {userId?.slice(0, 8)}
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-8 relative z-10">

          {/* Current Password */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Current Password</label>
            <div className="relative group">
              <KeyRound className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-700 group-focus-within:text-blue-500 transition-colors" />
              <input
                type={showCurrent ? "text" : "password"}
                required
                value={formData.current}
                onChange={(e) => setFormData({...formData, current: e.target.value})}
                className="w-full bg-[#050b1d] border border-white/5 rounded-2xl pl-16 pr-14 py-5 text-sm font-bold text-white outline-none focus:border-blue-500/40 transition-all shadow-inner"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 hover:text-white transition-colors cursor-pointer"
              >
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent my-6" />

          {/* New Password */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">New Password</label>
            <div className="relative group">
              <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-700 group-focus-within:text-blue-500 transition-colors" />
              <input
                type={showNew ? "text" : "password"}
                required
                value={formData.new}
                onChange={(e) => setFormData({...formData, new: e.target.value})}
                className="w-full bg-[#050b1d] border border-white/5 rounded-2xl pl-16 pr-14 py-5 text-sm font-bold text-white outline-none focus:border-blue-500/40 transition-all shadow-inner"
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 hover:text-white transition-colors cursor-pointer"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
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
            <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest mt-2 flex flex-col gap-1 italic">
               <span className="flex items-center gap-2"><Activity size={10} /> Requirements: 8+ chars, Upper, Lower, Num, Special</span>
            </p>
          </div>

          {/* Confirm Password */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1 italic">Confirm New Password</label>
            <input
              type="password"
              required
              value={formData.confirm}
              onChange={(e) => setFormData({...formData, confirm: e.target.value})}
              className={cn(
                "w-full bg-[#050b1d] border rounded-2xl px-6 py-5 text-sm font-bold text-white outline-none transition-all shadow-inner",
                formData.confirm && formData.new !== formData.confirm ? "border-rose-500/40" : "border-white/5 focus:border-blue-500/40"
              )}
              placeholder="Re-enter new password"
            />
            {formData.confirm && formData.new !== formData.confirm && (
              <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-2 flex items-center gap-2 italic">
                <AlertTriangle size={12} /> Passwords do not match
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !isValid || formData.new !== formData.confirm}
            className="w-full relative group mt-10 overflow-hidden rounded-[1.5rem] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-400 group-hover:scale-105 transition-transform duration-500" />
            <div className="relative py-6 flex items-center justify-center gap-4 text-white text-[11px] font-black uppercase tracking-[0.4em] italic">
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Update Password <ArrowRight size={16} /></>
              )}
            </div>
          </button>
        </form>

        {/* Success Overlay */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#020617] flex flex-col items-center justify-center p-10 z-50 text-center"
            >
              <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mb-8 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.1)]">
                <CheckCircle2 className="text-emerald-500 w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">Password <span className="text-emerald-500">Updated</span></h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed mb-10">
                Your password has been changed successfully at Gene Laboratories.
              </p>
              <button
                onClick={() => setSuccess(false)}
                className="px-12 py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-200 transition-all cursor-pointer shadow-xl"
              >
                Done
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
