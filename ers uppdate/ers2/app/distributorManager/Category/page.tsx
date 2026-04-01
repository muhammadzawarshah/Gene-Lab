"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
  Layers, ShieldCheck, Plus, Trash2,
  FolderTree, Database, Search, X, Activity,
  FileText, Pencil, Save, Loader2
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

// --- SECURITY: Anti-XSS Sanitization ---
const sanitize = (str: string) => str.replace(/[<>'"/\\;]/g, "").trim();

export default function CategoryManagement() {
  const authToken = Cookies.get('auth_token');
  const userId = Cookies.get('user_id'); 

  // States
  const [categories, setCategories] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Edit state
  const [editItem, setEditItem]       = useState<any>(null);
  const [editSaving, setEditSaving]   = useState(false);

  // Form State (2 Inputs)
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  });

  // --- 1. FETCH DATA ---
  const fetchCategories = useCallback(async () => {
   
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/category`, {
        params: { user_id: userId },
        headers: { Authorization: `Bearer ${authToken}` }
      });
      console.log(res.data.category)
      setCategories(res.data.category || []);
    } catch (err) {
      console.error("Fetch error");
    }
  }, [authToken, userId]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  // --- 2. SEARCH LOGIC ---
  const filteredCategories = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return categories;
    
    return categories.filter(c => 
      c.name?.toLowerCase().includes(term) ||
      c.description?.toLowerCase().includes(term)
    );
  }, [searchTerm, categories]);

  // --- 3. SECURE POST ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error("Category name is required.");

    setSubmitting(true);
    const tId = toast.loading("Syncing Category...");

    try {
      const payload = {
        user_id: userId,
        category: sanitize(formData.name),
        description: sanitize(formData.description),
      };

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/category/`, payload, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      toast.success(`${formData.name} added to inventory!`, { id: tId });
      setFormData({ name: "", description: "" });
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Action Unauthorized", { id: tId });
    } finally {
      setSubmitting(false);
    }
  };

  // --- 4. EDIT / UPDATE ---
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem?.category) return toast.error("Category name is required.");
    setEditSaving(true);
    const tId = toast.loading("Updating category...");
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/category/${editItem.product_category_id}`,
        { category: sanitize(editItem.category), description: sanitize(editItem.description || '') },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      toast.success("Category updated!", { id: tId });
      setEditItem(null);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Update failed", { id: tId });
    } finally {
      setEditSaving(false);
    }
  };

  // --- 5. SECURE DELETE ---
  const handleDelete = async (id: string, name: string) => {
    const tId = toast.loading(`Deleting ${name}...`);
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/category/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { user_id: userId }
      });
      toast.success("Category removed.", { id: tId });
      fetchCategories();
    } catch (err) {
      toast.error("Delete Failed.", { id: tId });
    }
  };

  // UI Styles
  const inputClass = "bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-blue-500 focus:ring-1 ring-blue-500/20 outline-none w-full transition-all text-sm shadow-inner";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block ml-1";

  return (
    <div className="text-slate-300 p-4 md:p-12 font-sans selection:bg-blue-500/30">
      <Toaster richColors theme="dark" position="top-center" />
      
      <div className="max-w-7xl mx-auto space-y-12">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-10">
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-4 rounded-2xl shadow-[0_0_30px_rgba(37,99,235,0.2)]">
              <FolderTree className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                CATEGORY <span className="text-blue-500">VAULT</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] mt-2 uppercase flex items-center gap-2">
                <ShieldCheck size={12} className="text-blue-500" /> Secure Inventory Classification
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
            <Activity size={14} className="text-blue-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Node ID: {userId?.slice(0,8)}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* FORM (2 INPUTS) */}
          <div className="lg:col-span-4">
            <div className="bg-[#0f172a]/40 border border-white/5 p-10 rounded-[3rem] backdrop-blur-2xl shadow-2xl relative overflow-hidden">
              <h3 className="text-white font-black mb-10 flex items-center gap-3 text-xs uppercase tracking-[0.3em]">
                <Plus size={16} className="text-blue-500" /> New Category
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-7">
                <div>
                  <label className={labelClass}>Category Name</label>
                  <input 
                    type="text" className={inputClass} placeholder="e.g. Electronics, Pharma"
                    value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className={labelClass}>Description</label>
                  <textarea 
                    rows={4} className={inputClass} placeholder="Enter classification details..."
                    value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <button 
                  disabled={submitting}
                  className="hover:cursor-pointer w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-blue-900/20 uppercase text-[10px] tracking-[0.4em] flex items-center justify-center gap-3 disabled:opacity-30"
                >
                  Confirm Classification
                </button>
              </form>
            </div>
          </div>

          {/* LIST WITH SEARCH */}
          <div className="lg:col-span-8 space-y-6">
            {/* SEARCH */}
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type="text"
                className="w-full bg-[#0f172a]/40 border border-white/5 rounded-[2rem] py-5 pl-16 pr-16 text-sm text-white outline-none focus:border-blue-500 focus:ring-4 ring-blue-500/5 transition-all backdrop-blur-xl shadow-2xl"
                placeholder="Search Category or Description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-6 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full text-slate-400">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* TABLE */}
            <div className="bg-[#0f172a]/40 border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-2xl shadow-2xl">
              <div className="p-8 border-b border-white/5 bg-black/40 flex justify-between items-center">
                <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] flex items-center gap-3">
                  <Database size={16} className="text-blue-500" /> Classification Registry
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 bg-black/20">
                      <th className="px-8 py-6">Category Name</th>
                      <th className="px-8 py-6">Description</th>
                      <th className="px-8 py-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredCategories.length > 0 ? filteredCategories.map((c) => (
                      <tr key={c.product_category_id} className="hover:bg-blue-500/[0.03] transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <Layers size={14} className="text-blue-500/50" />
                            <span className="font-black text-slate-200 uppercase text-xs tracking-widest">{c.category}</span>
                          </div>
                        </td>
                        
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3 text-slate-400">
                            <FileText size={12} className="shrink-0 opacity-50" />
                            <p className="text-xs truncate max-w-[300px] italic">
                              {c.description || "No description provided."}
                            </p>
                          </div>
                        </td>

                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditItem({ ...c })}
                              className="p-3 text-slate-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-2xl transition-all active:scale-90"
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(c.product_category_id, c.category)}
                              className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all active:scale-90"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} className="py-32 text-center text-[10px] font-black uppercase tracking-[0.5em] text-slate-700">
                          Empty Registry
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-md shadow-2xl p-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-white font-black uppercase italic tracking-tighter text-lg flex items-center gap-3">
                <Pencil size={18} className="text-blue-500" /> Edit Category
              </h3>
              <button onClick={() => setEditItem(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-6">
              <div>
                <label className={labelClass}>Category Name</label>
                <input
                  type="text"
                  className={inputClass}
                  value={editItem.category}
                  onChange={e => setEditItem({ ...editItem, category: e.target.value })}
                  placeholder="Category name"
                />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea
                  rows={4}
                  className={inputClass}
                  value={editItem.description || ''}
                  onChange={e => setEditItem({ ...editItem, description: e.target.value })}
                  placeholder="Description (optional)"
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setEditItem(null)}
                  className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-white/5 hover:bg-white/10 text-slate-400 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
                >
                  {editSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}