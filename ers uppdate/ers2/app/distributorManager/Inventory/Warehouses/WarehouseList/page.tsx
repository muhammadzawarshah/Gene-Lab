"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { 
  Warehouse, MapPin, Save, XCircle, Loader2, ChevronRight, 
  Hash, Globe, ShieldCheck, Search, Trash2, Edit3, Eye, X, Info
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

// --- SECURITY: SANITIZATION ---
const sanitize = (str: string) => str.replace(/[<>'"%;()&+]/g, '').trim();

export default function WarehouseCommandCenter() {
  const currentUserId = Cookies.get('userId') || 'GUEST_USER';
  const authToken = Cookies.get('auth_token');

  // Core Data States
  const [warehouses, setWarehouses] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal States
  const [showDetailModal, setShowDetailModal] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState<any>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Form State (for both Create and Edit)
  const [formData, setFormData] = useState({
    id: '', warehouseCode: '', name: '', city: '', districtId: '', address: '', provinceId: ''
  });

  // --- 1. INITIAL LOAD ---
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [whRes, provRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/warehouse/list`, { headers: { Authorization: `Bearer ${authToken}` } }),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/setup-data`, { headers: { Authorization: `Bearer ${authToken}` } })
      ]);
      setWarehouses(whRes.data.data);
      setProvinces(provRes.data.data.provinces);
    } catch (err) {
      toast.error("Database Sync Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (authToken) fetchInitialData(); }, [authToken]);

  // --- 2. CASCADING DISTRICTS FOR EDIT/CREATE ---
  useEffect(() => {
    const fetchDistricts = async () => {
      if (!formData.provinceId) return setDistricts([]);
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/locations/districts?provinceId=${formData.provinceId}`, 
        { headers: { Authorization: `Bearer ${authToken}` } });
      setDistricts(res.data);
    };
    fetchDistricts();
  }, [formData.provinceId]);

  // --- 3. ACTIONS: CREATE / UPDATE ---
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsActionLoading(true);
    
    const isEdit = !!formData.id;
    const url = isEdit ? `/api/warehouses/update` : `/api/warehouses/create`;
    
    try {
      const payload = {
        ...formData,
        warehouseCode: sanitize(formData.warehouseCode.toUpperCase()),
        name: sanitize(formData.name),
        audit: { operator: currentUserId, timestamp: new Date().toISOString() }
      };

      await axios[isEdit ? 'put' : 'post'](`${process.env.NEXT_PUBLIC_API_URL}${url}`, payload, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      toast.success(isEdit ? "Registry Updated" : "Warehouse Created");
      setShowEditModal(null);
      resetForm();
      fetchInitialData();
    } catch (err) {
      toast.error("Operation Denied", { description: "Check permissions or network." });
    } finally {
      setIsActionLoading(false);
    }
  };

  // --- 4. ACTION: DELETE ---
  const handleDelete = async (id: string) => {
    if (!confirm("Security Alert: Are you sure you want to purge this record?")) return;
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/warehouses/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { userId: currentUserId }
      });
      toast.success("Entry Purged Successfully");
      fetchInitialData();
    } catch (err) {
      toast.error("Delete Failed");
    }
  };

  const resetForm = () => setFormData({ id: '', warehouseCode: '', name: '', city: '', districtId: '', address: '', provinceId: '' });

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
        <button 
          onClick={() => { resetForm(); setShowEditModal('create'); }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all flex items-center gap-2"
        >
          <Warehouse size={16} /> Register New Hub
        </button>
      </div>

      {/* MAIN DATA TABLE */}
      <div className="max-w-7xl mx-auto bg-[#1e293b]/10 border border-white/5 rounded-[2.5rem] shadow-3xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Ref Code</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Hub Name</th>
                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Region</th>
                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">Command</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={4} className="py-24 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={32} /></td></tr>
              ) : warehouses.map((wh: any) => (
                <tr key={wh.id} className="group hover:bg-blue-600/[0.03] transition-all duration-300">
                  <td className="px-8 py-6 text-xs font-mono text-blue-400 font-bold uppercase tracking-wider">{wh.warehouseCode}</td>
                  <td className="px-8 py-6 text-xs text-white font-semibold">{wh.name}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-500 text-[10px] font-bold uppercase">
                      <MapPin size={12} className="text-blue-500/50"/> {wh.city || wh.provinceName}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setShowDetailModal(wh)} className="p-2.5 bg-slate-800/50 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 rounded-xl transition-all"><Eye size={16}/></button>
                      <button onClick={() => { setFormData(wh); setShowEditModal('edit'); }} className="p-2.5 bg-slate-800/50 hover:bg-emerald-600/20 text-slate-400 hover:text-emerald-400 rounded-xl transition-all"><Edit3 size={16}/></button>
                      <button onClick={() => handleDelete(wh.id)} className="p-2.5 bg-slate-800/50 hover:bg-rose-600/20 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL: EDIT / CREATE --- */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-slate-800 w-full max-w-xl rounded-[2.5rem] shadow-3xl overflow-hidden relative">
            <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">
                {showEditModal === 'edit' ? 'Update' : 'Register'} <span className="text-blue-600">Hub Node</span>
              </h2>
              <button onClick={() => setShowEditModal(null)} className="p-2 text-slate-500 hover:text-rose-500 transition-colors"><X/></button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-1">
                  <label className={labelClass}>Warehouse Code</label>
                  <div className="relative">
                    <Hash size={14} className="absolute left-3 top-3.5 text-slate-600" />
                    <input className={inputClass + " pl-10"} value={formData.warehouseCode} onChange={(e) => setFormData({...formData, warehouseCode: e.target.value})} placeholder="WH-01" required />
                  </div>
                </div>
                <div className="col-span-1">
                  <label className={labelClass}>Official Title</label>
                  <input className={inputClass} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Main Branch" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className={labelClass}>Province</label>
                  <select className={inputClass} value={formData.provinceId} onChange={(e) => setFormData({...formData, provinceId: e.target.value})}>
                    <option value="">Select Province</option>
                    {provinces.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>District Registry</label>
                  <select className={inputClass} value={formData.districtId} onChange={(e) => setFormData({...formData, districtId: e.target.value})}>
                    <option value="">Select District</option>
                    {districts.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Physical Address</label>
                <textarea rows={2} className={inputClass + " resize-none"} value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Full street address..." />
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
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Master Reference</p>
                <p className="text-3xl font-black text-blue-500 font-mono italic uppercase">{showDetailModal.warehouseCode}</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <DetailItem label="Official Name" value={showDetailModal.name} />
                <DetailItem label="Province" value={showDetailModal.provinceName} />
                <DetailItem label="District" value={showDetailModal.districtName} />
                <DetailItem label="Status" value="Verified Node" highlight />
              </div>

              <div className="p-6 bg-slate-900/50 rounded-3xl border border-white/5">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Deployment Address</p>
                <p className="text-sm text-slate-300 leading-relaxed">{showDetailModal.address || "No physical address provided."}</p>
              </div>

              <div className="flex items-center gap-4 pt-4">
                <div className="h-10 w-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500 font-black text-[10px]">
                  {currentUserId.substring(0,2).toUpperCase()}
                </div>
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase">Operator Identity</p>
                  <p className="text-xs text-white font-bold">{currentUserId}</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-900/50 flex justify-center">
              <button onClick={() => setShowDetailModal(null)} className="w-full py-4 bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">Close Specification</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component for Detail Display
function DetailItem({ label, value, highlight = false }: any) {
  return (
    <div>
      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-sm font-bold ${highlight ? 'text-emerald-500' : 'text-slate-200'}`}>{value || '---'}</p>
    </div>
  );
}