"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Search, Truck, Download, Printer, 
  ArrowUpRight, Landmark, BookOpen, MessageSquare, 
  Loader2, ShieldAlert, ShieldCheck, Lock
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
interface VendorEntry {
  id: string;
  date: string;
  type: 'Purchase' | 'Payment' | 'Return';
  description: string;
  debit: number; 
  credit: number; 
  balance: number;
}

interface Vendor {
  id: string;
  name: string;
  company: string;
  phone: string;
  totalDue: number;
  lastPurchase: string;
}

export default function VendorLedger() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [ledgerData, setLedgerData] = useState<Record<string, VendorEntry[]>>({});
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // --- Security & Auth Config ---
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY; // Managed via Axios Headers
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const currentUserId = Cookies.get('userId');
  const token = Cookies.get('auth_token');

  // Secure Axios Instance
  const secureApi = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'x-user-id': currentUserId
    }
  });

  // --- Fetch Initial Vendors ---
  useEffect(() => {
    const fetchVendors = async () => {
      setIsLoading(true);
      try {
        if (!currentUserId || !token) throw new Error("AUTH_INVALID");
        const response = await secureApi.get(`/vendors/summary?ownerId=${currentUserId}`);
        setVendors(response.data);
      } catch (err) {
        toast.error("SECURITY ALERT", { 
          description: "Unauthorized access detected or session expired." 
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchVendors();
  }, []);

  // --- Fetch Ledger for Specific Vendor ---
  useEffect(() => {
    if (selectedVendor && !ledgerData[selectedVendor.id]) {
      const fetchDetails = async () => {
        try {
          // Security: Regex to ensure ID is strictly alphanumeric (Prevents SQL Injection)
          const safeId = selectedVendor.id.replace(/[^a-zA-Z0-9-]/g, "");
          const response = await secureApi.get(`/vendors/ledger/${safeId}?userId=${currentUserId}`);
          setLedgerData(prev => ({ ...prev, [selectedVendor.id]: response.data }));
        } catch (err) {
          toast.error("DATA LOCK", { description: "Failed to retrieve encrypted ledger." });
        }
      };
      fetchDetails();
    }
  }, [selectedVendor]);

  // --- Functions ---
  const handleExportCSV = (vendor: Vendor) => {
    const entries = ledgerData[vendor.id] || [];
    const csvHeader = "Date,Description,Type,Debit(Paid),Credit(Due),Balance\n";
    
    // Prevent Excel/CSV Injection (Sanitizing start characters =, +, -, @)
    const csvRows = entries.map(e => {
      const safeDesc = e.description.replace(/^[=+\-@]/, "'");
      return `${e.date},${safeDesc},${e.type},${e.debit},${e.credit},${e.balance}`;
    }).join("\n");

    const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SECURE_LEDGER_${vendor.company.replace(/\s+/g, '_')}.csv`;
    link.click();
    toast.success("VERIFIED EXPORT", { description: "CSV Statement generated successfully." });
  };

  const handleWhatsAppUpdate = (vendor: Vendor) => {
    const text = `Verified Statement: Assalam-o-Alaikum ${vendor.name}, our outstanding balance for ${vendor.company} is PKR ${vendor.totalDue.toLocaleString()}. Please verify records.`;
    window.open(`https://wa.me/${vendor.phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Security: Sanitizing search input before filtering
  const filteredVendors = useMemo(() => {
    const safeSearch = search.toLowerCase().replace(/[${};"']/g, ""); 
    return vendors.filter(v => 
      v.name.toLowerCase().includes(safeSearch) || 
      v.company.toLowerCase().includes(safeSearch)
    );
  }, [search, vendors]);

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans relative overflow-hidden">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* SECURITY WATERMARK (Subtle) */}
      <div className="absolute top-5 right-10 flex items-center gap-2 opacity-20 pointer-events-none">
        <ShieldCheck size={14} className="text-amber-500" />
        <span className="text-[8px] font-black uppercase tracking-widest">Nexus Security Protocol Active</span>
      </div>

      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
            Supplier <span className="text-amber-500">Ledger</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2">
            <Lock size={10} className="text-amber-500" /> Secure Accounts Payable Console
          </p>
        </motion.div>
        
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="VALIDATE SUPPLIER HASH..." 
            className="w-full bg-[#050b1d] border border-white/5 rounded-2xl py-5 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-white outline-none focus:border-amber-500 transition-all shadow-2xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* VENDOR LIST (LEFT) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Authenticated Entities</h2>
            {isLoading && <Loader2 size={14} className="animate-spin text-amber-500" />}
          </div>

          <div className="h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar space-y-4">
            {filteredVendors.map(vendor => (
              <motion.div 
                key={vendor.id}
                onClick={() => setSelectedVendor(vendor)}
                whileHover={{ x: 5, backgroundColor: "rgba(251, 191, 36, 0.05)" }}
                className={cn(
                  "p-8 rounded-[2.5rem] border cursor-pointer transition-all flex items-center justify-between group overflow-hidden relative",
                  selectedVendor?.id === vendor.id 
                    ? "bg-amber-500 border-amber-400 text-black shadow-2xl shadow-amber-500/20" 
                    : "bg-[#050b1d] border-white/5 hover:border-white/10"
                )}
              >
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner transition-colors",
                    selectedVendor?.id === vendor.id ? "bg-black/10" : "bg-white/5"
                  )}>
                    <Truck size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase italic tracking-tighter">{vendor.company}</h3>
                    <p className={cn("text-[10px] font-black mt-1", selectedVendor?.id === vendor.id ? "text-amber-900" : "text-slate-600")}>
                      PAYABLE: PKR {vendor.totalDue.toLocaleString()}
                    </p>
                  </div>
                </div>
                {vendor.totalDue > 500000 && selectedVendor?.id !== vendor.id && (
                  <div className="absolute top-0 right-10">
                    <span className="bg-rose-500/20 text-rose-500 text-[8px] font-black px-3 py-1 rounded-b-lg border-b border-rose-500/50">HIGH RISK</span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* LEDGER DETAILS (RIGHT) */}
        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedVendor ? (
              <motion.div 
                key={selectedVendor.id}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="bg-[#050b1d] border border-white/5 rounded-[4rem] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] flex flex-col h-full"
              >
                {/* ACCOUNT SUMMARY */}
                <div className="p-10 border-b border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-gradient-to-b from-white/[0.02] to-transparent">
                  <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-amber-500/10 rounded-[2rem] flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner">
                      <Landmark size={36} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">{selectedVendor.company}</h2>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-3 py-1 rounded-full border border-white/5">SUPPLIER: {selectedVendor.id}</span>
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">{selectedVendor.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => handleWhatsAppUpdate(selectedVendor)} className="p-5 bg-emerald-500/10 text-emerald-500 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-xl">
                      <MessageSquare size={20} />
                    </button>
                    <button onClick={() => handleExportCSV(selectedVendor)} className="p-5 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 hover:text-white transition-all border border-white/5">
                      <Download size={20} />
                    </button>
                    <button onClick={() => window.print()} className="p-5 bg-white/5 text-slate-400 rounded-2xl hover:bg-white/10 hover:text-white transition-all border border-white/5">
                      <Printer size={20} />
                    </button>
                  </div>
                </div>

                {/* LEDGER TABLE */}
                <div className="p-8 flex-1 overflow-x-auto overflow-y-auto max-h-[500px] custom-scrollbar">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-[#050b1d] z-10">
                      <tr className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] border-b border-white/5">
                        <th className="px-8 py-6">Timestamp</th>
                        <th className="px-8 py-6">Transaction Detail</th>
                        <th className="px-8 py-6 text-emerald-500">Paid (-)</th>
                        <th className="px-8 py-6 text-rose-500">Payable (+)</th>
                        <th className="px-8 py-6">Net Liability</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {!ledgerData[selectedVendor.id] ? (
                        <tr>
                          <td colSpan={5} className="py-24 text-center">
                            <Loader2 className="animate-spin mx-auto text-amber-500 mb-4" size={32} />
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600">Verifying Blockchain Hashes...</p>
                          </td>
                        </tr>
                      ) : (
                        ledgerData[selectedVendor.id].map((entry) => (
                          <tr key={entry.id} className="hover:bg-white/[0.03] transition-colors group">
                            <td className="px-8 py-8 text-[11px] font-black text-slate-500 uppercase italic">{entry.date}</td>
                            <td className="px-8 py-8">
                              <p className="text-xs font-black text-slate-200 uppercase tracking-tight group-hover:text-amber-500 transition-colors">{entry.description}</p>
                              <p className="text-[9px] font-bold text-slate-700 uppercase mt-1">Audit-ID: {entry.id}</p>
                            </td>
                            <td className="px-8 py-8 text-xs font-black text-emerald-500 italic">
                              {entry.debit > 0 ? `PKR ${entry.debit.toLocaleString()}` : '—'}
                            </td>
                            <td className="px-8 py-8 text-xs font-black text-rose-500 italic">
                              {entry.credit > 0 ? `PKR ${entry.credit.toLocaleString()}` : '—'}
                            </td>
                            <td className="px-8 py-8">
                              <span className="text-xs font-black text-white px-5 py-2 bg-white/5 rounded-xl border border-white/5 tracking-tighter">
                                PKR {entry.balance.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* FOOTER */}
                <div className="p-10 bg-white/[0.01] border-t border-white/5 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <ShieldAlert size={18} className="text-amber-500/50" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Total Outstanding: <span className="text-white ml-2 text-sm italic">PKR {selectedVendor.totalDue.toLocaleString()}</span>
                    </p>
                  </div>
                  <button className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-3 hover:gap-6 transition-all group">
                    Full Procurement Audit <ArrowUpRight size={14} className="group-hover:text-white" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="h-full min-h-[600px] border-2 border-dashed border-white/5 rounded-[4rem] flex flex-col items-center justify-center text-slate-700 bg-white/[0.01]">
                <Truck size={80} className="mb-6 opacity-10" />
                <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-600">Secure Vault Standby</h3>
                <p className="text-[9px] font-bold uppercase tracking-[0.4em] mt-3">Select a supplier identity to decrypt procurement history</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
      
      {/* SYSTEM LOGS FOOTER */}
      <div className="max-w-7xl mx-auto mt-10 flex justify-between items-center opacity-30 text-[8px] font-black uppercase tracking-[0.5em]">
        <p>User-Session: {currentUserId?.slice(0, 10)}...-Encrypted</p>
        <p>Nexus Ledger Protocol v4.0.2</p>
      </div>
    </div>
  );
}