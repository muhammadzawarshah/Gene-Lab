"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { 
  Percent, ShieldCheck, Plus, Trash2, 
  Tag, Database, Settings2, Activity, Search, X, Edit3, AlertTriangle
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

// --- SECURITY: Anti-XSS Sanitization ---
const sanitize = (str: string) => str.replace(/[<>'"/\\;]/g, "").trim();
const formatRateForDisplay = (rate: unknown, type: string) => {
  const numericRate = Number(rate);

  if (!Number.isFinite(numericRate)) {
    return "---";
  }

  if (type === "percentage") {
    const percentValue = numericRate * 100;
    return `${percentValue.toFixed(percentValue % 1 === 0 ? 0 : 2)}%`;
  }

  return numericRate.toFixed(numericRate % 1 === 0 ? 0 : 4);
};

export default function TaxManagement() {
  const authToken = Cookies.get('auth_token');
  const userId = Cookies.get('user_id'); 

  // States
  const [taxes, setTaxes] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [pageAlert, setPageAlert] = useState<{ type: "error" | "success"; message: string } | null>(null);

  // Form State (Aligned with Backend: rate as string for input, then parsed)
  const [formData, setFormData] = useState({
    name: "",
    rate: "",
    type: "percentage",
    context: "sale"
  });

  // --- 1. FETCH DATA ---
  const fetchTaxes = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/finance/taxes`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setPageAlert(null);
      setTaxes(res.data.data || []);
    } catch (err: any) {
      const message = err.response?.data?.message || "Failed to load registry.";
      setPageAlert({ type: "error", message });
      toast.error(message);
    }
  }, [authToken, userId]);

  useEffect(() => { fetchTaxes(); }, [fetchTaxes]);

  // --- 2. SEARCH LOGIC (Filtered Data) ---
  const filteredTaxes = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return taxes;
    
    return taxes.filter(t => 
      t.name?.toLowerCase().includes(term) ||
      t.rate?.toString().includes(term) ||
      t.type?.toLowerCase().includes(term) ||
      t.context?.toLowerCase().includes(term)
    );
  }, [searchTerm, taxes]);

  // --- 3. SECURE POST/PUT ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.rate === "") return toast.error("Please fill all fields.");

    const parsedRate = Number.parseFloat(formData.rate);
    if (Number.isNaN(parsedRate) || parsedRate < 0) {
      const message = "Valid rate enter karein. Negative value allowed nahi hai.";
      setPageAlert({ type: "error", message });
      return toast.error(message);
    }

    if (formData.type === "percentage" && parsedRate > 100) {
      const message = "Percentage rate 0 se 100 ke darmiyan hona chahiye.";
      setPageAlert({ type: "error", message });
      return toast.error(message);
    }

    if (formData.type === "fixed" && parsedRate > 200000000) {
      const message = "Fixed tax rate 200000000 se zyada nahi ho sakta.";
      setPageAlert({ type: "error", message });
      return toast.error(message);
    }

    setSubmitting(true);
    const tId = toast.loading(editId ? "Updating Tax Rule..." : "Authorizing Tax Rule...");

    try {
      const payload = {
        name: sanitize(formData.name),
        rate: parseFloat(formData.rate),
        type: formData.type,
        context: formData.context,
        user_id: userId 
      };

      if (editId) {
        await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/finance/taxes/${editId}`, payload, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        toast.success(`${formData.name} Updated Successfully!`, { id: tId });
      } else {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/finance/taxes`, payload, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        toast.success(`${formData.name} Synced Successfully!`, { id: tId });
      }

      setPageAlert({ type: "success", message: `Tax rule "${formData.name}" successfully save ho gayi.` });
      setFormData({ name: "", rate: "", type: "percentage", context: "sale" });
      setEditId(null);
      fetchTaxes(); 
    } catch (err: any) {
      const message = err.response?.data?.message || "Action Unauthorized";
      setPageAlert({ type: "error", message });
      toast.error(message, { id: tId });
    } finally {
      setSubmitting(false);
    }
  };

  // --- 4. START EDIT ---
  const startEdit = (t: any) => {
    setEditId(t.tax_id);
    setFormData({
      name: t.name,
      rate: t.type === "percentage" ? String(Number(t.rate) * 100) : t.rate.toString(),
      type: t.type,
      context: t.context
    });
    setPageAlert(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditId(null);
    setFormData({ name: "", rate: "", type: "percentage", context: "sale" });
    setPageAlert(null);
  };

  // --- 5. SECURE DELETE ---
  // Changed 'id' to 'tax_id' to match Prisma Model
  const handleDelete = async (tax_id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    const tId = toast.loading(`Purging ${name}...`);
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/finance/taxes/${tax_id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setPageAlert({ type: "success", message: `${name} delete ho gaya.` });
      toast.success("Record Deleted.", { id: tId });
      fetchTaxes();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Delete Failed.";
      setPageAlert({ type: "error", message: msg });
      toast.error(msg, { id: tId });
    }
  };

  // UI Styles
  const inputClass = "bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-emerald-500 focus:ring-1 ring-emerald-500/20 outline-none w-full transition-all text-sm shadow-inner";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block ml-1";

  return (
    <div className="text-slate-300 p-4 md:p-12 font-sans selection:bg-emerald-500/30">
      <Toaster richColors theme="dark" position="top-center" />
      
      <div className="max-w-7xl mx-auto space-y-12">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-10">
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-tr from-emerald-600 to-emerald-400 p-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <Settings2 className="text-black" size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                TAX <span className="text-emerald-500">CONTROL</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] mt-2 uppercase flex items-center gap-2">
                <ShieldCheck size={12} className="text-emerald-500" /> Identity Protected Node
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
            <Activity size={14} className="text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">UID: {userId?.slice(0,8)}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* FORM (LEFT) */}
          <div className="lg:col-span-4">
            <div className="bg-[#0f172a]/40 border border-white/5 p-10 rounded-[3rem] backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
              {pageAlert && (
                <div className={`mb-8 flex items-start gap-3 rounded-2xl border px-4 py-4 text-sm ${
                  pageAlert.type === "error"
                    ? "border-rose-500/20 bg-rose-500/10 text-rose-200"
                    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                }`}>
                  <AlertTriangle size={18} className={pageAlert.type === "error" ? "text-rose-400" : "text-emerald-400"} />
                  <p>{pageAlert.message}</p>
                </div>
              )}

              <h3 className="text-white font-black mb-10 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.3em]">
                <div className="flex items-center gap-3">
                  {editId ? <Edit3 size={16} className="text-blue-500" /> : <Plus size={16} className="text-emerald-500" />} 
                  {editId ? 'Modify Configuration' : 'New Configuration'}
                </div>
                {editId && (
                  <button onClick={cancelEdit} className="text-rose-500 hover:text-rose-400 transition-colors">
                    <X size={16} />
                  </button>
                )}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-7">
                <div>
                  <label className={labelClass}>Tax Name</label>
                  <input 
                    type="text" className={inputClass} placeholder="GST / VAT / Income"
                    value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className={labelClass}>Rate</label>
                  <input 
                    type="number" step="0.0001" className={inputClass} placeholder="0.00"
                    value={formData.rate} onChange={(e) => setFormData({...formData, rate: e.target.value})}
                  />
                  <p className="mt-2 ml-1 text-[10px] font-bold tracking-[0.15em] uppercase text-slate-500">
                    Percentage ke liye `17` likhein. Fixed amount ke liye maximum `200000000` allow hai.
                  </p>
                </div>
                <div>
                    <label className={labelClass}>Type</label>
                    <select className={inputClass} value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                      <option value="percentage" className="bg-[#0f172a]">Percentage (%)</option>
                      <option value="fixed" className="bg-[#0f172a]">Fixed Amount</option>
                    </select>
                </div>
                <div>
                    <label className={labelClass}>Context</label>
                    <select className={inputClass} value={formData.context} onChange={(e) => setFormData({...formData, context: e.target.value})}>
                      <option value="sale" className="bg-[#0f172a]">Sale (Output)</option>
                      <option value="purchase" className="bg-[#0f172a]">Purchase (Input)</option>
                    </select>
                </div>
                <button 
                  disabled={submitting}
                  className={`w-full ${editId ? 'bg-blue-600 hover:bg-blue-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-black font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-900/20 uppercase text-[10px] tracking-[0.4em] flex items-center justify-center gap-3 disabled:opacity-30`}
                >
                  {editId ? 'Update Node' : 'Sync to Cloud'}
                </button>
                {editId && (
                  <button 
                    type="button"
                    onClick={cancelEdit}
                    className="w-full bg-white/5 border border-white/10 text-white font-black py-4 rounded-2xl hover:bg-white/10 transition-all uppercase text-[9px] tracking-[0.2em]"
                  >
                    Cancel Modification
                  </button>
                )}
              </form>
            </div>
          </div>

          {/* LIST WITH SEARCH (RIGHT) */}
          <div className="lg:col-span-8 space-y-6">
            {/* SEARCH BAR */}
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={20} />
              <input 
                type="text"
                className="w-full bg-[#0f172a]/40 border border-white/5 rounded-[2rem] py-5 pl-16 pr-16 text-sm text-white outline-none focus:border-emerald-500 focus:ring-4 ring-emerald-500/5 transition-all backdrop-blur-xl shadow-2xl"
                placeholder="Search by Name, Rate, Type or Context..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm("")}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full text-slate-400"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* TABLE */}
            <div className="bg-[#0f172a]/40 border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-2xl shadow-2xl">
              <div className="p-8 border-b border-white/5 bg-black/40 flex justify-between items-center">
                <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] flex items-center gap-3">
                  <Database size={16} className="text-emerald-500" /> Active Registry
                </h3>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{filteredTaxes.length} Rules Found</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 bg-black/20">
                      <th className="px-8 py-6">Name</th>
                      <th className="px-8 py-6">Rate</th>
                      <th className="px-8 py-6">Type</th>
                      <th className="px-8 py-6">Context</th>
                      <th className="px-8 py-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredTaxes.length > 0 ? filteredTaxes.map((t) => (
                      <tr key={t.tax_id} className={`hover:bg-emerald-500/[0.03] transition-colors group ${editId === t.tax_id ? 'bg-blue-500/5 shadow-inner' : ''}`}>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <Tag size={14} className="text-emerald-500/50" />
                            <span className={`font-black uppercase text-xs tracking-widest ${editId === t.tax_id ? 'text-blue-400' : 'text-slate-200'}`}>{t.name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 font-mono text-emerald-400 font-black italic text-sm">
                          {formatRateForDisplay(t.rate, t.type)}
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-[9px] bg-white/5 text-slate-400 px-3 py-1 rounded-lg border border-white/5 font-black uppercase tracking-tighter">
                            {t.type}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`text-[9px] px-3 py-1 rounded-lg font-black uppercase tracking-tighter border ${t.context === 'sale' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-orange-500/10 text-orange-400 border-orange-500/20'}`}>
                            {t.context}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => startEdit(t)}
                              className="p-3 text-slate-600 hover:text-blue-500 hover:bg-blue-500/10 rounded-2xl transition-all active:scale-90"
                              title="Modify Registry"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(t.tax_id, t.name)}
                              className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all active:scale-90"
                              title="Purge Record"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (

                      <tr>
                        <td colSpan={5} className="py-32 text-center">
                          <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-700">No matching records found</p>
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
    </div>
  );
}
