"use client";

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Save, Package, Loader2, Barcode } from 'lucide-react';
import { Toaster, toast } from 'sonner';

const HSN_PREFIX_OPTIONS = ['R', 'P', 'A', 'N', 'C'];

const formatUomLabel = (uom: any) => {
  if (!uom) return '';
  if (uom.sub_unit_name && uom.conversion_to_base) {
    return `${uom.name} (1 ${uom.name} = ${uom.conversion_to_base} ${uom.sub_unit_name})`;
  }

  return uom.name;
};

export default function AddProductDynamicPage() {
  const authToken = Cookies.get('auth_token');
  const userId = Cookies.get('user_id');

  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [modes, setModes] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [nextCodes, setNextCodes] = useState({
    skuCode: '0001',
    hsnCode: 'R-0001'
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    unit_id: '',
    hsn_prefix: 'R',
    mode_id: '',
    min_stock: '',
    max_stock: '',
  });

  const loadNextCodes = async (hsnPrefix: string) => {
    if (!authToken) {
      return;
    }

    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/product/next-codes`,
        {
          params: { hsn_prefix: hsnPrefix },
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );

      const data = res.data?.data;
      if (data?.skuCode && data?.hsnCode) {
        setNextCodes({
          skuCode: data.skuCode,
          hsnCode: data.hsnCode
        });
      }
    } catch {
      toast.error("SKU/HSN preview fetch fail ho gaya.");
    }
  };

  useEffect(() => {
    const fetchLookupData = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${authToken}` } };
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/setup-data`, config);
        const data = res.data.data;

        setCategories(data.categories || []);
        setUnits(data.uoms || []);
        setModes(data.modes || []);
      } catch {
        toast.error("Lookup data fetch fail ho gaya.");
      }
    };

    if (authToken) {
      fetchLookupData();
    }
  }, [authToken]);

  useEffect(() => {
    loadNextCodes(formData.hsn_prefix);
  }, [authToken, formData.hsn_prefix]);

  const handleChange = (field: string, value: string) => {
    const cleanValue = value.replace(/<[^>]*>?/gm, '');
    setFormData((prev) => ({ ...prev, [field]: cleanValue }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      return toast.error("Product name lazmi hai.");
    }

    if (!formData.unit_id) {
      return toast.error("UOM select karna zaroori hai.");
    }

    setIsSyncing(true);
    const tId = toast.loading("Saving product...");

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/product/`,
        {
          ...formData,
          user_id: userId,
          product_price: 0
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      toast.success("Product added successfully!", { id: tId });
      setFormData({
        name: '',
        description: '',
        category_id: '',
        unit_id: '',
        hsn_prefix: 'R',
        mode_id: '',
        min_stock: '',
        max_stock: '',
      });
      await loadNextCodes('R');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Error: Server connection failed.", { id: tId });
    } finally {
      setIsSyncing(false);
    }
  };

  const thClass = "px-4 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-[#0b1224] whitespace-nowrap sticky top-0 z-20";
  const inputClass = "bg-transparent border-none outline-none text-sm text-slate-200 w-full placeholder:text-slate-700 focus:ring-1 ring-emerald-500/30 rounded py-1.5 px-2 transition-all";
  const inputDisabledClass = "bg-transparent border-none outline-none text-sm text-slate-500 w-full rounded py-1.5 px-2 cursor-not-allowed";
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
              <p className="text-[10px] text-slate-600 font-bold tracking-[0.4em]">AUTO_SKU_AND_HSN_MODE</p>
            </div>
          </div>
        </header>

        <div className="bg-[#0f172a]/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className={`${thClass} pl-10`}>#</th>
                  <th className={thClass}>Product Name</th>
                  <th className={thClass}>Description</th>
                  <th className={thClass}>Category</th>
                  <th className={thClass}>Unit (UOM)</th>
                  <th className={thClass}>HSN Prefix</th>
                  <th className={thClass}>Generated HSN</th>
                  <th className={thClass}>Mode</th>
                  <th className={thClass}>Min Stock</th>
                  <th className={thClass}>Max Stock</th>
                  <th className={thClass}>Generated SKU</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                <tr className="hover:bg-white/[0.01] transition-colors group">
                  <td className="pl-10 py-5 text-[10px] font-black text-emerald-500">1</td>

                  <td className="px-1 py-5 border-r border-white/5 min-w-[180px]">
                    <input
                      className={inputClass}
                      placeholder="Name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                    />
                  </td>

                  <td className="px-1 py-5 border-r border-white/5 min-w-[200px]">
                    <input
                      className={inputClass}
                      placeholder="Details"
                      value={formData.description}
                      onChange={(e) => handleChange('description', e.target.value)}
                    />
                  </td>

                  <td className="px-1 py-5 border-r border-white/5 min-w-[160px]">
                    <select className={selectClass} value={formData.category_id} onChange={(e) => handleChange('category_id', e.target.value)}>
                      <option value="">Select Category</option>
                      {categories.map((cat: any) => (
                        <option key={cat.product_category_id} value={cat.product_category_id}>{cat.category}</option>
                      ))}
                    </select>
                  </td>

                  <td className="px-1 py-5 border-r border-white/5 min-w-[130px]">
                    <select className={selectClass} value={formData.unit_id} onChange={(e) => handleChange('unit_id', e.target.value)}>
                      <option value="">Select UOM</option>
                      {units.map((u: any) => (
                        <option key={u.uom_id} value={u.uom_id}>{formatUomLabel(u)}</option>
                      ))}
                    </select>
                  </td>

                  <td className="px-1 py-5 border-r border-white/5 min-w-[140px]">
                    <select className={selectClass} value={formData.hsn_prefix} onChange={(e) => handleChange('hsn_prefix', e.target.value)}>
                      {HSN_PREFIX_OPTIONS.map((prefix) => (
                        <option key={prefix} value={prefix}>{prefix}</option>
                      ))}
                    </select>
                  </td>

                  <td className="px-1 py-5 border-r border-white/5 min-w-[140px]">
                    <div className="flex items-center gap-2 px-2">
                      <Barcode size={14} className="text-amber-500" />
                      <input
                        className={inputDisabledClass}
                        value={nextCodes.hsnCode}
                        readOnly
                        title="HSN code backend se current prefix ke hisaab se auto-generate hoga"
                      />
                    </div>
                  </td>

                  <td className="px-1 py-5 border-r border-white/5 min-w-[140px]">
                    <select className={selectClass} value={formData.mode_id} onChange={(e) => handleChange('mode_id', e.target.value)}>
                      <option value="">Select Mode</option>
                      {modes.map((m: any) => (
                        <option key={m.mode_id} value={m.mode_id}>{m.name}</option>
                      ))}
                    </select>
                  </td>

                  <td className="px-1 py-5 border-r border-white/5 min-w-[100px]">
                    <input
                      type="number"
                      className={inputClass}
                      placeholder="Min"
                      value={formData.min_stock}
                      onChange={(e) => handleChange('min_stock', e.target.value)}
                    />
                  </td>

                  <td className="px-1 py-5 border-r border-white/5 min-w-[100px]">
                    <input
                      type="number"
                      className={inputClass}
                      placeholder="Max"
                      value={formData.max_stock}
                      onChange={(e) => handleChange('max_stock', e.target.value)}
                    />
                  </td>

                  <td className="px-1 py-5 min-w-[130px]">
                    <input
                      className={inputDisabledClass}
                      value={nextCodes.skuCode}
                      readOnly
                      title="SKU number backend se auto-generate hoga"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-8 bg-black/20 flex flex-col md:flex-row justify-between items-center gap-6 border-t border-white/5">
            <p className="text-[10px] text-slate-600 font-bold tracking-widest uppercase">
              SKU aur HSN dono backend se real-time 4-digit format mein auto-generate honge
            </p>
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
