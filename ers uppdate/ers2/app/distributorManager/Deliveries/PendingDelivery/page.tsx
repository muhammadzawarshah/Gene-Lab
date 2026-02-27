"use client";

import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import { 
  Truck, Eye, Search, X, Loader2, Edit3, 
  CheckCircle2, Calendar, User
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useAuth } from "@/app/context/authcontext";

export default function PendingDeliveries() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const getAuthToken = () => document.cookie.split("; ").find((row) => row.startsWith("token="))?.split("=")[1];

  // --- Data Fetching ---
  const fetchDeliveries = async () => {
    try {
      setIsInitialLoading(true);
      const token = getAuthToken();
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/distribution/listdel`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const mappedData = (response.data.data || []).map((item: any) => {
        const totalAmount = item.deliverynoteline?.reduce((acc: number, line: any) => {
          const price = parseFloat(line.product?.productprice?.[0]?.unit_price || 0);
          const qty = parseFloat(line.delivered_qty || 0);
          return acc + (qty * price);
        }, 0);

        return {
          ...item,
          displayName: item.salesorder?.party?.name || "N/A",
          displayTotal: totalAmount || 0
        };
      });

      setDeliveries(mappedData);
    } catch (error) {
      toast.error("Records load karne mein masla hua.");
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => { if (user?.id) fetchDeliveries(); }, [user]);

  // --- Final Update Action (Controller compatible) ---
  const handleFinalize = async () => {
    if (!selectedDelivery) return;
    setLoadingId(selectedDelivery.delv_note_id);
    
    try {
      const token = getAuthToken();
      
      // Controller expectations ke mutabiq payload
      const payload = {
        delv_note_id: selectedDelivery.delv_note_id,
        status: "COMPLETED",
        remarks: "Updated from Delivery Control Panel",
        lines: selectedDelivery.deliverynoteline.map((l: any) => ({
          delv_note_line_id: l.delv_note_line_id,
          delivered_qty: l.delivered_qty,
          product_id: l.product_id
        }))
      };

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/distribution/updatedel`, 
        payload, 
        { headers: { Authorization: `Bearer ${token}` }}
      );

      toast.success(`DN-${selectedDelivery.delv_note_id} is now COMPLETED!`);
      setSelectedDelivery(null);
      fetchDeliveries(); // Refresh the list
    } catch (error) {
      console.error(error);
      toast.error("Update fail ho gaya. Database check karein.");
    } finally {
      setLoadingId(null);
    }
  };

  const filtered = useMemo(() => {
    return deliveries.filter(d => 
      d.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      String(d.delv_note_id).includes(searchTerm)
    );
  }, [searchTerm, deliveries]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-20 font-sans">
      <Toaster position="top-right" richColors theme="dark" />

      {/* --- Header --- */}
      <header className="px-8 py-10 border-b border-slate-900 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 bg-rose-600 rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(225,29,72,0.3)] rotate-3">
              <Truck className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white">
                Pending <span className="text-rose-600">Shipments</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-500 tracking-[0.4em] uppercase">Logistics & Distribution Control</p>
            </div>
          </div>

          <div className="relative w-full md:w-96 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-rose-500 transition-colors" size={18} />
            <input 
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Customer or DN ID..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 pl-14 pr-6 text-sm outline-none focus:border-rose-600/50 focus:ring-4 focus:ring-rose-600/5 transition-all"
            />
          </div>
        </div>
      </header>

      {/* --- Table Section --- */}
      <main className="max-w-[1600px] mx-auto p-8">
        <div className="bg-slate-900/20 border border-slate-800/50 rounded-[2rem] overflow-hidden backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                <th className="px-8 py-6">Reference</th>
                <th className="px-8 py-6">Customer</th>
                <th className="px-8 py-6">Current Status</th>
                <th className="px-8 py-6 text-right">Value (PKR)</th>
                <th className="px-8 py-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {isInitialLoading ? (
                <tr><td colSpan={5} className="py-32 text-center"><Loader2 className="animate-spin mx-auto text-rose-500" size={40} /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No Pending Deliveries Found</td></tr>
              ) : filtered.map((item) => (
                <tr key={item.delv_note_id} className="hover:bg-rose-600/[0.02] transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-lg font-black text-rose-500 italic">DN-{item.delv_note_id}</span>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">SO#{item.so_id}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 font-bold text-white uppercase text-sm">{item.displayName}</td>
                  <td className="px-8 py-6">
                    <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-1 rounded-full text-[9px] font-black uppercase italic tracking-wider">
                      {item.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-right font-black text-white italic text-lg tracking-tighter">
                    {item.displayTotal.toLocaleString()}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setSelectedDelivery(item); setMode("view"); }} className="p-3 bg-slate-800/50 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-all shadow-lg"><Eye size={18}/></button>
                      <button onClick={() => { setSelectedDelivery(item); setMode("edit"); }} className="p-3 bg-slate-800/50 rounded-xl text-rose-500 hover:bg-rose-600 hover:text-white transition-all shadow-lg"><Edit3 size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* --- Unified View/Edit Modal --- */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/80">
          <div className="w-full max-w-5xl bg-[#0f172a] border border-slate-800 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col md:flex-row max-h-[85vh]">
            
            {/* Modal Sidebar */}
            <div className={`w-full md:w-80 p-10 flex flex-col justify-between transition-colors duration-500 ${mode === 'edit' ? 'bg-rose-600' : 'bg-slate-900'}`}>
              <div>
                <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 backdrop-blur-md">
                  {mode === 'edit' ? <Edit3 className="text-white" /> : <Eye className="text-white" />}
                </div>
                <h2 className="text-4xl font-black italic uppercase text-white leading-none mb-2">DN-{selectedDelivery.delv_note_id}</h2>
                <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.3em] mb-10">
                  {mode === 'edit' ? 'Adjustment Active' : 'Read Only View'}
                </p>
                
                <div className="space-y-6 text-white/90">
                  <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
                    <User size={16} className="text-white/40"/> 
                    <span className="text-xs font-bold uppercase tracking-wider truncate">{selectedDelivery.displayName}</span>
                  </div>
                  <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5">
                    <Calendar size={16} className="text-white/40"/> 
                    <span className="text-xs font-bold uppercase tracking-wider">{new Date(selectedDelivery.delv_date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-white/10">
                <p className="text-[10px] font-black text-white/40 uppercase mb-1 tracking-widest">Grand Total</p>
                <p className="text-3xl font-black italic text-white tracking-tighter">PKR {selectedDelivery.displayTotal.toLocaleString()}</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-10 overflow-y-auto bg-slate-950/30">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-xl font-black uppercase text-white italic tracking-tighter">
                  {mode === 'edit' ? 'Modify Quantities' : 'Delivery Details'}
                </h3>
                <button onClick={() => setSelectedDelivery(null)} className="p-3 bg-slate-900 rounded-2xl text-slate-500 hover:text-white transition-colors hover:bg-slate-800"><X size={20}/></button>
              </div>

              <div className="bg-slate-900/40 rounded-3xl border border-slate-800/50 overflow-hidden mb-8 shadow-inner">
                <table className="w-full text-left">
                  <thead className="bg-slate-900/80 text-[9px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-5">Product</th>
                      <th className="px-6 py-5 text-center">Delivered Qty</th>
                      <th className="px-6 py-5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {selectedDelivery.deliverynoteline?.map((line: any, idx: number) => {
                      const unitPrice = parseFloat(line.product?.productprice?.[0]?.unit_price || 0);
                      return (
                        <tr key={idx} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-6">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-100 uppercase tracking-tight">{line.product?.name}</span>
                              <span className="text-[9px] text-rose-500 font-black uppercase italic tracking-widest mt-0.5">{line.product?.product_id.split('-')[0]}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            {mode === 'edit' ? (
                              <div className="flex items-center justify-center gap-2">
                                <input 
                                  type="number"
                                  className="w-24 bg-slate-950 border-2 border-slate-800 rounded-xl py-2 text-center text-rose-500 font-black text-xs outline-none focus:border-rose-600 transition-all"
                                  value={line.delivered_qty}
                                  onChange={(e) => {
                                    const updated = [...selectedDelivery.deliverynoteline];
                                    updated[idx].delivered_qty = e.target.value;
                                    const newTotal = updated.reduce((a, b) => a + (parseFloat(b.delivered_qty || 0) * parseFloat(b.product?.productprice?.[0]?.unit_price || 0)), 0);
                                    setSelectedDelivery({...selectedDelivery, deliverynoteline: updated, displayTotal: newTotal});
                                  }}
                                />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{line.uom?.name}</span>
                              </div>
                            ) : (
                              <span className="text-xs font-black text-white bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">{line.delivered_qty} {line.uom?.name}</span>
                            )}
                          </td>
                          <td className="px-6 py-6 text-right font-black text-white italic text-xs tracking-tighter">
                            PKR {(parseFloat(line.delivered_qty || 0) * unitPrice).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button 
                  onClick={() => setSelectedDelivery(null)}
                  className="flex-1 py-5 border-2 border-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-500 hover:bg-slate-900 transition-all tracking-[0.2em] hover:text-slate-300"
                >
                  DISMISS
                </button>
                {mode === 'edit' && (
                  <button 
                    onClick={handleFinalize}
                    disabled={!!loadingId}
                    className="flex-[2] py-5 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-[0_10px_30px_rgba(225,29,72,0.3)] hover:bg-rose-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {loadingId ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle2 size={18}/>} SYNC & FINALIZE
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}