"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
  ToggleLeft, Plus, Trash2, Database, Search, X,
  Activity, Pencil, Save, Loader2, RefreshCw
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

const sanitize = (str: string) => str.replace(/[<>'"/\\;]/g, "").trim();

export default function ModeManagement() {
  const authToken = Cookies.get('auth_token');

  const [modes, setModes] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [modeName, setModeName] = useState("");

  const fetchModes = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/mode`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setModes(res.data.data || []);
    } catch {
      toast.error("Mode data fetch failed.");
    }
  }, [authToken]);

  useEffect(() => { fetchModes(); }, [fetchModes]);

  const filteredModes = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return modes;
    return modes.filter(m => m.name?.toLowerCase().includes(term));
  }, [searchTerm, modes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modeName.trim()) return toast.error("Mode name is required.");
    setSubmitting(true);
    const tId = toast.loading("Saving Mode...");
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/mode`,
        { name: sanitize(modeName) },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      toast.success(`${modeName} added!`, { id: tId });
      setModeName("");
      fetchModes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add mode.", { id: tId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem?.name?.trim()) return toast.error("Mode name is required.");
    setEditSaving(true);
    const tId = toast.loading("Updating Mode...");
    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/mode/${editItem.mode_id}`,
        { name: sanitize(editItem.name) },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      toast.success("Mode updated!", { id: tId });
      setEditItem(null);
      fetchModes();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Update failed.", { id: tId });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const tId = toast.loading(`Deleting ${name}...`);
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/mode/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      toast.success("Mode deleted.", { id: tId });
      fetchModes();
    } catch {
      toast.error("Delete failed. Mode may be in use.", { id: tId });
    }
  };

  const inputClass = "bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-amber-500 focus:ring-1 ring-amber-500/20 outline-none w-full transition-all text-sm shadow-inner";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block ml-1";

  return (
    <div className="text-slate-300 p-4 md:p-12 font-sans selection:bg-amber-500/30">
      <Toaster richColors theme="dark" position="top-center" />

      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-10">
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-tr from-amber-600 to-orange-500 p-4 rounded-2xl shadow-[0_0_30px_rgba(217,119,6,0.2)]">
              <ToggleLeft className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                PRODUCT <span className="text-amber-400">MODE</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] mt-2 uppercase">
                Mode Master Data Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
            <Activity size={14} className="text-amber-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total: {modes.length} Modes
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* FORM */}
          <div className="lg:col-span-4">
            <div className="bg-[#0f172a]/40 border border-white/5 p-10 rounded-[3rem] backdrop-blur-2xl shadow-2xl">
              <h3 className="text-white font-black mb-10 flex items-center gap-3 text-xs uppercase tracking-[0.3em]">
                <Plus size={16} className="text-amber-500" /> New Mode
              </h3>
              <form onSubmit={handleSubmit} className="space-y-7">
                <div>
                  <label className={labelClass}>Mode Name *</label>
                  <input
                    type="text" className={inputClass}
                    placeholder="e.g. Local, Import, Export"
                    value={modeName}
                    onChange={(e) => setModeName(e.target.value)}
                  />
                </div>
                <button
                  disabled={submitting}
                  className="hover:cursor-pointer w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-amber-900/20 uppercase text-[10px] tracking-[0.4em] flex items-center justify-center gap-3 disabled:opacity-30"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add Mode
                </button>
              </form>
            </div>
          </div>

          {/* LIST */}
          <div className="lg:col-span-8 space-y-6">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors" size={20} />
              <input
                type="text"
                className="w-full bg-[#0f172a]/40 border border-white/5 rounded-[2rem] py-5 pl-16 pr-16 text-sm text-white outline-none focus:border-amber-500 focus:ring-4 ring-amber-500/5 transition-all backdrop-blur-xl shadow-2xl"
                placeholder="Search modes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-6 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-full text-slate-400">
                  <X size={16} />
                </button>
              )}
            </div>

            <div className="bg-[#0f172a]/40 border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-2xl shadow-2xl">
              <div className="p-8 border-b border-white/5 bg-black/40 flex justify-between items-center">
                <h3 className="text-white font-black text-xs uppercase tracking-[0.3em] flex items-center gap-3">
                  <Database size={16} className="text-amber-500" /> Mode Registry
                </h3>
                <button onClick={fetchModes} className="p-2 text-slate-500 hover:text-amber-400 transition-colors rounded-xl hover:bg-white/5">
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 bg-black/20">
                      <th className="px-8 py-6">ID</th>
                      <th className="px-8 py-6">Mode Name</th>
                      <th className="px-8 py-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredModes.length > 0 ? filteredModes.map((m) => (
                      <tr key={m.mode_id} className="hover:bg-amber-500/[0.03] transition-colors group">
                        <td className="px-8 py-5">
                          <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg">
                            #{m.mode_id}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="font-black text-slate-200 uppercase text-xs tracking-widest">{m.name}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditItem({ ...m })}
                              className="p-3 text-slate-600 hover:text-amber-400 hover:bg-amber-500/10 rounded-2xl transition-all active:scale-90"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(m.mode_id, m.name)}
                              className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all active:scale-90"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} className="py-32 text-center text-[10px] font-black uppercase tracking-[0.5em] text-slate-700">
                          No Modes Found
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
                <Pencil size={18} className="text-amber-500" /> Edit Mode
              </h3>
              <button onClick={() => setEditItem(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEdit} className="space-y-6">
              <div>
                <label className={labelClass}>Mode Name</label>
                <input
                  type="text" className={inputClass} placeholder="Mode name"
                  value={editItem.name}
                  onChange={e => setEditItem({ ...editItem, name: e.target.value })}
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  type="button" onClick={() => setEditItem(null)}
                  className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-white/5 hover:bg-white/10 text-slate-400 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit" disabled={editSaving}
                  className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
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
