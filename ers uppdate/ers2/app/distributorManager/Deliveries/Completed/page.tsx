"use client";

import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { 
  Eye, Download, Printer, Search, RefreshCw, 
  FileSpreadsheet, Truck, Loader2, X, ShieldCheck, 
  FileCheck, Calendar, User, MapPin
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useAuth } from "@/app/context/authcontext";
import * as XLSX from 'xlsx';

export default function CompletedDeliveries() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Filter States
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const getAuthToken = () => document.cookie.split("; ").find(row => row.startsWith("token="))?.split("=")[1];

  // --- 1. DATA FETCHING (Only Completed) ---
  const fetchCompleted = async () => {
    try {
      setIsInitialLoading(true);
      const token = getAuthToken();
      
      // Note: API endpoint should return deliveries with status 'COMPLETED'
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/distribution/listdel`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      console.log(response.data.data)

      const allData = response.data.data || [];
      
      // Frontend filtering to ensure ONLY completed records are shown
      const completedOnly = allData.filter((item: any) => item.status === "COMPLETED").map((item: any) => {
        const total = item.deliverynoteline?.reduce((acc: number, line: any) => {
          const price = parseFloat(line.product?.productprice?.[0]?.unit_price || 0);
          return acc + (parseFloat(line.delivered_qty) * price);
        }, 0);

        return {
          ...item,
          displayName: item.salesorder?.party?.name || "WALK-IN",
          displayTotal: total || 0,
          displayDate: new Date(item.delv_date).toISOString().split('T')[0]
        };
      });

      setDeliveries(completedOnly);
    } catch (error) {
      toast.error("Records load nahi ho sakay.");
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => { if (user?.id) fetchCompleted(); }, [user]);

  // --- 2. EXPORT TO EXCEL ---
  const exportToExcel = () => {
    const exportData = deliveries.map(d => ({
      "DN Number": `DN-${d.delv_note_id}`,
      "Customer": d.displayName,
      "Date": d.displayDate,
      "Status": d.status,
      "Total Amount": d.displayTotal,
      "SO Reference": d.so_id
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Archive");
    XLSX.writeFile(wb, `Completed_Deliveries_${new Date().getTime()}.xlsx`);
    toast.success("Archive Exported Successfully");
  };

  // --- 3. FILTER LOGIC ---
  const filteredDeliveries = useMemo(() => {
    return deliveries.filter(d => {
      const matchesSearch = d.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           String(d.delv_note_id).includes(searchTerm);
      const matchesDate = (!dateFrom || d.displayDate >= dateFrom) && 
                          (!dateTo || d.displayDate <= dateTo);
      return matchesSearch && matchesDate;
    });
  }, [searchTerm, deliveries, dateFrom, dateTo]);

  return (
    <div className="text-slate-200 font-sans pb-20 bg-[#020617] min-h-screen">
      <Toaster position="top-right" richColors theme="dark" />
      
      {/* --- HEADER --- */}
      <div className="px-8 py-10 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40 border-b border-slate-900">
        <div className="max-w-[1800px] mx-auto flex flex-col lg:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
             <div className="h-14 w-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] rotate-3">
               <FileCheck className="text-white" size={28} />
             </div>
             <div>
               <h1 className="text-3xl font-black text-white tracking-tighter italic uppercase">
                 Delivery <span className="text-emerald-500 not-italic">Archive</span>
               </h1>
               <p className="text-[10px] font-bold text-slate-500 tracking-[0.4em] uppercase">Audit & History Records</p>
             </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input 
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="SEARCH ARCHIVE..." 
                className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-xs font-bold text-white outline-none focus:border-emerald-600/50 transition-all" 
              />
            </div>
            <button onClick={exportToExcel} className="flex items-center gap-2 px-6 py-4 bg-emerald-600/10 border border-emerald-600/20 rounded-xl text-[10px] font-black text-emerald-500 hover:bg-emerald-600 hover:text-white transition-all uppercase tracking-widest">
              <FileSpreadsheet size={16} /> Export Excel
            </button>
            <button onClick={fetchCompleted} className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 hover:text-emerald-500 transition-all">
              <RefreshCw size={18} className={isInitialLoading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1800px] mx-auto p-8 space-y-8">
        
        {/* --- FILTERS --- */}
        <div className="bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-800/50 backdrop-blur-sm grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Calendar size={12}/> Date From</label>
            <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="w-full bg-[#020617] border border-slate-800 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-emerald-600" />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Calendar size={12}/> Date To</label>
            <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="w-full bg-[#020617] border border-slate-800 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-emerald-600" />
          </div>
          <button onClick={() => {setDateFrom(""); setDateTo(""); setSearchTerm("");}} className="bg-slate-800 text-slate-400 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-700 transition-all">Reset Filters</button>
          <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase">Total Records</span>
            <span className="text-xl font-black text-emerald-500 italic">{filteredDeliveries.length}</span>
          </div>
        </div>

        {/* --- TABLE --- */}
        <div className="bg-slate-900/20 rounded-[3rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/80 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800">
                  <th className="px-8 py-7">DN ID</th>
                  <th className="px-8 py-7">Customer Entity</th>
                  <th className="px-8 py-7">Delivery Date</th>
                  <th className="px-8 py-7 text-right">Settled Amount</th>
                  <th className="px-8 py-7 text-center">Audit Status</th>
                  <th className="px-8 py-7 text-center">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {isInitialLoading ? (
                  <tr><td colSpan={6} className="py-40 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" size={40}/></td></tr>
                ) : filteredDeliveries.length === 0 ? (
                    <tr><td colSpan={6} className="py-40 text-center text-slate-500 font-black uppercase tracking-widest">No matching archive found</td></tr>
                ) : filteredDeliveries.map((row) => (
                  <tr key={row.delv_note_id} className="hover:bg-emerald-500/[0.02] transition-colors group">
                    <td className="px-8 py-7 font-black text-emerald-500 italic text-lg tracking-tighter">DN-{row.delv_note_id}</td>
                    <td className="px-8 py-7 text-white font-bold uppercase text-sm tracking-tight">{row.displayName}</td>
                    <td className="px-8 py-7 text-slate-400 font-mono text-xs">{row.displayDate}</td>
                    <td className="px-8 py-7 text-right text-white font-black italic text-lg tracking-tighter">PKR {row.displayTotal.toLocaleString()}</td>
                    <td className="px-8 py-7 text-center">
                      <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase">
                        {row.status}
                      </span>
                    </td>
                    <td className="px-8 py-7 text-center">
                      <button onClick={() => setSelectedDelivery(row)} className="p-3 bg-slate-800/50 rounded-xl text-slate-400 hover:text-emerald-500 transition-all">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* --- AUDIT MODAL (View Only) --- */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl">
          <div className="relative w-full max-w-4xl bg-[#0f172a] rounded-[3rem] border border-slate-800 shadow-3xl overflow-hidden flex flex-col md:flex-row max-h-[85vh]">
            <div className="w-full md:w-80 bg-emerald-600 p-10 flex flex-col justify-between text-white">
               <div>
                  <ShieldCheck className="mb-6 opacity-30 shadow-white" size={48} />
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Verified Archive</p>
                  <h2 className="text-5xl font-black italic uppercase tracking-tighter">DN-{selectedDelivery.delv_note_id}</h2>
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl"><User size={14}/> <span className="text-[10px] font-black uppercase">{selectedDelivery.displayName}</span></div>
                    <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl"><Calendar size={14}/> <span className="text-[10px] font-black uppercase">{selectedDelivery.displayDate}</span></div>
                  </div>
               </div>
               <div className="pt-10 border-t border-white/20">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Final Settlement</p>
                  <p className="text-3xl font-black italic tracking-tighter uppercase">PKR {selectedDelivery.displayTotal.toLocaleString()}</p>
               </div>
            </div>

            <div className="flex-1 p-10 overflow-y-auto">
               <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Line Items Summary</h3>
                  <button onClick={() => setSelectedDelivery(null)} className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-all"><X size={24}/></button>
               </div>
               
               <div className="bg-slate-950/50 border border-slate-800/50 rounded-2xl overflow-hidden mb-8">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900/50 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                      <tr>
                        <th className="px-6 py-4">Item</th>
                        <th className="px-6 py-4 text-center">Qty</th>
                        <th className="px-6 py-4 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/30">
                      {selectedDelivery.deliverynoteline?.map((line: any, i: number) => (
                        <tr key={i}>
                          <td className="px-6 py-4 text-[11px] font-bold text-slate-300 uppercase">{line.product?.name}</td>
                          <td className="px-6 py-4 text-center text-[11px] font-black text-white italic">{line.delivered_qty}</td>
                          <td className="px-6 py-4 text-right text-[11px] font-black text-emerald-500 italic">
                            PKR {(parseFloat(line.delivered_qty) * parseFloat(line.product?.productprice?.[0]?.unit_price || 0)).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>

               <div className="flex gap-4">
                  <button onClick={() => window.print()} className="flex-1 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:text-white transition-all">
                    <Printer size={16} className="inline mr-2"/> Print Receipt
                  </button>
                  <button onClick={() => setSelectedDelivery(null)} className="flex-1 py-4 bg-emerald-600 rounded-2xl text-[10px] font-black uppercase text-white shadow-xl hover:bg-emerald-700 transition-all">
                    Close Archive
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}