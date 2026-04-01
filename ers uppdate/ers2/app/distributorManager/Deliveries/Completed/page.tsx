"use client";

import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { 
  Eye, Search, RefreshCw, FileSpreadsheet, Truck, 
  Loader2, X, ShieldCheck, FileCheck, Calendar, 
  User, Printer, Tag, CalendarDays, Layers, Hash, Clock
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useAuth } from "@/app/context/authcontext";
import * as XLSX from 'xlsx';

import { DeliveryNoteReportComponent } from "@/components/layout/DeliveryNoteReportComponent";

export default function CompletedDeliveries() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Filter States
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const getAuthToken = () => document.cookie.split("; ").find(row => row.startsWith("auth_token="))?.split("=")[1];

  // --- 1. DATA FETCHING ---
  const fetchCompleted = async () => {
    try {
      setIsInitialLoading(true);
      const token = getAuthToken();
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/distribution/listdel`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const allData = response.data.data || [];
      
      const completedOnly = allData.filter((item: any) => item.status === "COMPLETED").map((item: any) => {
        const lineTotal = item.deliverynoteline?.reduce((acc: number, line: any) => {
          const price = parseFloat(line.product?.productprice?.[0]?.unit_price || 0);
          return acc + (parseFloat(line.delivered_qty) * price);
        }, 0);

        return {
          ...item,
          displayName: item.salesorder?.party?.name || "WALK-IN",
          subTotal: lineTotal,
          displayTotal: parseFloat(item.nettotal || 0),
          displayDate: item.delv_date ? item.delv_date.split('T')[0] : '---'
        };
      });

      setDeliveries(completedOnly);
    } catch (error) {
      toast.error("Archive load karne mein masla hua.");
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => { if (user?.id) fetchCompleted(); }, [user]);

  // --- 2. EXCEL EXPORT ---
  const exportToExcel = () => {
    const exportData = filteredDeliveries.flatMap(d => 
      d.deliverynoteline.map((line: any) => ({
        "DN ID": `DN-${d.delv_note_id}`,
        "Date": d.displayDate,
        "Customer": d.displayName,
        "Product": line.product?.name,
        "Batch": line.batch?.batch_number || line.batch_number || "N/A",
        "MFG": (line.batch?.manufacturing_date || line.mfg_date || "").split('T')[0],
        "Expiry": (line.batch?.expiry_date || line.expiry_date || "").split('T')[0],
        "Qty": line.delivered_qty,
        "Net Total": d.displayTotal
      }))
    );
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Archive");
    XLSX.writeFile(wb, `Audit_Log_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel Report Generated!");
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

  const formatDate = (dateStr: string) => dateStr ? dateStr.split('T')[0] : '---';

  return (
    <div className="text-slate-200 font-sans pb-20 selection:bg-emerald-500/30">
      <Toaster position="top-right" richColors theme="dark" />
      
      {/* --- HEADER --- */}
      <div className="px-4 md:px-8 py-6 md:py-10 sticky top-0 backdrop-blur-md z-40 border-b border-slate-900 bg-black/20">
        <div className="max-w-[1900px] mx-auto flex flex-col xl:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 md:gap-6 self-start md:self-auto">
              <div className="h-12 w-12 md:h-14 md:w-14 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.3)] rotate-3 shrink-0">
                <FileCheck className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter italic uppercase leading-none">
                  Delivery <span className="text-emerald-500 not-italic">Archive</span>
                </h1>
                <p className="text-[9px] md:text-[10px] font-bold text-slate-500 tracking-[0.4em] uppercase font-mono mt-1">Settled Shipments & Logs</p>
              </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="relative w-full sm:flex-1 xl:w-96">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input onChange={(e) => setSearchTerm(e.target.value)} placeholder="SEARCH ARCHIVE..." className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-[10px] font-black text-white outline-none focus:border-emerald-600 transition-all uppercase" />
            </div>
            <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={exportToExcel} className="flex-1 sm:flex-none flex items-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-emerald-700 transition-all shadow-lg">
                  <FileSpreadsheet size={16} /> <span className="hidden sm:inline">Export Report</span>
                </button>
                <button onClick={fetchCompleted} className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-500 hover:text-emerald-500 transition-all cursor-pointer">
                  <RefreshCw size={18} className={isInitialLoading ? "animate-spin" : ""} />
                </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-[1900px] mx-auto p-4 md:p-8 space-y-6">
        
        {/* --- FILTERS --- */}
        <div className="bg-slate-900/40 p-5 md:p-8 rounded-[2.5rem] border border-slate-800/50 backdrop-blur-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-end shadow-xl">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 italic"><Calendar size={12}/> Date From</label>
            <input type="date" value={dateFrom} onChange={(e)=>setDateFrom(e.target.value)} className="w-full bg-[#020617] border border-slate-800 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-emerald-600" />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 italic"><Calendar size={12}/> Date To</label>
            <input type="date" value={dateTo} onChange={(e)=>setDateTo(e.target.value)} className="w-full bg-[#020617] border border-slate-800 rounded-xl py-3 px-4 text-xs font-bold text-white outline-none focus:border-emerald-600" />
          </div>
          <button onClick={() => {setDateFrom(""); setDateTo(""); setSearchTerm("");}} className="bg-slate-800 text-slate-400 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500/10 hover:text-red-500 transition-all cursor-pointer">Reset Archive View</button>
          
          <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-xl flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Logs Loaded</span>
              <span className="text-2xl font-black text-emerald-500 italic">{filteredDeliveries.length}</span>
            </div>
            <div className="h-10 w-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500">
               <Layers size={20}/>
            </div>
          </div>
        </div>

        {/* --- TABLE --- */}
        <div className="bg-slate-900/20 rounded-[1.5rem] md:rounded-[3rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-900/80 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800">
                  <th className="px-8 py-7">DN Ref</th>
                  <th className="px-8 py-7">Settled Date</th>
                  <th className="px-8 py-7">Party Name</th>
                  <th className="px-8 py-7 text-right">Net Amount</th>
                  <th className="px-8 py-7 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {isInitialLoading ? (
                  <tr><td colSpan={5} className="py-40 text-center"><Loader2 className="animate-spin mx-auto text-emerald-500" size={40}/></td></tr>
                ) : filteredDeliveries.map((row) => (
                  <tr key={row.delv_note_id} className="hover:bg-emerald-500/[0.02] transition-colors group">
                    <td className="px-8 py-7 font-black text-emerald-500 italic text-lg tracking-tighter uppercase">DN-{row.delv_note_id}</td>
                    <td className="px-8 py-7 text-white font-mono text-[11px] font-bold">{row.displayDate}</td>
                    <td className="px-8 py-7 text-white font-bold uppercase text-[11px] tracking-tight">{row.displayName}</td>
                    <td className="px-8 py-7 text-right text-white font-black italic text-lg font-mono">PKR {row.displayTotal.toLocaleString()}</td>
                    <td className="px-8 py-7 text-center">
                      <button onClick={() => setSelectedDelivery(row)} className="p-3 bg-slate-800/50 rounded-xl text-slate-400 hover:text-emerald-500 transition-all cursor-pointer">
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

      {/* --- DETAILED VIEW MODAL --- */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl overflow-y-auto">
            <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl relative">
              
              {/* Modal Toolbar (Sticky) */}
              <div className="sticky top-0 z-10 p-4 bg-slate-900 flex justify-between items-center rounded-t-[2rem]">
                <h3 className="text-white font-black italic uppercase ml-4">Delivery Note Preview</h3>
                <div className="flex gap-4">
                  <button 
                    onClick={() => window.print()}
                    className="px-6 py-2 bg-emerald-500 text-black text-[10px] font-black uppercase rounded-xl hover:bg-emerald-400 transition-all"
                  >
                    Print Report
                  </button>
                  <button 
                    onClick={() => setSelectedDelivery(null)} 
                    className="p-2 bg-white/10 text-white rounded-full hover:bg-red-500 transition-all"
                  >
                    <X size={20}/>
                  </button>
                </div>
              </div>

              {/* Report Content Area */}
              <div className="p-6 bg-gray-100 rounded-b-[2rem]">
                <div id="printable-area">
                  <DeliveryNoteReportComponent data={selectedDelivery} />
                </div>
              </div>

            </div>
        </div>
      )}
    </div>
  );
}