"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'sonner';
import { 
  ChevronDown, ShieldCheck, Loader2, Lock, Receipt, User, Calendar
} from 'lucide-react';

// --- TYPES (Aapke JSON ke mutabiq) ---
interface OrderItem {
  line_id: string;
  product_name: string;
  delivered_qty: string | number;
  uom_name: string;
  batch_no: string;
  amount: number;
}

interface OrderReference {
  _id: string; 
  deliveryNumber: string;
}

interface SelectedOrderDetails {
  customerName: string;
  date: string;
  status: string;
}

export default function CreateInvoice() {
  const [orderList, setOrderList] = useState<OrderReference[]>([]);
  const [selectedDN, setSelectedDN] = useState(""); 
  const [items, setItems] = useState<OrderItem[]>([]);
  const [orderMeta, setOrderMeta] = useState<SelectedOrderDetails | null>(null);
  const [loading, setLoading] = useState(false);
  
  const token = Cookies.get('auth_token');
  const currentUserId = Cookies.get('user_id');
  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  const api = useMemo(() => axios.create({
    baseURL: API_BASE,
    headers: { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }), [token, API_BASE]);

  // --- 1. FETCH DELIVERY NOTES LIST ---
  const fetchOrderList = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/api/v1/distribution/listdel');
      const rawData = res.data.data || res.data;
      const dataArray = Array.isArray(rawData) ? rawData : [];
      
      const formattedList = dataArray.map((ord: any) => ({
        _id: ord.delivery_number, // Use delivery_number as key
        deliveryNumber: ord.delivery_number
      }));

      setOrderList(formattedList);
    } catch (err) {
      toast.error("Failed to load delivery notes");
    }
  }, [api, token]);

  useEffect(() => { fetchOrderList(); }, [fetchOrderList]);

  // --- 2. FETCH SPECIFIC DETAILS (JSON Mapping) ---
  const fetchOrderDetails = useCallback(async (dn: string) => {
    if (!dn) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/distribution/specificdel/${dn}`);
      const data = res.data.data;
      
      if (!data) throw new Error("No data found");

      // Customer and Meta Info
      setOrderMeta({
        customerName: data.salesorder?.party?.name || "Unknown Customer",
        date: data.delv_date ? new Date(data.delv_date).toLocaleDateString() : "N/A",
        status: data.status || "N/A"
      });

      // Items Mapping
      const rawLines = data.deliverynoteline || [];
      const mappedItems = rawLines.map((line: any) => ({
        line_id: line.delv_note_line_id?.toString(),
        product_name: line.product?.name || "N/A",
        delivered_qty: line.delivered_qty || 0,
        uom_name: line.uom?.name || "Unit",
        batch_no: line.batch?.batch_no || "No Batch",
        amount: Number(data.salesorder?.total_amount || 0) / rawLines.length // Simple split or use your logic
      }));

      setItems(mappedItems);
    } catch (err) {
      console.error(err);
      toast.error("Error fetching delivery details");
      setItems([]);
      setOrderMeta(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (selectedDN) fetchOrderDetails(selectedDN);
    else {
      setItems([]);
      setOrderMeta(null);
    }
  }, [selectedDN, fetchOrderDetails]);

  // --- ACTIONS ---
  const handleSingleInvoice = async (item: OrderItem) => {
    const toastId = toast.loading("Processing Invoice...");
    try {
      await api.post(`/api/v1/finance/invoices/generate/${selectedDN}`, {
        delivery_number: selectedDN,
        items: [item],
        total_amount: item.amount
      });
      toast.success("Invoiced successfully", { id: toastId });
      setItems(prev => prev.filter(i => i.line_id !== item.line_id));
    } catch (err) {
      toast.error("Invoice creation failed", { id: toastId });
    }
  };

  const handleBulkInvoice = async () => {
    const toastId = toast.loading("Generating Full Invoice...");
    try {
      await api.post('/api/v1/invoices/bulk-create', {
        delivery_number: selectedDN,
        items: items
      });
      toast.success("Bulk Invoice Created", { id: toastId });
      setSelectedDN("");
      fetchOrderList();
    } catch (err) {
      toast.error("Bulk process failed", { id: toastId });
    }
  };

  // --- STYLES ---
  const thStyle = "p-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-white/[0.01]";
  const tdStyle = "p-4 text-xs font-bold text-white border-b border-white/5 whitespace-nowrap";

  return (
    <div className="text-white p-4 md:p-10 pb-24 bg-[#020617] min-h-screen">
      <Toaster position="top-right" theme="dark" richColors />

      {/* HEADER SECTION */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-10">
        <div className="border-l-4 border-emerald-500 pl-6">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <Receipt className="text-emerald-500" size={36} />
            Invoice <span className="text-emerald-500">Terminal</span>
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2">
            <ShieldCheck size={14} className="text-emerald-500" /> Active Session • User: {currentUserId || "System"}
          </p>
        </div>

        <div className="relative w-full md:w-96 group">
          <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-3 block ml-2">Select Delivery Note</label>
          <div className="relative">
            <select 
              className="w-full bg-slate-900 border border-white/10 rounded-2xl py-5 pl-6 pr-12 text-xs font-black appearance-none outline-none focus:border-emerald-500 transition-all cursor-pointer shadow-2xl uppercase"
              value={selectedDN}
              onChange={(e) => setSelectedDN(e.target.value)}
            >
              <option value="">-- SEARCH DELIVERY NUMBER --</option>
              {orderList.map((order) => (
                <option key={order._id} value={order._id}>{order.deliveryNumber}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={20} />
          </div>
        </div>
      </div>

      {/* CUSTOMER INFO STRIP (Conditional) */}
      {orderMeta && (
        <div className="mb-6 flex gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl flex items-center gap-3">
            <User size={16} className="text-emerald-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-200">{orderMeta.customerName}</span>
          </div>
          <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3">
            <Calendar size={16} className="text-slate-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">{orderMeta.date}</span>
          </div>
        </div>
      )}

      {/* TABLE SECTION */}
      <div className="bg-slate-900/20 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-500" size={48} />
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-emerald-500/[0.02]">
                <th className="p-4 text-center text-[11px] font-black text-slate-500 border-b border-white/5 w-16">S#</th>
                <th className={thStyle}>Product</th>
                <th className={thStyle}>Batch No</th>
                <th className={thStyle}>Qty</th>
                <th className={thStyle}>UOM</th>
                <th className={thStyle}>Line Total</th>
                <th className="p-4 text-center text-[11px] font-black text-emerald-500 border-b border-white/5 bg-emerald-500/5">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <tr key={item.line_id} className="hover:bg-emerald-500/[0.03] transition-colors">
                    <td className="p-4 text-center font-mono text-slate-600 text-xs italic">{idx + 1}</td>
                    <td className={tdStyle}>{item.product_name}</td>
                    <td className={tdStyle}>{item.batch_no}</td>
                    <td className={tdStyle}>{item.delivered_qty}</td>
                    <td className={tdStyle}>{item.uom_name}</td>
                    <td className={tdStyle + " text-emerald-400 font-black"}>PKR {item.amount.toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handleSingleInvoice(item)} 
                        className="px-6 py-2 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all"
                      >
                        Process Invoice
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-32 text-center opacity-20">
                    <Lock className="mx-auto mb-4" size={48} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Selection</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BULK ACTION FOOTER */}
      {items.length > 0 && (
        <div className="mt-8 flex justify-between items-center bg-emerald-500/5 p-8 rounded-[2rem] border border-emerald-500/10">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Outstanding</p>
            <p className="text-4xl font-black italic text-emerald-400">PKR {items.reduce((sum, i) => sum + i.amount, 0).toLocaleString()}</p>
          </div>
          <button 
            onClick={handleBulkInvoice} 
            className="bg-emerald-600 hover:bg-emerald-500 text-black px-12 py-5 rounded-full font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 active:scale-95 transition-all"
          >
            Create Full Bulk Invoice
          </button>
        </div>
      )}
    </div>
  );
}