"use client";

import React, { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogOut, User as UserIcon, ShieldCheck, Zap } from 'lucide-react';
import { useAuth } from '@/app/context/authcontext'; 

export default function Navbar() {
  const { user, logout } = useAuth(); 
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Dynamic Route Breadcrumb Logic
  const formatPath = (path: string) => {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return "Dashboard";
    const lastSegment = segments[segments.length - 1];
    return lastSegment.replace(/-/g, ' ').toUpperCase();
  };

  // Avatar Initials Logic
  const getInitials = (name: string) => {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <nav className="h-20 px-4 md:px-8 border-b border-white/[0.05] bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-30 flex items-center justify-between">
      
      {/* 1. Identity & Path */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold tracking-[0.2em] text-blue-500 uppercase">System Active</span>
            <div className="h-1 w-1 rounded-full bg-blue-500 animate-ping" />
          </div>
          <h1 className="text-sm md:text-lg font-bold text-white tracking-tighter flex items-center gap-2 italic">
            GENE Labs<span className="text-slate-700 font-light">/</span> 
            <span className="text-slate-400 text-xs md:text-sm">{formatPath(pathname)}</span>
          </h1>
        </div>
      </div>

      {/* 2. User Profile from AuthContext */}
      <div className="relative">
        <div 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-3 p-1.5 pr-2 md:pr-3 hover:bg-white/[0.03] rounded-2xl cursor-pointer transition-all border border-white/[0.08]"
        >
          <div className="relative">
            {/* Dynamic Initials from AuthContext */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center font-black text-white text-xs shadow-lg shadow-blue-500/20">
              {getInitials(user?.name)}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#020617] rounded-full" />
          </div>

          <div className="hidden md:block">
            {/* Dynamic Name and Role from AuthContext */}
            <p className="text-xs font-bold text-white leading-none">{user?.name || 'Loading...'}</p>
            <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-tighter font-medium italic">
              {user?.role || 'Operator'} • ID: {user?.id}
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* Dropdown Menu */}
        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-60 bg-slate-950 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl z-50 p-2"
            >
              <div className="p-4 bg-white/[0.02] rounded-2xl mb-2">
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1 italic">Auth Session</p>
                <p className="text-xs font-bold text-white truncate">{user?.email}</p>
              </div>

              <div className="space-y-1">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all uppercase tracking-widest">
                  <UserIcon size={14} className="text-blue-500" /> Profile Settings
                </button>
                <button 
                  onClick={() => { logout(); router.push('/login'); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all uppercase tracking-widest"
                >
                  <LogOut size={14} /> Terminate Session
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Close Dropdown Overlay */}
      {isDropdownOpen && <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)} />}
    </nav>
  );
}