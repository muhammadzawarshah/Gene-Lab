"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'sonner';
import { 
  ChevronDown, CheckSquare, Loader2, Lock, Receipt, ShieldCheck, Truck, Percent
} from 'lucide-react';

// --- Types ---
interface GRNLineItem {
  grn_line_id: number;
  product_name: string;
  batch_no: string;
  mfg_date: string | null;
  expiry: string | null;
  received_qty: string | number;
  uom: string;
  discount: number;
  transport_charges: number;
}

interface GRNReference {
  grn_id: number;
  grn_number: string;
}

export default function CreateInvoice() {
  const [grnList, setGrnList] = useState<GRNReference[]>([]);
  const [selectedGRNId, setSelectedGRNId] = useState("");
  const [items, setItems] = useState<GRNLineItem[]>([]);
  const [grnMeta, setGrnMeta] = useState<{ discount: number; transport: number; nettotal: number } | null>(null);
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

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr || dateStr === "---") return '---';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  };

  // --- 1. Fetch Approved GRNs ---
  const fetchGRNList = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api.get(`/api/v1/finance/invoice/grns/available`);
      const nextList = Array.isArray(res.data?.data) ? res.data.data : [];
      setGrnList(nextList);
    } catch (err) {
      toast.error("Database Error: Failed to fetch GRN records");
    }
  }, [api, token]);

  useEffect(() => { fetchGRNList(); }, [fetchGRNList]);

  // --- 2. Fetch GRN Details ---
  const fetchGRNDetails = useCallback(async (id: string) => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/v1/grn/singlegrn/${id}`);
      const rawData = res.data.data;

      // discount aur transportcharges GRN master record mein hain — grnline mein NAHI
      const grnDiscount  = Number(rawData.discount         ?? 0);
      const grnTransport = Number(rawData.transportcharges ?? 0);
      const grnNettotal  = Number(rawData.nettotal          ?? 0);

      setGrnMeta({ discount: grnDiscount, transport: grnTransport, nettotal: grnNettotal });

      const mappedItems = (rawData.grnline || []).map((line: any) => ({
        grn_line_id:       line.grn_line_id,
        product_name:      line.product?.name || "Unknown",
        batch_no:          line.batch?.batch_number || "N/A",
        mfg_date:          line.batch?.manufacturing_date ? formatDate(line.batch.manufacturing_date) : "---",
        expiry:            line.batch?.expiry_date ? formatDate(line.batch.expiry_date) : "---",
        received_qty:      line.received_qty,
        uom:               line.uom?.name || "Units",
        // GRN master se — yahi sahi hain
        discount:          grnDiscount,
        transport_charges: grnTransport
      }));

      setItems(mappedItems);
    } catch (err) {
      toast.error("Security Alert: Data access denied");
      setItems([]);
      setGrnMeta(null);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (selectedGRNId) fetchGRNDetails(selectedGRNId);
    else { setItems([]); setGrnMeta(null); }
  }, [selectedGRNId, fetchGRNDetails]);

  // --- 3. Create Invoice ---
  const handleCreateInvoice = async () => {
    if (!selectedGRNId) return;
    const toastId = toast.loading("Finalizing Secure Invoice...");
    const createdGRNId = selectedGRNId;

    try {
      const payload = {
        grn_id: Number(selectedGRNId),
        userId: currentUserId,
        narration: `Purchase Invoice for GRN #${selectedGRNId}`
      };

      await api.post(`/api/v1/finance/invoice/generate/${selectedGRNId}`, payload);

      toast.success("Invoice successfully created!", { id: toastId });
      setGrnList((prev) => prev.filter((grn) => String(grn.grn_id) !== createdGRNId));
      setSelectedGRNId("");
      setItems([]);
      setGrnMeta(null);
      fetchGRNList();
    } catch (err: any) {
      const message = err?.response?.data?.message || "Invoice Generation Failed";
      toast.error(message, { id: toastId });
    }
  };

  const thStyle = "p-4 text-left text-[11px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-white/[0.01]";
  const tdStyle = "p-4 text-xs font-bold text-white border-b border-white/5 whitespace-nowrap";

  return (
    <div className="text-white p-4 md:p-10 pb-24">
      <Toaster position="top-right" theme="dark" richColors />

      {/* HEADER */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-10">
        <div className="border-l-4 border-blue-500 pl-6">
          <h1 className="text-5xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <Receipt className="text-blue-500" size={36} />
            GRN <span className="text-blue-500">Invoice</span>
          </h1>
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2">
            <ShieldCheck size={14} className="text-blue-500" /> Secure Terminal • UserID: {currentUserId || "System"}
          </p>
        </div>

        {/* DROPDOWN */}
        <div className="relative w-full md:w-96 group">
          <label className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-3 block ml-2">Select Approved GRN</label>
          <div className="relative">
            <select
              className="w-full bg-slate-900 border border-white/10 rounded-2xl py-5 pl-6 pr-12 text-xs font-black appearance-none outline-none focus:border-blue-500 transition-all cursor-pointer shadow-2xl uppercase"
              value={selectedGRNId}
              onChange={(e) => setSelectedGRNId(e.target.value)}
            >
              <option value="">
                {grnList.length ? "-- SELECT GRN VAULT --" : "-- NO PENDING GRN FOUND --"}
              </option>
              {grnList.map((grn) => (
                <option key={grn.grn_id} value={grn.grn_id}>{grn.grn_number}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-slate-900/20 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" size={48} />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1300px]">
            <thead>
              <tr className="bg-blue-500/[0.02]">
                <th className="p-4 text-center text-[11px] font-black text-slate-500 border-b border-white/5 w-16">S#</th>
                <th className={thStyle}>Product</th>
                <th className={thStyle}>Batch No</th>
                <th className={thStyle}>MFG Date</th>
                <th className={thStyle}>Expiry</th>
                <th className={thStyle}>Qty</th>
                <th className={thStyle}>UOM</th>
                <th className={thStyle}>Discount (GRN)</th>
                <th className={thStyle}>Transport (GRN)</th>
                <th className="p-4 text-right px-10 text-[11px] font-black text-blue-500 border-b border-white/5 bg-blue-500/5 uppercase italic">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length > 0 ? (
                items.map((item, idx) => (
                  <tr key={item.grn_line_id} className="hover:bg-blue-500/[0.03] transition-colors group">
                    <td className="p-4 text-center font-mono text-slate-600 text-xs italic">{idx + 1}</td>
                    <td className={tdStyle}>
                      <span className="uppercase tracking-wide">{item.product_name}</span>
                    </td>
                    <td className={tdStyle}>
                      <span className="bg-white/5 px-3 py-1 rounded text-slate-400 font-mono">{item.batch_no}</span>
                    </td>
                    <td className={tdStyle + " font-mono text-emerald-500/80"}>{item.mfg_date}</td>
                    <td className={tdStyle + " font-mono text-rose-500/80"}>{item.expiry}</td>
                    <td className={tdStyle}>{item.received_qty}</td>
                    <td className={tdStyle + " text-blue-400"}>{item.uom}</td>
                    {/* GRN master se aane wale values */}
                    <td className={tdStyle + " text-orange-400/90 font-mono"}>
                      {Number(item.discount) > 0 ? `PKR ${Number(item.discount).toLocaleString()}` : '—'}
                    </td>
                    <td className={tdStyle + " text-indigo-400/90 font-mono"}>
                      {Number(item.transport_charges) > 0 ? `PKR ${Number(item.transport_charges).toLocaleString()}` : '—'}
                    </td>
                    <td className="p-4 text-right px-10">
                      <span className="text-[10px] font-black bg-white/5 px-4 py-2 rounded-lg text-slate-500">AUDITED</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="p-40 text-center opacity-20">
                    <div className="flex flex-col items-center gap-4">
                      <Lock size={64} />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em]">Vault Locked - Select GRN Above</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FOOTER ACTION */}
      {items.length > 0 && (
        <div className="mt-10 flex flex-col md:flex-row justify-between items-center bg-blue-500/5 p-10 rounded-[3rem] border border-blue-500/10 gap-8">
          <div className="space-y-3">
            <p className="text-[10px] font-black text-slate-500 uppercase italic tracking-widest">GRN Financial Summary</p>
            <div className="flex flex-wrap gap-8">
              {grnMeta && Number(grnMeta.discount) > 0 && (
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-1">
                    <Percent size={10} /> Discount
                  </p>
                  <p className="text-xl font-black text-orange-400">-PKR {Number(grnMeta.discount).toLocaleString()}</p>
                </div>
              )}
              {grnMeta && Number(grnMeta.transport) > 0 && (
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest flex items-center gap-1 mb-1">
                    <Truck size={10} /> Transport
                  </p>
                  <p className="text-xl font-black text-indigo-400">+PKR {Number(grnMeta.transport).toLocaleString()}</p>
                </div>
              )}
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Net Total</p>
                <p className="text-3xl font-black italic text-white tracking-tighter">
                  PKR {Number(grnMeta?.nettotal || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateInvoice}
            className="bg-blue-600 hover:bg-blue-500 text-white px-16 py-7 rounded-full font-black uppercase text-xs tracking-[0.2em] flex items-center gap-4 shadow-2xl shadow-blue-500/30 transition-all active:scale-95"
          >
            <CheckSquare size={20} /> Generate Invoice
          </button>
        </div>
      )}
    </div>
  );
}
