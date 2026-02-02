"use client";

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import img from '@/public/logo.png';
import { 
  Lock, Mail, ArrowRight, Eye, EyeOff, 
  Loader2, ShieldAlert, ShieldCheck 
} from 'lucide-react';
import { useAuth } from '@/app/context/authcontext'; 
import axios from 'axios';
import { toast, Toaster } from 'sonner';

export default function LoginScreen() {
  // --- STATES ---
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // --- AUTH CONTEXT & ROUTING ---
  const { login } = useAuth();

  // --- SECURITY: INPUT SANITIZATION ---
  const sanitizeInput = (val: string) => {
    // Blocks common SQL injection patterns
    return val.replace(/['"--|;<>]/g, "").trim();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError('');
    
    // Aesthetic Loading State with Sonner
    const tId = toast.loading("INITIALIZING_SECURE_HANDSHAKE...");

    try {
      // 1. Sanitize the Identity
      const sanitizedEmail = sanitizeInput(email);

      // 2. Perform API Authentication
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/users/login`, 
        { 
          email: sanitizedEmail, 
          password: password, // Send as is, backend handles hashing
          timestamp: new Date().toISOString() 
        },
        {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY,
            'x-requested-with': 'GeniLabs-Core'
          }
        }
      );

      if (response.data.success) {
        toast.success("AUTHORIZATION_GRANTED", { 
          id: tId, 
          description: `Access Node: ${response.data.user.role.toUpperCase()}` 
        });
        
        login(response.data.token, response.data.user);
      }
    } catch (err: any) {
      const status = err.response?.status;
      let msg = "Authorization Failed: Access Denied";

      if (status === 429) msg = "DDoS_PROTECTION: Rate limit exceeded.";
      if (status === 401) msg = "INVALID_CREDENTIALS: Key mismatch.";
      
      setError(msg);
      toast.error("AUTH_ERROR", { 
        id: tId, 
        description: msg,
        icon: <ShieldAlert className="text-red-500" />
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#01030a] flex items-center justify-center p-4 relative overflow-hidden">
      <Toaster theme="dark" position="top-center" richColors />
      
      {/* BACKGROUND NEURAL ORBS (Aesthetic Untouched) */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-[450px] z-10"
      >
        {/* LOGO SECTION */}
        <div className="flex flex-col items-center mb-10 text-center">
          <motion.div 
            whileHover={{ rotate: 180, scale: 1.1 }}
            transition={{ duration: 0.6 }}
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(37,99,235,0.4)] mb-4 cursor-none"
          >
            <Image src={img} alt='GeniLabs Logo' priority />
          </motion.div>
          <h1 className="text-3xl font-black text-white tracking-tighter italic uppercase">
            Geni<span className="text-cyan-400">Labs</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-mono tracking-[0.5em] uppercase mt-2">
            Medical Innovation & Research
          </p>
        </div>

        {/* LOGIN CARD */}
        <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden bg-white/[0.02] backdrop-blur-xl shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50" />
          
          <form onSubmit={handleLogin} className="space-y-6">
            {/* ERROR DISPLAY */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-black uppercase tracking-widest p-3 rounded-xl text-center italic"
                >
                  <span className="opacity-50 mr-2">[!]</span> {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* EMAIL FIELD */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Access ID / Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="operator@genilabs.com"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 outline-none transition-all placeholder:text-slate-700 font-mono"
                />
              </div>
            </div>

            {/* PASSWORD FIELD */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Security Cipher</label>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-12 text-sm text-white focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/20 outline-none transition-all placeholder:text-slate-700"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:cursor-pointer absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* PERSISTENCE INDICATOR */}
            <div className="flex items-center gap-2 px-1 cursor-pointer group w-fit" onClick={() => {}}>
              <div className="w-4 h-4 rounded border border-white/10 bg-white/5 flex items-center justify-center group-hover:border-cyan-400/50 transition-all">
                <motion.div 
                  initial={false}
                  animate={{ scale: 1, opacity: 0.8 }}
                  className="w-2 h-2 bg-cyan-400 rounded-sm" 
                />
              </div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider group-hover:text-slate-300 transition-colors italic">Neural Persistence Active</span>
            </div>

            {/* SUBMIT BUTTON */}
            <motion.button
              disabled={isSubmitting}
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(37,99,235,0.2)" }}
              whileTap={{ scale: 0.98 }}
              className="hover:cursor-pointer w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 uppercase tracking-[0.3em] text-[10px] disabled:opacity-50 transition-all"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Verifying Link...
                </>
              ) : (
                <>
                  Initialize Access
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>
        </div>

        {/* SECURITY INFO FOOTER */}
        <div className="mt-8 flex justify-center items-center gap-6 opacity-40">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span className="text-[8px] font-bold text-white uppercase tracking-widest italic">Node_RSA_v4 Secure</span>
          </div>
          <div className="w-[1px] h-3 bg-slate-800" />
          <span className="text-[8px] font-bold text-white uppercase tracking-widest tracking-[0.2em]">Build 2026.02.01</span>
        </div>
      </motion.div>

      {/* OVERLAY SYSTEM STATUS */}
      <div className="absolute bottom-4 left-0 w-full flex justify-between px-6 pointer-events-none opacity-20">
        <span className="text-[8px] font-mono text-slate-500 tracking-tighter uppercase">GeniLabs Interface</span>
        <span className="text-[8px] font-mono text-slate-500 tracking-tighter uppercase">Auth: RSA-4096-AES</span>
      </div>
    </div>
  );
}