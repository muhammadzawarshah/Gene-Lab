"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'sonner';
import {
  Trash2, Layers, Loader2,
  Calculator, Wallet, ShieldCheck, ShoppingBag
} from 'lucide-react';

// --- TYPES ---
interface Category { product_category_id: string; category: string; }
interface Product  { product_id: string; name: string; }
interface POItem {
  category_id: string;
  product_id: string;
  total_unit: number;
  approved_rate: number;
  amount: number;
}

const emptyRow = (): POItem => ({
  category_id: '', product_id: '',
  total_unit: 0, approved_rate: 0, amount: 0,
});

export default function CreatePO() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [productsMap,  setProductsMap]  = useState<Record<string, Product[]>>({});
  const [rows,         setRows]         = useState<POItem[]>([emptyRow(), emptyRow(), emptyRow()]);

  const currentUserId = Cookies.get('userId') || Cookies.get('user_id') || '';
  const token         = Cookies.get('auth_token');
  const API           = process.env.NEXT_PUBLIC_API_URL;

  // ── Fetch categories on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };
    axios.get(`${API}/api/v1/category/`, { headers: h })
      .then(r => setCategories(r.data.category || []))
      .catch(() => toast.error("Category fetch failed"));
  }, [token]);

  // ── Fetch products by category (cached) ────────────────────────────────────
  const fetchProducts = async (catId: string) => {
    if (!catId || productsMap[catId]) return;
    try {
      const res = await axios.get(`${API}/api/v1/product/category/${catId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductsMap(prev => ({ ...prev, [catId]: res.data }));
    } catch { toast.error("Product fetch failed"); }
  };

  // ── Auto-fetch WHOLESALE price when product selected ───────────────────────
  const fetchPrice = async (index: number, productId: string) => {
    if (!productId) return;
    try {
      const res = await axios.get(`${API}/api/v1/productprice/lookup`, {
        params: { product_id: productId, price_type: 'WHOLESALE' },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.data) {
        const rate = parseFloat(res.data.data.unit_price);
        setRows(prev => {
          const next = [...prev];
          next[index] = { ...next[index], approved_rate: rate, amount: (next[index].total_unit || 0) * rate };
          return next;
        });
      }
    } catch { /* price stays 0 if lookup fails */ }
  };

  // ── Row change handler ─────────────────────────────────────────────────────
  const handleInputChange = (index: number, field: keyof POItem, value: any) => {
    setRows(prev => {
      const rows = [...prev];
      const row  = { ...rows[index], [field]: value };

      if (field === 'category_id') {
        row.product_id    = '';
        row.approved_rate = 0;
        row.amount        = 0;
        fetchProducts(value);
      }

      if (field === 'product_id' && value) {
        row.approved_rate = 0;
        row.amount        = 0;
        rows[index] = row;
        setRows([...rows]);
        fetchPrice(index, value);
        // auto-add new empty row when last row gets a product
        if (index === rows.length - 1) return [...rows, emptyRow()];
        return rows;
      }

      if (field === 'total_unit' || field === 'approved_rate') {
        row.amount = (Number(field === 'total_unit' ? value : row.total_unit) || 0)
                   * (Number(field === 'approved_rate' ? value : row.approved_rate) || 0);
      }

      rows[index] = row;
      return rows;
    });
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) setRows(rows.filter((_, i) => i !== index));
  };

  // ── Totals ──────────────────────────────────────────────────────────────────
  const grossTotal = useMemo(() => rows.reduce((s, r) => s + (r.amount || 0), 0), [rows]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = rows.filter(r => r.product_id !== '');
    if (!validItems.length) return toast.error("Kam az kam ek product select karein.");

    setIsSubmitting(true);
    try {
      await axios.post(`${API}/api/v1/distribution/custsales-order`, {
        createdBy:   Number(currentUserId),
        items:       validItems.map(r => ({
          productId: r.product_id,
          qty:       r.total_unit,
          price:     r.approved_rate,
        })),
        totalAmount: grossTotal,
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success("Purchase order submitted", { icon: <ShieldCheck className="text-emerald-500" /> });
      setRows([emptyRow(), emptyRow(), emptyRow()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const thCls  = "text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] p-4 border-b border-white/5";
  const inpCls = "w-full bg-[#0f172a] border border-slate-800 rounded-xl py-3 px-3 text-white focus:border-blue-500 outline-none transition-all text-xs font-medium appearance-none";

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-10 pb-24 selection:bg-blue-600/30">
      <Toaster position="top-right" theme="dark" richColors />

      {/* HEADER */}
      <div className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-l-8 border-blue-600 pl-6">
        <div className="flex-1">
          <h1 className="text-6xl font-black text-white uppercase tracking-tighter italic leading-none">
            Purchase <span className="text-blue-600">Order</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-4 flex items-center gap-2 italic">
            <Layers size={14} className="text-blue-500" /> USER_ID: {currentUserId}
          </p>
        </div>

        <div className="w-full lg:w-96 relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000" />
          <div className="relative bg-[#020617] rounded-2xl border border-white/10 p-4 flex items-center gap-4">
            <ShoppingBag className="text-blue-500" size={22} />
            <div>
              <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest italic">Ordering From</p>
              <p className="text-sm font-black text-white uppercase italic">Gene Laboratories (PVT) Ltd.</p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleFinalize} className="bg-[#020617] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="w-12 p-4 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest italic">S#</th>
                <th className={thCls}>Category</th>
                <th className={thCls}>Product</th>
                <th className={thCls}>Qty</th>
                <th className={thCls}>Rate (Wholesale)</th>
                <th className={thCls}>Amount</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row, index) => (
                <tr key={`row-${index}`} className="group hover:bg-blue-600/[0.02] transition-all">
                  <td className="p-4 text-center font-black text-slate-700 text-xs italic">{index + 1}</td>

                  {/* Category */}
                  <td className="p-2 w-48">
                    <select className={inpCls} value={row.category_id}
                      onChange={e => handleInputChange(index, 'category_id', e.target.value)}>
                      <option value="">Category</option>
                      {categories.map(c => (
                        <option key={c.product_category_id} value={c.product_category_id} className="bg-[#0f172a]">{c.category}</option>
                      ))}
                    </select>
                  </td>

                  {/* Product */}
                  <td className="p-2 w-56">
                    <select className={inpCls + " disabled:opacity-30"} value={row.product_id}
                      disabled={!row.category_id}
                      onChange={e => handleInputChange(index, 'product_id', e.target.value)}>
                      <option value="">Product</option>
                      {(productsMap[row.category_id] || []).map(p => (
                        <option key={p.product_id} value={p.product_id} className="bg-[#0f172a]">{p.name}</option>
                      ))}
                    </select>
                  </td>

                  {/* Qty */}
                  <td className="p-2 w-28">
                    <input type="number" className={inpCls + " text-center"} value={row.total_unit || ''}
                      onChange={e => handleInputChange(index, 'total_unit', e.target.value)} />
                  </td>

                  {/* Rate (auto-filled, not editable) */}
                  <td className="p-2 w-36">
                    <div className="w-full bg-[#0a0f1e] border border-slate-800/50 rounded-xl py-3 px-3 text-right text-blue-400 font-mono text-xs select-none cursor-not-allowed">
                      {row.approved_rate ? row.approved_rate.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                    </div>
                  </td>

                  {/* Amount */}
                  <td className="p-4 text-right text-xs font-black text-white italic">{row.amount.toLocaleString()}</td>

                  <td className="p-2">
                    <button type="button" onClick={() => removeRow(index)}
                      className="p-2 text-slate-800 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SUMMARY */}
        <div className="flex justify-end p-10 bg-white/[0.01] border-t border-white/5">
          <div className="bg-slate-900/50 rounded-[2rem] p-8 border border-white/5 space-y-4 shadow-inner w-full max-w-sm">
            <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">
              <span>Gross Subtotal</span>
              <span className="text-white">PKR {grossTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <span className="text-white font-black text-sm uppercase italic">Total Payable</span>
              <span className="text-4xl font-black text-blue-500 italic tracking-tighter">
                PKR {grossTotal.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-10 bg-[#020617] border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 bg-white/5 px-8 py-4 rounded-full border border-white/5">
            <Calculator className="text-blue-500" size={20} />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Gene Laboratories (PVT) Ltd.</span>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button type="button"
              onClick={() => setRows([emptyRow(), emptyRow(), emptyRow()])}
              className="flex-1 md:flex-none bg-white/5 text-slate-500 font-black px-10 py-5 rounded-2xl uppercase text-[10px] tracking-widest border border-white/5 hover:bg-rose-500/10 hover:text-rose-500 transition-all">
              Clear Form
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-2 md:flex-none bg-blue-600 hover:bg-blue-500 text-white font-black px-16 py-5 rounded-2xl uppercase text-[10px] tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 disabled:opacity-50">
              {isSubmitting ? <Loader2 className="animate-spin" /> : <><Wallet size={18} /> Submit Purchase Order</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
