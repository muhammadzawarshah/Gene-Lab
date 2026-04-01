"use client";

import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import {
  Truck, Eye, Search, X, Loader2, Edit3,
  CheckCircle2, Package, Tag, CreditCard, ShieldCheck,
  Truck as TransportIcon, CalendarDays, Activity, FileText
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useAuth } from "@/app/context/authcontext";
import { DeliveryNoteReportComponent } from "@/components/layout/DeliveryNoteReportComponent";

export default function PendingDeliveries() {
  const { user } = useAuth();
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [selectedDelivery, setSelectedDelivery] = useState<any>(null);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isApproved, setIsApproved] = useState(false);
  const [batchOptions, setBatchOptions] = useState<{ [key: string]: any[] }>({});
  const [reportDelivery, setReportDelivery] = useState<any>(null);

  const getAuthToken = () => document.cookie.split("; ").find((row) => row.startsWith("auth_token="))?.split("=")[1];

  // --- Data Fetching ---
  const fetchDeliveries = async () => {
    try {
      setIsInitialLoading(true);
      const token = getAuthToken();
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/distribution/listdel`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const mappedData = (response.data.data || []).map((item: any) => {
        const lineTotal = item.deliverynoteline?.reduce((acc: number, line: any) => {
          const price = parseFloat(line.product?.productprice?.[0]?.unit_price || 0);
          const qty = parseFloat(line.delivered_qty || 0);
          return acc + (qty * price);
        }, 0);

        return {
          ...item,
          displayName: item.salesorder?.party?.name || "N/A",
          displayTotal: lineTotal || 0,
          discount: parseFloat(item.discount || 0),
          transportCharges: parseFloat(item.transportcharges || 0),
          netTotal: parseFloat(item.nettotal || 0),
          status: item.status || "PENDING" // Initial Status
        };
      });
      setDeliveries(mappedData);
    } catch (error) {
      toast.error("Records load karne mein masla hua.");
    } finally {
      setIsInitialLoading(false);
    }
  };

  const fetchAllBatches = async () => {
    try {
      const token = getAuthToken();
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/setup-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allBatches = res.data.data.batch || [];
      const grouped = allBatches.reduce((acc: any, b: any) => {
        if (!acc[b.product_id]) acc[b.product_id] = [];
        acc[b.product_id].push(b);
        return acc;
      }, {});
      setBatchOptions(grouped);
    } catch (err) { console.error("Batch fetch error", err); }
  };

  useEffect(() => { if (user?.id) { fetchDeliveries(); fetchAllBatches(); } }, [user]);

  // --- Finalize Logic ---
  const handleFinalize = async () => {
    if (!selectedDelivery || (!isApproved && mode === 'edit')) {
      toast.error("Please approve the details first.");
      return;
    }
    setLoadingId(selectedDelivery.delv_note_id);
    try {
      const token = getAuthToken();
      const payload = {
        delv_note_id: selectedDelivery.delv_note_id,
        status: selectedDelivery.status, // Dinamic Status from State
        discount_amount: selectedDelivery.discount,
        transportation_charges: selectedDelivery.transportCharges,
        lines: selectedDelivery.deliverynoteline.map((l: any) => ({
          delv_note_line_id: l.delv_note_line_id,
          delivered_qty: parseFloat(l.delivered_qty || 0),
          product_id: l.product_id,
          batch_id: l.batch_id,
          mfg_date: l.mfg_date,
          expiry_date: l.expiry_date
        }))
      };
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/distribution/updatedel`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`Shipment marked as ${selectedDelivery.status}!`);
      setSelectedDelivery(null);
      fetchDeliveries();
    } catch (error) {
      toast.error("Update fail ho gaya.");
    } finally { setLoadingId(null); }
  };

  const filtered = useMemo(() => {
    return deliveries.filter(d =>
      d.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(d.delivery_number).includes(searchTerm)
    );
  }, [searchTerm, deliveries]);

  const formatDate = (dateStr: string) => dateStr ? dateStr.split('T')[0] : '---';

  return (
    <div className="text-slate-200 pb-20 font-sans">
      <Toaster position="top-right" richColors theme="dark" />

      {/* Header & Table same rahengi... */}
      <header className="px-8 py-10 border-b border-slate-900 backdrop-blur-md z-40">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="h-14 w-14 bg-rose-600 rounded-2xl flex items-center justify-center shadow-lg rotate-3">
              <Truck className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black italic tracking-tighter uppercase text-white">Pending <span className="text-rose-600">Shipments</span></h1>
              <p className="text-[10px] font-bold text-slate-500 tracking-[0.4em] uppercase">Warehouse Logistics</p>
            </div>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search DN..." className="w-full bg-slate-900 border border-slate-800 rounded-xl py-4 pl-14 pr-6 text-sm outline-none focus:border-rose-600/50" />
          </div>
        </div>
      </header>

      {/* Main Table Body */}
      <main className="max-w-[1600px] mx-auto p-8 animate-in fade-in duration-700">
        <div className="bg-slate-900/20 border border-slate-800/50 rounded-[2rem] overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-900/50 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                <th className="px-6 py-6">DN Ref</th>
                <th className="px-6 py-6">Customer</th>
                <th className="px-6 py-6 text-center">Batch No</th>
                <th className="px-6 py-6 text-center text-blue-400">MFG Date</th>
                <th className="px-6 py-6 text-center text-rose-400">Expiry Date</th>
                <th className="px-6 py-6 text-right">Net Value</th>
                <th className="px-6 py-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {!isInitialLoading && filtered.map((item) => (
                <tr key={item.delv_note_id} className="hover:bg-rose-600/[0.02] transition-colors group">
                  <td className="px-6 py-6 font-black text-rose-500 italic uppercase">{item.delivery_number}</td>
                  <td className="px-6 py-6 font-bold text-white uppercase text-xs">{item.displayName}</td>
                  <td className="px-6 py-6 text-center font-mono text-amber-500 text-xs font-bold">{item.deliverynoteline?.[0]?.batch?.batch_number || '---'}</td>
                  <td className="px-6 py-6 text-center text-[11px] text-slate-400 uppercase">{formatDate(item.deliverynoteline?.[0]?.batch?.manufacturing_date)}</td>
                  <td className="px-6 py-6 text-center">
                    <span className="bg-rose-500/10 text-rose-500 px-2 py-1 rounded text-[10px] font-bold">{formatDate(item.deliverynoteline?.[0]?.batch?.expiry_date)}</span>
                  </td>
                  <td className="px-6 py-6 text-right font-black text-white italic tracking-tighter">{item.netTotal.toLocaleString()}</td>
                  <td className="px-6 py-6 text-center">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => { setSelectedDelivery(item); setMode("view"); }} className="p-3 bg-slate-800/50 rounded-xl text-slate-400 hover:text-white cursor-pointer"><Eye size={16} /></button>
                      <button onClick={() => setReportDelivery(item)} className="p-3 bg-slate-800/50 rounded-xl text-emerald-500 hover:bg-emerald-600 hover:text-white cursor-pointer"><FileText size={16} /></button>
                      <button onClick={() => { setSelectedDelivery(item); setMode("edit"); }} className="p-3 bg-slate-800/50 rounded-xl text-rose-500 hover:bg-rose-600 hover:text-white cursor-pointer"><Edit3 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-xl bg-black/80 animate-in fade-in duration-300">
          <div className="w-full max-w-7xl bg-[#0f172a] border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className={`p-8 flex justify-between items-center transition-colors duration-500 ${mode === 'edit' ? 'bg-rose-600' : 'bg-slate-900'}`}>
              <div className="flex items-center gap-4 text-white">
                <Package size={28} className="animate-pulse" />
                <div>
                  <h2 className="text-3xl font-black italic uppercase">{selectedDelivery.delivery_number}</h2>
                  <p className="text-[10px] font-bold uppercase opacity-70">{selectedDelivery.displayName}</p>
                </div>
              </div>
              <button onClick={() => setSelectedDelivery(null)} className="p-3 hover:bg-black/20 rounded-2xl cursor-pointer text-white transition-transform hover:rotate-90"><X /></button>
            </div>

            <div className="flex-1 p-8 overflow-y-auto">
              {/* Main Logic: Status Update Box */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800 group transition-all hover:border-slate-600">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-2 flex items-center gap-2"><Activity size={12} /> Delivery Status</span>
                  {mode === 'edit' ? (
                    <select
                      className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl py-3 px-4 text-amber-500 font-black text-sm outline-none focus:border-rose-600 transition-all appearance-none cursor-pointer"
                      value={selectedDelivery.status}
                      onChange={(e) => setSelectedDelivery({ ...selectedDelivery, status: e.target.value })}
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="COMPLETED">COMPLETED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  ) : (
                    <div className="text-xl font-black text-white italic uppercase tracking-tighter">{selectedDelivery.status}</div>
                  )}
                </div>
                <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800 group">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">Adjust Discount</span>
                  {mode === 'edit' ? (
                    <input type="number" className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl py-3 px-4 text-rose-500 font-black text-lg outline-none focus:border-rose-600 transition-all" value={selectedDelivery.discount} onChange={(e) => {
                      const val = parseFloat(e.target.value || "0");
                      setSelectedDelivery({ ...selectedDelivery, discount: val, netTotal: (selectedDelivery.displayTotal - val) + selectedDelivery.transportCharges });
                    }} />
                  ) : <div className="text-xl font-black text-white italic">PKR {selectedDelivery.discount.toLocaleString()}</div>}
                </div>
                <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-slate-800 group">
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">Transport Charges</span>
                  {mode === 'edit' ? (
                    <input type="number" className="w-full bg-slate-950 border-2 border-slate-800 rounded-xl py-3 px-4 text-rose-500 font-black text-lg outline-none focus:border-rose-600 transition-all" value={selectedDelivery.transportCharges} onChange={(e) => {
                      const val = parseFloat(e.target.value || "0");
                      setSelectedDelivery({ ...selectedDelivery, transportCharges: val, netTotal: (selectedDelivery.displayTotal - selectedDelivery.discount) + val });
                    }} />
                  ) : <div className="text-xl font-black text-white italic">PKR {selectedDelivery.transportCharges.toLocaleString()}</div>}
                </div>
                <div className="bg-rose-600/10 p-6 rounded-[2rem] border border-rose-600/30 group">
                  <span className="text-[10px] font-black uppercase text-rose-500 block mb-2">Final Net Total</span>
                  <div className="text-3xl font-black text-white italic tracking-tighter">PKR {selectedDelivery.netTotal.toLocaleString()}</div>
                </div>
              </div>

              {/* Product Lines Table */}
              <div className="bg-slate-950/50 rounded-[2rem] border border-slate-800/50 overflow-x-auto mb-8 shadow-inner">
                <table className="w-full text-left min-w-[1100px]">
                  <thead className="bg-slate-900/80 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-6">Product</th>
                      <th className="px-6 py-6 text-center">Batch Selection</th>
                      <th className="px-6 py-6 text-center">MFG Date</th>
                      <th className="px-6 py-6 text-center">Expiry Date</th>
                      <th className="px-6 py-6 text-center">Qty</th>
                      <th className="px-6 py-6 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {selectedDelivery.deliverynoteline?.map((line: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-6 text-xs font-black text-slate-100 uppercase">{line.product?.name}</td>
                        <td className="px-6 py-6 text-center">
                          {mode === 'edit' ? (
                            <select
                              className="bg-slate-950 border-2 border-slate-800 rounded-xl py-2 px-3 text-amber-500 font-bold text-xs outline-none focus:border-rose-600 w-full"
                              value={line.batch_id || ""}
                              onChange={(e) => {
                                const bId = Number(e.target.value);
                                const currentBatch = (batchOptions[line.product_id] || []).find(b => b.batch_id === bId);
                                const updatedLines = [...selectedDelivery.deliverynoteline];
                                updatedLines[idx] = { ...updatedLines[idx], batch_id: bId, batch: currentBatch, mfg_date: currentBatch?.manufacturing_date, expiry_date: currentBatch?.expiry_date };
                                setSelectedDelivery({ ...selectedDelivery, deliverynoteline: updatedLines });
                              }}
                            >
                              <option value="">Select Batch</option>
                              {(batchOptions[line.product_id] || []).map((b: any) => (
                                <option key={b.batch_id} value={b.batch_id}>{b.batch_number} (Avl: {b.available_quantity})</option>
                              ))}
                            </select>
                          ) : <span className="font-mono text-amber-500 font-bold text-xs">{line.batch?.batch_number || '---'}</span>}
                        </td>
                        <td className="px-6 py-6 text-center text-[11px] text-slate-400 uppercase font-bold">{formatDate(line.batch?.manufacturing_date || line.mfg_date)}</td>
                        <td className="px-6 py-6 text-center">
                          <span className="bg-rose-500/10 text-rose-500 px-3 py-1 rounded text-[10px] font-bold">{formatDate(line.batch?.expiry_date || line.expiry_date)}</span>
                        </td>
                        <td className="px-6 py-6 text-center">
                          {mode === 'edit' ? (
                            <input type="number" className="w-20 bg-slate-950 border-2 border-slate-800 rounded-xl py-2 text-center text-rose-500 font-black text-xs outline-none focus:border-rose-600" value={line.delivered_qty} onChange={(e) => {
                              const updatedLines = [...selectedDelivery.deliverynoteline];
                              updatedLines[idx].delivered_qty = e.target.value;
                              setSelectedDelivery({ ...selectedDelivery, deliverynoteline: updatedLines });
                            }} />
                          ) : <span className="text-xs font-black text-white italic">{line.delivered_qty}</span>}
                        </td>
                        <td className="px-6 py-6 text-right font-black text-white italic text-sm">PKR {(parseFloat(line.delivered_qty || 0) * parseFloat(line.product?.productprice?.[0]?.unit_price || 0)).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Approval & Footer Buttons */}
              {mode === 'edit' && (
                <div className="flex items-center gap-4 mb-8 bg-slate-900/60 p-6 rounded-[2rem] border border-slate-800 cursor-pointer group transition-all" onClick={() => setIsApproved(!isApproved)}>
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${isApproved ? 'bg-rose-600 scale-110 shadow-lg' : 'bg-slate-800'}`}>
                    {isApproved && <ShieldCheck size={20} className="text-white animate-in zoom-in" />}
                  </div>
                  <span className="text-xs font-black text-white uppercase italic tracking-widest">Approve Status & Data</span>
                </div>
              )}

              <div className="flex gap-4">
                <button onClick={() => setSelectedDelivery(null)} className="flex-1 py-5 border-2 border-slate-800 rounded-2xl text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] hover:text-red-500 transition-all active:scale-95 cursor-pointer">CANCEL</button>
                {mode === 'edit' && (
                  <button onClick={handleFinalize} disabled={!!loadingId || !isApproved} className="flex-[2] py-5 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] shadow-xl hover:bg-rose-700 disabled:opacity-20 flex items-center justify-center gap-3 transition-all active:scale-95 cursor-pointer">
                    {loadingId ? <Loader2 className="animate-spin" /> : <CheckCircle2 size={18} />} SYNC & FINALIZE
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Delivery Note Report Modal */}
      {reportDelivery && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl relative">
            <div className="sticky top-0 z-10 p-4 bg-slate-900 flex justify-between items-center rounded-t-[2rem]">
              <h3 className="text-white font-black italic uppercase ml-4">Delivery Note Report</h3>
              <div className="flex gap-4">
                <button onClick={() => window.print()} className="px-6 py-2 bg-emerald-500 text-black text-[10px] font-black uppercase rounded-xl hover:bg-emerald-400 transition-all">Print PDF</button>
                <button onClick={() => setReportDelivery(null)} className="p-2 bg-white/10 text-white rounded-full hover:bg-red-500 transition-all"><X size={20} /></button>
              </div>
            </div>
            <div className="p-6 bg-gray-100 rounded-b-[2rem]">
              <div id="printable-area">
                <DeliveryNoteReportComponent data={reportDelivery} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}