"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'sonner';
import { 
  Save, Trash2, Package, Layers, ChevronDown, 
  Loader2, Calculator, Percent, ReceiptIndianRupee, 
  Wallet, ShieldCheck 
} from 'lucide-react';

// --- TYPES ---
interface Category { id: string; name: string; }
interface Product { id: string; name: string; category_id: string; }
interface SalesItem {
  category_id: string;
  product_id: string;
  batch_no: string;
  expiry: string;
  total_unit: number;
  approved_rate: number;
  amount: number;
}

export default function CreateSalesOrder() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsMap, setProductsMap] = useState<{ [key: string]: Product[] }>({});
  
  // Financial Summary States
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);

  const currentUserId = Cookies.get('userId') || 'ADMIN_USER';
  const token = Cookies.get('auth_token');

  const [rows, setRows] = useState<SalesItem[]>([
    { category_id: '', product_id: '', batch_no: '', expiry: '', total_unit: 0, approved_rate: 0, amount: 0 },
    { category_id: '', product_id: '', batch_no: '', expiry: '', total_unit: 0, approved_rate: 0, amount: 0 },
    { category_id: '', product_id: '', batch_no: '', expiry: '', total_unit: 0, approved_rate: 0, amount: 0 },
  ]);

  // --- API: FETCH CATEGORIES ---
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/categories`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCategories(res.data);
      } catch (err) {
        toast.error("Network Error", { description: "Categories fetch nahi ho sakin." });
      }
    };
    fetchCategories();
  }, [token]);

  // --- API: FETCH PRODUCTS BY CATEGORY ---
  const fetchProducts = async (catId: string) => {
    if (!catId || productsMap[catId]) return;
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/products?category=${catId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductsMap(prev => ({ ...prev, [catId]: res.data }));
    } catch (err) {
      toast.error("Product Error");
    }
  };

  // --- HANDLE INPUT CHANGE ---
  const handleInputChange = async (index: number, field: keyof SalesItem, value: any) => {
    const updatedRows = [...rows];
    updatedRows[index] = { ...updatedRows[index], [field]: value };

    if (field === 'category_id') {
      updatedRows[index].product_id = '';
      fetchProducts(value);
    }

    if (field === 'total_unit' || field === 'approved_rate') {
      const units = Number(updatedRows[index].total_unit) || 0;
      const rate = Number(updatedRows[index].approved_rate) || 0;
      updatedRows[index].amount = units * rate;
    }

    setRows(updatedRows);

    if (index === rows.length - 1 && field === 'product_id' && value !== '') {
      setRows([...updatedRows, { category_id: '', product_id: '', batch_no: '', expiry: '', total_unit: 0, approved_rate: 0, amount: 0 }]);
    }
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) setRows(rows.filter((_, i) => i !== index));
  };

  // --- CALCULATIONS ---
  const grossTotal = useMemo(() => rows.reduce((sum, item) => sum + (item.amount || 0), 0), [rows]);
  const calculatedDiscount = useMemo(() => (grossTotal * discountPercent) / 100, [grossTotal, discountPercent]);
  const finalPayable = useMemo(() => (grossTotal - calculatedDiscount) + taxAmount, [grossTotal, calculatedDiscount, taxAmount]);

  // --- SUBMIT ---
  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    const validData = rows.filter(r => r.product_id !== '');
    if (validData.length === 0) return toast.error("Entry Required", { description: "Please select at least one product." });

    setIsSubmitting(true);
    try {
      const payload = {
        createdBy: currentUserId,
        items: validData,
        financials: {
          grossTotal,
          discountPercent,
          discountValue: calculatedDiscount,
          taxAmount,
          netTotal: finalPayable
        }
      };

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/orders`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("TRANSMISSION SUCCESSFUL", { icon: <ShieldCheck className="text-emerald-500" /> });
      setRows([
        { category_id: '', product_id: '', batch_no: '', expiry: '', total_unit: 0, approved_rate: 0, amount: 0 },
        { category_id: '', product_id: '', batch_no: '', expiry: '', total_unit: 0, approved_rate: 0, amount: 0 },
        { category_id: '', product_id: '', batch_no: '', expiry: '', total_unit: 0, approved_rate: 0, amount: 0 },
      ]);
      setDiscountPercent(0);
      setTaxAmount(0);
    } catch (err: any) {
      toast.error("Server Error", { description: "Order save nahi ho saka." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const thStyle = "text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] p-4 border-b border-white/5";
  const inputBase = "w-full bg-[#0f172a] border border-slate-800 rounded-xl py-3 px-3 text-white focus:border-blue-500 outline-none transition-all text-xs font-medium appearance-none";

  return (
    <div className="max-w-[1500px] mx-auto p-4 md:p-10 pb-24 selection:bg-blue-600/30">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* HEADER */}
      <div className="mb-10 border-l-8 border-blue-600 pl-6">
        <h1 className="text-6xl font-black text-white uppercase tracking-tighter italic leading-none">
          Order <span className="text-blue-600">Forge</span>
        </h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-3 flex items-center gap-2 italic">
          <Layers size={14} className="text-blue-500" /> System Unit: {currentUserId}
        </p>
      </div>

      <form onSubmit={handleFinalize} className="bg-[#020617] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        {/* DATA TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="w-14 p-4 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest">S#</th>
                <th className={thStyle}>Category</th>
                <th className={thStyle}>Product</th>
                <th className={thStyle}>Batch No</th>
                <th className={thStyle}>Expiry</th>
                <th className={thStyle}>Units</th>
                <th className={thStyle}>Rate</th>
                <th className={thStyle}>Amount</th>
                <th className="w-14"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row, index) => (
                <tr key={index} className="group hover:bg-blue-600/[0.02] transition-all">
                  <td className="p-4 text-center font-black text-slate-700 text-xs italic">{index + 1}</td>
                  <td className="p-2 w-[200px]">
                    <select className={inputBase} value={row.category_id} onChange={(e) => handleInputChange(index, 'category_id', e.target.value)}>
                      <option value="">Select Category</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2 w-[220px]">
                    <select className={inputBase + " disabled:opacity-20"} value={row.product_id} disabled={!row.category_id} onChange={(e) => handleInputChange(index, 'product_id', e.target.value)}>
                      <option value="">Select Product</option>
                      {(productsMap[row.category_id] || []).map(prod => <option key={prod.id} value={prod.id}>{prod.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2"><input type="text" placeholder="LOT" className={inputBase + " text-center uppercase"} value={row.batch_no} onChange={(e) => handleInputChange(index, 'batch_no', e.target.value)} /></td>
                  <td className="p-2"><input type="date" className={inputBase} value={row.expiry} onChange={(e) => handleInputChange(index, 'expiry', e.target.value)} /></td>
                  <td className="p-2 w-24"><input type="number" placeholder="0" className={inputBase + " text-center"} value={row.total_unit || ''} onChange={(e) => handleInputChange(index, 'total_unit', e.target.value)} /></td>
                  <td className="p-2 w-28"><input type="number" placeholder="0.00" className={inputBase + " text-right text-blue-400 font-mono"} value={row.approved_rate || ''} onChange={(e) => handleInputChange(index, 'approved_rate', e.target.value)} /></td>
                  <td className="p-4 text-right text-xs font-black text-white italic">{row.amount.toLocaleString()}</td>
                  <td className="p-2">
                    <button type="button" onClick={() => removeRow(index)} className="hover:cursor-pointer p-2 text-slate-800 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* --- FINANCIAL SUMMARY SECTION --- */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-10 bg-white/[0.01] border-t border-white/5 items-start">
          
          {/* Discount & Tax Inputs (4 columns) */}
          <div className="md:col-span-4 space-y-5">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mb-4">Adjustments</h3>
            
            <div className="relative group">
              <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block tracking-widest group-focus-within:text-blue-400 transition-colors">Trade Discount (%)</label>
              <div className="relative">
                <input 
                  type="number" 
                  placeholder="0" 
                  className={inputBase + " pl-10 h-14 bg-[#0a101f] text-lg"} 
                  value={discountPercent || ''} 
                  onChange={(e) => setDiscountPercent(Number(e.target.value))} 
                />
                <Percent className="absolute left-3 top-4 text-blue-600" size={20} />
              </div>
            </div>

            <div className="relative group">
              <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block tracking-widest group-focus-within:text-emerald-400 transition-colors">Sales Tax (PKR)</label>
              <div className="relative">
                <input 
                  type="number" 
                  placeholder="0.00" 
                  className={inputBase + " pl-10 h-14 bg-[#0a101f] text-lg"} 
                  value={taxAmount || ''} 
                  onChange={(e) => setTaxAmount(Number(e.target.value))} 
                />
                <ReceiptIndianRupee className="absolute left-3 top-4 text-emerald-600" size={20} />
              </div>
            </div>
          </div>

          {/* Spacer (2 columns) */}
          <div className="hidden md:block md:col-span-3"></div>

          {/* Totals Display (5 columns) */}
          <div className="md:col-span-5">
            <div className="bg-[#0f172a]/50 rounded-[2rem] p-8 border border-white/5 space-y-4 shadow-inner relative overflow-hidden">
               {/* Background Glow */}
               <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-600/10 blur-[50px] rounded-full" />
               
               <div className="flex justify-between items-center text-slate-500 text-xs font-bold uppercase tracking-wider">
                 <span>Gross Valuation:</span>
                 <span className="text-white">PKR {grossTotal.toLocaleString()}</span>
               </div>

               <div className="flex justify-between items-center text-rose-500 text-xs font-bold uppercase tracking-wider">
                 <span>Discount ({discountPercent}%):</span>
                 <span className="font-mono">- {calculatedDiscount.toLocaleString()}</span>
               </div>

               <div className="flex justify-between items-center text-emerald-500 text-xs font-bold uppercase tracking-wider border-b border-white/10 pb-4">
                 <span>Applied Tax:</span>
                 <span className="font-mono">+ {taxAmount.toLocaleString()}</span>
               </div>

               <div className="flex justify-between items-center pt-2">
                 <div className="flex flex-col">
                   <span className="text-white font-black text-sm uppercase tracking-tighter italic">Net Payable</span>
                   <span className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em]">Authorized Amount</span>
                 </div>
                 <span className="text-4xl font-black text-blue-500 italic tracking-tighter drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                   PKR {finalPayable.toLocaleString()}
                 </span>
               </div>
            </div>
          </div>
        </div>

        {/* FINAL ACTION BAR */}
        <div className="p-10 bg-[#020617] border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 bg-white/5 px-8 py-4 rounded-full border border-white/5">
            <Calculator className="text-blue-500" size={20} />
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Math Engine</span>
              <span className="text-[10px] font-bold text-emerald-500 uppercase">Live Sync Active</span>
            </div>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <button 
              type="button" 
              onClick={() => { if(confirm("Clear entire sheet?")) window.location.reload(); }} 
              className="hover:cursor-pointer flex-1 md:flex-none bg-white/5 text-slate-500 font-black px-10 py-5 rounded-2xl uppercase text-[10px] tracking-widest border border-white/5 hover:bg-rose-500/10 hover:text-rose-500 transition-all active:scale-95"
            >
              Flush All
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="hover:cursor-pointer flex-[2] md:flex-none bg-blue-600 hover:bg-blue-500 text-white font-black px-20 py-5 rounded-2xl uppercase text-[10px] tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/30 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <><Wallet size={20} /> Deploy Order & Sync</>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}