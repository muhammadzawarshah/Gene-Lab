"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'sonner';
import {
  Trash2, Layers, Loader2,
  Wallet, ShieldCheck
} from 'lucide-react';

interface Category { id: string; name: string; }
interface Product  { id: string; name: string; category_id: string; }
interface OrderItem {
  category_id: string;
  product_id: string;
  total_unit: number;
}

const emptyRow = (): OrderItem => ({
  category_id: '', product_id: '',
  total_unit: 0,
});

export default function CreatePOPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsMap, setProductsMap] = useState<{ [key: string]: Product[] }>({});

  const currentUserId = Cookies.get('userId') || 'ADMIN_USER';
  const token = Cookies.get('auth_token');

  const [rows, setRows] = useState<OrderItem[]>([emptyRow(), emptyRow(), emptyRow()]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/category`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCategories(res.data.category || []);
      } catch {
        toast.error("Categories fetch nahi ho sakin.");
      }
    };
    if (token) fetchCategories();
  }, [token]);

  const fetchProducts = async (catId: string) => {
    if (!catId || productsMap[catId]) return;
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/product/category/${catId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProductsMap(prev => ({ ...prev, [catId]: res.data }));
    } catch {
      toast.error("Product Error");
    }
  };

  const handleInputChange = (index: number, field: keyof OrderItem, value: any) => {
    setRows(prev => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };

      if (field === 'category_id') {
        row.product_id = '';
        fetchProducts(value);
      }

      updated[index] = row;

      if (index === updated.length - 1 && field === 'product_id' && value !== '') {
        return [...updated, emptyRow()];
      }
      return updated;
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
        financials: { grossTotal: 0, netTotal: 0 }
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success("Order submitted successfully", { icon: <ShieldCheck className="text-emerald-500" /> });
      setRows([emptyRow(), emptyRow(), emptyRow()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Server Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const thStyle = "text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] p-4 border-b border-white/5";
  const inputBase = "w-full bg-[#0f172a] border border-slate-800 rounded-xl py-3 px-3 text-white focus:border-blue-500 outline-none transition-all text-xs font-medium appearance-none";

  return (
    <div className="max-w-[1500px] mx-auto p-4 md:p-10 pb-24 selection:bg-blue-600/30">
      <Toaster position="top-right" theme="dark" richColors />

      <div className="mb-10 border-l-8 border-blue-600 pl-6">
        <h1 className="text-6xl font-black text-white uppercase tracking-tighter italic leading-none">
          Order <span className="text-blue-600">Forge</span>
        </h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-3 flex items-center gap-2 italic">
          <Layers size={14} className="text-blue-500" /> System Unit: {currentUserId}
        </p>
      </div>

      <form onSubmit={handleFinalize} className="bg-[#020617] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="w-14 p-4 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest">S#</th>
                <th className={thStyle}>Category</th>
                <th className={thStyle}>Product</th>
                <th className={thStyle}>Units</th>
                <th className="w-14"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row, index) => (
                <tr key={index} className="group hover:bg-blue-600/[0.02] transition-all">
                  <td className="p-4 text-center font-black text-slate-700 text-xs italic">{index + 1}</td>
                  <td className="p-2 w-[200px]">
                    <select className={inputBase} value={row.category_id}
                      onChange={(e) => handleInputChange(index, 'category_id', e.target.value)}>
                      <option value="">Select Category</option>
                      {categories.map((cat: any) => (
                        <option key={cat.product_category_id || cat.id} value={cat.product_category_id || cat.id}>
                          {cat.category || cat.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 w-[220px]">
                    <select className={inputBase + " disabled:opacity-20"} value={row.product_id}
                      disabled={!row.category_id}
                      onChange={(e) => handleInputChange(index, 'product_id', e.target.value)}>
                      <option value="">Select Product</option>
                      {(productsMap[row.category_id] || []).map((prod: any) => (
                        <option key={prod.product_id || prod.id} value={prod.product_id || prod.id}>
                          {prod.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 w-24">
                    <input type="number" placeholder="0" className={inputBase + " text-center"}
                      value={row.total_unit || ''}
                      onChange={(e) => handleInputChange(index, 'total_unit', e.target.value)} />
                  </td>
                  <td className="p-2">
                    <button type="button" onClick={() => removeRow(index)}
                      className="hover:cursor-pointer p-2 text-slate-800 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
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
            <button type="button" onClick={() => setRows([emptyRow(), emptyRow(), emptyRow()])}
              className="hover:cursor-pointer bg-white/5 text-slate-500 font-black px-10 py-5 rounded-2xl uppercase text-[10px] tracking-widest border border-white/5 hover:bg-rose-500/10 hover:text-rose-500 transition-all">
              Flush All
            </button>
            <button type="submit" disabled={isSubmitting}
              className="hover:cursor-pointer bg-blue-600 hover:bg-blue-500 text-white font-black px-20 py-5 rounded-2xl uppercase text-[10px] tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/30 disabled:opacity-50">
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><Wallet size={20} /> Deploy Order</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
