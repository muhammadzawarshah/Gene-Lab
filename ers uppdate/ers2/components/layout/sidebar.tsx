"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/app/context/authcontext'; 
import img from '@/public/logo.png';
import {
  ChevronRight,
  ChevronDown,
  CircleDot,
  Activity,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { NAVIGATION_CONFIG } from '../../lib/NavigationData';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [openNested, setOpenNested] = useState<string | null>(null);

  const pathname = usePathname();
  const router = useRouter();

  // Aapke AuthContext se ye values aa rahi hain
  const { role, user, isLoading } = useAuth(); 

  // Role ke mutabiq menu items filter karna
  const menuItems = useMemo(() => {
    if (!role) return [];
    // NAVIGATION_CONFIG mein se wo data uthayega jo cookie wale role se match karega
    return (NAVIGATION_CONFIG as any)[role] || [];
  }, [role]);

  // Page refresh par active menu ko auto-open karne ki logic
  useEffect(() => {
    if (!menuItems) return;
    menuItems.forEach((section: any) => {
      const hasActiveChild = section.items?.some((item: any) => {
        if (item.type === 'nested') {
          const hasActiveSub = item.subItems?.some((sub: any) => pathname === sub.href);
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

  // Jab tak cookie se role read ho raha ho, pulse effect dikhao
  if (isLoading) {
    return <div className="h-screen w-20 bg-[#020617] border-r border-white/5 animate-pulse" />;
  }

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={cn(
        "h-screen sticky top-0 bg-[#020617] text-slate-200 border-r border-white/5 transition-all duration-500 flex flex-col z-50",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* BRAND LOGO */}
      <div className="p-6 mb-4 flex items-center gap-3">
        <div className="w-10 h-10 relative flex-shrink-0">
          <Image src={img} alt='logo' fill className="object-contain" />
        </div>
        {!isCollapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col">
            <span className="font-black text-lg text-white italic tracking-tighter">
              Gene<span className="text-blue-500">LABS</span>
            </span>
            <span className="text-[7px] font-bold text-emerald-400 tracking-[0.3em] uppercase">
              {role || 'System'}
            </span>
          </motion.div>
        )}
      </div>

      {/* NAVIGATION MENU */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((section: any) => {
          const isDropdown = section.type === 'dropdown';
          const isOpen = openSection === section.id;
          const Icon = section.icon || LayoutDashboard;
          const isActive = section.items?.some((item: any) => {
            if (item.type === 'nested') return item.subItems?.some((sub: any) => pathname === sub.href);
            return pathname === item.href;
          }) || pathname === section.href;

          return (
            <div key={section.id} className="space-y-1">
              <button
                onClick={() => isDropdown ? toggleSection(section.id) : router.push(section.href!)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group relative",
                  isActive ? "bg-blue-600/10 text-blue-400" : "text-slate-500 hover:text-white hover:bg-white/[0.02]"
                )}
              >
                <Icon size={20} className={cn(isActive ? "text-blue-500" : "group-hover:scale-110")} />
                {!isCollapsed && (
                  <div className="flex flex-1 items-center justify-between">
                    <span className="text-xs font-bold">{section.label || section.title}</span>
                    {isDropdown && <ChevronDown size={14} className={cn("transition-transform", isOpen && "rotate-180")} />}
                  </div>
                )}
                {isActive && <div className="absolute left-0 w-1 h-5 bg-blue-500 rounded-r-full" />}
              </button>

              <AnimatePresence>
                {isDropdown && isOpen && !isCollapsed && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }} 
                    animate={{ height: "auto", opacity: 1 }} 
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden ml-9 border-l border-white/5"
                  >
                    {section.items?.map((item: any, idx: number) => (
                      <div key={item.id ?? item.label ?? idx} className="mt-1">
                        {item.type === 'nested' ? (
                          <div className="pl-2">
                            <button 
                              onClick={(e) => toggleNested(e, item.id!)} 
                              className={cn("w-full flex items-center justify-between px-4 py-2 text-[10px] uppercase font-black", openNested === item.id ? "text-blue-400" : "text-slate-500")}
                            >
                              <span className="flex items-center gap-2"><CircleDot size={8} /> {item.label}</span>
                              <ChevronDown size={12} className={cn(openNested === item.id && "rotate-180")} />
                            </button>
                            {openNested === item.id && item.subItems?.map((sub: any) => (
                              <button 
                                key={sub.href} 
                                onClick={() => router.push(sub.href)} 
                                className={cn("block w-full text-left px-4 py-1.5 text-[9px] font-bold uppercase", pathname === sub.href ? "text-white bg-blue-500/20" : "text-slate-600 hover:text-blue-300")}
                              >
                                {sub.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <button 
                            onClick={() => router.push(item.href)} 
                            className={cn("w-full text-left px-4 py-2 text-[10px] font-bold uppercase", pathname === item.href ? "text-blue-400" : "text-slate-500 hover:text-white")}
                          >
                            {item.label}
                          </button>
                        )}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* USER PROFILE FOOTER */}
      <div className="p-4 mt-auto border-t border-white/5 bg-[#020617]">
        {!isCollapsed && (
          <div className="mb-4 px-2 py-3 rounded-2xl flex items-center gap-3 border border-white/5 bg-white/[0.01]">
            <Activity className="w-4 h-4 text-emerald-400" />
            <div className="flex flex-col overflow-hidden">
              <span className="text-[10px] font-black text-white truncate uppercase italic">
                {user?.name || "System User"}
              </span>
              <span className="text-[8px] text-blue-500 uppercase">
                {role || "No Role Found"}
              </span>
            </div>
          </div>
        )}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="w-full flex items-center justify-center p-3 hover:bg-white/5 rounded-2xl transition-all"
        >
          <ChevronRight className={cn("transition-transform duration-500", !isCollapsed && "rotate-180")} />
        </button>
      </div>
    </motion.div>
  );
}