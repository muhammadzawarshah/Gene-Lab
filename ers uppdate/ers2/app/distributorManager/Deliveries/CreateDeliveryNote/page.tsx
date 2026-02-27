"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { 
  Save, Loader2, Search, ChevronDown, 
  ShoppingBag, User, Package, List,
  Trash2, Plus, X, Home
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function FullSaleOrderManagement() {
  const authToken = Cookies.get('auth_token');

  // --- DATA STATES ---
  const [saleOrders, setSaleOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedSO, setSelectedSO] = useState<any>(null);
  
  // UI States
  const [isSoOpen, setIsSoOpen] = useState(false);
  const [isWhOpen, setIsWhOpen] = useState(false);
  const [soSearch, setSoSearch] = useState("");
  const [whSearch, setWhSearch] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  // --- EDITABLE FORM STATE ---
  const [formData, setFormData] = useState<any>({
    distributorName: '',
    orderDate: '',
    status: 'pending',
    remarks: '',
    warehouse_id: '', 
    products: [] 
  });

  const soRef = useRef<HTMLDivElement>(null);
  const whRef = useRef<HTMLDivElement>(null);

  // --- 1. SEARCH LOGICS ---
  const filteredOrders = useMemo(() => {
    if (!soSearch.trim()) return saleOrders;
    return saleOrders.filter(order => 
      order.so_id?.toString().toLowerCase().includes(soSearch.toLowerCase()) || 
      order.party?.name?.toLowerCase().includes(soSearch.toLowerCase())
    );
  }, [soSearch, saleOrders]);

  const filteredWarehouses = useMemo(() => {
    if (!whSearch.trim()) return warehouses;
    return warehouses.filter(wh => 
      wh.name?.toLowerCase().includes(whSearch.toLowerCase())
    );
  }, [whSearch, warehouses]);

  // Outside click logic
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (soRef.current && !soRef.current.contains(e.target as Node)) setIsSoOpen(false);
      if (whRef.current && !whRef.current.contains(e.target as Node)) setIsWhOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // --- 2. INITIAL FETCH ---
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/distribution/listsale`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        console.log(res.data.data)
        setSaleOrders(res.data.data || []);
      } catch (err) {
        toast.error("Orders load karne mein masla hua");
      }
    };
    if (authToken) fetchOrders();
  }, [authToken]);

  // --- 3. WAREHOUSE FETCH ---
  const fetchWarehouses = async () => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/warehouse/list`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setWarehouses(res.data.data || []);
    } catch (err) {
      toast.error("Warehouse list nahi mil saki");
    }
  };

  // --- 4. LOAD SELECTED ORDER DETAILS ---
  const handleSOSelection = async (so: any) => {
    setSelectedSO(so);
    setIsSoOpen(false);
    setSoSearch(""); 
    setIsFetching(true);
    
    try {
      const [orderRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/distribution/sales/${so.so_id}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        }),
        fetchWarehouses()
      ]);
      
      const backendData = orderRes.data.data; 
      
      setFormData({
        distributorName: backendData.party?.name || '',
        orderDate: backendData.order_date ? backendData.order_date.split('T')[0] : '',
        status: backendData.status?.toLowerCase() || 'pending',
        remarks: backendData.remarks || '',
        warehouse_id: '', 
        products: (backendData.salesorderline || []).map((line: any) => ({
          id: line.so_line_id || Math.random(),
          productName: line.product?.name || 'Unknown Product',
          quantity: Number(line.quantity) || 0,
          price: Number(line.unit_price) || 0
        }))
      });
    } catch (err) {
      toast.error("Data load karne mein masla hua");
    } finally {
      setIsFetching(false);
    }
  };

  // --- 5. TABLE ACTIONS ---
  const handleProductChange = (index: number, field: string, value: any) => {
    const updated = [...formData.products];
    updated[index][field] = value;
    setFormData({ ...formData, products: updated });
  };

  const addNewRow = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { id: Date.now(), productName: '', quantity: 1, price: 0 }]
    });
  };

  const removeRow = (index: number) => {
    const updated = formData.products.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, products: updated });
  };

  const grandTotal = formData.products.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0);

  // --- 6. FINAL SUBMIT ---
  const handleSubmit = async () => {
    if (!selectedSO) return toast.error("Pehle order select karein");
    if (!formData.warehouse_id) return toast.error("Pehle warehouse select karein");
    
    const tId = toast.loading("Saving changes & Dispatching...");
    
    const finalPayload = {
      orderId: selectedSO.so_id,
      ...formData,
      totalAmount: grandTotal
    };

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/distribution/deliveries/${selectedSO.so_id}`, 
        finalPayload, 
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      toast.success("Order & Warehouse Synced Successfully!", { id: tId });
      setSelectedSO(null); 
      setFormData({ distributorName: '', orderDate: '', status: 'pending', remarks: '', warehouse_id: '', products: [] });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Submission Failed!", { id: tId });
    }
  };

  const labelClass = "text-[10px] font-black text-slate-500 uppercase mb-2 block ml-2 tracking-widest";
  const inputStyle = "bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none w-full text-sm transition-all";

  // Helper to find warehouse name safely
  const selectedWarehouseName = warehouses.find(w => (w.id === formData.warehouse_id || w.warehouse_id === formData.warehouse_id))?.name;

  return (
    <div className="text-slate-300 p-4 md:p-12 font-sans">
      <Toaster richColors theme="dark" position="top-center" />

      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <header className="flex items-center gap-6 mb-12 border-b border-white/5 pb-10">
          <div className="bg-emerald-600 p-4 rounded-2xl shadow-xl shadow-emerald-500/20">
            <ShoppingBag className="text-white" size={28} />
          </div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter uppercase">SALE <span className="text-emerald-500">INVOICE MANAGER</span></h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* --- STEP 1: ORDER SELECTION --- */}
            <div className="relative" ref={soRef}>
            <label className={labelClass}>Step 1: Select Sale Order</label>
            <div 
                onClick={() => setIsSoOpen(!isSoOpen)}
                className={`w-full bg-[#0f172a] border ${isSoOpen ? 'border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : 'border-slate-800'} rounded-2xl py-5 px-6 flex justify-between items-center text-white cursor-pointer transition-all`}
            >
                <div className="flex items-center gap-4">
                <List className={selectedSO ? "text-emerald-500" : "text-slate-600"} size={20} />
                <span className={selectedSO ? "text-lg font-black italic text-emerald-400" : "text-slate-500"}>
                    {selectedSO ? `ORDER #${selectedSO.so_id}` : "Select Order..."}
                </span>
                </div>
                <ChevronDown size={20} className={isSoOpen ? "rotate-180 text-emerald-500" : "text-slate-600"} />
            </div>

            {isSoOpen && (
                <div className="absolute z-[999] mt-2 w-full bg-[#1e293b] border border-slate-700 rounded-2xl shadow-3xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-4 bg-black/40 border-b border-white/5">
                    <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                    <input 
                        autoFocus
                        className="w-full bg-slate-800/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:ring-1 ring-emerald-500"
                        placeholder="Search Order..."
                        value={soSearch}
                        onChange={(e) => setSoSearch(e.target.value)}
                    />
                    </div>
                </div>
                <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-emerald-600">
                    {filteredOrders.length > 0 ? filteredOrders.map((so) => (
                    <div key={so.so_id} onClick={() => handleSOSelection(so)} className="px-6 py-4 hover:bg-emerald-600 group cursor-pointer border-b border-white/5 last:border-none transition-colors flex justify-between items-center">
                        <div>
                        <p className="font-black text-slate-200 group-hover:text-white uppercase tracking-tight">#{so.so_id}</p>
                        <p className="text-[10px] text-slate-500 group-hover:text-emerald-100 font-bold">{so.party?.name || 'Walk-in'}</p>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 group-hover:text-white">{so.order_date?.split('T')[0]}</div>
                    </div>
                    )) : <div className="p-10 text-center text-slate-500 text-sm">No orders found</div>}
                </div>
                </div>
            )}
            </div>

            {/* --- STEP 2: WAREHOUSE SELECTION --- */}
            <div className={`relative transition-all duration-500 ${selectedSO ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`} ref={whRef}>
            <label className={labelClass}>Step 2: Assign Warehouse</label>
            <div 
                onClick={() => setIsWhOpen(!isWhOpen)}
                className={`w-full bg-[#0f172a] border ${isWhOpen ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.1)]' : 'border-slate-800'} rounded-2xl py-5 px-6 flex justify-between items-center text-white cursor-pointer transition-all`}
            >
                <div className="flex items-center gap-4">
                <Home className={formData.warehouse_id ? "text-amber-500" : "text-slate-600"} size={20} />
                <span className={formData.warehouse_id ? "text-lg font-black italic text-amber-400" : "text-slate-500"}>
                    {formData.warehouse_id ? selectedWarehouseName?.toUpperCase() : "Select Warehouse..."}
                </span>
                </div>
                <ChevronDown size={20} className={isWhOpen ? "rotate-180 text-amber-500" : "text-slate-600"} />
            </div>

            {isWhOpen && (
                <div className="absolute z-[999] mt-2 w-full bg-[#1e293b] border border-slate-700 rounded-2xl shadow-3xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                <div className="p-4 bg-black/40 border-b border-white/5">
                    <div className="relative">
                    <Search className="absolute left-3 top-2.5 text-slate-500" size={16} />
                    <input 
                        autoFocus
                        className="w-full bg-slate-800/50 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:ring-1 ring-amber-500"
                        placeholder="Search Warehouse..."
                        value={whSearch}
                        onChange={(e) => setWhSearch(e.target.value)}
                    />
                    </div>
                </div>
                <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-amber-600">
                    {filteredWarehouses.length > 0 ? filteredWarehouses.map((wh) => (
                    <div key={wh.id || wh.warehouse_id} onClick={() => { setFormData({...formData, warehouse_id: wh.id || wh.warehouse_id}); setIsWhOpen(false); }} className="px-6 py-4 hover:bg-amber-600 group cursor-pointer border-b border-white/5 last:border-none transition-colors">
                        <p className="font-black text-slate-200 group-hover:text-white uppercase tracking-tight">{wh.name}</p>
                        <p className="text-[10px] text-slate-500 group-hover:text-amber-100 font-bold">{wh.location || 'Main Storage'}</p>
                    </div>
                    )) : <div className="p-10 text-center text-slate-500 text-sm">No warehouses found</div>}
                </div>
                </div>
            )}
            </div>
        </div>

        {/* --- STEP 3: EDITABLE CONTENT --- */}
        {isFetching ? (
          <div className="py-20 flex flex-col items-center"><Loader2 className="animate-spin text-emerald-500 mb-4" size={40} /><p className="text-xs font-black uppercase text-slate-600 tracking-widest">Loading Order & Inventory...</p></div>
        ) : selectedSO && (
          <div className="space-y-10 animate-in zoom-in-95 duration-500">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5">
              <div className="space-y-2">
                <label className={labelClass}>Distributor Entity</label>
                <div className="relative">
                    <User className="absolute left-4 top-3.5 text-slate-600" size={16} />
                    <input className={`${inputStyle} pl-12`} value={formData.distributorName} onChange={(e) => setFormData({...formData, distributorName: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Registry Date</label>
                <input type="date" className={inputStyle} value={formData.orderDate} onChange={(e) => setFormData({...formData, orderDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className={labelClass}>Status</label>
                <select className={inputStyle + " font-bold uppercase"} value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="dispatched">Dispatched</option>
                </select>
              </div>
            </div>

            <div className="bg-[#0f172a]/40 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="px-10 py-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <h2 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center gap-2">
                  <Package className="text-emerald-500" size={16} /> Line Items adjustment
                </h2>
                <button type="button" onClick={addNewRow} className="bg-emerald-600 text-[10px] font-black px-5 py-2.5 rounded-full uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500 transition-all">
                  <Plus size={14} /> Add Manual Product
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-black/20 border-b border-white/5">
                      <th className="px-10 py-5">Product Details</th>
                      <th className="px-10 py-5 w-32 text-center">Quantity</th>
                      <th className="px-10 py-5 w-48 text-center">Price (PKR)</th>
                      <th className="px-10 py-5 text-right">Subtotal</th>
                      <th className="px-10 py-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {formData.products.map((item: any, idx: number) => (
                      <tr key={item.id} className="hover:bg-white/[0.01] transition-colors">
                        <td className="px-10 py-4">
                          <input className="bg-transparent border-b border-slate-800 focus:border-emerald-500 outline-none w-full text-sm text-slate-200 font-bold" value={item.productName} onChange={(e) => handleProductChange(idx, 'productName', e.target.value)} placeholder="Product name..." />
                        </td>
                        <td className="px-10 py-4">
                          <input type="number" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 w-full text-emerald-400 font-mono text-center font-bold outline-none focus:border-emerald-500" value={item.quantity} onChange={(e) => handleProductChange(idx, 'quantity', Number(e.target.value))} />
                        </td>
                        <td className="px-10 py-4">
                          <input type="number" className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 w-full text-slate-300 font-mono text-center outline-none focus:border-emerald-500" value={item.price} onChange={(e) => handleProductChange(idx, 'price', Number(e.target.value))} />
                        </td>
                        <td className="px-10 py-4 text-right font-mono text-white font-black italic tracking-tighter">
                          PKR {(item.quantity * item.price).toLocaleString()}
                        </td>
                        <td className="px-10 py-4 text-center">
                          <button type="button" onClick={() => removeRow(idx)} className="text-slate-700 hover:text-red-500 transition-colors p-2">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-emerald-600/5">
                      <td colSpan={3} className="px-10 py-8 text-right text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Final Adjusted Total</td>
                      <td className="px-10 py-8 text-right font-mono text-4xl font-black text-white italic tracking-tighter leading-none">
                        PKR {grandTotal.toLocaleString()}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-end gap-10">
              <div className="w-full md:flex-1 space-y-2">
                <label className={labelClass}>Dispatch Remarks</label>
                <textarea rows={3} className="w-full bg-[#0f172a] border border-slate-800 rounded-[2rem] p-6 text-sm outline-none focus:border-emerald-500 resize-none transition-all" placeholder="Any warehouse or delivery instructions?" value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} />
              </div>
              <button 
                onClick={handleSubmit}
                className="w-full md:w-auto bg-white text-black px-16 py-7 rounded-[2.5rem] font-black text-xs uppercase tracking-[0.5em] hover:bg-emerald-600 hover:text-white transition-all shadow-2xl active:scale-95 flex items-center gap-3"
              >
                <Save size={20} /> SYNC & FINALIZE
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}