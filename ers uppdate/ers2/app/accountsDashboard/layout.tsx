"use client";

import React, { useState, useEffect } from 'react'; // useLayoutEffect ki jagah useEffect behtar hai refresh handle karne ke liye
import Sidebar from '@/components/layout/sidebar';
import Navbar from '@/components/layout/navbar';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'sonner';
import { Menu, Activity } from 'lucide-react'; 
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/authcontext';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  
  // isLoading ko yahan context se nikalein
  const { token, isLoading } = useAuth();

  useEffect(() => {
    // Agar loading khatam ho chuki hai AUR token phir bhi nahi mila
    if (!isLoading && !token) {
      router.replace('/login');
    }
  }, [token, isLoading, router]);

  // Jab tak AuthContext cookies check kar raha hai, loading screen dikhao
  if (isLoading) {
    return (
      <div className="h-screen w-full bg-[#020617] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Verifying Session...</span>
        </div>
      </div>
    );
  }

  // Agar loading khatam ho gayi aur token mil gaya, tabhi content dikhao
  if (!token) return null;

  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden relative">
      <Toaster theme="dark" position="top-right" richColors />
      
      <div className={`
        fixed inset-y-0 left-0 z-[60] transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <Sidebar />
      </div>

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

      <div className="flex flex-col flex-1 relative overflow-hidden w-full">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="flex items-center bg-[#020617]/40 backdrop-blur-2xl border-b border-white/[0.05] sticky top-0 z-20">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="ml-4 p-2 text-slate-400 hover:text-white md:hidden transition-colors"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex-1">
              <Navbar />
          </div>

          <div className="hidden md:flex items-center gap-2 px-6 border-l border-white/5">
            <Activity size={14} className="text-blue-500" />
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">System Ready</span>
          </div>
        </div>

        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 relative z-10 custom-scrollbar">
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>

        <div className="h-6 bg-white/[0.02] border-t border-white/[0.02] flex items-center px-4 justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter">Direct Node Connection</span>
            </div>
            <span className="text-[7px] font-bold text-slate-600 uppercase tracking-[0.2em]">VirtueOS Stable v4.2</span>
        </div>
      </div>
    </div>
  );
}