"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { 
  Save, Loader2, Search, ChevronDown, 
  ShoppingBag, User, Package, List,
  Trash2, Plus, X, Home, Calendar, Hash,
  Tag, Truck
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
  interface FormData {
    distributorName: string;
    orderDate: string;
    status: string;
    remarks: string;
    warehouse_id: string;
    discount: number;
    transportCharges: number;
    products: any[];
  }

  const [formData, setFormData] = useState<FormData>({
    distributorName: '',
    orderDate: '',
    status: 'pending',
    remarks: '',
    warehouse_id: '', 
    discount: 0,
    transportCharges: 0,
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
    return warehouses.filter(wh => wh.name?.toLowerCase().includes(whSearch.toLowerCase()));
  }, [whSearch, warehouses]);

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
        setSaleOrders(res.data.data || []);
      } catch (err) {
        toast.error("Orders load karne mein masla hua");
      }
    };
    if (authToken) fetchOrders();
  }, [authToken]);

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

  // --- 3. BATCH FETCHING LOGIC ---
  const fetchBatchesForProduct = async (index: number) => {
  // 1. Sirf specific index waale product ki loading true karein
  setFormData((prev: FormData) => {
    const updatedProducts = [...prev.products];
    updatedProducts[index] = { ...updatedProducts[index], isBatchLoading: true };
    return { ...prev, products: updatedProducts };
  });

  try {
    const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/setup-data`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log(res.data.data)
    // API se batches nikaalein
    const batches = res.data.data.batch || [];

    // 2. State update karein: Batches ko list mein daalein aur loading khatam karein
    setFormData((prev: FormData) => {
      const latestProducts = [...prev.products];
      latestProducts[index] = { 
        ...latestProducts[index], 
        batchOptions: batches, 
        isBatchLoading: false 
      };
      return { ...prev, products: latestProducts };
    });

  } catch (err) {
    // 3. Error ki surat mein loading band karein
    setFormData((prev: FormData) => {
      const latestProducts = [...prev.products];
      latestProducts[index] = { ...latestProducts[index], isBatchLoading: false };
      return { ...prev, products: latestProducts };
    });
    console.error("Fetch Error:", err);
    toast.error("Batch list load nahi ho saki");
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
      console.log(orderRes.data)
      const backendData = orderRes.data.data; 
      const productsWithBatches = (backendData.salesorderline || []).map((line: any) => ({
        id: line.so_line_id || Math.random(),
        product_id:line.product_id,
        productName: line.product?.name || 'Unknown Product',
        quantity: Number(line.quantity) || 0,
        price: Number(line.unit_price) || 0,
        batch: line.batch_number || '',
        expiry: line.expiry_date ? line.expiry_date.split('T')[0] : '',
        mfg: line.mfg_date ? line.mfg_date.split('T')[0] : '',
        batchOptions: [],
        isBatchLoading: false
      }));

      setFormData({
        distributorName: backendData.party?.name || '',
        orderDate: backendData.order_date ? backendData.order_date.split('T')[0] : '',
        status: backendData.status?.toLowerCase() || 'pending',
        remarks: backendData.remarks || '',
        warehouse_id: '', 
        discount: Number(backendData.discount) || 0,
        transportCharges: Number(backendData.transport_charges) || 0,
        products: productsWithBatches
      });

      // Fetch initial batches for all products
      productsWithBatches.forEach((p: any, idx: number) => {
        fetchBatchesForProduct(idx);
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

    // Agar batch select kiya hai to details auto-fill karein
    if (field === 'batch') {
      const selectedBatchObj = updated[index].batchOptions?.find((b: any) => b.batch_number === value);
      if (selectedBatchObj) {
        updated[index].expiry = selectedBatchObj.expiry_date ? selectedBatchObj.expiry_date.split('T')[0] : '';
        updated[index].mfg = selectedBatchObj.mfg_date ? selectedBatchObj.mfg_date.split('T')[0] : '';
      }
    }

    setFormData({ ...formData, products: updated });

    // Agar product name change hua to naye batches layein
    if (field === 'productName') {
      fetchBatchesForProduct(index);
    }
  };

  const addNewRow = () => {
    setFormData({
      ...formData,
      products: [...formData.products, { id: Date.now(), productName: '', quantity: 1, price: 0, batch: '', expiry: '', mfg: '', batchOptions: [], isBatchLoading: false }]
    });
  };

  const removeRow = (index: number) => {
    const updated = formData.products.filter((_: any, i: number) => i !== index);
    setFormData({ ...formData, products: updated });
  };

  const lineItemsTotal = formData.products.reduce((sum: number, item: any) => sum + (item.quantity * item.price), 0);
// Discount ko percentage samajh kar calculate karein
const discountPercent = Number(formData.discount) || 0;
const transport = Number(formData.transportCharges) || 0;

// Step 1: Discount amount nikalain (Total ka X percentage)
const discountAmount = (lineItemsTotal * discountPercent) / 100;

// Step 2: Final Grand Total
const grandTotal = (lineItemsTotal - discountAmount) + transport;

  const handleSubmit = async () => {
    if (!selectedSO) return toast.error("Pehle order select karein");
    if (!formData.warehouse_id) return toast.error("Pehle warehouse select karein");
    
    const tId = toast.loading("Saving changes & Dispatching...");
    const finalPayload = { orderId: selectedSO.so_id, ...formData, totalAmount: grandTotal };

    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/distribution/deliveries/${selectedSO.so_id}`, finalPayload, { headers: { Authorization: `Bearer ${authToken}` } });
      toast.success("Order Synced Successfully!", { id: tId });
      setSelectedSO(null); 
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Submission Failed!", { id: tId });
    }
  };

  const labelClass = "text-[10px] font-black text-slate-500 uppercase mb-2 block ml-2 tracking-widest";
  const inputStyle = "bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-white focus:border-emerald-500 outline-none w-full text-sm transition-all";

  return (
    <div className="text-slate-300 p-4 md:p-8 font-sans">
      <Toaster richColors theme="dark" position="top-center" />
      <div className="max-w-[1400px] mx-auto">
        <header className="flex items-center gap-6 mb-12 border-b border-white/5 pb-10">
          <div className="bg-emerald-600 p-4 rounded-2xl"><ShoppingBag className="text-white" size={28} /></div>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">SALE <span className="text-emerald-500">INVOICE MANAGER</span></h1>
        </header>

        {/* STEP 1 & 2: SELECTIONS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="relative" ref={soRef}>
                <label className={labelClass}>Step 1: Select Sale Order</label>
                <div onClick={() => setIsSoOpen(!isSoOpen)} className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl py-5 px-6 flex justify-between items-center text-white cursor-pointer">
                    <div className="flex items-center gap-4">
                        <List className={selectedSO ? "text-emerald-500" : "text-slate-600"} size={20} />
                        <span className="text-lg font-black italic">{selectedSO ? `ORDER #${selectedSO.so_id}` : "Select Order..."}</span>
                    </div>
                    <ChevronDown size={20} />
                </div>
                {isSoOpen && (
                    <div className="absolute z-[999] mt-2 w-full bg-[#1e293b] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-4 bg-black/40"><input className="w-full bg-slate-800 rounded-xl py-2 px-4 text-sm outline-none" placeholder="Search..." value={soSearch} onChange={(e) => setSoSearch(e.target.value)} /></div>
                        <div className="max-h-60 overflow-y-auto">
                            {filteredOrders.map((so) => (
                                <div key={so.so_id} onClick={() => handleSOSelection(so)} className="px-6 py-4 hover:bg-emerald-600 cursor-pointer border-b border-white/5 flex justify-between">
                                    <span className="font-bold">#{so.so_id} - {so.party?.name || 'Walk-in'}</span>
                                    <span className="text-[10px] opacity-50">{so.order_date?.split('T')[0]}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className={`relative ${selectedSO ? 'opacity-100' : 'opacity-30 pointer-events-none'}`} ref={whRef}>
                <label className={labelClass}>Step 2: Assign Warehouse</label>
                <div onClick={() => setIsWhOpen(!isWhOpen)} className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl py-5 px-6 flex justify-between items-center text-white cursor-pointer">
                    <div className="flex items-center gap-4">
                        <Home className="text-amber-500" size={20} />
                        <span className="text-lg font-black italic">{formData.warehouse_id ? warehouses.find(w => (w.id || w.warehouse_id) === formData.warehouse_id)?.name?.toUpperCase() : "Select Warehouse..."}</span>
                    </div>
                    <ChevronDown size={20} />
                </div>
                {isWhOpen && (
                    <div className="absolute z-[999] mt-2 w-full bg-[#1e293b] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="max-h-60 overflow-y-auto">
                            {filteredWarehouses.map((wh) => (
                                <div key={wh.id || wh.warehouse_id} onClick={() => { setFormData({...formData, warehouse_id: wh.id || wh.warehouse_id}); setIsWhOpen(false); }} className="px-6 py-4 hover:bg-amber-600 cursor-pointer border-b border-white/5">
                                    <p className="font-bold uppercase">{wh.name}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>

        {isFetching ? (
          <div className="py-20 flex flex-col items-center"><Loader2 className="animate-spin text-emerald-500 mb-4" size={40} /><p className="text-xs font-black uppercase tracking-widest">Fetching Order Details...</p></div>
        ) : selectedSO && (
          <div className="space-y-10">
            {/* ITEM TABLE */}
            <div className="bg-[#0f172a]/40 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="px-10 py-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Package size={16} className="text-emerald-500" /> Dispatch Line Items</h2>
                <button onClick={addNewRow} className="bg-emerald-600 text-[10px] font-black px-5 py-2.5 rounded-full uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500 transition-all"><Plus size={14} /> Add Product</button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[1200px]">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-black/20 border-b border-white/5">
                      <th className="px-6 py-5">Product Name</th>
                      <th className="px-6 py-5 w-48 text-amber-500">Batch Number (Select)</th>
                      <th className="px-6 py-5 w-32 text-center">MFG</th>
                      <th className="px-6 py-5 w-32 text-center">Expiry</th>
                      <th className="px-6 py-5 w-24 text-center">Qty</th>
                      <th className="px-6 py-5 w-32 text-center">Unit Price</th>
                      <th className="px-6 py-5 text-right">Subtotal</th>
                      <th className="px-6 py-5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {formData.products.map((item: any, idx: number) => (
                      <tr key={item.product_id} className="hover:bg-white/[0.01]">
                        <td className="px-6 py-4">
                            <input className="bg-transparent border-b border-slate-800 focus:border-emerald-500 outline-none w-full text-sm font-bold" value={item.productName} onChange={(e) => handleProductChange(idx, 'productName', e.target.value)} />
                        </td>
                        <td className="px-4 py-4">
                            <div className="relative">
                                {item.isBatchLoading && <Loader2 size={12} className="absolute right-2 top-3 animate-spin text-emerald-500" />}
                                <select 
                                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 w-full text-xs text-amber-400 font-bold outline-none focus:border-amber-500 appearance-none"
                                    value={item.batch}
                                    onChange={(e) => handleProductChange(idx, 'batch', e.target.value)}
                                >
                                    <option value="">Select Batch</option>
                                    {item.batchOptions?.map((opt: any) => (
                                        <option key={opt.batch_number} value={opt.batch_number}>
                                            {opt.batch_number} ({opt.current_stock || 0} left)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </td>
                        <td className="px-4 py-4 text-center"><span className="text-[11px] font-mono opacity-60 italic">{item.mfg || '---'}</span></td>
                        <td className="px-4 py-4 text-center"><span className={`text-[11px] font-mono font-bold ${item.expiry ? 'text-rose-400' : ''}`}>{item.expiry || '---'}</span></td>
                        <td className="px-4 py-4"><input type="number" className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 w-full text-emerald-400 font-mono text-center outline-none" value={item.quantity} onChange={(e) => handleProductChange(idx, 'quantity', Number(e.target.value))} /></td>
                        <td className="px-4 py-4"><input type="number" className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 w-full text-slate-300 font-mono text-center outline-none" value={item.price} onChange={(e) => handleProductChange(idx, 'price', Number(e.target.value))} /></td>
                        <td className="px-6 py-4 text-right font-mono text-white font-black italic">{(item.quantity * item.price).toLocaleString()}</td>
                        <td className="px-6 py-4 text-center"><button onClick={() => removeRow(idx)} className="text-slate-700 hover:text-red-500 transition-colors"><Trash2 size={18} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* BILLING FOOTER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className={labelClass}>Discount (PKR)</label>
                            <div className="relative"><Tag className="absolute left-4 top-3.5 text-rose-500" size={16} /><input type="number" className={`${inputStyle} pl-12 text-rose-400 font-bold`} value={formData.discount} onChange={(e) => setFormData({...formData, discount: Number(e.target.value)})} /></div>
                        </div>
                        <div className="space-y-2">
                            <label className={labelClass}>Transport (PKR)</label>
                            <div className="relative"><Truck className="absolute left-4 top-3.5 text-blue-500" size={16} /><input type="number" className={`${inputStyle} pl-12 text-blue-400 font-bold`} value={formData.transportCharges} onChange={(e) => setFormData({...formData, transportCharges: Number(e.target.value)})} /></div>
                        </div>
                    </div>
                    <textarea rows={3} className="w-full bg-[#0f172a] border border-slate-800 rounded-[2rem] p-6 text-sm outline-none focus:border-emerald-500" placeholder="Dispatch instructions..." value={formData.remarks} onChange={(e) => setFormData({...formData, remarks: e.target.value})} />
                </div>

                <div className="bg-white/[0.03] border border-white/5 rounded-[3rem] p-10 flex flex-col justify-between">
                    <div className="space-y-4">
                        <div className="flex justify-between text-slate-500 text-xs font-bold uppercase tracking-widest"><span>Subtotal</span><span>PKR {lineItemsTotal.toLocaleString()}</span></div>
                        <div className="flex justify-between text-rose-500 text-xs font-bold uppercase tracking-widest"><span>Discount (-)</span><span>PKR {Number(formData.discount).toLocaleString()}</span></div>
                        <div className="flex justify-between text-blue-400 text-xs font-bold uppercase tracking-widest"><span>Transport (+)</span><span>PKR {Number(formData.transportCharges).toLocaleString()}</span></div>
                        <div className="h-px bg-white/10 my-4"></div>
                        <div className="flex justify-between items-end">
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Total Payable</span>
                            <span className="text-5xl font-black text-white italic tracking-tighter leading-none"><span className="text-sm font-medium opacity-40 mr-2 uppercase">PKR</span>{grandTotal.toLocaleString()}</span>
                        </div>
                    </div>
                    <button onClick={handleSubmit} className="mt-10 w-full bg-emerald-500 text-black py-6 rounded-2xl font-black text-xs tracking-[0.4em] hover:bg-emerald-400 transition-all flex items-center justify-center gap-3">
                        <Save size={18} /> SYNC & FINALIZE ORDER
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}