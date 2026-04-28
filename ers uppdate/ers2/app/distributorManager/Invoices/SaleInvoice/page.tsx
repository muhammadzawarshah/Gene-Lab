"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'sonner';
import { 
  ChevronDown, ShieldCheck, Loader2, Lock, Receipt, User, Calendar, Truck, Percent
} from 'lucide-react';

// --- TYPES ---
interface OrderItem {
  line_id: string;
  product_name: string;
  delivered_qty: string | number;
  uom_name: string;
  batch_no: string;
  mfg_date: string | null;
  expiry_date: string | null;
  unit_price: number;
  tax_name: string;
  tax_amount: number;
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
  const [narration, setNarration] = useState("");
  
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

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr || dateStr === "---") return '---';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  };

  const fetchOrderList = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get('/api/v1/finance/invoice/dns/available');
      const dataArray = Array.isArray(res.data.data) ? res.data.data : [];

      const formattedList = dataArray.map((ord: any) => ({
        _id: ord.delivery_number,
        deliveryNumber: ord.delivery_number
      }));

      setOrderList(formattedList);
    } catch (err) {
      toast.error("Failed to load delivery notes");
    }
  }, [api, token]);

  useEffect(() => { fetchOrderList(); }, [fetchOrderList]);

  const fetchOrderDetails = useCallback(async (dn: string) => {
    if (!dn) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/distribution/specificdel/${dn}`);
      const data = res.data.data;
      
      if (!data) throw new Error("No data found");

      setOrderMeta({
        customerName: data.salesorder?.party?.name || "Unknown Customer",
        date: data.delv_date ? formatDate(data.delv_date) : "N/A",
        status: data.status || "N/A"
      });

      const rawLines = data.deliverynoteline || [];
      const mappedItems = rawLines.map((line: any) => ({
        line_id: line.delv_note_line_id?.toString() || Math.random().toString(),
        product_name: line.product?.name || "N/A",
        delivered_qty: line.delivered_qty || 0,
        uom_name: line.uom?.name || "Unit",
        batch_no: line.batch?.batch_number || "N/A",
        mfg_date: line.batch?.manufacturing_date ? formatDate(line.batch.manufacturing_date) : "---",
        expiry_date: line.batch?.expiry_date ? formatDate(line.batch.expiry_date) : "---",
        unit_price: Number(line.salesorderline?.unit_price ?? 0),
        tax_name: line.salesorderline?.tax?.name || '',
        tax_amount: (() => {
          const tax = line.salesorderline?.tax;
          const lt = Number(line.salesorderline?.line_total ?? 0);
          if (!tax) return 0;
          return tax.type === 'percentage' ? (lt * Number(tax.rate)) / 100 : Number(tax.rate);
        })(),
        amount: Number(line.salesorderline?.line_total ?? 0)
      }));

      setItems(mappedItems);
    } catch (err) {
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

  const handleSingleInvoice = async () => {
    if (!selectedDN) return;
    const toastId = toast.loading("Processing Invoice...");
    try {
      await api.post(`/api/v1/finance/invoices/generate/${selectedDN}`, {
        narration: narration,
        userId: currentUserId
      });
      toast.success("Invoice generated successfully", { id: toastId });
      setSelectedDN("");
      setItems([]);
      fetchOrderList();
    } catch (err) {
      toast.error("Invoice creation failed", { id: toastId });
    }
  };

  const handleBulkInvoice = async () => {
    handleSingleInvoice(); // Both call the same backend logic for now
  };

  const thStyle = "p-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-white/[0.01]";
  const tdStyle = "p-4 text-xs font-bold text-white border-b border-white/5 whitespace-nowrap";

  return (
    <div className="text-white p-4 md:p-10 pb-24">
      <Toaster position="top-right" theme="dark" richColors />

      {/* HEADER */}
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

      {/* NARRATION FIELD */}
      {selectedDN && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <label className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-2 block ml-2">Invoice Narration (Optional)</label>
          <textarea
            className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:border-emerald-500 transition-all resize-none h-20"
            placeholder="Enter narration for this invoice..."
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
          />
        </div>
      )}

      {/* META INFO */}
      {orderMeta && (
        <div className="mb-6 flex flex-wrap gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
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

      {/* TABLE */}
      <div className="bg-slate-900/20 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-500" size={48} />
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-emerald-500/[0.02]">
                <th className="p-4 text-center text-[11px] font-black text-slate-500 border-b border-white/5 w-16">S#</th>
                <th className={thStyle}>Product</th>
                <th className={thStyle}>Batch No</th>
                <th className={thStyle}>MFG</th>
                <th className={thStyle}>Expiry</th>
                <th className={thStyle}>Qty</th>
                <th className={thStyle}>UOM</th>
                <th className={thStyle}>Unit Price</th>
                <th className={thStyle}>Tax</th>
                <th className={thStyle}>Net Total</th>
                <th className="p-4 text-center text-[11px] font-black text-emerald-500 border-b border-white/5 bg-emerald-500/5 uppercase italic">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, idx) => {
                  const netTotal = item.amount + item.tax_amount;
                  return (
                    <tr key={item.line_id} className="hover:bg-emerald-500/[0.03] transition-colors group">
                      <td className="p-4 text-center font-mono text-slate-600 text-xs italic">{idx + 1}</td>
                      <td className={tdStyle}>{item.product_name}</td>
                      <td className={tdStyle + " font-mono"}>{item.batch_no}</td>
                      <td className={tdStyle + " font-mono text-slate-400"}>{item.mfg_date}</td>
                      <td className={tdStyle + " font-mono text-rose-400/80"}>{item.expiry_date}</td>
                      <td className={tdStyle}>{item.delivered_qty}</td>
                      <td className={tdStyle + " text-slate-500"}>{item.uom_name}</td>

                      <td className={tdStyle + " text-blue-400 font-mono"}>
                        {item.unit_price ? item.unit_price.toLocaleString() : '---'}
                      </td>
                      <td className={tdStyle + " text-amber-400 font-mono"}>
                        {item.tax_name ? `${item.tax_name} +${item.tax_amount.toLocaleString()}` : '—'}
                      </td>
                      <td className={tdStyle + " text-emerald-400 font-black"}>
                        PKR {netTotal.toLocaleString()}
                      </td>

                      <td className="p-4 text-center">
                        <span className="text-[10px] font-black bg-white/5 px-4 py-2 rounded-lg text-slate-500 uppercase">Pending Billing</span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="p-32 text-center opacity-20">
                    <div className="flex flex-col items-center gap-4">
                      <Lock size={48} />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em]">Vault Locked • Select Delivery Note</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER */}
      {items.length > 0 && (
        <div className="mt-8 flex flex-col md:flex-row justify-between items-center bg-emerald-500/5 p-10 rounded-[2.5rem] border border-emerald-500/10 gap-6">
          <div className="flex gap-10">
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Tax</p>
              <p className="text-xl font-bold text-amber-400">
                +{items.reduce((s, i) => s + Number(i.tax_amount || 0), 0).toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-px bg-white/10 hidden md:block" />
            <div>
              <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest mb-1">Grand Total (Net)</p>
              <p className="text-4xl font-black italic text-emerald-400 tracking-tighter">
                PKR {items.reduce((sum, i) => sum + Number(i.amount || 0) + Number(i.tax_amount || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleBulkInvoice} 
            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-500 text-black px-16 py-6 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl shadow-emerald-500/20 transition-all flex items-center gap-3"
          >
            <Receipt size={18} /> Process Full Bulk Invoice
          </button>
        </div>
      )}
    </div>
  );
}