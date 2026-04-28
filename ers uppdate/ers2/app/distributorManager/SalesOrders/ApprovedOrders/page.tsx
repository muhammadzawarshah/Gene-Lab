"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'sonner';
import {
  Edit3, X, Search, Save, User, Eye, Info, Hash, Calendar, DollarSign, Tag, ArrowRightLeft, ShoppingBag, CheckCircle2
} from 'lucide-react';
import { InvoiceComponent } from '@/components/layout/InvoiceComponent';

// --- TYPES ---
interface OrderItem {
  so_line_id: number;
  product: { name: string; id?: any };
  quantity: any;
  unit_price: any;
  line_total: any;
  product_id: string;
}

interface Order {
  so_id: number;
  party: { name: string };
  salesorderline: OrderItem[];
  status: string;
  total_amount: any;
  order_date: string;
  party_id_customer: string;
}

export default function ApprovedOrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [editForm, setEditForm] = useState<{
    so_id: number;
    so_line_id: number;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
    status: string;
  } | null>(null);

  const token = Cookies.get('auth_token');
  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  const safeNum = (val: any): number => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  // --- FETCH DATA ---
  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [orderRes, catRes, prodRes] = await Promise.all([
        axios.get(`${API_BASE}/api/v1/distribution/listsale`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE}/api/v1/distribution/categories`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } })),
        axios.get(`${API_BASE}/api/v1/distribution/products`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => ({ data: { data: [] } }))
      ]);
      setOrders(Array.isArray(orderRes.data.data) ? orderRes.data.data : []);
      setCategories(Array.isArray(catRes.data.data) ? catRes.data.data : []);
      setProducts(Array.isArray(prodRes.data.data) ? prodRes.data.data : []);
    } catch (err: any) {
      toast.error("Sync error. Please check your connection.");
    }
  }, [token, API_BASE]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- OPEN EDIT MODAL ---
  const openEditModal = (order: Order, item: OrderItem) => {
    setEditForm({
      so_id: order.so_id,
      so_line_id: item.so_line_id,
      product_id: item.product_id,
      product_name: item.product?.name,
      quantity: safeNum(item.quantity),
      unit_price: safeNum(item.unit_price),
      line_total: safeNum(item.line_total),
      status: order.status
    });
    setIsEditOpen(true);
  };

  // --- SAVE ACTION ---
  const handleEditSave = async () => {
    if (!editForm || !token) return;
    const toastId = toast.loading("Updating Approved Order...");

    try {
      const payload = {
        so_id: editForm.so_id,
        so_line_id: editForm.so_line_id,
        product_id: editForm.product_id,
        quantity: editForm.quantity,
        unit_price: editForm.unit_price,
        line_total: editForm.line_total,
        status: editForm.status
      };

      await axios.put(`${API_BASE}/api/v1/distribution/sales/${editForm.so_id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Order Synced Successfully", { id: toastId });
      setIsEditOpen(false);
      fetchData();
    } catch (err) {
      toast.error("Failed to update status.", { id: toastId });
    }
  };

  // --- FILTER: ONLY APPROVED ITEMS ---
  const filteredOrders = useMemo(() => {
    return orders.filter(o =>
      ['APPROVED', 'PARTIAL', 'COMPLETED'].includes(o.status) &&
      (statusFilter === 'ALL' || o.status === statusFilter) &&
      (o.party?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.salesorderline.some(i => i.product?.name?.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }, [orders, searchQuery, statusFilter]);

  const thStyle = "p-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10 italic";
  const tdStyle = "p-4 text-xs font-medium text-white border-b border-white/5";

  return (
    <div className="text-white p-6 font-sans">
      <Toaster position="top-right" theme="dark" richColors />

      {/* HEADER (Same UI/UX) */}
      <div className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-6">
          <div className="h-14 w-1.5 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">Approved <span className="text-emerald-500 text-5xl">Orders</span></h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">Verified & Processed Inventory</p>
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              placeholder="Search approved records..."
              className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm outline-none focus:border-emerald-500 transition-all shadow-inner backdrop-blur-md"
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {[
              { label: 'All', value: 'ALL', color: 'slate' },
              { label: 'Approved', value: 'APPROVED', color: 'emerald' },
              { label: 'Partial', value: 'PARTIAL', color: 'amber' },
              { label: 'Completed', value: 'COMPLETED', color: 'blue' },
            ].map(({ label, value, color }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                  statusFilter === value
                    ? color === 'emerald' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : color === 'amber'   ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : color === 'blue'    ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                    : 'bg-white/10 text-white border-white/20'
                    : 'bg-transparent text-slate-500 border-white/5 hover:border-white/20'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TABLE (Same Columns) */}
      <div className="bg-slate-900/30 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-md shadow-2xl animate-in fade-in duration-500">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="p-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10">Ref#</th>
                <th className={thStyle}>Customer</th>
                <th className={thStyle}>Product</th>
                <th className={thStyle}>Status</th>
                <th className={thStyle + " text-center"}>Qty</th>
                <th className={thStyle + " text-right"}>Rate</th>
                <th className={thStyle + " text-right"}>Total Amount</th>
                <th className="p-4 text-center text-[10px] font-black text-slate-500 uppercase border-b border-white/10">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.flatMap((order) => order.salesorderline.map((item, idx) => (
                <tr key={`${order.so_id}-${idx}`} className="hover:bg-emerald-500/[0.02] transition-colors group">
                  <td className="p-4 text-center text-emerald-500/50 font-mono text-xs font-bold italic">#{order.so_id}</td>
                  <td className={tdStyle}>
                    <div className="flex items-center gap-2 text-slate-300 font-bold">
                      <User size={12} className="text-slate-500" />
                      {order.party?.name}
                    </div>
                  </td>
                  <td className={tdStyle}>
                    <div className="flex items-center gap-2 italic">
                      <ShoppingBag size={12} className="text-slate-500" />
                      {item.product?.name}
                    </div>
                  </td>
                  <td className={tdStyle}>
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black uppercase border ${
                      order.status === 'COMPLETED'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : order.status === 'PARTIAL'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                    }`}>
                      <CheckCircle2 size={10} /> {order.status}
                    </span>
                  </td>
                  <td className={tdStyle + " text-center font-bold"}>{item.quantity}</td>
                  <td className={tdStyle + " text-right font-mono text-blue-400"}>{safeNum(item.unit_price).toLocaleString()}</td>
                  <td className={tdStyle + " text-right font-black text-emerald-400 italic"}>PKR {safeNum(item.line_total).toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => openEditModal(order, item)} className="p-2.5 bg-white/5 hover:bg-emerald-600 text-slate-400 hover:text-white rounded-xl transition-all active:scale-90 border border-white/5"><Edit3 size={15} /></button>
                      <button onClick={() => { setSelectedOrder(order); setIsViewOpen(true); }} className="p-2.5 bg-white/5 hover:bg-emerald-500 text-slate-400 hover:text-black rounded-xl transition-all active:scale-90 border border-white/5"><Eye size={15} /></button>
                    </div>
                  </td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT MODAL (Same Logic) */}
      {isEditOpen && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden shadow-emerald-500/5">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                  <ArrowRightLeft className="text-emerald-500" size={20} />
                </div>
                <h3 className="text-xl font-black italic uppercase">Manage <span className="text-emerald-500">Approved Line</span></h3>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-slate-500 hover:text-white transition-all"><X size={20} /></button>
            </div>

            <div className="p-10 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Current Status</label>
                  <select
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-emerald-500 font-bold text-xs uppercase cursor-pointer"
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="APPROVED">APPROVED</option>
                    <option value="DRAFT">DRAFT</option>
                    <option value="PENDING">PENDING</option>
                    <option value="CANCELLED">CANCELLED</option>
                    {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Quantity</label>
                  <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-emerald-500 font-mono text-lg"
                    value={editForm.quantity} onChange={(e) => { const q = safeNum(e.target.value); setEditForm({ ...editForm, quantity: q, line_total: q * editForm.unit_price }); }} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Unit Rate</label>
                  <input type="number" className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-emerald-500 font-mono text-lg"
                    value={editForm.unit_price} onChange={(e) => { const r = safeNum(e.target.value); setEditForm({ ...editForm, unit_price: r, line_total: editForm.quantity * r }); }} />
                </div>
              </div>

              <div className="p-8 bg-gradient-to-r from-emerald-500/10 to-transparent rounded-[2rem] border border-emerald-500/20 flex justify-between items-center">
                <span className="text-[11px] font-black text-emerald-500 uppercase flex items-center gap-2"><DollarSign size={14} /> Final Value</span>
                <span className="font-mono font-bold text-3xl text-white italic">PKR {safeNum(editForm.line_total).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-8 border-t border-white/5 flex gap-4 bg-white/[0.01]">
              <button onClick={() => setIsEditOpen(false)} className="flex-1 py-5 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">Discard</button>
              <button onClick={handleEditSave} className="flex-[2] py-5 bg-emerald-500 hover:bg-emerald-600 rounded-2xl text-black text-[10px] font-black uppercase flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-emerald-500/20">
                <Save size={18} /> Update Approved Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {isViewOpen && selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl relative">

            {/* Modal Toolbar (Sticky) */}
            <div className="sticky top-0 z-10 p-4 bg-slate-900 flex justify-between items-center rounded-t-[2rem]">
              <h3 className="text-white font-black italic uppercase ml-4">Invoice Preview</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => window.print()}
                  className="px-6 py-2 bg-emerald-500 text-black text-[10px] font-black uppercase rounded-xl hover:bg-emerald-400 transition-all"
                >
                  Print PDF
                </button>
                <button
                  onClick={() => setIsViewOpen(false)}
                  className="p-2 bg-white/10 text-white rounded-full hover:bg-red-500 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Invoice Content Area */}
            <div className="p-6 bg-gray-100 rounded-b-[2rem]">
              <div id="printable-area">
                {/* YAHAN HUM COMPONENT CALL KAR RAHE HAIN */}
                <InvoiceComponent order={selectedOrder} />
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
  return (
    <div className="space-y-2 group">
      <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">
        {icon} {label}
      </div>
      <div className="text-sm font-bold text-white border-l-2 border-white/5 pl-4 py-1 group-hover:border-emerald-500 transition-all">{value || "N/A"}</div>
    </div>
  )
}