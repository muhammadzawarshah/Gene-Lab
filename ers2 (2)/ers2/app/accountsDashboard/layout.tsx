"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/sidebar';
import Navbar from '@/components/layout/navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/authcontext'; 
import { toast, Toaster } from 'sonner';
import { Menu, ShieldCheck, Loader2, Lock } from 'lucide-react'; 

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Naye AuthContext se data nikaal rahe hain
  const { user, token, isLoading } = useAuth(); 
  const router = useRouter();

  // --- SECURITY PROTOCOL: AUTH VERIFICATION ---
  useEffect(() => {
    // Agar loading khatam ho jaye aur system ko token ya user na mile
    if (!isLoading && (!token || !user)) {
      toast.error("UNAUTHORIZED_ACCESS", { 
        description: "Secure node connection lost. Redirecting..." 
      });
      
      // Redirect to login page
      router.replace('/login');
    }
  }, [token, user, isLoading, router]);

  // --- LOADING TERMINAL UI (Aesthetic Intact) ---
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#020617] flex flex-col items-center justify-center space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-10 h-10 text-blue-500" />
        </motion.div>
        <p className="text-blue-500/50 font-black text-[10px] tracking-[0.5em] uppercase italic animate-pulse text-center">
          Decrypting Secure Neural Node...<br/>
          <span className="opacity-30 tracking-normal text-[8px]">Verifying GeniLabs Core Credentials</span>
        </p>
      </div>
    );
  }

  // Prevent UI flicker/rendering agar user authorized nahi hai
  if (!token || !user) return null;

  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden relative">
      <Toaster theme="dark" position="top-right" richColors />
      
      {/* 1. SIDEBAR - Hidden on mobile, visible on MD+ */}
      <div className={`
        fixed inset-y-0 left-0 z-[60] transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <Sidebar />
      </div>

      {/* MOBILE OVERLAY (Glassmorphism effect) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[55] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* 2. MAIN CONTENT WRAPPER */}
      <div className="flex flex-col flex-1 relative overflow-hidden w-full">
        
        {/* NEURAL GLOW EFFECTS (Aesthetic UI) */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

        {/* NAVBAR - Integrated with Auth State */}
        <div className="flex items-center bg-[#020617]/40 backdrop-blur-2xl border-b border-white/[0.05] sticky top-0 z-50">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="ml-4 p-2 text-slate-400 hover:text-white md:hidden transition-colors"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex-1">
             <Navbar />
          </div>

          {/* Security Badge in Navbar showing current Role */}
          <div className="hidden md:flex items-center gap-2 px-6 border-l border-white/5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none">Secure Link</span>
              <span className="text-[7px] text-slate-500 uppercase font-mono">{user?.role}</span>
            </div>
          </div>
        </div>

        {/* 3. SCROLLABLE VIEWPORT */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative z-10 custom-scrollbar">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* Logic check to ensure children only render if fully authorized */}
            {token ? children : (
               <div className="h-full flex flex-col items-center justify-center opacity-20">
                 <Lock size={48} />
                 <p className="mt-4 font-mono">ENCRYPTED_ZONE</p>
               </div>
            )}
          </motion.div>
        </main>

        {/* System Status Bar (Bottom) */}
        <div className="h-6 bg-blue-600/5 border-t border-white/[0.02] flex items-center px-4 justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter">Neural Network Active</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[7px] font-bold text-slate-600 uppercase">GeniLabs Core v2.0.4</span>
              <span className="text-[7px] font-bold text-slate-600 uppercase hidden sm:block">Identity: {user?.email}</span>
            </div>
        </div>
      </div>
    </div>
  );
}