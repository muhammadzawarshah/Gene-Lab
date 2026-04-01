"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
    Package, Plus, Edit3, Trash2, Search,
    X, Save, AlertCircle, Hash, CalendarDays,
    Layers, ChevronDown, Activity
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

const emptyForm = {
    product_id: '',
    batch_number: '',
    manufacturing_date: '',
    expiry_date: '',
    received_quantity: '',
    available_quantity: '',
    status: 'ACTIVE',
    location_id: '',
};

export default function BatchPage() {
    const authToken = Cookies.get('auth_token');
    const config = { headers: { Authorization: `Bearer ${authToken}` } };

    const [batches, setBatches] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [isSaving, setIsSaving] = useState(false);

    const fetchData = async () => {
        try {
            const [batchRes, productRes] = await Promise.all([
                axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/batch`, config),
                axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product`, config),
            ]);
            setBatches(batchRes.data.data || []);
            setProducts(productRes.data || []);
        } catch (err) {
            toast.error('Data load failed.');
        }
    };

    useEffect(() => { if (authToken) fetchData(); }, [authToken]);

    const openCreateForm = () => {
        setForm({ ...emptyForm });
        setIsEditing(false);
        setEditId(null);
        setIsFormOpen(true);
    };

    const openEditForm = (batch: any) => {
        setForm({
            product_id: batch.product_id || '',
            batch_number: batch.batch_number || '',
            manufacturing_date: batch.manufacturing_date ? batch.manufacturing_date.split('T')[0] : '',
            expiry_date: batch.expiry_date ? batch.expiry_date.split('T')[0] : '',
            received_quantity: String(batch.received_quantity || ''),
            available_quantity: String(batch.available_quantity || ''),
            status: batch.status || 'ACTIVE',
            location_id: batch.location_id ? String(batch.location_id) : '',
        });
        setIsEditing(true);
        setEditId(batch.batch_id);
        setIsFormOpen(true);
    };

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!form.product_id || !form.batch_number) {
            toast.error('Product and Batch Number are required.');
            return;
        }
        setIsSaving(true);
        const tId = toast.loading(isEditing ? 'Updating batch...' : 'Creating batch...');
        try {
            if (isEditing && editId !== null) {
                await axios.put(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/batch/${editId}`, form, config);
                toast.success('Batch updated!', { id: tId });
            } else {
                await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/batch`, form, config);
                toast.success('Batch created!', { id: tId });
            }
            setIsFormOpen(false);
            fetchData();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Operation failed.', { id: tId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this batch record?')) return;
        const tId = toast.loading('Deleting...');
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/batch/${id}`, config);
            toast.success('Batch deleted.', { id: tId });
            fetchData();
        } catch (err) {
            toast.error('Delete failed.', { id: tId });
        }
    };

    const filtered = useMemo(() => {
        const q = searchQuery.toLowerCase();
        return batches.filter(b => {
            const prodName = b.product?.name?.toLowerCase() || '';
            const bNum = (b.batch_number || '').toLowerCase();
            return prodName.includes(q) || bNum.includes(q);
        });
    }, [batches, searchQuery]);

    const formatDate = (d: string) => d ? d.split('T')[0] : '---';

    const thClass = "px-4 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-[#0b1224] whitespace-nowrap";
    const tdClass = "px-4 py-4 text-sm text-slate-300 border-b border-white/[0.02]";
    const inputClass = "w-full bg-[#161f35] border border-white/5 rounded-2xl py-3.5 px-5 outline-none focus:ring-2 ring-amber-500/30 transition-all text-white [color-scheme:dark] text-sm";
    const labelClass = "text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1 block mb-1.5";

    const statusColor: Record<string, string> = {
        ACTIVE: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        EXPIRED: 'text-red-400 bg-red-500/10 border-red-500/20',
        HOLD: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    };

    return (
        <div className="text-slate-300 p-6 md:p-10 font-sans">
            <Toaster richColors theme="dark" position="top-right" />
            <div className="max-w-[1900px] mx-auto">

                {/* HEADER */}
                <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 border-b border-white/5 pb-10">
                    <div className="flex items-center gap-6">
                        <div className="bg-amber-600 p-4 rounded-2xl shadow-2xl shadow-amber-900/20">
                            <Package className="text-white" size={30} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                                BATCH <span className="text-amber-400">MANAGEMENT</span>
                            </h1>
                            <p className="text-[10px] text-slate-600 font-bold tracking-[0.4em]">BATCH_INVENTORY_SYSTEM</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search batch or product..."
                                className="bg-[#0f172a] border border-white/5 rounded-2xl py-3.5 pl-11 pr-5 w-full md:w-[320px] outline-none focus:ring-2 ring-amber-500/20 text-sm transition-all"
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={openCreateForm}
                            className="flex items-center gap-3 bg-amber-600 hover:bg-amber-500 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all shadow-lg shadow-amber-900/30 active:scale-95 cursor-pointer"
                        >
                            <Plus size={16} />
                            Add Batch
                        </button>
                    </div>
                </header>

                {/* STATS */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {[
                        { label: 'Total Batches', value: batches.length, color: 'amber' },
                        { label: 'Active', value: batches.filter(b => b.status === 'ACTIVE').length, color: 'emerald' },
                        { label: 'Expired', value: batches.filter(b => b.status === 'EXPIRED').length, color: 'red' },
                        { label: 'On Hold', value: batches.filter(b => b.status === 'HOLD').length, color: 'blue' },
                    ].map((stat) => (
                        <div key={stat.label} className="bg-[#0f172a]/60 border border-white/5 rounded-2xl p-5">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">{stat.label}</p>
                            <p className={`text-3xl font-black text-${stat.color}-400`}>{stat.value}</p>
                        </div>
                    ))}
                </div>

                {/* TABLE */}
                <div className="bg-[#0f172a]/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr>
                                    <th className={`${thClass} pl-8`}><Hash size={12} /></th>
                                    <th className={thClass}>Product</th>
                                    <th className={thClass}>Batch Number</th>
                                    <th className={thClass}>MFG Date</th>
                                    <th className={thClass}>Expiry Date</th>
                                    <th className={thClass}>Received Qty</th>
                                    <th className={thClass}>Available Qty</th>
                                    <th className={thClass}>Status</th>
                                    <th className={`${thClass} pr-8 text-center`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {filtered.map((batch: any, idx) => (
                                    <tr key={batch.batch_id} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="pl-8 py-4 text-[10px] font-bold text-slate-700">{idx + 1}</td>
                                        <td className={`${tdClass} font-bold text-white`}>{batch.product?.name || '---'}</td>
                                        <td className={tdClass}>
                                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-lg text-[11px] font-mono font-bold">
                                                {batch.batch_number}
                                            </span>
                                        </td>
                                        <td className={`${tdClass} font-mono text-[12px]`}>{formatDate(batch.manufacturing_date)}</td>
                                        <td className={`${tdClass} font-mono text-[12px]`}>
                                            <span className="text-red-400">{formatDate(batch.expiry_date)}</span>
                                        </td>
                                        <td className={`${tdClass} font-bold text-center`}>{batch.received_quantity || 0}</td>
                                        <td className={`${tdClass} font-bold text-center text-emerald-400`}>{batch.available_quantity || 0}</td>
                                        <td className={tdClass}>
                                            <span className={`px-3 py-1 rounded-full text-[11px] font-black border uppercase ${statusColor[batch.status] || 'text-slate-400 bg-slate-800 border-slate-700'}`}>
                                                {batch.status}
                                            </span>
                                        </td>
                                        <td className="pr-8 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-40 group-hover:opacity-100 transition-all">
                                                <button onClick={() => openEditForm(batch)} className="p-2 hover:bg-amber-600 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer">
                                                    <Edit3 size={15} />
                                                </button>
                                                <button onClick={() => handleDelete(batch.batch_id)} className="p-2 hover:bg-red-600 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filtered.length === 0 && (
                            <div className="py-20 text-center text-slate-600 font-bold text-xs uppercase tracking-widest">
                                No batches found.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CREATE / EDIT MODAL */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => !isSaving && setIsFormOpen(false)} />
                    <div className="relative bg-[#0b1224] border border-white/10 w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-[3rem] shadow-3xl p-8 md:p-12">

                        {/* Modal Header */}
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex items-center gap-4">
                                <div className="bg-amber-600 p-3 rounded-2xl">
                                    {isEditing ? <Edit3 className="text-white" size={22} /> : <Plus className="text-white" size={22} />}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                                        {isEditing ? 'Update Batch' : 'New Batch'}
                                    </h2>
                                    <p className="text-[10px] text-slate-600 font-bold tracking-[0.3em] uppercase">
                                        {isEditing ? 'Modify existing batch' : 'Create a new batch entry'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsFormOpen(false)} className="text-slate-500 hover:text-white transition-colors cursor-pointer">
                                <X size={28} />
                            </button>
                        </div>

                        {/* Form Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                            {/* Product Select */}
                            <div className="md:col-span-2">
                                <label className={labelClass}>
                                    <Package size={10} className="inline mr-1" />
                                    Product <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        className={`${inputClass} appearance-none pr-10`}
                                        value={form.product_id}
                                        onChange={(e) => handleChange('product_id', e.target.value)}
                                    >
                                        <option value="">— Select Product —</option>
                                        {products.map((p: any) => (
                                            <option key={p.product_id} value={p.product_id}>
                                                {p.name} {p.sku_code ? `(${p.sku_code})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                </div>
                            </div>

                            {/* Batch Number */}
                            <div>
                                <label className={labelClass}>
                                    <Hash size={10} className="inline mr-1" />
                                    Batch Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. BT-2024-001"
                                    className={inputClass}
                                    value={form.batch_number}
                                    onChange={(e) => handleChange('batch_number', e.target.value)}
                                />
                            </div>

                            {/* Status */}
                            <div>
                                <label className={labelClass}>
                                    <Activity size={10} className="inline mr-1" />
                                    Status
                                </label>
                                <div className="relative">
                                    <select
                                        className={`${inputClass} appearance-none pr-10`}
                                        value={form.status}
                                        onChange={(e) => handleChange('status', e.target.value)}
                                    >
                                        <option value="ACTIVE">ACTIVE</option>
                                        <option value="EXPIRED">EXPIRED</option>
                                        <option value="HOLD">HOLD</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                </div>
                            </div>

                            {/* MFG Date */}
                            <div>
                                <label className={labelClass}>
                                    <CalendarDays size={10} className="inline mr-1" />
                                    Manufacturing Date
                                </label>
                                <input type="date" className={inputClass} value={form.manufacturing_date} onChange={(e) => handleChange('manufacturing_date', e.target.value)} />
                            </div>

                            {/* Expiry Date */}
                            <div>
                                <label className={labelClass}>
                                    <CalendarDays size={10} className="inline mr-1" />
                                    Expiry Date
                                </label>
                                <input type="date" className={inputClass} value={form.expiry_date} onChange={(e) => handleChange('expiry_date', e.target.value)} />
                            </div>

                            {/* Received Quantity */}
                            <div>
                                <label className={labelClass}>Received Quantity</label>
                                <input type="number" min="0" placeholder="0" className={inputClass} value={form.received_quantity} onChange={(e) => handleChange('received_quantity', e.target.value)} />
                            </div>

                            {/* Available Quantity */}
                            <div>
                                <label className={labelClass}>Available Quantity</label>
                                <input type="number" min="0" placeholder="0" className={inputClass} value={form.available_quantity} onChange={(e) => handleChange('available_quantity', e.target.value)} />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-5 border-t border-white/5 pt-8">
                            <div className="flex items-center gap-2 text-slate-600 italic text-[10px] font-bold uppercase tracking-widest">
                                <AlertCircle size={14} className="text-amber-500" />
                                Required fields marked with *
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => setIsFormOpen(false)}
                                    className="flex-1 md:flex-none bg-white/5 hover:bg-white/10 text-slate-300 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={isSaving}
                                    onClick={handleSubmit}
                                    className="flex-1 md:flex-none bg-amber-600 hover:bg-amber-500 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-amber-900/30 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                                >
                                    {isSaving ? 'Saving...' : isEditing ? 'Update Batch' : 'Create Batch'}
                                    <Save size={15} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
