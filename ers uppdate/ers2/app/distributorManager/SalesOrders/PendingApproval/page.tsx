"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { Toaster, toast } from 'sonner';
import { 
  Edit3, X, Search, Save, User, Eye, Info, Hash, Calendar, DollarSign, Tag, ArrowRightLeft, ShoppingBag
} from 'lucide-react';
import { InvoiceComponent } from '@/components/layout/InvoiceComponent';
import { DataRibbon, EmptyState, PremiumHero, PremiumPage, SearchPanel, StatusPill } from '@/components/ui/premium';
import { printElementById } from '@/lib/printElement';

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
  tp_discount?: any;
  dd_discount?: any;
  other_discount?: any;
  tpDiscount?: any;
  ddDiscount?: any;
  otherDiscount?: any;
  order_date: string;
  party_id_customer: string;
}

export default function SaleOrderManagement() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<any[]>([]); 
  const [categories, setCategories] = useState<any[]>([]); 
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [reportDiscountMode, setReportDiscountMode] = useState<'tp' | 'tp_dd' | 'all' | null>(null);

  // --- FORM STATE ---
  const [editForm, setEditForm] = useState<{
    so_id: number; 
    total_evaluation: number;
    status: string; 
  } | null>(null);

  const token = Cookies.get('auth_token');
  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  const safeNum = (val: any): number => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
  };

  const getOrderEvaluation = (order: Order): number => {
    const orderTotal = safeNum(order.total_amount);
    if (orderTotal > 0) return orderTotal;

    return order.salesorderline.reduce((sum, item) => {
      const lineTotal = safeNum(item.line_total);
      if (lineTotal > 0) return sum + lineTotal;

      return sum + (safeNum(item.quantity) * safeNum(item.unit_price));
    }, 0);
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
  const openEditModal = (order: Order) => {
    setEditForm({
      so_id: order.so_id, 
      total_evaluation: getOrderEvaluation(order),
      status: order.status 
    });
    setIsEditOpen(true);
  };

  // --- SAVE ACTION ---
  const handleEditSave = async () => {
    if (!editForm || !token) return;
    const toastId = toast.loading("Updating Order...");
    
    try {
      const payload = {
        so_id: editForm.so_id,
        status: editForm.status 
      };

      await axios.put(`${API_BASE}/api/v1/distribution/sales/${editForm.so_id}`, payload, { 
        headers: { Authorization: `Bearer ${token}` } 
      });

      toast.success("Order Updated Successfully", { id: toastId });
      setIsEditOpen(false);
      fetchData(); 
    } catch (err) {
      toast.error("Failed to update status. Check API permissions.", { id: toastId });
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => (o.status === 'DRAFT' || o.status === 'PENDING') && 
      (o.party?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
       o.salesorderline.some(i => i.product?.name?.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }, [orders, searchQuery]);

  // Design Helpers
  const thStyle = "p-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10 italic";
  const tdStyle = "p-4 text-xs font-medium text-white border-b border-white/5";

  return (
    <PremiumPage>
      <Toaster position="top-right" theme="light" richColors />

      {/* HEADER */}
      <PremiumHero
        eyebrow="Sales Order Review"
        icon={ShoppingBag}
        title={<>Approval <span className="text-amber-500">Queue</span></>}
        description="Review pending distributor orders, inspect order details, and update approval status without changing the existing workflow."
        meta={<StatusPill tone="amber">{filteredOrders.length} Pending</StatusPill>}
      >
        <DataRibbon
          items={[
            { label: "Orders", value: filteredOrders.length },
            { label: "Products", value: filteredOrders.reduce((sum, order) => sum + order.salesorderline.length, 0) },
            { label: "Total Qty", value: filteredOrders.reduce((sum, order) => sum + order.salesorderline.reduce((inner, item) => inner + safeNum(item.quantity), 0), 0).toLocaleString() },
            { label: "Evaluation", value: `PKR ${filteredOrders.reduce((sum, order) => sum + getOrderEvaluation(order), 0).toLocaleString()}` },
          ]}
        />
      </PremiumHero>

      <SearchPanel
        className="mt-6"
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="Search by customer or product..."
      />

      {/* TABLE WITH ALL COLUMNS */}
      <div className="app-panel mt-6 overflow-hidden rounded-[1.75rem] border border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-white/[0.02]">
                <th className="p-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/10">Ref#</th>
                <th className={thStyle}>Customer</th>
                <th className={thStyle + " text-center"}>Products</th>
                <th className={thStyle}>Status</th> 
                <th className={thStyle + " text-center"}>Qty</th>
                <th className={thStyle + " text-right"}>Total Amount</th>
                <th className="p-4 text-center text-[10px] font-black text-slate-500 uppercase border-b border-white/10">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const totalQty = order.salesorderline.reduce((sum, item) => sum + safeNum(item.quantity), 0);
                const totalEvaluation = getOrderEvaluation(order);

                return (
                <tr key={order.so_id} className="group transition-colors hover:bg-amber-500/[0.04]">
                  <td className="p-4 text-center text-amber-500/50 font-mono text-xs font-bold italic">#{order.so_id}</td>
                  <td className={tdStyle}>
                    <div className="flex items-center gap-2">
                      <User size={12} className="text-slate-500" />
                      {order.party?.name}
                    </div>
                  </td>
                  <td className={tdStyle + " text-center"}>
                    <div className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-[11px] font-black text-amber-400">
                      <ShoppingBag size={13} className="text-slate-500" />
                      {order.salesorderline.length} Products
                    </div>
                  </td>
                  <td className={tdStyle}>
                    <StatusPill tone="amber">{order.status}</StatusPill>
                  </td>
                  <td className={tdStyle + " text-center font-bold"}>{totalQty.toLocaleString()}</td>
                  <td className={tdStyle + " text-right font-black text-emerald-400 italic"}>PKR {totalEvaluation.toLocaleString()}</td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-3">
                      <button onClick={() => openEditModal(order)} className="p-2.5 bg-white/5 hover:bg-blue-600 text-slate-400 hover:text-white rounded-xl transition-all active:scale-90 border border-white/5"><Edit3 size={15}/></button>
                      <button onClick={() => { setSelectedOrder(order); setReportDiscountMode(null); setIsViewOpen(true); }} className="p-2.5 bg-white/5 hover:bg-amber-500 text-slate-400 hover:text-black rounded-xl transition-all active:scale-90 border border-white/5"><Eye size={15}/></button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {filteredOrders.length === 0 && (
            <EmptyState icon={ShoppingBag} title="No pending orders" description="Pending approval queue is clear for the current filters." />
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {isEditOpen && editForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="app-panel w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-white/10 shadow-2xl shadow-amber-500/5">
            <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.45] p-6">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center border border-amber-500/20">
                    <ArrowRightLeft className="text-amber-500" size={20} />
                 </div>
                 <h3 className="text-xl font-black tracking-tight text-white">Modify <span className="text-amber-500">Sale Order</span></h3>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-slate-500 hover:text-white transition-all"><X size={20}/></button>
            </div>
            
            <div className="space-y-8 p-6 md:p-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">SO Number</label>
                    <p className="font-mono text-2xl font-black italic text-amber-400">SO-{editForm.so_id}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900 p-5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Total Evaluation</label>
                    <p className="font-mono text-2xl font-black italic text-emerald-400">PKR {safeNum(editForm.total_evaluation).toLocaleString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block ml-1">Order Status</label>
                    <select 
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-amber-500 font-bold text-xs uppercase cursor-pointer"
                        value={editForm.status}
                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                    >
                        <option value="DRAFT">DRAFT</option>
                        <option value="PENDING">PENDING</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="CANCELLED">CANCELLED</option>
                        {categories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                    </select>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-white/5 flex gap-4 bg-white/[0.01]">
              <button onClick={() => setIsEditOpen(false)} className="flex-1 py-5 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-all">Cancel</button>
              <button onClick={handleEditSave} className="flex-[2] py-5 bg-amber-500 hover:bg-amber-600 rounded-2xl text-black text-[10px] font-black uppercase flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-amber-500/20">
                <Save size={18}/> Commit & Sync Status
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
        <h3 className="text-white font-black italic uppercase ml-4">Select Report Discount</h3>
        <div className="flex gap-4">
          <button 
            onClick={() => printElementById("printable-area", "Sales Order Report")} 
            disabled={!reportDiscountMode}
            className="px-6 py-2 bg-emerald-500 text-black text-[10px] font-black uppercase rounded-xl hover:bg-emerald-400 transition-all"
          >
            Print PDF
          </button>
          <button 
            onClick={() => setIsViewOpen(false)} 
            className="p-2 bg-white/10 text-white rounded-full hover:bg-red-500 transition-all"
          >
            <X size={20}/>
          </button>
        </div>
      </div>

      {/* Invoice Content Area */}
      <div className="p-6 bg-gray-100 rounded-b-[2rem]">
         <div id="printable-area">
            {!reportDiscountMode ? (
              <div className="grid gap-4 p-8 md:grid-cols-3">
                {[
                  { key: 'tp' as const, title: 'Report With TP', desc: 'Sirf TP discount apply hoga.' },
                  { key: 'tp_dd' as const, title: 'Report With TP + DD', desc: 'TP aur DD discount apply honge.' },
                  { key: 'all' as const, title: 'Report With TP + DD + Other', desc: 'Teeno discounts apply honge.' },
                ].map((option) => (
                  <button
                    key={option.key}
                    onClick={() => setReportDiscountMode(option.key)}
                    className="rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-amber-400 hover:shadow-lg"
                  >
                    <p className="text-sm font-black uppercase text-slate-950">{option.title}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-500">{option.desc}</p>
                  </button>
                ))}
              </div>
            ) : (
              <InvoiceComponent order={selectedOrder} discountMode={reportDiscountMode} />
            )}
         </div>
      </div>
      
    </div>
  </div>
)}
    </PremiumPage>
  );
}

function DetailItem({ label, value, icon }: { label: string, value: string, icon: React.ReactNode }) {
    return (
        <div className="space-y-2 group">
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase tracking-widest">
                {icon} {label}
            </div>
            <div className="text-sm font-bold text-white border-l-2 border-white/5 pl-4 py-1 group-hover:border-amber-500 transition-all">{value || "N/A"}</div>
        </div>
    )
}
