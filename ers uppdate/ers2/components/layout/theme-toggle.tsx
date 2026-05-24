"use client";

import { Sun } from 'lucide-react';

export default function ThemeToggle() {
  return (
    <div
      className="hidden items-center gap-2 rounded-[1rem] border border-[#dce8f3] bg-white/70 px-3 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 sm:flex"
      title="Light mode is fixed for this platform"
    >
      <Sun size={14} className="text-amber-400" />
      Light
    </div>
  );
}
