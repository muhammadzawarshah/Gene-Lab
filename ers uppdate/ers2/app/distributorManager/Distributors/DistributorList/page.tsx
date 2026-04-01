"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import {
  Users, Search, UserPlus, MapPin, ShieldCheck,
  Trash2, Building2, Save, Loader2, Eye,
  Edit3, X, Phone, Mail, Hash, FileText, Plus
} from 'lucide-react';
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  address_line1: '',
  city: '',
  country: 'Pakistan',
  postal_code: '',
  tax_id: '',
  type: 'CUSTOMER',
};

export default function DistributorListPage() {
  const [distributors, setDistributors] = useState<any[]>([]);
  const [searchTerm, setSearchTerm]     = useState('');
  const [isLoading, setIsLoading]       = useState(true);
  const [showModal, setShowModal]       = useState<'create' | 'edit' | 'view' | null>(null);
  const [selected, setSelected]         = useState<any>(null);
  const [form, setForm]                 = useState(emptyForm);
  const [isSaving, setIsSaving]         = useState(false);

  const authToken = Cookies.get('auth_token');
  const currentUserId = Cookies.get('userId');
  const headers = { Authorization: `Bearer ${authToken}` };

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchDistributors = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/v1/party/customers`, { headers });
      setDistributors(Array.isArray(res.data) ? res.data : res.data.data || []);
    } catch {
      toast.error("Failed to load distributors");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDistributors(); }, []);

  // ── Create ───────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await axios.post(`${API_BASE}/api/v1/party`, { ...form, type: 'CUSTOMER' }, { headers });
      toast.success("Distributor created");
      setShowModal(null);
      setForm(emptyForm);
      fetchDistributors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Create failed");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Update ───────────────────────────────────────────────────────────────
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setIsSaving(true);
    try {
      await axios.put(`${API_BASE}/api/v1/party/${selected.party_id}`, form, { headers });
      toast.success("Distributor updated");
      setShowModal(null);
      fetchDistributors();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete distributor "${name}"?`)) return;
    const tId = toast.loading("Deleting...");
    try {
      await axios.delete(`${API_BASE}/api/v1/party/${id}`, { headers });
      setDistributors(prev => prev.filter(d => d.party_id !== id));
      toast.success("Distributor deleted", { id: tId });
    } catch (err: any) {
      const msg = err.response?.data?.message || "Delete failed";
      toast.error(msg.includes('ORDERS') ? "Cannot delete: distributor has existing orders" : msg, { id: tId });
    }
  };

  const openCreate = () => { setForm(emptyForm); setSelected(null); setShowModal('create'); };

  const openEdit = (d: any) => {
    setSelected(d);
    setForm({
      name:          d.name || '',
      email:         d.email || '',
      phone:         d.phone || '',
      address_line1: d.addresses?.[0]?.line1 || '',
      city:          d.addresses?.[0]?.city || '',
      country:       d.addresses?.[0]?.country || 'Pakistan',
      postal_code:   d.addresses?.[0]?.postal_code || '',
      tax_id:        d.tax_id?.toString() || '',
      type:          d.type || 'CUSTOMER',
    });
    setShowModal('edit');
  };

  const openView = (d: any) => { setSelected(d); setShowModal('view'); };

  const filtered = useMemo(() =>
    distributors.filter(d =>
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.phone?.includes(searchTerm)
    ), [distributors, searchTerm]);

  const inputCls  = "w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-semibold outline-none focus:border-blue-500 transition-all";
  const labelCls  = "block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5";

  if (isLoading) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      <p className="text-blue-500 font-black text-[10px] tracking-[0.5em] uppercase">Loading Distributors...</p>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 p-6 min-h-screen">
      <Toaster theme="dark" position="top-right" richColors />

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
            <Building2 className="text-blue-500 w-10 h-10" /> Partner Network
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">
            Operator: {currentUserId} · Total: {distributors.length} distributors
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search name, email, phone..."
              className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-xs text-white outline-none focus:border-blue-500/50 w-80 transition-all font-bold"
            />
          </div>
          <button onClick={openCreate}
            className="bg-blue-600 hover:bg-blue-500 text-white px-7 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
            <UserPlus size={14} /> Add Distributor
          </button>
        </div>
      </div>

      {/* ── GRID ───────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] opacity-30">
          <Users size={48} className="text-slate-600 mb-3" />
          <p className="text-xs uppercase tracking-[0.3em] font-black">No distributors found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map(dist => (
              <motion.div
                layout key={dist.party_id}
                initial={{ opacity: 0, scale: 0.93 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.93 }}
                className="group relative bg-slate-900/40 border border-white/[0.08] p-6 rounded-[2.5rem] hover:border-blue-500/30 transition-all backdrop-blur-xl overflow-hidden"
              >
                {/* Top row */}
                <div className="flex justify-between items-start mb-5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                    <Users className="text-blue-400" size={20} />
                  </div>
                  <span className={cn(
                    "text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest border",
                    dist.type === 'BOTH' ? "border-purple-500/20 text-purple-400 bg-purple-500/5" :
                    dist.type === 'CUSTOMER' ? "border-blue-500/20 text-blue-400 bg-blue-500/5" :
                    "border-emerald-500/20 text-emerald-400 bg-emerald-500/5"
                  )}>
                    {dist.type}
                  </span>
                </div>

                {/* Name & location */}
                <div className="mb-4">
                  <h3 className="text-base font-black text-white italic tracking-tighter uppercase group-hover:text-blue-400 transition-colors truncate">
                    {dist.name}
                  </h3>
                  {dist.addresses?.[0]?.city && (
                    <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                      <MapPin size={11} />
                      <span className="text-[10px] font-bold uppercase tracking-tight">
                        {dist.addresses[0].city}{dist.addresses[0].country ? `, ${dist.addresses[0].country}` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Contact info */}
                <div className="space-y-2 py-4 border-y border-white/[0.05] mb-4">
                  {dist.email && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <Mail size={11} className="text-blue-500/50 shrink-0" />
                      <span className="truncate">{dist.email}</span>
                    </div>
                  )}
                  {dist.phone && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <Phone size={11} className="text-blue-500/50 shrink-0" />
                      <span>{dist.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <FileText size={11} className="text-slate-600 shrink-0" />
                    <span>{dist._count?.customerinvoice ?? 0} invoices</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => openView(dist)}
                    className="flex-1 bg-white/5 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5 transition-all flex items-center justify-center gap-1.5">
                    <Eye size={12} /> View
                  </button>
                  <button onClick={() => openEdit(dist)}
                    className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5 transition-all flex items-center justify-center gap-1.5">
                    <Edit3 size={12} /> Edit
                  </button>
                  <button onClick={() => handleDelete(dist.party_id, dist.name)}
                    className="p-2.5 bg-white/5 hover:bg-rose-600 text-slate-600 hover:text-white rounded-xl transition-all border border-white/5">
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* ── VIEW MODAL ──────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal === 'view' && selected && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-3xl"
            >
              <div className="px-8 py-6 bg-blue-600/10 border-b border-blue-500/20 flex items-start justify-between">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Distributor Profile</p>
                  <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">{selected.name}</h2>
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">{selected.type}</span>
                </div>
                <button onClick={() => setShowModal(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <InfoItem icon={<Mail size={13} />} label="Email" value={selected.email} />
                  <InfoItem icon={<Phone size={13} />} label="Phone" value={selected.phone} />
                  <InfoItem icon={<Hash size={13} />} label="Tax ID" value={selected.tax_id} />
                  <InfoItem icon={<FileText size={13} />} label="Invoices" value={selected._count?.customerinvoice ?? 0} />
                </div>

                {selected.addresses?.[0] && (
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-5">
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">Address</p>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {selected.addresses[0].line1}
                      {selected.addresses[0].city ? `, ${selected.addresses[0].city}` : ''}
                      {selected.addresses[0].postal_code ? ` ${selected.addresses[0].postal_code}` : ''}
                      {selected.addresses[0].country ? `, ${selected.addresses[0].country}` : ''}
                    </p>
                  </div>
                )}
              </div>

              <div className="px-8 pb-8 flex gap-3">
                <button onClick={() => { openEdit(selected); }}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                  <Edit3 size={13} /> Edit
                </button>
                <button onClick={() => setShowModal(null)}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-slate-400 py-3.5 rounded-2xl font-black text-[10px] uppercase transition-all">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── CREATE / EDIT MODAL ─────────────────────────────────────────── */}
      <AnimatePresence>
        {(showModal === 'create' || showModal === 'edit') && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(null)}
              className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
            <motion.form
              onSubmit={showModal === 'create' ? handleCreate : handleUpdate}
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-white/10 rounded-[2.5rem] shadow-3xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                <h2 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                  {showModal === 'create' ? <Plus className="text-blue-500" size={18} /> : <Edit3 className="text-blue-500" size={18} />}
                  {showModal === 'create' ? 'New Distributor' : 'Edit Distributor'}
                </h2>
                <button type="button" onClick={() => setShowModal(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 p-8 space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div className="col-span-2">
                    <label className={labelCls}>Full Name *</label>
                    <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Ahmed Traders" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Email</label>
                    <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="email@example.com" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Phone</label>
                    <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                      placeholder="03xx-xxxxxxx" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Tax / NTN ID</label>
                    <input value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })}
                      placeholder="Tax ID" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Type</label>
                    <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className={inputCls}>
                      <option value="CUSTOMER" className="bg-[#0f172a]">Customer</option>
                      <option value="SUPPLIER" className="bg-[#0f172a]">Supplier</option>
                      <option value="BOTH"     className="bg-[#0f172a]">Both</option>
                    </select>
                  </div>
                </div>

                {/* Address */}
                <div className="border-t border-white/5 pt-5 space-y-4">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Address</p>
                  <div>
                    <label className={labelCls}>Street Address</label>
                    <input value={form.address_line1} onChange={e => setForm({ ...form, address_line1: e.target.value })}
                      placeholder="Street / Area" className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>City</label>
                      <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })}
                        placeholder="Karachi" className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Postal Code</label>
                      <input value={form.postal_code} onChange={e => setForm({ ...form, postal_code: e.target.value })}
                        placeholder="75000" className={inputCls} />
                    </div>
                    <div className="col-span-2">
                      <label className={labelCls}>Country</label>
                      <input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}
                        className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-4 px-8 py-6 border-t border-white/5">
                <button type="button" onClick={() => setShowModal(null)}
                  className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-[10px] text-slate-400 uppercase transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-2xl font-black text-[10px] uppercase shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                  {isSaving ? <Loader2 className="animate-spin" size={14} /> : <><Save size={13} /> {showModal === 'create' ? 'Create' : 'Save Changes'}</>}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <div>
      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1.5">{label}</p>
      <div className="flex items-center gap-2 text-sm font-bold text-slate-300">
        <span className="text-slate-600">{icon}</span>
        {value ?? <span className="text-slate-600 text-xs">—</span>}
      </div>
    </div>
  );
}
