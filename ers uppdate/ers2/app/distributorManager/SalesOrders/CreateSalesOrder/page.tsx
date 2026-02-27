"use client";

import React, { useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'sonner';
import { 
  Trash2, Layers, ChevronDown, Loader2, 
  Calculator, Percent, ReceiptIndianRupee, 
  Wallet, ShieldCheck, UserCircle2
} from 'lucide-react';

// --- TYPES ---
interface Customer {
  party_id: string; 
  name: string;
}

interface Category { 
  product_category_id: string; 
  category: string; 
}

interface Batch {
  batch_number: string;
  expiry_date: string;
}

interface Product { 
  product_id: string; 
  name: string; 
  batch?: Batch[]; 
}

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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedPartyId, setSelectedPartyId] = useState<string>('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsMap, setProductsMap] = useState<{ [key: string]: Product[] }>({});
  
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);

  const currentUserId = Cookies.get('userId') || 'ADMIN_USER';
  const token = Cookies.get('auth_token');

  const [rows, setRows] = useState<SalesItem[]>([
    { category_id: '', product_id: '', batch_no: '', expiry: '', total_unit: 0, approved_rate: 0, amount: 0 },
    { category_id: '', product_id: '', batch_no: '', expiry: '', total_unit: 0, approved_rate: 0, amount: 0 },
    { category_id: '', product_id: '', batch_no: '', expiry: '', total_unit: 0, approved_rate: 0, amount: 0 },
  ]);

  // --- API: FETCH CUSTOMERS ---
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/party/customers`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = res.data.customers || res.data.data || res.data;
        setCustomers(Array.isArray(data) ? data : []);
      } catch (err) {
        toast.error("Customer Fetch Failed");
      }
    };
    fetchCustomers();
  }, [token]);

  // --- API: FETCH CATEGORIES ---
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/category/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCategories(res.data.category || []);
      } catch (err) {
        toast.error("Category Error");
      }
    };
    fetchCategories();
  }, [token]);

  // --- FETCH PRODUCTS BY CATEGORY ---
  const fetchProducts = async (catId: string) => {
    if (!catId || productsMap[catId]) return;
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product/category/${catId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductsMap(prev => ({ ...prev, [catId]: res.data }));
    } catch (err) {
      toast.error("Product Sync Error");
    }
  };

  const handleInputChange = async (index: number, field: keyof SalesItem, value: any) => {
    const updatedRows = [...rows];
    updatedRows[index] = { ...updatedRows[index], [field]: value };

    if (field === 'category_id') {
      updatedRows[index].product_id = '';
      updatedRows[index].batch_no = '';
      updatedRows[index].expiry = '';
      fetchProducts(value);
    }

    if (field === 'product_id' && value !== '') {
      const categoryProducts = productsMap[updatedRows[index].category_id] || [];
      const selectedProduct = categoryProducts.find(p => p.product_id === value);
      if (selectedProduct && selectedProduct.batch && selectedProduct.batch.length > 0) {
        const activeBatch = selectedProduct.batch[0];
        updatedRows[index].batch_no = activeBatch.batch_number || '';
        if (activeBatch.expiry_date) {
          updatedRows[index].expiry = activeBatch.expiry_date.split('T')[0];
        }
      }
    }

    if (field === 'total_unit' || field === 'approved_rate') {
      updatedRows[index].amount = (Number(updatedRows[index].total_unit) || 0) * (Number(updatedRows[index].approved_rate) || 0);
    }

    setRows(updatedRows);

    if (index === rows.length - 1 && field === 'product_id' && value !== '') {
      setRows([...updatedRows, { category_id: '', product_id: '', batch_no: '', expiry: '', total_unit: 0, approved_rate: 0, amount: 0 }]);
    }
  };

  const removeRow = (index: number) => {
    if (rows.length > 1) setRows(rows.filter((_, i) => i !== index));
  };

  const grossTotal = useMemo(() => rows.reduce((sum, item) => sum + (item.amount || 0), 0), [rows]);
  const calculatedDiscount = useMemo(() => (grossTotal * discountPercent) / 100, [grossTotal, discountPercent]);
  const finalPayable = useMemo(() => (grossTotal - calculatedDiscount) + taxAmount, [grossTotal, calculatedDiscount, taxAmount]);

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId) return toast.error("Selection Error", { description: "Pehle customer select karein." });
    
    const validItems = rows.filter(r => r.product_id !== '');
    if (validItems.length === 0) return toast.error("Empty Order");

    setIsSubmitting(true);
    try {
      const payload = {
        customerId: selectedPartyId, // party_id sent as customerId
        createdBy: currentUserId,
        items: validItems,
        financials: {
          grossTotal,
          discountPercent,
          discountValue: calculatedDiscount,
          taxAmount,
          netTotal: finalPayable
        }
      };

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/distribution/sales-orders`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("ORDER DEPLOYED", { icon: <ShieldCheck className="text-emerald-500" /> });
      
      // Reset State
      setSelectedPartyId('');
      setRows([
        { category_id: '', product_id: '', batch_no: '', expiry: '', total_unit: 0, approved_rate: 0, amount: 0 },
        { category_id: '', product_id: '', batch_no: '', expiry: '', total_unit: 0, approved_rate: 0, amount: 0 },
        { category_id: '', product_id: '', batch_no: '', expiry: '', total_unit: 0, approved_rate: 0, amount: 0 },
      ]);
      setDiscountPercent(0);
      setTaxAmount(0);
    } catch (err: any) {
      toast.error("Transmission Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const thStyle = "text-left text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] p-4 border-b border-white/5";
  const inputBase = "w-full bg-[#0f172a] border border-slate-800 rounded-xl py-3 px-3 text-white focus:border-blue-500 outline-none transition-all text-xs font-medium appearance-none";

  return (
    <div className="max-w-[1500px] mx-auto p-4 md:p-10 pb-24 selection:bg-blue-600/30">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* HEADER & CUSTOMER SELECT */}
      <div className="mb-10 flex flex-col lg:flex-row lg:items-end justify-between gap-8 border-l-8 border-blue-600 pl-6">
        <div className="flex-1">
          <h1 className="text-6xl font-black text-white uppercase tracking-tighter italic leading-none">
            Order <span className="text-blue-600">Forge</span>
          </h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-4 flex items-center gap-2 italic">
            <Layers size={14} className="text-blue-500" /> AUTH_ID: {currentUserId}
          </p>
        </div>

        <div className="w-full lg:w-[400px] relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative bg-[#020617] rounded-2xl border border-white/10 p-4">
             <label className="text-[9px] font-black text-blue-500 uppercase mb-2 block tracking-widest italic text-nowrap">Target Customer Account</label>
             <div className="relative">
                <select 
                  className="w-full bg-slate-900 border-none rounded-xl py-4 pl-12 pr-10 text-white text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                  value={selectedPartyId}
                  onChange={(e) => setSelectedPartyId(e.target.value)}
                >
                  <option value="">Choose Customer Account...</option>
                  {customers.map((c) => (
                    <option key={c.party_id} value={c.party_id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <UserCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={20} />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
             </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleFinalize} className="bg-[#020617] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden relative">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="w-14 p-4 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest italic">S#</th>
                <th className={thStyle}>Category</th>
                <th className={thStyle}>Product</th>
                <th className={thStyle}>Batch No</th>
                <th className={thStyle}>Expiry</th>
                <th className={thStyle}>Qty</th>
                <th className={thStyle}>Rate</th>
                <th className={thStyle}>Amount</th>
                <th className="w-14"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row, index) => (
                <tr key={`row-${index}`} className="group hover:bg-blue-600/[0.02] transition-all">
                  <td className="p-4 text-center font-black text-slate-700 text-xs italic">{index + 1}</td>
                  <td className="p-2 w-[200px]">
                    <select className={inputBase} value={row.category_id} onChange={(e) => handleInputChange(index, 'category_id', e.target.value)}>
                      <option value="">Category</option>
                      {categories.map(cat => <option key={cat.product_category_id} value={cat.product_category_id}>{cat.category}</option>)}
                    </select>
                  </td>
                  <td className="p-2 w-[220px]">
                    <select className={inputBase} value={row.product_id} disabled={!row.category_id} onChange={(e) => handleInputChange(index, 'product_id', e.target.value)}>
                      <option value="">Product</option>
                      {(productsMap[row.category_id] || []).map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="p-2"><input type="text" className={inputBase + " text-center uppercase"} value={row.batch_no} onChange={(e) => handleInputChange(index, 'batch_no', e.target.value)} /></td>
                  <td className="p-2"><input type="date" className={inputBase} value={row.expiry} onChange={(e) => handleInputChange(index, 'expiry', e.target.value)} /></td>
                  <td className="p-2 w-24"><input type="number" className={inputBase + " text-center"} value={row.total_unit || ''} onChange={(e) => handleInputChange(index, 'total_unit', e.target.value)} /></td>
                  <td className="p-2 w-28"><input type="number" className={inputBase + " text-right text-blue-400 font-mono"} value={row.approved_rate || ''} onChange={(e) => handleInputChange(index, 'approved_rate', e.target.value)} /></td>
                  <td className="p-4 text-right text-xs font-black text-white italic">{row.amount.toLocaleString()}</td>
                  <td className="p-2">
                    <button type="button" onClick={() => removeRow(index)} className="p-2 text-slate-800 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* SUMMARY SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-10 bg-white/[0.01] border-t border-white/5">
          <div className="md:col-span-4 space-y-6">
            <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em]">Adjustment Engine</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="relative group">
                <input type="number" placeholder="Discount %" className={inputBase + " pl-10 h-14 bg-slate-900"} value={discountPercent || ''} onChange={(e) => setDiscountPercent(Number(e.target.value))} />
                <Percent className="absolute left-3 top-4 text-blue-600" size={20} />
              </div>
              <div className="relative group">
                <input type="number" placeholder="Tax Amount" className={inputBase + " pl-10 h-14 bg-slate-900"} value={taxAmount || ''} onChange={(e) => setTaxAmount(Number(e.target.value))} />
                <ReceiptIndianRupee className="absolute left-3 top-4 text-emerald-600" size={20} />
              </div>
            </div>
          </div>

          <div className="md:col-span-3"></div>

          <div className="md:col-span-5">
            <div className="bg-slate-900/50 rounded-[2rem] p-8 border border-white/5 space-y-4 shadow-inner">
               <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-widest italic">
                 <span>Gross Subtotal</span>
                 <span className="text-white">PKR {grossTotal.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center text-rose-500 text-[10px] font-bold uppercase tracking-widest italic border-b border-white/10 pb-4">
                 <span>Markdown Applied</span>
                 <span className="font-mono">-{calculatedDiscount.toLocaleString()}</span>
               </div>
               <div className="flex justify-between items-center pt-2">
                 <span className="text-white font-black text-sm uppercase italic">Final Payable</span>
                 <span className="text-4xl font-black text-blue-500 italic tracking-tighter">
                   PKR {finalPayable.toLocaleString()}
                 </span>
               </div>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-10 bg-[#020617] border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 bg-white/5 px-8 py-4 rounded-full border border-white/5">
            <Calculator className="text-blue-500" size={20} />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">Logic Engine Active</span>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <button type="button" onClick={() => window.location.reload()} className="flex-1 md:flex-none bg-white/5 text-slate-500 font-black px-10 py-5 rounded-2xl uppercase text-[10px] tracking-widest border border-white/5 hover:bg-rose-500/10 hover:text-rose-500 transition-all">Clear Form</button>
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="flex-[2] md:flex-none bg-blue-600 hover:bg-blue-500 text-white font-black px-16 py-5 rounded-2xl uppercase text-[10px] tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" /> : <><Wallet size={18} /> Deploy Sales Order</>}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}