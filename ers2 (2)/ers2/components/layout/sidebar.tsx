"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/authcontext'; 
import { 
  ChevronRight, FlaskConical, Dna, ChevronDown, 
  CircleDot 
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { NAVIGATION_CONFIG } from '../../lib/NavigationData'; 

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openNested, setOpenNested] = useState<string | null>(null);
  
  const { user, role, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = useMemo(() => {
    if (!role) return [];
    return NAVIGATION_CONFIG[role as keyof typeof NAVIGATION_CONFIG] || [];
  }, [role]);

  useEffect(() => {
    menuItems.forEach(section => {
      const hasActiveChild = section.items?.some(item => {
        if (item.type === 'nested') {
          const hasActiveSub = item.subItems?.some(sub => pathname === sub.href);
          if (hasActiveSub) setOpenNested(item.id || null);
          return hasActiveSub;
        }
        return pathname === item.href;
      });
      if (hasActiveChild || pathname === section.href) setOpenSection(section.id);
    });
  }, [pathname, menuItems]);

  const toggleSection = (id: string) => setOpenSection(openSection === id ? null : id);
  const toggleNested = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenNested(openNested === id ? null : id);
  };

  return (
    <motion.div 
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        "h-screen sticky top-0 bg-[#020617] text-slate-200 border-r border-white/5 transition-all duration-500 flex flex-col z-50",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Brand Logo */}
      <div className="p-6 mb-4 flex items-center gap-3 relative overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 to-cyan-500 p-2 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.3)] flex-shrink-0 z-10">
          <FlaskConical className="w-6 h-6 text-white" />
        </div>
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="flex flex-col z-10">
              <span className="font-black text-lg tracking-tighter text-white leading-none uppercase italic">
                Virtue<span className="text-blue-500">OS</span>
              </span>
              {/* FIX APPLIED HERE: String conversion added */}
              <span className="text-[7px] font-bold text-blue-400 uppercase tracking-[0.4em]">
                Node: {user?.id ? String(user.id).slice(-6) : 'SECURE'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((section) => {
          const isDropdown = section.type === 'dropdown';
          const isOpen = openSection === section.id;
          const isActiveSection = section.items?.some(item => {
            if (item.type === 'nested') return item.subItems?.some(sub => pathname === sub.href);
            return pathname === item.href;
          }) || pathname === section.href;

          return (
            <div key={section.id} className="space-y-1">
              <button
                onClick={() => isDropdown ? toggleSection(section.id) : router.push(section.href!)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative cursor-pointer text-left overflow-hidden",
                  isActiveSection ? "bg-blue-600/10 text-blue-400" : "text-slate-500 hover:text-white hover:bg-white/[0.02]"
                )}
              >
                <section.icon className={cn(
                  "w-5 h-5 flex-shrink-0 transition-all duration-300 z-10", 
                  isActiveSection ? "text-blue-500 scale-110 drop-shadow-[0_0_8px_rgba(37,99,235,0.5)]" : "group-hover:scale-110"
                )} />
                
                {!isCollapsed && (
                  <div className="flex flex-1 items-center justify-between z-10">
                    <span className={cn("text-xs font-bold transition-all duration-300 tracking-tight", isActiveSection ? "text-white" : "group-hover:translate-x-1")}>
                      {section.label || section.title}
                    </span>
                    {isDropdown && <ChevronDown className={cn("w-4 h-4 transition-transform duration-300", isOpen && "rotate-180 text-blue-400")} />}
                  </div>
                )}

                {isActiveSection && <motion.div layoutId="activeIndicator" className="absolute left-0 w-1 h-5 bg-blue-500 rounded-r-full z-20" />}
              </button>

              <AnimatePresence>
                {isDropdown && isOpen && !isCollapsed && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="ml-9 mt-1 space-y-1 border-l border-white/[0.05]">
                      {section.items?.map((item: any, index: number) => (
                        <div key={item.id || `${item.label}-${index}`} className="space-y-1">
                          {item.type === 'nested' ? (
                            <>
                              <button onClick={(e) => toggleNested(e, item.id!)} className={cn("w-full flex items-center justify-between px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg", openNested === item.id ? "text-blue-400" : "text-slate-500 hover:text-slate-200")}>
                                <span className="flex items-center gap-2">
                                  <CircleDot size={8} className={openNested === item.id ? "animate-pulse" : "opacity-30"} />
                                  {item.label}
                                </span>
                                <ChevronDown size={12} className={cn("transition-transform duration-300", openNested === item.id && "rotate-180")} />
                              </button>
                              <AnimatePresence>
                                {openNested === item.id && (
                                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="ml-4 space-y-1 overflow-hidden">
                                    {item.subItems?.map((sub: any) => (
                                      <button key={sub.href} onClick={() => router.push(sub.href)} className={cn("w-full text-left px-4 py-1.5 text-[9px] font-bold transition-all rounded-md uppercase italic", pathname === sub.href ? "text-white bg-blue-600/20 border-l border-blue-500" : "text-slate-600 hover:text-blue-300")}>
                                        {sub.label}
                                      </button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </>
                          ) : (
                            <button onClick={() => router.push(item.href)} className={cn("w-full text-left px-4 py-2 text-[10px] font-bold transition-all rounded-lg uppercase tracking-wider", pathname === item.href ? "text-blue-400 bg-blue-600/5" : "text-slate-500 hover:text-slate-200")}>
                              {item.label}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 mt-auto border-t border-white/5 bg-[#020617]">
        {!isCollapsed && (
          <div className="mb-4 px-2 py-3 rounded-2xl flex items-center gap-3 border border-white/5 bg-white/[0.01]">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
              <Dna className="w-4 h-4 text-blue-400 animate-pulse" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] font-black text-white leading-none uppercase italic truncate">{role || 'GUEST'}</span>
              <button onClick={logout} className="text-[8px] text-rose-500 uppercase tracking-tighter hover:underline text-left mt-1">Terminate Session</button>
            </div>
          </div>
        )}
        <button onClick={() => setIsCollapsed(!isCollapsed)} className="w-full flex items-center justify-center p-3 hover:bg-white/5 rounded-2xl transition-all group border border-transparent hover:border-white/5">
          <ChevronRight className={cn("w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-transform duration-700", isCollapsed ? "" : "rotate-180")} />
        </button>
      </div>
    </motion.div>
  );
}