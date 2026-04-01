"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, LogOut, User as UserIcon, 
  ShieldCheck, Loader2 
} from 'lucide-react';
import Cookies from 'js-cookie';
import { useAuth } from '@/app/context/authcontext';

export default function Navbar() {
  const { logout } = useAuth();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(true);

  useEffect(() => {
    const syncUser = () => {
      const savedUser = Cookies.get('virtue_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          // Console log ke mutabiq keys map ho rahi hain
          setActiveUser(parsed);
        } catch (e) {
          console.error("Auth Sync Error", e);
        }
      }
      setIsSyncing(false);
    };

    syncUser();
    window.addEventListener('focus', syncUser);
    return () => window.removeEventListener('focus', syncUser);
  }, []);

  const currentPathLabel = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) return "DASHBOARD";
    return segments[segments.length - 1].replace(/-/g, ' ').toUpperCase();
  }, [pathname]);

  // Avatar ke liye logic: Agar name nahi hai toh email ka pehla letter use karein
  const renderAvatar = () => {
    const displayName = activeUser?.name || activeUser?.useremail || "";
    if (displayName) {
      return <span className="text-white font-black text-xs">{displayName[0].toUpperCase()}</span>;
    }
    return <UserIcon size={18} className="text-white/50" />;
  };

  return (
    <nav className="h-20 px-4 md:px-8 border-b border-white/[0.05] bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-[100] flex items-center justify-between">
      
      {/* IDENTITY */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[8px] font-black tracking-[0.3em] text-blue-500 uppercase">System_Active</span>
          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
        </div>
        <h1 className="text-sm md:text-lg font-black text-white tracking-tighter italic uppercase">
          GENE Labs <span className="text-slate-700 font-thin not-italic">/</span> 
          <span className="text-blue-600/80 text-xs md:text-sm font-bold ml-2">{currentPathLabel}</span>
        </h1>
      </div>

      {/* USER SECTION */}
      <div className="relative">
        <button 
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="flex items-center gap-3 p-1.5 pr-3 hover:bg-white/[0.04] rounded-2xl cursor-pointer transition-all border border-white/5 group"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center border border-white/10 shadow-lg">
              {isSyncing ? <Loader2 size={16} className="animate-spin text-white/30" /> : renderAvatar()}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#020617] rounded-full shadow-lg" />
          </div>

          <div className="hidden md:block text-left min-w-[100px]">
            <p className="text-[11px] font-black text-white uppercase truncate tracking-tight">
              {/* Check for useremail because name is missing in your object */}
              {activeUser?.name || activeUser?.useremail?.split('@')[0] || 'Unknown User'}
            </p>
            <p className="text-[9px] text-slate-500 uppercase font-bold italic flex items-center gap-1">
              <ShieldCheck size={10} className="text-blue-500" />
              {activeUser?.role?.replace(/_/g, ' ') || 'Verifying...'}
            </p>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <>
              <div className="fixed inset-0 z-[-1]" onClick={() => setIsDropdownOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="absolute right-0 mt-4 w-64 bg-[#0f172a] border border-white/10 rounded-[2rem] shadow-2xl z-50 p-2"
              >
                <div className="p-4 bg-white/[0.03] rounded-[1.5rem] mb-2 border border-white/5">
                  <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1.5 italic">Session Info</p>
                  {/* Changed from .email to .useremail */}
                  <p className="text-xs font-bold text-white truncate">{activeUser?.useremail || 'No email found'}</p>
                </div>

                <button 
                  onClick={() => { logout(); setIsDropdownOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-[10px] font-black text-rose-500 hover:text-white hover:bg-rose-600 rounded-xl transition-all uppercase tracking-widest"
                >
                  <LogOut size={14} /> Terminate Session
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}