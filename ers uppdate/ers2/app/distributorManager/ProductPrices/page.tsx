"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
    DollarSign, Plus, Edit3, Trash2, Search,
    X, Save, AlertCircle, Tag, ChevronDown, Package,
    CalendarDays, Hash
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

const PRICE_TYPES = ['RETAIL', 'WHOLESALE', 'DISTRIBUTER'] as const;

const emptyForm = {
    product_id: '',
    price_type: 'RETAIL' as string,
    currency: 'PKR',
    uom_id: '',
    unit_price: '',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
    tax_id: '',
};

export default function ProductPricePage() {
    const authToken = Cookies.get('auth_token');
    const config = { headers: { Authorization: `Bearer ${authToken}` } };

    const [prices, setPrices] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [uoms, setUoms] = useState<any[]>([]);
    const [taxes, setTaxes] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal states
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [form, setForm] = useState({ ...emptyForm });
    const [isSaving, setIsSaving] = useState(false);

    // Fetch all required data in parallel
    const fetchData = async () => {
        try {
            const [priceRes, productRes, masterRes] = await Promise.all([
                axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/productprice`, config),
                axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product`, config),
                axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/setup-data`, config),
            ]);
            console.log(productRes.data.data);
            setPrices(priceRes.data.data || []);
            setProducts(productRes.data || []);
            setUoms(masterRes.data?.data?.uoms || []);

            // Fetch taxes separately (usually via finance or erp setup)
            try {
                const taxRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/setup-data`, config);
                setTaxes(taxRes.data?.data?.taxes || []);
            } catch {
                setTaxes([]);
            }
        } catch (err) {
            toast.error('Data load failed. Check your connection.');
        }
    };

    useEffect(() => { if (authToken) fetchData(); }, [authToken]);

    const openCreateForm = () => {
        setForm({ ...emptyForm });
        setIsEditing(false);
        setEditId(null);
        setIsFormOpen(true);
    };

    const openEditForm = (price: any) => {
        setForm({
            product_id: price.product_id,
            price_type: price.price_type,
            currency: price.currency || 'PKR',
            uom_id: String(price.uom_id),
            unit_price: String(price.unit_price),
            effective_from: price.effective_from?.split('T')[0] || '',
            effective_to: price.effective_to ? price.effective_to.split('T')[0] : '',
            tax_id: price.tax_id ? String(price.tax_id) : '',
        });
        setIsEditing(true);
        setEditId(price.prod_price_id);
        setIsFormOpen(true);
    };

    const handleChange = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!form.product_id || !form.unit_price || !form.uom_id || !form.effective_from) {
            toast.error('Please fill all required fields.');
            return;
        }
        setIsSaving(true);
        const tId = toast.loading(isEditing ? 'Updating price...' : 'Creating price...');
        try {
            if (isEditing && editId !== null) {
                await axios.put(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/productprice/${editId}`,
                    form, config
                );
                toast.success('Price updated successfully!', { id: tId });
            } else {
                await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/v1/productprice`,
                    form, config
                );
                toast.success('Price created successfully!', { id: tId });
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
        if (!confirm('Delete this product price record?')) return;
        const tId = toast.loading('Deleting...');
        try {
            await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/productprice/${id}`, config);
            toast.success('Price record deleted.', { id: tId });
            fetchData();
        } catch (err) {
            toast.error('Delete failed.', { id: tId });
        }
    };

    const filtered = prices.filter(p => {
        const name = p.product?.name?.toLowerCase() || '';
        const sku = p.product?.sku_code?.toLowerCase() || '';
        const q = searchQuery.toLowerCase();
        return name.includes(q) || sku.includes(q);
    });

    const thClass = "px-4 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-[#0b1224] whitespace-nowrap";
    const tdClass = "px-4 py-4 text-sm text-slate-300 border-b border-white/[0.02]";
    const inputClass = "w-full bg-[#161f35] border border-white/5 rounded-2xl py-3.5 px-5 outline-none focus:ring-2 ring-violet-500/30 transition-all text-white [color-scheme:dark] text-sm";
    const labelClass = "text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1 block mb-1.5";

    const badgeColor: Record<string, string> = {
        RETAIL: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        WHOLESALE: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
        DISTRIBUTER: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    };

    return (
        <div className="text-slate-300 p-6 md:p-10 font-sans">
            <Toaster richColors theme="dark" position="top-right" />

            <div className="max-w-[1900px] mx-auto">
                {/* HEADER */}
                <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 border-b border-white/5 pb-10">
                    <div className="flex items-center gap-6">
                        <div className="bg-violet-600 p-4 rounded-2xl shadow-2xl shadow-violet-900/20">
                            <DollarSign className="text-white" size={30} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                                PRODUCT <span className="text-violet-400">PRICING</span>
                            </h1>
                            <p className="text-[10px] text-slate-600 font-bold tracking-[0.4em]">PRICE_MANAGEMENT_SYSTEM</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                            <input
                                type="text"
                                placeholder="Search by product or SKU..."
                                className="bg-[#0f172a] border border-white/5 rounded-2xl py-3.5 pl-11 pr-5 w-full md:w-[320px] outline-none focus:ring-2 ring-violet-500/20 text-sm transition-all"
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            id="add-product-price-btn"
                            onClick={openCreateForm}
                            className="flex items-center gap-3 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-[0.15em] transition-all shadow-lg shadow-violet-900/30 active:scale-95"
                        >
                            <Plus size={16} />
                            Add Price
                        </button>
                    </div>
                </header>

                {/* STATS ROW */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    {[
                        { label: 'Total Price Records', value: prices.length, color: 'violet' },
                        { label: 'Retail Prices', value: prices.filter(p => p.price_type === 'RETAIL').length, color: 'emerald' },
                        { label: 'Wholesale Prices', value: prices.filter(p => p.price_type === 'WHOLESALE').length, color: 'blue' },
                        { label: 'Distributor Prices', value: prices.filter(p => p.price_type === 'DISTRIBUTER').length, color: 'amber' },
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
                                    <th className={thClass}>SKU</th>
                                    <th className={thClass}>Price Type</th>
                                    <th className={thClass}>Unit Price</th>
                                    <th className={thClass}>Currency</th>
                                    <th className={thClass}>UoM</th>
                                    <th className={thClass}>Tax</th>
                                    <th className={thClass}>Effective From</th>
                                    <th className={thClass}>Effective To</th>
                                    <th className={`${thClass} pr-8 text-center`}>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.03]">
                                {filtered.map((price: any, idx) => (
                                    <tr key={price.prod_price_id} className="hover:bg-white/[0.01] transition-colors group">
                                        <td className="pl-8 py-4 text-[10px] font-bold text-slate-700">{idx + 1}</td>
                                        <td className={`${tdClass} font-bold text-white`}>{price.product?.name || '---'}</td>
                                        <td className={tdClass}>
                                            <span className="bg-slate-800 text-slate-400 px-2 py-1 rounded-lg text-[10px] font-mono border border-white/5">
                                                {price.product?.sku_code || '---'}
                                            </span>
                                        </td>
                                        <td className={tdClass}>
                                            <span className={`px-3 py-1 rounded-full text-[11px] font-black border uppercase ${badgeColor[price.price_type] || 'text-slate-400 bg-slate-800 border-slate-700'}`}>
                                                {price.price_type}
                                            </span>
                                        </td>
                                        <td className={`${tdClass} font-mono font-black text-violet-300 text-base`}>
                                            {Number(price.unit_price).toLocaleString('en-PK', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className={tdClass}>{price.currency || 'PKR'}</td>
                                        <td className={tdClass}>{price.uom?.name || '---'}</td>
                                        <td className={tdClass}>{price.tax ? `${price.tax.name} (${(Number(price.tax.rate) * 100).toFixed(1)}%)` : '---'}</td>
                                        <td className={`${tdClass} font-mono text-[12px]`}>{price.effective_from?.split('T')[0] || '---'}</td>
                                        <td className={`${tdClass} font-mono text-[12px]`}>
                                            {price.effective_to ? (
                                                <span className="text-red-400">{price.effective_to.split('T')[0]}</span>
                                            ) : (
                                                <span className="text-emerald-500 font-black text-[10px] uppercase tracking-widest">Active</span>
                                            )}
                                        </td>
                                        <td className="pr-8 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-40 group-hover:opacity-100 transition-all">
                                                <button
                                                    id={`edit-price-${price.prod_price_id}`}
                                                    onClick={() => openEditForm(price)}
                                                    className="p-2 hover:bg-violet-600 text-slate-400 hover:text-white rounded-xl transition-all"
                                                >
                                                    <Edit3 size={15} />
                                                </button>
                                                <button
                                                    id={`delete-price-${price.prod_price_id}`}
                                                    onClick={() => handleDelete(price.prod_price_id)}
                                                    className="p-2 hover:bg-red-600 text-slate-400 hover:text-white rounded-xl transition-all"
                                                >
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
                                No product prices found.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* CREATE / EDIT MODAL */}
            {isFormOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/90 backdrop-blur-md"
                        onClick={() => !isSaving && setIsFormOpen(false)}
                    />
                    <div className="relative bg-[#0b1224] border border-white/10 w-full max-w-3xl max-h-[95vh] overflow-y-auto rounded-[3rem] shadow-3xl p-8 md:p-12">

                        {/* Modal Header */}
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex items-center gap-4">
                                <div className="bg-violet-600 p-3 rounded-2xl">
                                    {isEditing ? <Edit3 className="text-white" size={22} /> : <Plus className="text-white" size={22} />}
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">
                                        {isEditing ? 'Update Price' : 'New Product Price'}
                                    </h2>
                                    <p className="text-[10px] text-slate-600 font-bold tracking-[0.3em] uppercase">
                                        {isEditing ? 'Modify existing price record' : 'Set price for a registered product'}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsFormOpen(false)} className="text-slate-500 hover:text-white transition-colors">
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
                                        id="price-product-select"
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

                            {/* Price Type */}
                            <div>
                                <label className={labelClass}>
                                    <Tag size={10} className="inline mr-1" />
                                    Price Type <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        id="price-type-select"
                                        className={`${inputClass} appearance-none pr-10`}
                                        value={form.price_type}
                                        onChange={(e) => handleChange('price_type', e.target.value)}
                                    >
                                        {PRICE_TYPES.map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                </div>
                            </div>

                            {/* Unit Price */}
                            <div>
                                <label className={labelClass}>
                                    <DollarSign size={10} className="inline mr-1" />
                                    Unit Price <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="price-unit-price"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="e.g. 1500.00"
                                    className={inputClass}
                                    value={form.unit_price}
                                    onChange={(e) => handleChange('unit_price', e.target.value)}
                                />
                            </div>

                            {/* UoM */}
                            <div>
                                <label className={labelClass}>Unit of Measure <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <select
                                        id="price-uom-select"
                                        className={`${inputClass} appearance-none pr-10`}
                                        value={form.uom_id}
                                        onChange={(e) => handleChange('uom_id', e.target.value)}
                                    >
                                        <option value="">— Select UoM —</option>
                                        {uoms.map((u: any) => (
                                            <option key={u.uom_id} value={u.uom_id}>{u.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                </div>
                            </div>

                            {/* Currency */}
                            <div>
                                <label className={labelClass}>Currency</label>
                                <input
                                    id="price-currency"
                                    type="text"
                                    placeholder="PKR"
                                    className={inputClass}
                                    value={form.currency}
                                    onChange={(e) => handleChange('currency', e.target.value)}
                                />
                            </div>

                            {/* Tax */}
                            <div>
                                <label className={labelClass}>Tax (Optional)</label>
                                <div className="relative">
                                    <select
                                        id="price-tax-select"
                                        className={`${inputClass} appearance-none pr-10`}
                                        value={form.tax_id}
                                        onChange={(e) => handleChange('tax_id', e.target.value)}
                                    >
                                        <option value="">— No Tax —</option>
                                        {taxes.map((t: any) => (
                                            <option key={t.tax_id} value={t.tax_id}>
                                                {t.name} ({(Number(t.rate) * 100).toFixed(1)}%)
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                </div>
                            </div>

                            {/* Effective From */}
                            <div>
                                <label className={labelClass}>
                                    <CalendarDays size={10} className="inline mr-1" />
                                    Effective From <span className="text-red-500">*</span>
                                </label>
                                <input
                                    id="price-effective-from"
                                    type="date"
                                    className={inputClass}
                                    value={form.effective_from}
                                    onChange={(e) => handleChange('effective_from', e.target.value)}
                                />
                            </div>

                            {/* Effective To */}
                            <div>
                                <label className={labelClass}>
                                    <CalendarDays size={10} className="inline mr-1" />
                                    Effective To (Optional)
                                </label>
                                <input
                                    id="price-effective-to"
                                    type="date"
                                    className={inputClass}
                                    value={form.effective_to}
                                    onChange={(e) => handleChange('effective_to', e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-5 border-t border-white/5 pt-8">
                            <div className="flex items-center gap-2 text-slate-600 italic text-[10px] font-bold uppercase tracking-widest">
                                <AlertCircle size={14} className="text-violet-500" />
                                Required fields marked with *
                            </div>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => setIsFormOpen(false)}
                                    className="flex-1 md:flex-none bg-white/5 hover:bg-white/10 text-slate-300 px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    id="save-price-btn"
                                    disabled={isSaving}
                                    onClick={handleSubmit}
                                    className="flex-1 md:flex-none bg-violet-600 hover:bg-violet-500 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-lg shadow-violet-900/30 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : isEditing ? 'Update Price' : 'Create Price'}
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
