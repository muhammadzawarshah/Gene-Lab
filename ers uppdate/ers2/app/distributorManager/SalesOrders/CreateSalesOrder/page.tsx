"use client";

import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'sonner';
import {
  Trash2, Layers, ChevronDown, Loader2,
  Calculator, Wallet, ShieldCheck, UserCircle2, AlertTriangle
} from 'lucide-react';

interface Customer { party_id: string; name: string; }
interface Category { product_category_id: string; category: string; }
interface Product  {
  product_id: string;
  name: string;
  uom_id: number;
  default_sale_price?: number;
}
interface SOItem {
  category_id: string;
  product_id: string;
  uom_id: number;
  total_unit: number;
  sale_price: number;
  amount: number;
}

const emptyRow = (): SOItem => ({
  category_id: '', product_id: '',
  uom_id: 0, total_unit: 0, sale_price: 0, amount: 0,
});

export default function CreateSalesOrder() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, Product[]>>({});
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  const currentUserId = Cookies.get('userId') || 'ADMIN_USER';
  const token = Cookies.get('auth_token');

  const [rows, setRows] = useState<SOItem[]>([emptyRow(), emptyRow(), emptyRow()]);

  useEffect(() => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };

    Promise.allSettled([
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/party/customers`, { headers: h }),
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/category/`, { headers: h }),
      axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/stock/combined`, { headers: h })
    ]).then(([customerRes, categoryRes, stockRes]) => {
      if (customerRes.status === 'fulfilled') {
        const customerData = customerRes.value.data.customers || customerRes.value.data.data || customerRes.value.data;
        setCustomers(Array.isArray(customerData) ? customerData : []);
      } else {
        setCustomers([]);
        toast.error("Customers load nahi ho sake.");
      }

      if (categoryRes.status === 'fulfilled') {
        setCategories(categoryRes.value.data.category || []);
      } else {
        setCategories([]);
        toast.error("Categories load nahi ho sakin.");
      }

      if (stockRes.status === 'fulfilled') {
        const nextMap = (stockRes.value.data.data || []).reduce((acc: Record<string, number>, item: any) => {
          acc[item.product_id] = Number(item.available || 0);
          return acc;
        }, {});
        setStockMap(nextMap);
      } else {
        setStockMap({});
        toast.error("Combined stock load nahi ho saka.");
      }
    }).catch(() => toast.error("Initial sales data fetch failed"));
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
      toast.error("Product fetch failed");
    }
  };

  const handleInputChange = (index: number, field: keyof SOItem, value: any) => {
    setRows(prev => {
      const updatedRows = [...prev];
      const row = { ...updatedRows[index], [field]: value };

      if (field === 'category_id') {
        row.product_id = '';
        row.uom_id = 0;
        row.sale_price = 0;
        row.amount = 0;
        row.total_unit = 0;
        fetchProducts(value);
      }

      if (field === 'product_id') {
        const selectedProduct = (productsMap[row.category_id] || []).find((product) => product.product_id === value);
        row.uom_id = selectedProduct?.uom_id || 0;
        row.sale_price = Number(selectedProduct?.default_sale_price || 0);
        row.total_unit = 0;
        row.amount = 0;
      }

      if (field === 'total_unit' || field === 'sale_price') {
        row.amount = (Number(row.total_unit) || 0) * (Number(row.sale_price) || 0);
      }

      updatedRows[index] = row;

      const availableQty = row.product_id ? Number(stockMap[row.product_id] || 0) : 0;
      if (field === 'total_unit' && row.product_id && Number(row.total_unit) > availableQty) {
        toast.error(`Stock kam hai. Available: ${availableQty}`);
      }

      if (index === prev.length - 1 && field === 'product_id' && value) {
        return [...updatedRows, emptyRow()];
      }

      return updatedRows;
    });
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) setRows(rows.filter((_, i) => i !== index));
  };

  const grossTotal = useMemo(() => rows.reduce((s, r) => s + (r.amount || 0), 0), [rows]);
  const stockIssues = useMemo(() => {
    return rows
      .filter((row) => row.product_id && Number(row.total_unit) > Number(stockMap[row.product_id] || 0))
      .map((row) => ({
        product_id: row.product_id,
        requested: Number(row.total_unit),
        available: Number(stockMap[row.product_id] || 0)
      }));
  }, [rows, stockMap]);

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId) return toast.error("Pehle customer select karein.");

    const validItems = rows.filter(r => r.product_id !== '');
    if (!validItems.length) return toast.error("Kam az kam ek product select karein.");
    if (stockIssues.length) return toast.error("Stock issues resolve kiye baghair order create nahi ho sakta.");

    setIsSubmitting(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/distribution/sales-orders`, {
        customerId: selectedPartyId,
        createdBy: currentUserId,
        items: validItems.map(r => ({
          ...r,
          approved_rate: r.sale_price,
        })),
        financials: { grossTotal, taxId: null, taxAmount: 0, netTotal: grossTotal }
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success("Sales order submitted", { icon: <ShieldCheck className="text-emerald-500" /> });
      setSelectedPartyId('');
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

      <div className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-l-8 border-blue-600 pl-6">
        <div className="flex-1">
          <h1 className="text-6xl font-black text-white uppercase tracking-tighter italic leading-none">
            Order <span className="text-blue-600">Forge</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-4 flex items-center gap-2 italic">
            <Layers size={14} className="text-blue-500" /> AUTH_ID: {currentUserId}
          </p>
        </div>

        <div className="w-full lg:w-[560px]">
          <div className="relative bg-[#020617] rounded-2xl border border-white/10 p-4">
            <label className="text-[9px] font-black text-blue-500 uppercase mb-2 block tracking-widest italic">Target Customer Account</label>
            <div className="relative">
              <select
                className="w-full bg-slate-900 border-none rounded-xl py-4 pl-12 pr-10 text-white text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                value={selectedPartyId}
                onChange={e => setSelectedPartyId(e.target.value)}
              >
                <option value="">Choose Customer Account...</option>
                {customers.map(c => (
                  <option key={c.party_id} value={c.party_id} className="bg-slate-900">{c.name}</option>
                ))}
              </select>
              <UserCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
            </div>
          </div>
        </div>
      </div>

      {stockIssues.length > 0 && (
        <div className="mb-8 rounded-3xl border border-red-500/20 bg-red-500/10 px-6 py-5 text-sm text-red-200">
          <div className="flex items-center gap-3 font-black uppercase tracking-widest text-[11px]">
            <AlertTriangle size={16} className="text-red-400" />
            Stock Alert
          </div>
          <div className="mt-3 space-y-2">
            {stockIssues.map((issue) => (
              <p key={issue.product_id}>
                Product `{issue.product_id}` ke liye requested qty `{issue.requested}` hai jab ke available `{issue.available}` hai.
              </p>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleFinalize} className="bg-[#020617] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="w-12 p-4 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest italic">S#</th>
                <th className={thCls}>Category</th>
                <th className={thCls}>Product</th>
                <th className={thCls}>Available Stock</th>
                <th className={thCls}>Qty</th>
                <th className={`${thCls} text-amber-400`}>Sale Price</th>
                <th className={thCls}>Amount</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row, index) => {
                const availableQty = row.product_id ? Number(stockMap[row.product_id] || 0) : 0;
                const hasShortage = row.product_id && Number(row.total_unit) > availableQty;

                return (
                  <tr key={`row-${index}`} className={`group transition-all ${hasShortage ? 'bg-red-500/[0.04]' : 'hover:bg-blue-600/[0.02]'}`}>
                    <td className="p-4 text-center font-black text-slate-700 text-xs italic">{index + 1}</td>

                    <td className="p-2 w-44">
                      <select className={inpCls} value={row.category_id}
                        onChange={e => handleInputChange(index, 'category_id', e.target.value)}>
                        <option value="">Category</option>
                        {categories.map(c => (
                          <option key={c.product_category_id} value={c.product_category_id} className="bg-[#0f172a]">{c.category}</option>
                        ))}
                      </select>
                    </td>

                    <td className="p-2 w-52">
                      <select className={inpCls + " disabled:opacity-30"} value={row.product_id}
                        disabled={!row.category_id}
                        onChange={e => handleInputChange(index, 'product_id', e.target.value)}>
                        <option value="">Product</option>
                        {(productsMap[row.category_id] || []).map(p => (
                          <option key={p.product_id} value={p.product_id} className="bg-[#0f172a]">{p.name}</option>
                        ))}
                      </select>
                    </td>

                    <td className="p-4 text-center">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-black ${hasShortage ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                        {row.product_id ? availableQty : '--'}
                      </span>
                    </td>

                    <td className="p-2 w-28">
                      <input type="number" className={`${inpCls} text-center ${hasShortage ? 'border-red-500 text-red-300' : ''}`} value={row.total_unit || ''}
                        onChange={e => handleInputChange(index, 'total_unit', e.target.value)} />
                    </td>

                    <td className="p-2 w-32">
                      <input type="number" placeholder="0.00" className={inpCls + " text-right text-amber-400 font-mono"}
                        value={row.sale_price || ''}
                        onChange={e => handleInputChange(index, 'sale_price', e.target.value)} />
                    </td>

                    <td className="p-4 text-right text-xs font-black text-white italic">{row.amount.toLocaleString()}</td>
                    <td className="p-2">
                      <button type="button" onClick={() => removeRow(index)}
                        className="p-2 text-slate-800 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-10 bg-[#020617] border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 bg-white/5 px-8 py-4 rounded-full border border-white/5">
            <Calculator className="text-blue-500" size={20} />
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Gross Total</p>
              <p className="text-sm font-black text-white">PKR {grossTotal.toLocaleString()}</p>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button type="button" onClick={() => setRows([emptyRow(), emptyRow(), emptyRow()])}
              className="flex-1 md:flex-none bg-white/5 text-slate-500 font-black px-10 py-5 rounded-2xl uppercase text-[10px] tracking-widest border border-white/5 hover:bg-rose-500/10 hover:text-rose-500 transition-all">
              Clear Form
            </button>
            <button type="submit" disabled={isSubmitting || stockIssues.length > 0}
              className="flex-2 md:flex-none bg-blue-600 hover:bg-blue-500 text-white font-black px-16 py-5 rounded-2xl uppercase text-[10px] tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 disabled:opacity-50">
              {isSubmitting ? <Loader2 className="animate-spin" /> : <><Wallet size={18} /> Deploy Sales Order</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
