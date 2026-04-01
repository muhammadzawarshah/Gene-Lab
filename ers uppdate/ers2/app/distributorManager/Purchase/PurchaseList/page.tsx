"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { 
  Trash2, Loader2, X, Search, ShieldCheck, Calendar, 
  Edit, RefreshCcw, ReceiptText, 
  Clock, Banknote, Filter, PackageCheck, Hash, User, LayoutPanelLeft
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { InvoiceComponent } from '@/components/layout/InvoiceComponent';

export default function PurchaseOrderConsole() {
  const currentUserId = Cookies.get('userId') || 'GUEST_USER';
  const authToken = Cookies.get('auth_token');

  // --- CORE STATES ---
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewDetail, setViewDetail] = useState<any>(null); 
  const [editItem, setEditItem] = useState<any>(null);      

  // --- FILTER STATES ---
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeDates, setActiveDates] = useState({ from: '', to: '' });

  // --- 1. FETCH DATA ---
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/purchase/listpo`, { 
        headers: { Authorization: `Bearer ${authToken}` } 
      });
      console.log(res.data.data)
      const rawPo = res.data.data?.po || [];
      
      const mappedOrders = rawPo.map((item: any) => ({
        ...item,
        id: item.po_id, 
        purchaseNo: item.po_id.toString(), 
        date: item.order_date ? item.order_date.split('T')[0] : '', 
        supplierName: item.party?.name || "Unknown Supplier",
        grossTotal: parseFloat(item.total_amount) || 0,
      }));

      setOrders(mappedOrders);
    } catch (err) {
      toast.error("Registry Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (authToken) fetchData(); }, [authToken]);

  // --- 2. DELETE ACTION ---
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Purge record from system?")) return;
    const tId = toast.loading("Processing purge...");
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/purchase-orders/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setOrders(prev => prev.filter(o => o.id !== id));
      toast.success("Record Deleted", { id: tId });
    } catch (err) {
      toast.error("Action Denied", { id: tId });
    }
  };

  // --- 3. UPDATE ACTION ---
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const tId = toast.loading("Updating Registry...");
    try {
      const updatePayload = {
        po_id: editItem.id,
        order_date: editItem.date,
        status: editItem.status,
        total_amount: editItem.grossTotal.toString(),
        party_name: editItem.supplierName 
      };

      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/purchase/updatepo/${editItem.id}`, 
        updatePayload,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      setOrders(prev => prev.map(o => o.id === editItem.id ? { ...editItem } : o));
      setEditItem(null);
      toast.success("Registry Updated Successfully", { id: tId });
    } catch (err) {
      toast.error("Update Failed", { id: tId });
    }
  };

  // --- 4. FILTER LOGIC ---
  const filteredOrders = useMemo(() => {
    return orders.filter((order: any) => {
      const matchesSearch = order.purchaseNo?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === '' || order.status?.toLowerCase() === statusFilter.toLowerCase();
      const orderDate = new Date(order.date);
      const start = activeDates.from ? new Date(activeDates.from) : null;
      const end = activeDates.to ? new Date(activeDates.to) : null;
      return matchesSearch && matchesStatus && ((!start || orderDate >= start) && (!end || orderDate <= end));
    });
  }, [orders, searchQuery, statusFilter, activeDates]);

  const inputBase = "bg-[#0f172a] border border-slate-800 rounded-xl py-3 px-4 text-[12px] text-white outline-none focus:border-blue-500 transition-all w-full focus:ring-1 focus:ring-blue-500/50";

  return (
    <div className="text-slate-300 p-6 md:p-8 selection:bg-blue-500/30 font-sans">
      <Toaster richColors theme="dark" position="top-right" />

      {/* --- HEADER --- */}
      <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center mb-10 gap-4 border-b border-white/5 pb-8">
        <div className="flex items-center gap-5">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-4 rounded-2xl shadow-2xl shadow-blue-500/20">
            <ShieldCheck size={32} className="text-white"/>
          </div>
          <div>
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">PURCHASE <span className="text-blue-600">CONSOLE</span></h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.4em] uppercase mt-1">OPERATOR_ID: {currentUserId}</p>
          </div>
        </div>
        <button onClick={fetchData} className="p-4 bg-white/5 border border-white/10 rounded-full hover:bg-blue-600 transition-all text-blue-500 hover:text-white cursor-pointer group">
          <RefreshCcw size={20} className={loading ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
        </button>
      </div>

      {/* --- FILTERS --- */}
      <div className="max-w-[1600px] mx-auto mb-10">
        <div className="bg-[#0f172a]/40 border border-white/5 p-6 rounded-[3rem] flex flex-col xl:flex-row items-end gap-6 shadow-2xl backdrop-blur-2xl">
          <div className="w-full xl:w-[450px]">
            <label className="text-[10px] font-black text-slate-500 uppercase mb-3 block ml-2 flex items-center gap-2 italic"><Calendar size={14}/> Timeline Scope</label>
            <div className="flex items-center gap-3">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputBase} />
              <div className="h-[2px] w-6 bg-slate-800" />
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputBase} />
              <button onClick={() => setActiveDates({ from: fromDate, to: toDate })} className="cursor-pointer bg-blue-600 p-3 rounded-xl hover:bg-blue-500 text-white px-8 uppercase text-[11px] font-black transition-all active:scale-95">GO</button>
            </div>
          </div>
          <div className="flex-1 w-full relative">
            <label className="text-[10px] font-black text-slate-500 uppercase mb-3 block ml-2 flex items-center gap-2 italic"><Search size={14}/> Reference Search</label>
            <input type="text" placeholder="Search PO Number..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className={inputBase + " pl-12"} />
            <Search className="absolute left-4 top-[46px] text-slate-600" size={18} />
          </div>
          <div className="w-full xl:w-64">
            <label className="text-[10px] font-black text-slate-500 uppercase mb-3 block ml-2 flex items-center gap-2 italic"><Filter size={14}/> Status Filter</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputBase + " appearance-none cursor-pointer"}>
              <option value="">All Transactions</option>
              <option value="RECIEVED">Received</option>
              <option value="DRAFT">Draft</option>
              <option value="APPROVED">Approved</option>
            </select>
          </div>
        </div>
      </div>

      {/* --- DATA TABLE --- */}
      <div className="max-w-[1600px] mx-auto bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden shadow-3xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/[0.04]">
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">
                <th className="px-10 py-7 text-left">#</th>
                <th className="px-10 py-7 text-left">PO Number</th>
                <th className="px-10 py-7 text-left">Issue Date</th>
                <th className="px-10 py-7 text-left">Supplier</th>
                <th className="px-10 py-7 text-left text-blue-500">Valuation</th>
                <th className="px-10 py-7 text-left">Status</th>
                <th className="px-10 py-7 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr><td colSpan={7} className="py-32 text-center"><Loader2 className="animate-spin mx-auto text-blue-500" size={40}/></td></tr>
              ) : filteredOrders.map((order: any, idx) => (
                <tr key={order.id} onClick={() => setViewDetail(order)} className="group hover:bg-blue-600/[0.06] cursor-pointer transition-all duration-300">
                  <td className="px-10 py-6 text-[11px] text-slate-600 font-mono">{idx + 1}</td>
                  <td className="px-10 py-6 text-sm text-white font-black italic tracking-tight">#{order.purchaseNo}</td>
                  <td className="px-10 py-6 text-sm text-slate-400">
                    {order.date ? new Date(order.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '---'}
                  </td>
                  <td className="px-10 py-6 text-[11px] text-blue-400 font-mono uppercase truncate max-w-[200px]">{order.supplierName}</td>
                  <td className="px-10 py-6 text-sm font-mono text-white font-black">PKR {order.grossTotal?.toLocaleString()}</td>
                  <td className="px-10 py-6">
                    <span className={`text-[9px] font-black uppercase px-4 py-1.5 rounded-full border ${
                      order.status === 'RECIEVED' || order.status === 'APPROVED' ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' : 
                      order.status === 'DRAFT' ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' : 'border-rose-500/40 text-rose-400 bg-rose-500/10'
                    }`}>{order.status}</span>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setEditItem(order); }} className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl hover:bg-blue-500 hover:text-white cursor-pointer transition-all"><Edit size={16} /></button>
                      {/* <button onClick={(e) => handleDelete(e, order.id)} className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white cursor-pointer transition-all"><Trash2 size={16} /></button> */}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- DETAILS MODAL --- */}
      {viewDetail && (
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
                        onClick={() => setViewDetail(null)}
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
                      <InvoiceComponent order={viewDetail} />
                    </div>
                  </div>
      
                </div>
              </div>
            )}

      {/* --- EDIT MODAL (Full Control) --- */}
      {editItem && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4" onClick={() => setEditItem(null)}>
          <div className="bg-[#0f172a] border border-blue-500/30 w-full max-w-xl rounded-[3rem] shadow-3xl overflow-hidden animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center gap-4">
               <div className="bg-blue-600/20 p-3 rounded-2xl text-blue-500"><LayoutPanelLeft size={24}/></div>
               <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">MODIFY_PO <span className="text-blue-600">#{editItem.purchaseNo}</span></h2>
            </div>

            <form onSubmit={handleUpdate} className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Supplier */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Supplier Name</label>
                  <input 
                    type="text" 
                    value={editItem.supplierName} 
                    onChange={(e) => setEditItem({...editItem, supplierName: e.target.value})}
                    className={inputBase}
                    placeholder="Enter Supplier"
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Order Date</label>
                  <input 
                    type="date" 
                    value={editItem.date} 
                    onChange={(e) => setEditItem({...editItem, date: e.target.value})}
                    className={inputBase}
                  />
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Total Amount (PKR)</label>
                  <input 
                    type="number" 
                    value={editItem.grossTotal} 
                    onChange={(e) => setEditItem({...editItem, grossTotal: parseFloat(e.target.value)})}
                    className={inputBase}
                  />
                </div>

                {/* Status */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase ml-1 tracking-widest">Current Status</label>
                  <select 
                    value={editItem.status} 
                    onChange={(e) => setEditItem({...editItem, status: e.target.value})} 
                    className={inputBase + " cursor-pointer appearance-none"}
                  >
                      <option value="DRAFT">DRAFT</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="RECIEVED">RECEIVED</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-8">
                <button type="submit" className="flex-1 bg-blue-600 py-5 rounded-2xl text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-500 cursor-pointer shadow-lg transition-all active:scale-95">SYNC CHANGES</button>
                <button type="button" onClick={() => setEditItem(null)} className="px-10 py-5 bg-white/5 text-slate-500 rounded-2xl text-[11px] font-black uppercase cursor-pointer hover:bg-white/10 transition-all border border-white/5">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}