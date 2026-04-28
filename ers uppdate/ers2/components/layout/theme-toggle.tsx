"use client";

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'gene-theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const currentTheme = window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
    setTheme(currentTheme);
    document.documentElement.classList.toggle('theme-light', currentTheme === 'light');
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('theme-light', nextTheme === 'light');
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
  };

  return (
    <button
      onClick={toggleTheme}
      className="app-soft-badge flex items-center gap-2 rounded-[1.1rem] px-3.5 py-2.5 text-[11px] font-black uppercase tracking-[0.22em] text-slate-300 transition-all hover:border-blue-500/25 hover:bg-blue-500/5"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      type="button"
    >
      {theme === 'dark' ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-blue-500" />}
      {theme === 'dark' ? 'Light UI' : 'Dark UI'}
    </button>
  );
}
