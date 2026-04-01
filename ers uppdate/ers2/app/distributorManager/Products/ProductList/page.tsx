"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
  Edit3, Trash2, Package, Search,
  X, Save, AlertCircle, Hash, Database, Filter
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function ProductListPage() {
  const authToken = Cookies.get('auth_token');
  const userId = Cookies.get('user_id');

  // States
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [skuSearch, setSkuSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Edit Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // 1. Fetch Data
  const fetchInitialData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${authToken}` } };
      const [prodRes, catRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product`, config),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/setup-data`, config),
      ]);
      setProducts(prodRes.data || []);
      setCategories(catRes.data.data.categories || []);
      setUnits(catRes.data.data.uoms || []);
    } catch (err) {
      toast.error("Database se contact nahi ho saka.");
    }
  };

  useEffect(() => { if (authToken) fetchInitialData(); }, [authToken]);

  // 2. Delete Logic
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this product?")) return;

    const tId = toast.loading("Processing removal...");
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      toast.success("Product removed from inventory.", { id: tId });
      setProducts(products.filter((p: any) => p.product_id !== id));
    } catch (err) {
      toast.error("Delete request failed.", { id: tId });
    }
  };

  // 3. Edit Modal Handlers
  const openEditModal = (product: any) => {
    setCurrentProduct({
      product_id: product.product_id,
      name: product.name,
      skuCode: product.sku_code,
      brand: product.brand,
      hsnCode: product.hsn_code,
      description: product.description,
      categoryId: product.product_cat_id,
      uomId: product.uom_id,
    });
    setIsEditModalOpen(true);
  };

  const handleEditChange = (field: string, value: string) => {
    const cleanValue = value.replace(/<[^>]*>?/gm, '');
    setCurrentProduct({ ...currentProduct, [field]: cleanValue });
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    const tId = toast.loading("Syncing changes...");
    try {
      await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product/${currentProduct.product_id}`,
        currentProduct,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      toast.success("Product details updated!", { id: tId });
      setIsEditModalOpen(false);
      fetchInitialData();
    } catch (err) {
      toast.error("Update failed. Please check inputs.", { id: tId });
    } finally {
      setIsUpdating(false);
    }
  };

  // 4. Filter Logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = !searchQuery ||
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSku = !skuSearch ||
      p.sku_code?.toLowerCase().includes(skuSearch.toLowerCase());

    const matchesCategory = !selectedCategory ||
      String(p.product_cat_id) === selectedCategory;

    return matchesSearch && matchesSku && matchesCategory;
  });

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
        </header>

        {/* SEARCH & FILTER BAR */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* General Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by Name or Brand..."
              className="bg-[#0f172a] border border-white/5 rounded-2xl py-4 pl-12 pr-6 w-full outline-none focus:ring-2 ring-emerald-500/20 text-sm transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* SKU Search */}
          <div className="relative md:w-[280px]">
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search by SKU Number..."
              className="bg-[#0f172a] border border-white/5 rounded-2xl py-4 pl-12 pr-6 w-full outline-none focus:ring-2 ring-cyan-500/20 text-sm transition-all"
              value={skuSearch}
              onChange={(e) => setSkuSearch(e.target.value)}
            />
          </div>

          {/* Category Filter */}
          <div className="relative md:w-[250px]">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <select
              className="bg-[#0f172a] border border-white/5 rounded-2xl py-4 pl-12 pr-6 w-full outline-none focus:ring-2 ring-amber-500/20 text-sm transition-all text-slate-300 appearance-none cursor-pointer"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((cat: any) => (
                <option key={cat.product_category_id} value={cat.product_category_id}>
                  {cat.category}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* TABLE BODY */}
        <div className="bg-[#0f172a]/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-emerald-600/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className={`${thClass} pl-10`}><Hash size={12} /></th>
                  <th className={thClass}>SKU</th>
                  <th className={thClass}>Product Name</th>
                  <th className={thClass}>Category</th>
                  <th className={thClass}>Unit</th>
                  <th className={thClass}>Brand</th>
                  <th className={thClass}>HSN Code</th>
                  <th className={`${thClass} pr-10 text-center`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredProducts
                  .map((prod: any, idx) => (
                    <tr key={prod.product_id} className="hover:bg-white/[0.01] transition-colors group">
                      <td className="pl-10 py-4 text-[10px] font-bold text-slate-700">{idx + 1}</td>
                      <td className={tdClass}>
                        <span className="bg-emerald-500/5 text-emerald-500 px-3 py-1 rounded-full text-[11px] font-mono font-black border border-emerald-500/10 uppercase">
                          {prod.sku_code}
                        </span>
                      </td>
                      <td className={`${tdClass} font-bold text-white`}>{prod.name}</td>
                      <td className={tdClass}>{prod.productcategory?.category || '---'}</td>
                      <td className={tdClass}>{prod.uom?.name || '---'}</td>
                      <td className={tdClass}>{prod.brand || '---'}</td>
                      <td className={tdClass}>{prod.hsn_code || '---'}</td>
                      <td className="pr-10 text-center">
                        <div className="flex items-center justify-center gap-2 opacity-40 group-hover:opacity-100 transition-all">
                          <button onClick={() => openEditModal(prod)} className="p-2 hover:bg-emerald-500 text-slate-400 hover:text-black rounded-xl transition-all" title="Edit">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDelete(prod.product_id)} className="p-2 hover:bg-red-500 text-slate-400 hover:text-white rounded-xl transition-all" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {filteredProducts.length === 0 && (
              <div className="py-20 text-center text-slate-600 font-bold text-xs uppercase tracking-widest">
                No products found matching your criteria.
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
                { label: 'SKU Identifier', key: 'skuCode', type: 'text' },
                { label: 'Brand Name', key: 'brand', type: 'text' },
                { label: 'HSN Code', key: 'hsnCode', type: 'text' },
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
                  value={currentProduct.categoryId || ''}
                  onChange={(e) => handleEditChange('categoryId', e.target.value)}
                >
                  <option value="">Select Category</option>
                  {categories.map((c: any) => <option key={c.product_category_id} value={c.product_category_id}>{c.category}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Unit (UOM)</label>
                <select
                  className="w-full bg-[#161f35] border border-white/5 rounded-2xl py-4 px-5 outline-none focus:ring-2 ring-emerald-500/30 text-white"
                  value={currentProduct.uomId || ''}
                  onChange={(e) => handleEditChange('uomId', e.target.value)}
                >
                  <option value="">Select UOM</option>
                  {units.map((u: any) => <option key={u.uom_id} value={u.uom_id}>{u.name}</option>)}
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