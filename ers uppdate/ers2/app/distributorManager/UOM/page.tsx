"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
  Ruler, Plus, Trash2, Database, Search, X,
  Activity, Pencil, Save, Loader2, RefreshCw
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

const sanitize = (str: string) => str.replace(/[<>'"/\\;]/g, "").trim();
const toUnitCode = (str: string) => sanitize(str).toUpperCase();

type UomFormState = {
  name: string;
  sub_unit_name: string;
  conversion_to_base: string;
};

export default function UOMManagement() {
  const authToken = Cookies.get('auth_token');

  const [uoms, setUoms] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editItem, setEditItem] = useState<any>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [formData, setFormData] = useState<UomFormState>({
    name: "",
    sub_unit_name: "",
    conversion_to_base: ""
  });

  const fetchUOMs = useCallback(async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/uom`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setUoms(res.data.data || []);
    } catch {
      toast.error("UOM data fetch failed.");
    }
  }, [authToken]);

  useEffect(() => {
    fetchUOMs();
  }, [fetchUOMs]);

  const filteredUOMs = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return uoms;

    return uoms.filter((u) =>
      u.name?.toLowerCase().includes(term) ||
      u.sub_unit_name?.toLowerCase().includes(term)
    );
  }, [searchTerm, uoms]);

  const validateUomForm = (data: UomFormState | any) => {
    if (!data.name?.trim()) {
      return "UOM name is required.";
    }

    if (data.sub_unit_name?.trim() && !String(data.conversion_to_base || '').trim()) {
      return "Sub unit ke saath conversion value bhi dein.";
    }

    if (String(data.conversion_to_base || '').trim() && !data.sub_unit_name?.trim()) {
      return "Conversion ke saath sub unit bhi dein.";
    }

    if (String(data.conversion_to_base || '').trim()) {
      const numericValue = Number.parseFloat(String(data.conversion_to_base));
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        return "Conversion value 0 se greater honi chahiye.";
      }
    }

    return null;
  };

  const formatUomConversion = (uom: any) => {
    if (!uom?.sub_unit_name || !uom?.conversion_to_base) {
      return "No sub unit linked";
    }

    return `1 ${uom.name} = ${uom.conversion_to_base} ${uom.sub_unit_name}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateUomForm(formData);
    if (validationError) return toast.error(validationError);

    setSubmitting(true);
    const tId = toast.loading("Saving UOM...");

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/uom`,
        {
          name: toUnitCode(formData.name),
          sub_unit_name: formData.sub_unit_name ? toUnitCode(formData.sub_unit_name) : "",
          conversion_to_base: formData.conversion_to_base ? Number.parseFloat(formData.conversion_to_base) : null
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      toast.success(`${toUnitCode(formData.name)} added!`, { id: tId });
      setFormData({ name: "", sub_unit_name: "", conversion_to_base: "" });
      fetchUOMs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add UOM.", { id: tId });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateUomForm(editItem);
    if (validationError) return toast.error(validationError);

    setEditSaving(true);
    const tId = toast.loading("Updating UOM...");

    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/uom/${editItem.uom_id}`,
        {
          name: toUnitCode(editItem.name),
          sub_unit_name: editItem.sub_unit_name ? toUnitCode(editItem.sub_unit_name) : "",
          conversion_to_base: editItem.conversion_to_base ? Number.parseFloat(editItem.conversion_to_base) : null
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      toast.success("UOM updated!", { id: tId });
      setEditItem(null);
      fetchUOMs();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Update failed.", { id: tId });
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const tId = toast.loading(`Deleting ${name}...`);

    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/uom/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      toast.success("UOM deleted.", { id: tId });
      fetchUOMs();
    } catch {
      toast.error("Delete failed. UOM may be in use.", { id: tId });
    }
  };

  const inputClass = "bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3.5 text-white focus:border-violet-500 focus:ring-1 ring-violet-500/20 outline-none w-full transition-all text-sm shadow-inner";
  const labelClass = "text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block ml-1";

  return (
    <div className="text-slate-300 p-4 md:p-12 font-sans selection:bg-violet-500/30">
      <Toaster richColors theme="dark" position="top-center" />

      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/5 pb-10">
          <div className="flex items-center gap-6">
            <div className="bg-gradient-to-tr from-violet-600 to-purple-500 p-4 rounded-2xl shadow-[0_0_30px_rgba(124,58,237,0.2)]">
              <Ruler className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase leading-none">
                UNIT OF <span className="text-violet-400">MEASURE</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] mt-2 uppercase">
                UOM Master Data Management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 px-6 py-3 rounded-2xl border border-white/10">
            <Activity size={14} className="text-violet-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total: {uoms.length} Units
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <div className="bg-[#0f172a]/40 border border-white/5 p-10 rounded-[3rem] backdrop-blur-2xl shadow-2xl">
              <h3 className="text-white font-black mb-10 flex items-center gap-3 text-xs uppercase tracking-[0.3em]">
                <Plus size={16} className="text-violet-500" /> New UOM
              </h3>

              <form onSubmit={handleSubmit} className="space-y-7">
                <div>
                  <label className={labelClass}>Main Unit *</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. KG, BOX, LTR"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>Sub Unit</label>
                  <input
                    type="text"
                    className={inputClass}
                    placeholder="e.g. G, PCS, ML"
                    value={formData.sub_unit_name}
                    onChange={(e) => setFormData({ ...formData, sub_unit_name: e.target.value })}
                  />
                </div>

                <div>
                  <label className={labelClass}>1 Main Unit = ? Sub Units</label>
                  <input
                    type="number"
                    step="0.0001"
                    className={inputClass}
                    placeholder="e.g. 1000"
                    value={formData.conversion_to_base}
                    onChange={(e) => setFormData({ ...formData, conversion_to_base: e.target.value })}
                  />
                  <p className="mt-2 ml-1 text-[10px] font-bold tracking-[0.14em] uppercase text-slate-500">
                    Example: `1 KG = 1000 G` ya `1 BOX = 12 PCS`
                  </p>
                </div>

                <button
                  disabled={submitting}
                  className="hover:cursor-pointer w-full bg-violet-600 hover:bg-violet-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-violet-900/20 uppercase text-[10px] tracking-[0.4em] flex items-center justify-center gap-3 disabled:opacity-30"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  Add Unit
                </button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="relative group">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-violet-500 transition-colors" size={20} />
              <input
                type="text"
                className="w-full bg-[#0f172a]/40 border border-white/5 rounded-[2rem] py-5 pl-16 pr-16 text-sm text-white outline-none focus:border-violet-500 focus:ring-4 ring-violet-500/5 transition-all backdrop-blur-xl shadow-2xl"
                placeholder="Search UOM..."
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
                  <Database size={16} className="text-violet-500" /> UOM Registry
                </h3>
                <button onClick={fetchUOMs} className="p-2 text-slate-500 hover:text-violet-400 transition-colors rounded-xl hover:bg-white/5">
                  <RefreshCw size={14} />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] border-b border-white/5 bg-black/20">
                      <th className="px-8 py-6">ID</th>
                      <th className="px-8 py-6">Unit Name</th>
                      <th className="px-8 py-6">Sub Unit</th>
                      <th className="px-8 py-6">Conversion</th>
                      <th className="px-8 py-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredUOMs.length > 0 ? filteredUOMs.map((u) => (
                      <tr key={u.uom_id} className="hover:bg-violet-500/[0.03] transition-colors group">
                        <td className="px-8 py-5">
                          <span className="text-[10px] font-black text-violet-400 bg-violet-500/10 px-3 py-1.5 rounded-lg">
                            #{u.uom_id}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="font-black text-slate-200 uppercase text-xs tracking-widest">{u.name}</span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs text-slate-300 uppercase tracking-widest">
                            {u.sub_unit_name || "—"}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className="text-xs text-slate-400 italic">
                            {formatUomConversion(u)}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setEditItem({
                                ...u,
                                conversion_to_base: u.conversion_to_base ? String(u.conversion_to_base) : ''
                              })}
                              className="p-3 text-slate-600 hover:text-violet-400 hover:bg-violet-500/10 rounded-2xl transition-all active:scale-90"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => handleDelete(u.uom_id, u.name)}
                              className="p-3 text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all active:scale-90"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="py-32 text-center text-[10px] font-black uppercase tracking-[0.5em] text-slate-700">
                          No Units Found
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

      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-md shadow-2xl p-10">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-white font-black uppercase italic tracking-tighter text-lg flex items-center gap-3">
                <Pencil size={18} className="text-violet-500" /> Edit UOM
              </h3>
              <button onClick={() => setEditItem(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEdit} className="space-y-6">
              <div>
                <label className={labelClass}>Main Unit</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Unit name"
                  value={editItem.name}
                  onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>Sub Unit</label>
                <input
                  type="text"
                  className={inputClass}
                  placeholder="Sub unit name"
                  value={editItem.sub_unit_name || ''}
                  onChange={(e) => setEditItem({ ...editItem, sub_unit_name: e.target.value })}
                />
              </div>

              <div>
                <label className={labelClass}>1 Main Unit = ? Sub Units</label>
                <input
                  type="number"
                  step="0.0001"
                  className={inputClass}
                  placeholder="Conversion factor"
                  value={editItem.conversion_to_base || ''}
                  onChange={(e) => setEditItem({ ...editItem, conversion_to_base: e.target.value })}
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
                  className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center gap-2 transition-all disabled:opacity-40"
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
