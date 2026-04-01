"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'sonner';
import {
  Trash2, Layers, Loader2, Calculator,
  ReceiptIndianRupee, Wallet, ShieldCheck
} from 'lucide-react';

// --- TYPES ---
interface Category { product_category_id: string; category: string; }
interface Product   { product_id: string; name: string; }
interface TaxItem   { tax_id: number; name: string; rate: number; type: string; context: string; }
interface BatchItem {
  batch_id: number;
  batch_number: string;
  expiry_date: string | null;
  manufacturing_date: string | null;
  batchitem: { product_id: string; available_quantity: number }[];
}
interface SalesItem {
  order_date: string;
  category_id: string;
  product_id: string;
  price_type: string;
  batch_id: number | null;
  batch_no: string;
  expiry: string;
  total_unit: number;
  approved_rate: number;
  amount: number;
}

const emptyRow = (date: string): SalesItem => ({
  order_date: date, category_id: '', product_id: '', price_type: '',
  batch_id: null, batch_no: '', expiry: '', total_unit: 0, approved_rate: 0, amount: 0,
});

export default function CreatePurchaseOrder() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories,  setCategories]  = useState<Category[]>([]);
  const [productsMap, setProductsMap] = useState<Record<string, Product[]>>({});
  const [taxes,       setTaxes]       = useState<TaxItem[]>([]);
  const [selectedTax, setSelectedTax] = useState<TaxItem | null>(null);
  const [batches,     setBatches]     = useState<BatchItem[]>([]);

  const currentUserId = Cookies.get('userId') || 'ADMIN_USER';
  const token = Cookies.get('virtue_token') || Cookies.get('auth_token');
  const today = () => new Date().toISOString().split('T')[0];

  const [rows, setRows] = useState<SalesItem[]>([
    emptyRow(today()), emptyRow(today()), emptyRow(today()),
  ]);

  // ── Fetch categories, taxes, batches on mount ─────────────────────────────
  useEffect(() => {
    if (!token) return;
    const h = { Authorization: `Bearer ${token}` };

    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/category`, { headers: h })
      .then(r => setCategories(r.data.category || []))
      .catch(() => toast.error("Categories load failed"));

    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/finance/taxes`, { headers: h })
      .then(r => setTaxes(r.data.data || []))
      .catch(() => {});

    axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/batch`, { headers: h })
      .then(r => setBatches(Array.isArray(r.data) ? r.data : r.data.data || []))
      .catch(() => {});
  }, [token]);

  // ── Fetch products by category (cached) ──────────────────────────────────
  const fetchProducts = async (catId: string) => {
    if (!catId || productsMap[catId]) return;
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product/category/${catId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductsMap(prev => ({ ...prev, [catId]: res.data }));
    } catch { toast.error("Product fetch error"); }
  };

  // ── Fetch price by product + price type ──────────────────────────────────
  const fetchPrice = async (index: number, productId: string, priceType: string) => {
    if (!productId || !priceType) return;
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/productprice/lookup`, {
        params: { product_id: productId, price_type: priceType },
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.data) {
        const rate = parseFloat(res.data.data.unit_price);
        setRows(prev => {
          const next = [...prev];
          next[index] = { ...next[index], approved_rate: rate, amount: (next[index].total_unit || 0) * rate };
          return next;
        });
        toast.success(`${priceType} price: PKR ${rate.toLocaleString()}`);
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Price lookup failed");
    }
  };

  // ── Per-row batch list (filtered by product) ──────────────────────────────
  const getBatchesForProduct = (productId: string) =>
    batches.filter(b => b.batchitem.some(bi => bi.product_id === productId));

  // ── Row change handler ────────────────────────────────────────────────────
  const handleInputChange = (index: number, field: keyof SalesItem, value: any) => {
    setRows(prev => {
      const rows = [...prev];
      const row = { ...rows[index], [field]: value };

      if (field === 'category_id') {
        row.product_id = ''; row.price_type = '';
        row.batch_id = null; row.batch_no = ''; row.expiry = '';
        row.approved_rate = 0; row.amount = 0;
        fetchProducts(value);
      }

      if (field === 'product_id') {
        row.price_type = '';
        row.batch_id = null; row.batch_no = ''; row.expiry = '';
        row.approved_rate = 0; row.amount = 0;
      }

      if (field === 'price_type' && value && row.product_id) {
        rows[index] = row;
        setRows([...rows]);
        fetchPrice(index, row.product_id, value);
        return rows;
      }

      if (field === 'total_unit' || field === 'approved_rate') {
        row.amount = (Number(row.total_unit) || 0) * (Number(row.approved_rate) || 0);
      }

      rows[index] = row;

      // Auto-add row when last row gets a product
      if (index === rows.length - 1 && field === 'product_id' && value) {
        return [...rows, emptyRow(today())];
      }
      return rows;
    });
  };

  // ── Batch select handler ──────────────────────────────────────────────────
  const handleBatchSelect = (index: number, batchId: number | null) => {
    const batch = batches.find(b => b.batch_id === batchId) ?? null;
    setRows(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        batch_id:  batch?.batch_id ?? null,
        batch_no:  batch?.batch_number ?? '',
        expiry:    batch?.expiry_date ? batch.expiry_date.split('T')[0] : '',
      };
      return next;
    });
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) setRows(rows.filter((_, i) => i !== index));
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const grossTotal = useMemo(() => rows.reduce((s, r) => s + (r.amount || 0), 0), [rows]);
  const computedTaxAmount = useMemo(() => {
    if (!selectedTax) return 0;
    return selectedTax.type === 'percentage' ? (grossTotal * selectedTax.rate) / 100 : selectedTax.rate;
  }, [grossTotal, selectedTax]);
  const finalPayable = useMemo(() => grossTotal + computedTaxAmount, [grossTotal, computedTaxAmount]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    const validData = rows.filter(r => r.product_id !== '');
    if (!validData.length) return toast.error("Kam az kam ek product select karein.");
    setIsSubmitting(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/purchase/order`, {
        createdBy: currentUserId,
        items: validData,
        financials: { grossTotal, taxId: selectedTax?.tax_id ?? null, taxAmount: computedTaxAmount, netTotal: finalPayable }
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success("Order submitted successfully", { icon: <ShieldCheck className="text-emerald-500" /> });
      setRows([emptyRow(today()), emptyRow(today())]);
      setSelectedTax(null);
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

      {/* HEADER */}
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
          <table className="w-full border-collapse min-w-[1400px]">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="w-12 p-4 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest">S#</th>
                <th className={thCls}>Category</th>
                <th className={thCls}>Product</th>
                <th className={thCls}>Price Type</th>
                <th className={thCls}>Batch</th>
                <th className={thCls}>Expiry</th>
                <th className={thCls}>Units</th>
                <th className={thCls}>Rate</th>
                <th className={thCls}>Amount</th>
                <th className={thCls}>Date</th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row, index) => {
                const productBatches = row.product_id ? getBatchesForProduct(row.product_id) : [];
                return (
                  <tr key={index} className="group hover:bg-blue-600/[0.02] transition-all">
                    <td className="p-4 text-center font-black text-slate-700 text-xs italic">{index + 1}</td>

                    {/* Category */}
                    <td className="p-2 w-[155px]">
                      <select className={inpCls} value={row.category_id}
                        onChange={e => handleInputChange(index, 'category_id', e.target.value)}>
                        <option value="">Category</option>
                        {categories.map(c => <option key={c.product_category_id} value={c.product_category_id} className="bg-[#0f172a]">{c.category}</option>)}
                      </select>
                    </td>

                    {/* Product */}
                    <td className="p-2 w-[175px]">
                      <select className={inpCls + " disabled:opacity-30"} value={row.product_id}
                        disabled={!row.category_id}
                        onChange={e => handleInputChange(index, 'product_id', e.target.value)}>
                        <option value="">Product</option>
                        {(productsMap[row.category_id] || []).map(p => <option key={p.product_id} value={p.product_id} className="bg-[#0f172a]">{p.name}</option>)}
                      </select>
                    </td>

                    {/* Price Type */}
                    <td className="p-2 w-[135px]">
                      <select className={inpCls + " disabled:opacity-30"} value={row.price_type}
                        disabled={!row.product_id}
                        onChange={e => handleInputChange(index, 'price_type', e.target.value)}>
                        <option value="">Price Type</option>
                        <option value="RETAIL"      className="bg-[#0f172a]">Retail</option>
                        <option value="WHOLESALE"   className="bg-[#0f172a]">Wholesale</option>
                        <option value="DISTRIBUTER" className="bg-[#0f172a]">Distributor</option>
                      </select>
                    </td>

                    {/* Batch dropdown */}
                    <td className="p-2 w-[180px]">
                      <select
                        className={inpCls + " disabled:opacity-30"}
                        disabled={!row.product_id}
                        value={row.batch_id ?? ''}
                        onChange={e => handleBatchSelect(index, e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">Select Batch</option>
                        {productBatches.map(b => {
                          const avail = b.batchitem.find(bi => bi.product_id === row.product_id)?.available_quantity ?? 0;
                          return (
                            <option key={b.batch_id} value={b.batch_id} className="bg-[#0f172a]">
                              {b.batch_number} | Avail: {avail}
                            </option>
                          );
                        })}
                      </select>
                    </td>

                    {/* Expiry (readonly, filled by batch selection) */}
                    <td className="p-2 w-[130px]">
                      <input type="text" readOnly
                        className={inpCls + " text-center text-slate-400 cursor-default"}
                        value={row.expiry || '—'}
                        placeholder="—"
                      />
                    </td>

                    <td className="p-2 w-24"><input type="number" className={inpCls + " text-center"} value={row.total_unit || ''} onChange={e => handleInputChange(index, 'total_unit', e.target.value)} /></td>
                    <td className="p-2 w-28"><input type="number" className={inpCls + " text-right text-blue-400 font-mono"} value={row.approved_rate || ''} onChange={e => handleInputChange(index, 'approved_rate', e.target.value)} /></td>
                    <td className="p-4 text-right text-xs font-black text-white italic">{row.amount.toLocaleString()}</td>
                    <td className="p-2 w-36"><input type="date" className={inpCls} value={row.order_date} onChange={e => handleInputChange(index, 'order_date', e.target.value)} /></td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => removeRow(index)}
                        className="p-2 text-slate-800 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-10 bg-white/[0.01] border-t border-white/5 items-start">
          <div className="md:col-span-4 space-y-5">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Adjustments</h3>
            <div>
              <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block tracking-widest">Tax</label>
              <div className="relative">
                <select
                  className={inpCls + " pl-10 h-14 bg-[#0a101f] text-sm"}
                  value={selectedTax?.tax_id ?? ''}
                  onChange={e => setSelectedTax(taxes.find(t => t.tax_id === Number(e.target.value)) || null)}
                >
                  <option value="">— No Tax —</option>
                  {taxes.map(t => (
                    <option key={t.tax_id} value={t.tax_id} className="bg-[#0f172a]">
                      {t.name} ({t.rate}{t.type === 'percentage' ? '%' : ' PKR'})
                    </option>
                  ))}
                </select>
                <ReceiptIndianRupee className="absolute left-3 top-4 text-emerald-600 pointer-events-none" size={20} />
              </div>
            </div>
          </div>
          <div className="hidden md:block md:col-span-3" />
          <div className="md:col-span-5">
            <div className="bg-[#0f172a]/50 rounded-[2rem] p-8 border border-white/5 space-y-4 shadow-inner">
              <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
                <span>Gross Total</span>
                <span className="text-white">PKR {grossTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-500 text-xs font-bold uppercase tracking-wider border-b border-white/10 pb-4">
                <span>{selectedTax ? `${selectedTax.name} (${selectedTax.rate}${selectedTax.type === 'percentage' ? '%' : ' PKR'})` : 'Tax'}</span>
                <span className="font-mono">+ PKR {computedTaxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <div>
                  <p className="text-white font-black text-sm uppercase tracking-tighter italic">Net Payable</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Authorized Amount</p>
                </div>
                <span className="text-4xl font-black text-blue-500 italic tracking-tighter">PKR {finalPayable.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-10 bg-[#020617] border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 bg-white/5 px-8 py-4 rounded-full border border-white/5">
            <Calculator className="text-blue-500" size={20} />
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Math Engine</p>
              <p className="text-[10px] font-bold text-emerald-500 uppercase">Live Sync Active</p>
            </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <button type="button" onClick={() => window.location.reload()}
              className="flex-1 md:flex-none bg-white/5 text-slate-500 font-black px-10 py-5 rounded-2xl uppercase text-[10px] tracking-widest border border-white/5 hover:text-rose-500 transition-all">
              Flush All
            </button>
            <button type="submit" disabled={isSubmitting}
              className="flex-[2] md:flex-none bg-blue-600 hover:bg-blue-500 text-white font-black px-20 py-5 rounded-2xl uppercase text-[10px] tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/30 disabled:opacity-50 active:scale-95">
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><Wallet size={20} /> Deploy Order & Sync</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
