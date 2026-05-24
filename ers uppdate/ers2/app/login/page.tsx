"use client";

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import geneLogo from '@/public/gene-logo.png';
import { 
  Lock, Mail, ArrowRight, Eye, EyeOff, 
  Loader2, ShieldAlert, ShieldCheck 
} from 'lucide-react';
import { useAuth } from '@/app/context/authcontext'; 
import axios from 'axios';
import { toast, Toaster } from 'sonner';
import { PharmaOrb } from '@/components/ui/premium';

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
      console.log(process.env.NEXT_PUBLIC_API_URL)

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
            'x-requested-with': 'GeneLabs-Core'
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
    } catch (err: unknown) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
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
    <div className="app-shell app-grid relative flex min-h-screen w-full items-center justify-center overflow-hidden p-4">
      <Toaster theme="light" position="top-center" richColors />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/60 shadow-[0_40px_100px_rgba(8,35,63,0.16)] backdrop-blur-2xl lg:grid-cols-[1.15fr_0.85fr]"
      >
        <div className="relative hidden min-h-[680px] overflow-hidden border-r border-white/10 p-10 lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(6,182,212,0.18),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.86),rgba(239,248,255,0.72))]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div>
              <div className="flex h-20 w-48 items-center rounded-2xl bg-white/70 px-4 shadow-inner">
                <Image src={geneLogo} alt="Gene Laboratories logo" priority className="h-auto w-full object-contain" />
              </div>
              <div className="mt-12 max-w-xl">
                <h1 className="text-5xl font-black leading-tight tracking-tight text-white xl:text-6xl">
                  Secure medical distribution, redesigned for speed.
                </h1>
                <p className="mt-5 max-w-lg text-base leading-8 text-slate-500">
                  A premium operational workspace for finance, inventory, invoices, orders, and regulated distribution workflows.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {["Secure Auth", "Live Stock", "Finance Sync"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/55 p-4 backdrop-blur">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">{item}</p>
                  <div className="mt-3 h-1.5 rounded-full bg-gradient-to-r from-[#2563eb] via-[#06b6d4] to-[#10b981]" />
                </div>
              ))}
            </div>
          </div>
          <PharmaOrb className="absolute bottom-20 right-4 opacity-95" />
        </div>

        <div className="px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        {/* LOGO SECTION */}
        <div className="mb-8 flex flex-col items-center text-center lg:hidden">
          <motion.div
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.3 }}
            className="mb-5 flex h-24 w-full max-w-[280px] items-center justify-center px-4 drop-shadow-[0_0_24px_rgba(37,99,235,0.24)]"
          >
            <Image
              src={geneLogo}
              alt="Gene Laboratories logo"
              priority
              className="h-auto w-full object-contain"
            />
          </motion.div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            Gene<span className="text-cyan-400">Labs</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-mono tracking-[0.5em] uppercase mt-2">
            Medical Innovation & Research
          </p>
        </div>

        {/* LOGIN CARD */}
        <div className="glass-card relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-70" />
          <div className="mb-8">
            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-blue-500">Secure Access</span>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white">Welcome back</h2>
          </div>
          
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
                  placeholder="operator@geneLabs.com"
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
                Login
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </motion.button>
          </form>
        </div>

        </div>
      </motion.div>

      {/* OVERLAY SYSTEM STATUS */}
      <div className="absolute bottom-4 left-0 w-full flex justify-between px-6 pointer-events-none opacity-20">
        <span className="text-[8px] font-mono text-slate-500 tracking-tighter uppercase">GeneLabs Distribution</span>
        <span className="text-[8px] font-mono text-slate-500 tracking-tighter uppercase">Auth: RSA-4096-AES</span>
      </div>
    </div>
  );
}

