"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { 
  Edit3, Trash2, Package, Search, 
  X, Save, AlertCircle, Hash, Database
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function ProductListPage() {
  const authToken = Cookies.get('auth_token');
  const userId = Cookies.get('user_id');

  // States
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 1. Fetch Data (Direct No-Loading UI)
  const fetchInitialData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${authToken}` } };
      const [prodRes, catRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product`, config),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/setup-data`, config),
      ]);
      console.log(prodRes.data)
      setProducts(prodRes.data || []);
      setCategories(catRes.data.data.categories|| []);
      setUnits(catRes.data.data.uoms || []);
    } catch (err) {
      toast.error("Database se contact nahi ho saka.");
    }
  };

  useEffect(() => { if (authToken) fetchInitialData(); }, [authToken]);

  // 2. Delete Logic (Dedicated Secure Route)
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this product?")) return;
    
    const tId = toast.loading("Processing removal...");
    try {
      // Security: user_id verify karna backend ki responsibility hai
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/products/delete/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { user_id: userId } 
      });
      toast.success("Product removed from inventory.", { id: tId });
      setProducts(products.filter((p: any) => p.id !== id));
    } catch (err) {
      toast.error("Delete request failed.", { id: tId });
    }
  };

  // 3. Edit Modal Handlers
  const openEditModal = (product: any) => {
    setCurrentProduct({ ...product });
    setIsEditModalOpen(true);
  };

  const handleEditChange = (field: string, value: string) => {
    // Basic Sanitization to block <script> tags
    const cleanValue = value.replace(/<[^>]*>?/gm, '');
    setCurrentProduct({ ...currentProduct, [field]: cleanValue });
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    const tId = toast.loading("Syncing changes...");
    try {
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/products/update/${currentProduct.id}`, 
        { ...currentProduct, user_id: userId },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      toast.success("Product details updated!", { id: tId });
      setIsEditModalOpen(false);
      fetchInitialData(); // Refresh data
    } catch (err) {
      toast.error("Update failed. Please check inputs.", { id: tId });
    } finally {
      setIsUpdating(false);
    }
  };

  const thClass = "px-4 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-[#0b1224] whitespace-nowrap";
  const tdClass = "px-4 py-4 text-sm text-slate-300 border-b border-white/[0.02]";

  return (
    <div className="text-slate-300 p-6 md:p-10 font-sans">
      <Toaster richColors theme="dark" position="top-right" />

      <div className="max-w-[1900px] mx-auto">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 border-b border-white/5 pb-10">
          <div className="flex items-center gap-6">
            <div className="bg-emerald-600 p-4 rounded-2xl shadow-2xl shadow-emerald-900/20">
              <Database className="text-white" size={30} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                SECURE <span className="text-emerald-500">INVENTORY</span>
              </h1>
              <p className="text-[10px] text-slate-600 font-bold tracking-[0.4em]">REAL_TIME_DATA_MANAGEMENT</p>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search by SKU, Name or Brand..." 
              className="bg-[#0f172a] border border-white/5 rounded-2xl py-4 pl-12 pr-6 w-full md:w-[450px] outline-none focus:ring-2 ring-emerald-500/20 text-sm transition-all"
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </header>

        {/* TABLE BODY */}
        <div className="bg-[#0f172a]/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-emerald-600/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className={`${thClass} pl-10`}><Hash size={12}/></th>
                  <th className={thClass}>SKU</th>
                  <th className={thClass}>Product Name</th>
                  <th className={thClass}>Category</th>
                  <th className={thClass}>Unit</th>
                  <th className={thClass}>Brand</th>
                  <th className={thClass}>HSN Code</th>
                  <th className={thClass}>Batch #</th>
                  <th className={thClass}>MFG Date</th>
                  <th className={thClass}>EXP Date</th>
                  <th className={thClass}>Price (PKR)</th>
                  <th className={`${thClass} pr-10 text-center`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {products
                  .filter(p => 
                    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.brand_name?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((prod: any, idx) => (
                    <tr key={prod.id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="pl-10 py-4 text-[10px] font-bold text-slate-700">{idx + 1}</td>
                      <td className={tdClass}>
                        <span className="bg-emerald-500/5 text-emerald-500 px-3 py-1 rounded-full text-[11px] font-mono font-black border border-emerald-500/10 uppercase">
                          {prod.sku}
                        </span>
                      </td>
                      <td className={`${tdClass} font-bold text-white`}>{prod.name}</td>
                      <td className={tdClass}>{categories.find((c: any) => c.id === prod.category_id)?.name || '---'}</td>
                      <td className={tdClass}>{units.find((u: any) => u.id === prod.unit_id)?.name || '---'}</td>
                      <td className={tdClass}>{prod.brand_name || '---'}</td>
                      <td className={tdClass}>{prod.hsn_code || '---'}</td>
                      <td className={tdClass}>{prod.batch_number || '---'}</td>
                      <td className={tdClass}>{prod.mfg_date || '---'}</td>
                      <td className={tdClass}>{prod.exp_date || '---'}</td>
                      <td className={`${tdClass} font-mono text-emerald-400 font-bold`}>{prod.product_price}</td>
                      <td className="pr-10 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-40 group-hover:opacity-100 transition-all">
                          <button onClick={() => openEditModal(prod)} className="p-2 hover:bg-emerald-500 text-slate-400 hover:text-black rounded-xl transition-all">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDelete(prod.id)} className="p-2 hover:bg-red-500 text-slate-400 hover:text-white rounded-xl transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {products.length === 0 && (
                <div className="py-20 text-center text-slate-600 font-bold text-xs uppercase tracking-widest">
                    No products found in your database.
                </div>
            )}
          </div>
        </div>
      </div>

      {/* SECURE EDIT MODAL */}
      {isEditModalOpen && currentProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => !isUpdating && setIsEditModalOpen(false)} />
          <div className="relative bg-[#0b1224] border border-white/10 w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-[3rem] shadow-3xl p-8 md:p-16">
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-3 rounded-2xl">
                    <Edit3 className="text-black" size={24} />
                </div>
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Modify Product</h2>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={32} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { label: 'Product Name', key: 'name', type: 'text' },
                { label: 'SKU Identifier', key: 'sku', type: 'text' },
                { label: 'Brand Name', key: 'brand_name', type: 'text' },
                { label: 'HSN Code', key: 'hsn_code', type: 'text' },
                { label: 'Batch Number', key: 'batch_number', type: 'text' },
                { label: 'Price (PKR)', key: 'product_price', type: 'number' },
                { label: 'Manufacturing Date', key: 'mfg_date', type: 'date' },
                { label: 'Expiry Date', key: 'exp_date', type: 'date' },
              ].map((field) => (
                <div key={field.key} className="space-y-2">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">{field.label}</label>
                  <input 
                    type={field.type} 
                    className="w-full bg-[#161f35] border border-white/5 rounded-2xl py-4 px-5 outline-none focus:ring-2 ring-emerald-500/30 transition-all text-white [color-scheme:dark]"
                    value={currentProduct[field.key] || ''}
                    onChange={(e) => handleEditChange(field.key, e.target.value)}
                  />
                </div>
              ))}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Category</label>
                <select 
                  className="w-full bg-[#161f35] border border-white/5 rounded-2xl py-4 px-5 outline-none focus:ring-2 ring-emerald-500/30 text-white"
                  value={currentProduct.category_id}
                  onChange={(e) => handleEditChange('category_id', e.target.value)}
                >
                  <option value="">Select Category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div className="md:col-span-3 space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Description / Details</label>
                <textarea 
                   className="w-full bg-[#161f35] border border-white/5 rounded-2xl py-4 px-5 outline-none focus:ring-2 ring-emerald-500/30 text-white h-32 resize-none"
                   value={currentProduct.description || ''}
                   onChange={(e) => handleEditChange('description', e.target.value)}
                />
              </div>
            </div>

            <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-3 text-slate-500 italic text-[11px] font-bold uppercase tracking-widest">
                <AlertCircle size={16} className="text-emerald-500" />
                This action will permanently overwrite records.
              </div>
              <button 
                disabled={isUpdating}
                onClick={handleUpdate}
                className="w-full md:w-auto bg-white text-black px-16 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-emerald-600 hover:text-white transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4"
              >
                {isUpdating ? "Processing..." : "Sync Changes"}
                <Save size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}