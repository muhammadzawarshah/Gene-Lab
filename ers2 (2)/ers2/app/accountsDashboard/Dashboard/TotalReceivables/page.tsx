"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Banknote, Search, ArrowUpRight,
  Clock, UserCircle, Calendar, Download,
  AlertTriangle, CheckCircle2, FileText, Loader2
} from 'lucide-react';
import { cn } from "@/lib/utils";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Types ---
interface Receivable {
  id: string;
  customer: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  status: 'Critical' | 'Pending' | 'Near Due';
}

const statusStyles = {
  Critical: { bg: "bg-rose-500/10", text: "text-rose-500", border: "border-rose-500/20", icon: AlertTriangle },
  Pending: { bg: "bg-amber-500/10", text: "text-amber-500", border: "border-amber-500/20", icon: Clock },
  'Near Due': { bg: "bg-blue-500/10", text: "text-blue-500", border: "border-blue-500/20", icon: CheckCircle2 },
};

export default function ReceivablesPage() {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Critical' | 'Pending'>('All');

  // --- 1. Backend Integration Logic ---
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchReceivables = async () => {
      try {
        setLoading(true);
        const userId = Cookies.get('userId');
        const token = Cookies.get('auth_token');

        if (!userId) {
          setError("Session expired. Please login again.");
          return;
        }

        const response = await axios.get(`${API_BASE_URL}/accounts/receivables`, {
          params: { userId },
          headers: { 'Authorization': `Bearer ${token}` }
        });

        setReceivables(response.data);
      } catch (err: any) {
        console.error("Receivables Fetch Error:", err);
        setError(err.response?.data?.message || "Failed to sync receivables");
      } finally {
        setLoading(false);
      }
    };

    fetchReceivables();
  }, [API_BASE_URL]);

  // --- 2. Filtering Logic ---
  const filteredData = useMemo(() => {
    return receivables.filter(item => {
      const matchesSearch = item.customer.toLowerCase().includes(search.toLowerCase()) || item.id.includes(search);
      const matchesFilter = activeFilter === 'All' || item.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [search, activeFilter, receivables]);

  const totalAmount = filteredData.reduce((acc, curr) => acc + curr.amount, 0);

  // --- 3. PDF Export Functionality ---
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFillColor(2, 6, 23);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text("NEXUS FINANCE REPORT", 14, 20);
    doc.setFontSize(10);
    doc.text("RECEIVABLES STATUS - CONFIDENTIAL", 14, 30);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 150, 20);

    const tableData = filteredData.map(item => [
      item.id, item.customer, `PKR ${item.amount.toLocaleString()}`, item.dueDate, `${item.daysOverdue} Days`, item.status
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Invoice ID', 'Customer', 'Amount', 'Due Date', 'Aging', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [37, 99, 235], fontSize: 10 },
      foot: [['', 'Grand Total', `PKR ${totalAmount.toLocaleString()}`, '', '', '']],
    });

    doc.save(`Nexus_Receivables_Report.pdf`);
  };

  // --- 4. Loading State ---
  if (loading) return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#020617]">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="text-blue-500 mb-4">
        <Loader2 size={48} />
      </motion.div>
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 italic">Syncing Recovery Data...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-10 text-slate-300 font-sans">

      {/* --- RECOVERY METRICS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2.5rem] relative overflow-hidden"
        >
          <div className="relative z-10">
            <p className="text-blue-100/60 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Portfolio Outstanding</p>
            <h1 className="text-4xl font-black text-white italic tracking-tighter mb-6">PKR {totalAmount.toLocaleString()}</h1>
            <div className="flex gap-4">
              <div className="px-4 py-2 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                <p className="text-[8px] font-bold text-blue-100/60 uppercase">Records Found</p>
                <p className="text-sm font-black text-white">{filteredData.length}</p>
              </div>
              <div className="px-4 py-2 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
                <p className="text-[8px] font-bold text-blue-100/60 uppercase">Active Filter</p>
                <p className="text-sm font-black text-white uppercase">{activeFilter}</p>
              </div>
            </div>
          </div>
          <Banknote className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/5 -rotate-12 pointer-events-none" />
        </motion.div>

        <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] flex flex-col justify-between group hover:border-blue-500/20 transition-all">
          <div>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 italic">Aging Pulse</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400">Total Portfolio View</span>
                <span className="text-xs font-black text-blue-500 uppercase">Live Sync</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: "75%" }} className="h-full bg-blue-500 shadow-[0_0_10px_rgba(37,99,235,0.4)]" />
              </div>
            </div>
          </div>
          <button
            onClick={handleDownloadPDF}
            className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] text-white hover:bg-blue-600 hover:border-blue-600 transition-all flex items-center justify-center gap-3 active:scale-95"
          >
            Generate Ledger PDF <Download size={14} />
          </button>
        </div>
      </div>

      {/* --- CONTROLS --- */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/[0.01] border border-white/5 p-4 rounded-[2.5rem] mb-8 backdrop-blur-md">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
          <input
            type="text" placeholder="SEARCH BY CUSTOMER OR INVOICE ID..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#050b1d] border border-white/5 rounded-2xl py-4 pl-14 pr-10 text-[10px] font-black tracking-widest outline-none focus:border-blue-500/50 text-white placeholder:text-slate-700"
          />
        </div>
        <div className="flex gap-2 p-1 bg-[#050b1d] rounded-2xl border border-white/5">
          {['All', 'Critical', 'Pending'].map((f) => (
            <button key={f} onClick={() => setActiveFilter(f as any)}
              className={cn("px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                activeFilter === f ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" : "text-slate-500 hover:text-white"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* --- DATA LIST --- */}
      <div className="space-y-4">
        {error && <p className="text-center text-rose-500 font-black uppercase text-xs italic">{error}</p>}
        <AnimatePresence mode="popLayout">
          {filteredData.map((item, index) => {
            const style = statusStyles[item.status] || statusStyles['Near Due'];
            return (
              <motion.div key={item.id} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: index * 0.05 }}
                className="group bg-[#050b1d] border border-white/5 rounded-[2.5rem] p-6 hover:border-blue-500/40 transition-all flex flex-wrap lg:flex-nowrap items-center justify-between gap-8"
              >
                <div className="flex items-center gap-6 min-w-[300px]">
                  <div className="w-16 h-16 bg-white/[0.02] border border-white/5 rounded-[1.5rem] flex items-center justify-center group-hover:bg-blue-600/10 transition-colors">
                    <UserCircle className="text-slate-600 group-hover:text-blue-500" size={28} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-white italic tracking-tighter uppercase">{item.customer}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <FileText size={10} className="text-slate-600" />
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{item.id}</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-10 px-8 border-l border-white/5">
                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Net Receivable</p>
                    <p className="text-md font-black text-white italic">PKR {item.amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Maturity Date</p>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar size={12} />
                      <span className="text-xs font-bold italic">{item.dueDate}</span>
                    </div>
                  </div>
                  <div className="hidden md:block">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2">Days Delayed</p>
                    <p className={cn("text-xs font-black italic", item.daysOverdue > 10 ? "text-rose-500" : "text-amber-500")}>
                      +{item.daysOverdue} DAYS
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className={cn("px-5 py-2.5 rounded-2xl flex items-center gap-3 border", style.bg, style.border)}>
                    <style.icon size={14} className={style.text} />
                    <span className={cn("text-[10px] font-black uppercase tracking-widest italic", style.text)}>{item.status}</span>
                  </div>
                  <button className="w-12 h-12 flex items-center justify-center bg-white/[0.02] border border-white/5 rounded-2xl text-slate-600 hover:text-white hover:bg-blue-600 transition-all">
                    <ArrowUpRight size={20} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {!loading && filteredData.length === 0 && (
          <p className="text-center py-20 text-slate-600 font-black uppercase tracking-widest italic opacity-20">No Receivables Found</p>
        )}
      </div>
    </div>
  );
}