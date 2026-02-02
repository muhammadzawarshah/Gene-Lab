"use client";

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogOut, User as UserIcon, Shield } from 'lucide-react';
import Cookies from 'js-cookie';
import Image from 'next/image';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userData, setUserData] = useState<{ email?: string; role?: string; id?: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const parseUserAuth = () => {
      try {
        const rawCookie = Cookies.get('auth_token');
        
        if (rawCookie) {
          const decoded = decodeURIComponent(rawCookie);
          // Regex to extract JSON block { ... }
          const jsonMatch = decoded.match(/\{.*\}/);
          
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            setUserData(data);
          }
        }
      } catch (err) {
        console.error("Auth Parsing Failed:", err);
      } finally {
        // Force stop loading after attempt
        setTimeout(() => setIsLoading(false), 500);
      }
    };

    parseUserAuth();
  }, []);

  const formatPath = (path: string) => {
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) return "DASHBOARD";
    return segments[segments.length - 1].replace(/-/g, ' ').toUpperCase();
  };

  const handleLogout = () => {
    Cookies.remove('auth_token');
    Cookies.remove('userId');
    window.location.href = '/login';
  };

  // Logic: Name from Email, Email in Subtext, Default Logo
  const userDisplayName = userData?.email 
    ? userData.email.split('@')[0].toUpperCase() 
    : "AUTHORIZED_USER";
    
  const userEmailDisplay = userData?.email || "NODE_OFFLINE";

  // Loading Screen (Only for half a second)
  if (isLoading) {
    return (
      <div className="h-20 bg-[#020617] flex items-center justify-center border-b border-white/5">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <nav className="h-20 px-4 md:px-8 border-b border-white/[0.05] bg-[#020617]/90 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between">
      
      {/* 1. BRAND & SYSTEM PATH */}
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black tracking-[0.3em] text-blue-500 uppercase">System Active</span>
            <div className="h-1 w-1 rounded-full bg-blue-500 animate-ping" />
          </div>
          <h1 className="text-sm md:text-lg font-black text-white tracking-tighter italic flex items-center gap-2 uppercase">
            VIRTUE.OS <span className="text-slate-800 font-normal">/</span> 
            <span className="text-slate-500 text-[10px] md:text-xs">{formatPath(pathname)}</span>
          </h1>
        </div>
      </div>

      {/* 2. USER PROFILE CONTROL */}
      <div className="relative">
        <div 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-3 p-1.5 pr-4 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl cursor-pointer transition-all border border-white/[0.08]"
        >
          {/* Avatar Container */}
          <div className="relative">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-900 border border-white/10 flex items-center justify-center">
              <Image 
                src="/logo.png" // MUST exist in public/logo.png
                alt="Logo" 
                width={32} 
                height={32} 
                className="object-contain"
                priority
              />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#020617] rounded-full shadow-[0_0_5px_#10b981]" />
          </div>

          {/* Identity Label */}
          <div className="hidden md:block text-left">
            <p className="text-[11px] font-black text-white leading-none tracking-tight uppercase">
              {userDisplayName}
            </p>
            <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold tracking-tighter italic">
              {userEmailDisplay}
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </div>

        {/* SECURE DROPDOWN */}
        <AnimatePresence>
          {isDropdownOpen && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-4 w-64 bg-[#020617] border border-white/10 rounded-[2rem] p-3 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] z-50"
              >
                {/* ID Card Detail */}
                <div className="p-4 bg-blue-500/5 rounded-2xl mb-2 border border-blue-500/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-slate-800 rounded-lg">
                      <Shield size={16} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Access Level</p>
                      <p className="text-[10px] font-bold text-white uppercase">{userData?.role?.replace('_', ' ') || 'SECURE_OPERATOR'}</p>
                    </div>
                  </div>
                  <div className="h-px bg-white/5 w-full mb-3" />
                  <p className="text-[10px] font-medium text-slate-400 lowercase italic truncate">{userEmailDisplay}</p>
                </div>

                {/* Actions */}
                <div className="space-y-1">
                  <button 
                    onClick={() => { router.push('/profile'); setIsDropdownOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-slate-400 hover:text-white hover:bg-white/5 rounded-xl uppercase tracking-widest transition-all"
                  >
                    <UserIcon size={14} className="text-blue-500" /> Control Panel
                  </button>
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-rose-500 hover:text-white hover:bg-rose-500/10 rounded-xl uppercase tracking-widest transition-all"
                  >
                    <LogOut size={14} /> Kill Connection
                  </button>
                </div>
              </motion.div>
              {/* Click Outside Overlay */}
              <div className="fixed inset-0 z-40 cursor-default" onClick={() => setIsDropdownOpen(false)} />
            </>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}