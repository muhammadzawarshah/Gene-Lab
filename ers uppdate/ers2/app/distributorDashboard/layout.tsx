"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/components/layout/sidebar';
import Navbar from '@/components/layout/navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/authcontext'; 
import { toast, Toaster } from 'sonner';
import { Menu, ShieldCheck, Loader2 } from 'lucide-react'; 

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, token, isLoading } = useAuth(); // Context se data le rahe hain
  const router = useRouter();

  useEffect(() => {
    // Agar loading khatam ho jaye aur token na miley, tabhi redirect karo
    // Purani 'verify-node' wali API call yahan se hata di hai
    if (!isLoading && !token) {
      router.replace('/login');
    }
  }, [token, isLoading, router]);

  // Loading Screen jab tak context ready ho raha ho
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#020617] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-blue-500/50 font-black text-[10px] tracking-[0.5em] uppercase italic animate-pulse">
          Establishing Secure Node...
        </p>
      </div>
    );
  }

  // Agar token nahi hai to kuch render mat karo (useEffect handle kar lega redirect)
  if (!token) return null;

  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden relative">
      <Toaster theme="dark" position="top-right" richColors />
      
      {/* SIDEBAR */}
      <div className={`fixed inset-y-0 left-0 z-[60] transform transition-transform duration-300 md:relative md:translate-x-0 
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <Sidebar />
      </div>

      {/* MOBILE OVERLAY */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[55] md:hidden"
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col flex-1 relative overflow-hidden w-full">
        {/* NAVBAR */}
        <div className="flex items-center bg-[#020617]/40 backdrop-blur-2xl border-b border-white/[0.05] sticky top-0 z-50 h-16">
          <button onClick={() => setIsSidebarOpen(true)} className="ml-4 p-2 text-slate-400 md:hidden">
            <Menu size={24} />
          </button>
          
          <div className="flex-1">
             <Navbar />
          </div>

          <div className="hidden md:flex items-center gap-2 px-6 border-l border-white/5">
            <ShieldCheck size={14} className="text-emerald-500" />
            <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none">
              Link Stable: {user?.role}
            </span>
          </div>
        </div>

        {/* MAIN VIEWPORT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative z-10 custom-scrollbar">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {children}
          </motion.div>
        </main>

        {/* SYSTEM STATUS BAR */}
        <div className="h-6 bg-blue-600/5 border-t border-white/[0.02] flex items-center px-4 justify-between">
            <span className="text-[7px] font-bold text-slate-500 uppercase">Neural Net Active</span>
            <span className="text-[7px] font-bold text-slate-600 uppercase italic">GeniLabs v2.0</span>
        </div>
      </div>
    </div>
  );
}