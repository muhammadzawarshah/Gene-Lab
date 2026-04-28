"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'sonner';
import {
  Trash2, Layers, Loader2,
  Wallet, ShieldCheck
} from 'lucide-react';

interface Category { product_category_id: string; category: string; }
interface Product  { product_id: string; name: string; min_stock: number | null; max_stock: number | null; current_stock: number; }
interface POItem {
  order_date: string;
  category_id: string;
  product_id: string;
  total_unit: number;
}

const today = () => new Date().toISOString().split('T')[0];
const emptyRow = (): POItem => ({
  order_date: today(), category_id: '', product_id: '',
  total_unit: 0,
});

export default function CreatePurchaseOrder() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, Product[]>>({});

  const currentUserId = Cookies.get('userId') || 'ADMIN_USER';
  const token = Cookies.get('virtue_token') || Cookies.get('auth_token');

  const [rows, setRows] = useState<POItem[]>([emptyRow(), emptyRow(), emptyRow()]);

  useEffect(() => {
    if (!token) return;
    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/category`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => setCategories(r.data.category || []))
      .catch(() => toast.error("Categories load failed"));
  }, [token]);

  const fetchProducts = async (catId: string) => {
    if (!catId || productsMap[catId]) return;
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/product/category/${catId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProductsMap(prev => ({ ...prev, [catId]: res.data }));
    } catch { toast.error("Product fetch error"); }
  };

  const handleInputChange = (index: number, field: keyof POItem, value: any) => {
    setRows(prev => {
      const rows = [...prev];
      const row = { ...rows[index], [field]: value };

      if (field === 'category_id') {
        row.product_id = '';
        fetchProducts(value);
      }

      if (field === 'product_id' && value) {
        const catId = row.category_id;
        const product = productsMap[catId]?.find(p => p.product_id === value);
        if (product && product.min_stock !== null && product.current_stock <= product.min_stock) {
          toast.warning(`⚠️ ${product.name} stock is low! (Current: ${product.current_stock}, Min: ${product.min_stock})`, {
             duration: 5000,
             style: { background: '#3f3f46', color: '#fff' }
          });
          
          // Optional: Create notification in backend
          if (token) {
             axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/notifications`, {
                message: `${product.name} stock critical. Current: ${product.current_stock}, Min: ${product.min_stock}`,
                type: 'LOW_STOCK'
             }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
          }
        }
      }

      rows[index] = row;
      if (index === rows.length - 1 && field === 'product_id' && value) {
        return [...rows, emptyRow()];
      }
      return rows;
    });
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) setRows(rows.filter((_, i) => i !== index));
  };
  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    const validData = rows.filter(r => r.product_id !== '');
    if (!validData.length) return toast.error("Kam az kam ek product select karein.");
    setIsSubmitting(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/purchase/order`, {
        createdBy: currentUserId,
        items: validData.map(r => ({
          ...r,
          approved_rate: 0,
        })),
        financials: { grossTotal: 0, taxId: null, taxAmount: 0, netTotal: 0 }
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success("Order submitted successfully", { icon: <ShieldCheck className="text-emerald-500" /> });
      setRows([emptyRow(), emptyRow()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Server Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const thCls  = "text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] p-4 border-b border-white/5";
  const inpCls = "w-full bg-[#0f172a] border border-slate-800 rounded-xl py-3 px-3 text-white focus:border-blue-500 outline-none transition-all text-xs font-medium appearance-none";

  return (
    <div className="max-w-[1600px] mx-auto p-4 md:p-10 pb-24 selection:bg-blue-600/30">
      <Toaster position="top-right" theme="dark" richColors />

      <div className="mb-10 flex justify-between items-end border-l-8 border-blue-600 pl-6">
        <div>
          <h1 className="text-6xl font-black text-white uppercase tracking-tighter italic leading-none">
            Purchase <span className="text-blue-600">Order</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-3 flex items-center gap-2 italic">
            <Layers size={14} className="text-blue-500" /> System Unit: {currentUserId}
          </p>
        </div>
        <div className="bg-[#020617] border border-white/10 px-6 py-3 rounded-xl flex items-center gap-3 shadow-2xl">
          <div className="flex flex-col text-right">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] leading-none mb-1">From</span>
            <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600 uppercase italic tracking-tighter">GeneLab</span>
          </div>
          <div className="h-10 w-[2px] bg-blue-600/30 mx-1" />
          <div className="bg-blue-600/10 p-2 rounded-lg"><ShieldCheck size={24} className="text-blue-500" /></div>
        </div>
      </div>

      <form onSubmit={handleFinalize} className="bg-[#020617] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="w-12 p-4 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest">S#</th>
                <th className={thCls}>Category</th>
                <th className={thCls}>Product</th>
                <th className={thCls}>Units</th>
                <th className={thCls}>Date</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row, index) => (
                <tr key={index} className="group hover:bg-blue-600/[0.02] transition-all">
                  <td className="p-4 text-center font-black text-slate-700 text-xs italic">{index + 1}</td>

                  <td className="p-2 w-[155px]">
                    <select className={inpCls} value={row.category_id}
                      onChange={e => handleInputChange(index, 'category_id', e.target.value)}>
                      <option value="">Category</option>
                      {categories.map(c => (
                        <option key={c.product_category_id} value={c.product_category_id} className="bg-[#0f172a]">{c.category}</option>
                      ))}
                    </select>
                  </td>

                  <td className="p-2 w-[175px]">
                    <select className={inpCls + " disabled:opacity-30"} value={row.product_id}
                      disabled={!row.category_id}
                      onChange={e => handleInputChange(index, 'product_id', e.target.value)}>
                      <option value="">Product</option>
                      {(productsMap[row.category_id] || []).map(p => (
                        <option key={p.product_id} value={p.product_id} className="bg-[#0f172a]">{p.name}</option>
                      ))}
                    </select>
                  </td>

                  <td className="p-2 w-24">
                    <input type="number" className={inpCls + " text-center"} value={row.total_unit || ''}
                      onChange={e => handleInputChange(index, 'total_unit', e.target.value)} />
                  </td>
                  <td className="p-2 w-36">
                    <input type="date" className={inpCls} value={row.order_date}
                      onChange={e => handleInputChange(index, 'order_date', e.target.value)} />
                  </td>
                  <td className="p-2 text-center">
                    <button type="button" onClick={() => removeRow(index)}
                      className="p-2 text-slate-800 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-10 bg-white/[0.01] border-t border-white/5 flex justify-between items-center">
          <div />
          <div className="flex gap-4">
            <button type="button" onClick={() => setRows([emptyRow(), emptyRow()])}
              className="bg-white/5 text-slate-500 font-black px-10 py-5 rounded-2xl uppercase text-[10px] tracking-widest border border-white/5 hover:text-rose-500 transition-all">
              Flush All
            </button>
            <button type="submit" disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black px-20 py-5 rounded-2xl uppercase text-[10px] tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/30 disabled:opacity-50 active:scale-95">
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><Wallet size={20} /> Deploy Order & Sync</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
