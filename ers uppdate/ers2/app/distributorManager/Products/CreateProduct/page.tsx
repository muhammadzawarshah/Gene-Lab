"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
  Save, Package, Hash, Loader2
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function AddProductDynamicPage() {
  const authToken = Cookies.get('auth_token');
  const userId = Cookies.get('user_id');

  // States for Lookup Data
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Single Product State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    unit_id: '',
    hsn_code: '',
    brand_name: '',
    tax_id: ''
  });

  // Fetch Lookups
  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${authToken}` } };
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/setup-data`, config);
        const data = res.data.data;
        setCategories(data.categories || []);
        setUnits(data.uoms || []);
        setTaxes(data.tax || []);
      } catch (err) {
        toast.error("Lookup data fetch fail ho gaya.");
      }
    };
    if (authToken) fetchLookupData();
  }, [authToken]);

  const handleChange = (field: string, value: string) => {
    const cleanValue = value.replace(/<[^>]*>?/gm, '');
    setFormData({ ...formData, [field]: cleanValue });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.sku.trim()) {
      return toast.error("SKU aur Product Name lazmi hain.");
    }

    setIsSyncing(true);
    const tId = toast.loading("Saving product...");

    try {
      const finalPayload = {
        ...formData,
        user_id: userId,
        product_price: 0
      };

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product/`,
        finalPayload,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      toast.success("Product added successfully!", { id: tId });
      setFormData({ sku: '', name: '', description: '', category_id: '', unit_id: '', hsn_code: '', brand_name: '', tax_id: '' });
    } catch (err) {
      toast.error("Error: Server connection failed.", { id: tId });
    } finally {
      setIsSyncing(false);
    }
  };

  const thClass = "px-4 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-[#0b1224] whitespace-nowrap sticky top-0 z-20";
  const inputClass = "bg-transparent border-none outline-none text-sm text-slate-200 w-full placeholder:text-slate-700 focus:ring-1 ring-emerald-500/30 rounded py-1.5 px-2 transition-all";
  const selectClass = `${inputClass} bg-[#0b1224] text-white [color-scheme:dark]`;

  return (
    <div className="text-slate-300 p-6 md:p-10 font-sans">
      <Toaster richColors theme="dark" position="top-center" />

      <div className="max-w-[1900px] mx-auto">
        <header className="flex items-center justify-between mb-10 border-b border-white/5 pb-8">
          <div className="flex items-center gap-6">
            <div className="bg-emerald-600 p-4 rounded-2xl shadow-lg">
              <Package className="text-white" size={30} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                ADD <span className="text-emerald-500">PRODUCT</span>
              </h1>
              <p className="text-[10px] text-slate-600 font-bold tracking-[0.4em]">SINGLE_ENTRY_MODE_V3</p>
            </div>
          </div>
        </header>

        <div className="bg-[#0f172a]/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className={`${thClass} pl-10`}><Hash size={12}/></th>
                  <th className={thClass}>SKU Identifier</th>
                  <th className={thClass}>Product Name</th>
                  <th className={thClass}>Description</th>
                  <th className={thClass}>Category</th>
                  <th className={thClass}>Unit (UOM)</th>
                  <th className={thClass}>HSN Code</th>
                  <th className={thClass}>Brand</th>
                  <th className={thClass}>Tax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                <tr className="hover:bg-white/[0.01] transition-colors group">
                  <td className="pl-10 py-5 text-[10px] font-black text-emerald-500">1</td>

                  <td className="px-1 py-5 border-r border-white/5 min-w-[130px]">
                    <input className={inputClass} placeholder="SKU-..." value={formData.sku} onChange={(e) => handleChange('sku', e.target.value)} />
                  </td>
                  <td className="px-1 py-5 border-r border-white/5 min-w-[160px]">
                    <input className={inputClass} placeholder="Name" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} />
                  </td>
                  <td className="px-1 py-5 border-r border-white/5 min-w-[180px]">
                    <input className={inputClass} placeholder="Details" value={formData.description} onChange={(e) => handleChange('description', e.target.value)} />
                  </td>
                  <td className="px-1 py-5 border-r border-white/5 min-w-[140px]">
                    <select className={selectClass} value={formData.category_id} onChange={(e) => handleChange('category_id', e.target.value)}>
                      <option value="">Select Category</option>
                      {categories.map((cat: any) => (
                        <option key={cat.product_category_id} value={cat.product_category_id}>{cat.category}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-5 border-r border-white/5 min-w-[110px]">
                    <select className={selectClass} value={formData.unit_id} onChange={(e) => handleChange('unit_id', e.target.value)}>
                      <option value="">Select UOM</option>
                      {units.map((u: any) => (
                        <option key={u.uom_id} value={u.uom_id}>{u.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-1 py-5 border-r border-white/5 min-w-[100px]">
                    <input className={inputClass} placeholder="HSN" value={formData.hsn_code} onChange={(e) => handleChange('hsn_code', e.target.value)} />
                  </td>
                  <td className="px-1 py-5 border-r border-white/5 min-w-[110px]">
                    <input className={inputClass} placeholder="Brand" value={formData.brand_name} onChange={(e) => handleChange('brand_name', e.target.value)} />
                  </td>
                  <td className="px-1 py-5 min-w-[130px]">
                    <select className={selectClass} value={formData.tax_id} onChange={(e) => handleChange('tax_id', e.target.value)}>
                      <option value="">No Tax</option>
                      {taxes.map((t: any) => (
                        <option key={t.tax_id} value={t.tax_id}>{t.name} ({t.rate}%)</option>
                      ))}
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-8 bg-black/20 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-white/5">
            <button
              disabled={isSyncing}
              onClick={handleSubmit}
              className="bg-white text-black px-14 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-emerald-600 hover:text-white transition-all shadow-2xl active:scale-95 flex items-center gap-4"
            >
              {isSyncing ? <Loader2 className="animate-spin" /> : <Save size={18} />}
              SAVE PRODUCT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
