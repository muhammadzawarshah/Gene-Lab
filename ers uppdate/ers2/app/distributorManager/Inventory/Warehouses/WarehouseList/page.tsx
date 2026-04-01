"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
  Warehouse, MapPin, Save, XCircle, Loader2, ChevronRight,
  Hash, Globe, ShieldCheck, Search, Trash2, Edit3, Eye, X, Info
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

const sanitize = (str: string) => str.replace(/[<>'"%;()&+]/g, '').trim();

export default function WarehouseCommandCenter() {
  const currentUserId = Cookies.get('userId') || 'GUEST_USER';
  const authToken = Cookies.get('auth_token');

  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [provinces, setProvinces] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [showDetailModal, setShowDetailModal] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState<any>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [formData, setFormData] = useState({
    id: '', warehouseCode: '', name: '', districtId: '', address: '', provinceId: ''
  });

  const headers = { Authorization: `Bearer ${authToken}` };
  const base = process.env.NEXT_PUBLIC_API_URL;

  // --- 1. INITIAL LOAD ---
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [whRes, provRes] = await Promise.all([
        axios.get(`${base}/api/v1/warehouse/list`, { headers }),
        axios.get(`${base}/api/v1/erp/setup-data`, { headers })
      ]);
      setWarehouses(whRes.data.data || []);
      setProvinces(provRes.data.data?.provinces || []);
    } catch (err) {
      toast.error("Database Sync Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (authToken) fetchInitialData(); }, [authToken]);

  // --- 2. CASCADING DISTRICTS FOR EDIT ---
  useEffect(() => {
    if (!formData.provinceId) { setDistricts([]); return; }
    axios.get(`${base}/api/v1/district?provinceId=${formData.provinceId}`, { headers })
      .then(res => setDistricts(res.data.data || []))
      .catch(() => setDistricts([]));
  }, [formData.provinceId]);

  // --- 3. EDIT SUBMIT ---
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    try {
      const payload = {
        name: sanitize(formData.name),
        locationId: parseInt(formData.provinceId),
        districtId: formData.districtId ? parseInt(formData.districtId) : undefined,
        type: sanitize(formData.warehouseCode.toUpperCase()),
      };
      await axios.put(`${base}/api/v1/warehouse/update/${formData.id}`, payload, { headers });
      toast.success("Registry Updated");
      setShowEditModal(null);
      resetForm();
      fetchInitialData();
    } catch (err) {
      toast.error("Operation Denied");
    } finally {
      setIsActionLoading(false);
    }
  };

  // --- 4. DELETE ---
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this warehouse?")) return;
    try {
      await axios.delete(`${base}/api/v1/warehouse/delete/${id}`, { headers });
      toast.success("Entry Purged Successfully");
      fetchInitialData();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Delete Failed";
      toast.error(msg === "WAREHOUSE_NOT_EMPTY" ? "Cannot delete: warehouse has stock" : msg);
    }
  };

  const openEdit = (wh: any) => {
    setFormData({
      id: wh.warehouse_id,
      warehouseCode: wh.type || '',
      name: wh.name || '',
      districtId: '',
      address: '',
      provinceId: wh.location?.toString() || ''
    });
    setShowEditModal('edit');
  };

  const resetForm = () => setFormData({ id: '', warehouseCode: '', name: '', districtId: '', address: '', provinceId: '' });

  const inputClass = "w-full bg-[#0f172a] border border-slate-800 rounded-xl p-3 text-white text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all";
  const labelClass = "block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest ml-1";

  return (
    <div className="text-slate-300 p-6 md:p-10 font-sans selection:bg-blue-600/30">
      <Toaster richColors theme="dark" position="top-center" />

      {/* HEADER */}
      <div className="max-w-7xl mx-auto flex justify-between items-center mb-10">
        <div className="border-l-4 border-blue-600 pl-6">
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
            Warehouse <span className="text-blue-600">Console</span>
          </h1>
          <p className="text-[10px] text-slate-600 mt-2 font-bold uppercase tracking-[0.3em]">Operator Session: {currentUserId}</p>
        </div>
      </div>

      {/* MAIN DATA TABLE */}
      <div className="max-w-7xl mx-auto bg-[#1e293b]/10 border border-white/5 rounded-[2.5rem] shadow-3xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Ref Code</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Hub Name</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Province</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">City / District</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Stock Items</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Command</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={6} className="py-24 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={32} /></td></tr>
              ) : warehouses.length === 0 ? (
                <tr><td colSpan={6} className="py-24 text-center text-slate-600 text-xs uppercase tracking-widest">No warehouses found</td></tr>
              ) : warehouses.map((wh: any) => (
                <tr key={wh.warehouse_id} className="group hover:bg-blue-600/[0.03] transition-all duration-300">
                  <td className="px-8 py-6 text-xs font-mono text-blue-400 font-bold uppercase tracking-wider">{wh.type || '—'}</td>
                  <td className="px-8 py-6 text-xs text-white font-semibold">{wh.name}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-400 text-[11px] font-semibold">
                      <MapPin size={12} className="text-blue-500/50"/> {wh.province?.name || '—'}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-300 text-[11px] font-semibold">
                      <MapPin size={12} className="text-emerald-500/50"/> {wh.district?.name || '—'}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-xs text-slate-500">{wh._count?.stockitem ?? 0}</td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setShowDetailModal(wh)} className="p-2.5 bg-slate-800/50 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 rounded-xl transition-all"><Eye size={16}/></button>
                      <button onClick={() => openEdit(wh)} className="p-2.5 bg-slate-800/50 hover:bg-emerald-600/20 text-slate-400 hover:text-emerald-400 rounded-xl transition-all"><Edit3 size={16}/></button>
                      <button onClick={() => handleDelete(wh.warehouse_id)} className="p-2.5 bg-slate-800/50 hover:bg-rose-600/20 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL: EDIT --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-xl rounded-[2.5rem] shadow-3xl overflow-hidden relative">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                Update <span className="text-blue-600">Hub Node</span>
              </h2>
              <button onClick={() => setShowEditModal(null)} className="p-2 text-slate-500 hover:text-rose-500 transition-colors"><X/></button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Warehouse Code</label>
                  <div className="relative">
                    <Hash size={14} className="absolute left-3 top-3.5 text-slate-600" />
                    <input className={inputClass + " pl-10"} value={formData.warehouseCode} onChange={(e) => setFormData({...formData, warehouseCode: e.target.value})} placeholder="WH-01" required />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Official Title</label>
                  <input className={inputClass} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Main Branch" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Province</label>
                  <select className={inputClass} value={formData.provinceId} onChange={(e) => setFormData({...formData, provinceId: e.target.value, districtId: ''})}>
                    <option value="">Select Province</option>
                    {provinces.map((p: any) => <option key={p.province_id} value={p.province_id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>District</label>
                  <select className={inputClass} value={formData.districtId} onChange={(e) => setFormData({...formData, districtId: e.target.value})}>
                    <option value="">Select District</option>
                    {districts.map((d: any) => <option key={d.district_id} value={d.district_id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-800 flex justify-end gap-4">
                <button type="button" onClick={() => setShowEditModal(null)} className="px-6 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">Abort</button>
                <button
                  type="submit"
                  disabled={isActionLoading}
                  className="px-10 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all flex items-center gap-2"
                >
                  {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16}/> Commit Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: DETAIL VIEW --- */}
      {showDetailModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-3xl overflow-hidden">
            <div className="p-8 border-b border-slate-800 bg-blue-600/10 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <Info className="text-blue-500" />
                <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Hub <span className="text-blue-600">Specs</span></h2>
              </div>
              <button onClick={() => setShowDetailModal(null)} className="p-2 text-slate-500 hover:text-white transition-colors"><X/></button>
            </div>

            <div className="p-8 space-y-8">
              <div className="flex justify-between items-end border-b border-white/5 pb-4">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Warehouse Code</p>
                <p className="text-3xl font-black text-blue-500 font-mono italic uppercase">{showDetailModal.type || '—'}</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <DetailItem label="Official Name" value={showDetailModal.name} />
                <DetailItem label="Province" value={showDetailModal.province?.name} />
                <DetailItem label="City / District" value={showDetailModal.district?.name} />
                <DetailItem label="Stock Items" value={showDetailModal._count?.stockitem?.toString()} />
                <DetailItem label="Status" value="Verified Node" highlight />
              </div>
            </div>

            <div className="p-8 bg-slate-900/50 flex justify-center">
              <button onClick={() => setShowDetailModal(null)} className="w-full py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, highlight = false }: any) {
  return (
    <div>
      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-emerald-500' : 'text-slate-200'}`}>{value || '—'}</p>
    </div>
  );
}
