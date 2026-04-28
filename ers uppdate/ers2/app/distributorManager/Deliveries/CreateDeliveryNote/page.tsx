"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
  Save, Loader2, ChevronDown,
  ShoppingBag, Package, List, Home, Truck, AlertTriangle
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function CreateDeliveryNote() {
  const authToken = Cookies.get('auth_token');

  const [saleOrders, setSaleOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedSO, setSelectedSO] = useState<any>(null);

  const [isSoOpen, setIsSoOpen] = useState(false);
  const [isWhOpen, setIsWhOpen] = useState(false);
  const [soSearch, setSoSearch] = useState("");
  const [isFetching, setIsFetching] = useState(false);

  interface DeliveryRow {
    so_line_id: number;
    product_id: string;
    productName: string;
    orderedQty: number;
    deliveredQty: number;
    remainingQty: number;
    quantity: number;
    sale_price: number;
    selected_batch_id: string;
  }

  interface FormData {
    distributorName: string;
    orderDate: string;
    status: string;
    remarks: string;
    warehouse_id: string;
    transportCharges: number;
    products: DeliveryRow[];
  }

  const [formData, setFormData] = useState<FormData>({
    distributorName: '',
    orderDate: '',
    status: 'pending',
    remarks: '',
    warehouse_id: '',
    transportCharges: 0,
    products: []
  });

  const soRef = useRef<HTMLDivElement>(null);
  const whRef = useRef<HTMLDivElement>(null);

  const filteredOrders = useMemo(() => {
    return saleOrders.filter(o =>
      o.status !== 'COMPLETED' &&
      (!soSearch.trim() ||
        o.so_id?.toString().toLowerCase().includes(soSearch.toLowerCase()) ||
        o.party?.name?.toLowerCase().includes(soSearch.toLowerCase()))
    );
  }, [soSearch, saleOrders]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (soRef.current && !soRef.current.contains(e.target as Node)) setIsSoOpen(false);
      if (whRef.current && !whRef.current.contains(e.target as Node)) setIsWhOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const [orderRes, warehouseRes, batchRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/distribution/listsale`, {
            headers: { Authorization: `Bearer ${authToken}` }
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/warehouse/list`, {
            headers: { Authorization: `Bearer ${authToken}` }
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/batch`, {
            headers: { Authorization: `Bearer ${authToken}` }
          })
        ]);

        setSaleOrders(orderRes.data.data || []);
        setWarehouses(warehouseRes.data.data || []);
        setBatches(batchRes.data.data || []);
      } catch {
        toast.error("Orders ya warehouses load karne mein masla hua");
      }
    };

    if (authToken) fetchOrders();
  }, [authToken]);

  const handleSOSelection = async (so: any) => {
    setSelectedSO(so);
    setIsSoOpen(false);
    setSoSearch("");
    setIsFetching(true);
    try {
      const orderRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/distribution/sales/${so.so_id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const backendData = orderRes.data.data;
      const products = (backendData.salesorderline || [])
        .map((line: any) => {
          const alreadyDelivered = (line.deliverynoteline || []).reduce(
            (sum: number, deliveryLine: any) => sum + Number(deliveryLine.delivered_qty || 0),
            0
          );
          const orderedQty = Number(line.quantity || 0);
          const remainingQty = Math.max(orderedQty - alreadyDelivered, 0);

          return {
            so_line_id: line.so_line_id,
            product_id: line.product_id,
            productName: line.product?.name || 'Unknown Product',
            orderedQty,
            deliveredQty: alreadyDelivered,
            remainingQty,
            quantity: remainingQty,
            sale_price: Number(line.sale_price || line.unit_price) || 0,
            selected_batch_id: line.batch?.batch_id ? String(line.batch.batch_id) : '',
          };
        })
        .filter((line: DeliveryRow) => line.remainingQty > 0);

      if (!products.length) {
        toast.error("Is sales order ke tamam items already delivered hain.");
      }

      setFormData({
        distributorName: backendData.party?.name || '',
        orderDate: backendData.order_date ? backendData.order_date.split('T')[0] : '',
        status: backendData.status?.toLowerCase() || 'pending',
        remarks: '',
        warehouse_id: '',
        transportCharges: 0,
        products,
      });
    } catch {
      toast.error("Sales order detail load karne mein masla hua");
    } finally {
      setIsFetching(false);
    }
  };

  const handleProductQuantityChange = (index: number, value: number) => {
    setFormData((prev) => {
      const updatedProducts = [...prev.products];
      const row = updatedProducts[index];
      updatedProducts[index] = {
        ...row,
        quantity: Math.max(0, Math.min(Number(value || 0), row.remainingQty))
      };
      return { ...prev, products: updatedProducts };
    });
  };

  const handleSalePriceChange = (index: number, value: number) => {
    setFormData((prev) => {
      const updatedProducts = [...prev.products];
      updatedProducts[index] = {
        ...updatedProducts[index],
        sale_price: Math.max(0, Number(value || 0))
      };
      return { ...prev, products: updatedProducts };
    });
  };

  const handleBatchChange = (index: number, value: string) => {
    setFormData((prev) => {
      const updatedProducts = [...prev.products];
      updatedProducts[index] = {
        ...updatedProducts[index],
        selected_batch_id: value
      };
      return { ...prev, products: updatedProducts };
    });
  };

  const getProductBatches = (productId: string) => {
    return batches.filter((batch) =>
      batch.status === 'ACTIVE' &&
      Array.isArray(batch.batchitem) &&
      batch.batchitem.some((item: any) =>
        item.product_id === productId && Number(item.available_quantity || 0) > 0
      )
    );
  };

  const lineItemsTotal = useMemo(
    () => formData.products.reduce((sum: number, item: DeliveryRow) => sum + (Number(item.quantity) * Number(item.sale_price)), 0),
    [formData.products]
  );
  const grandTotal = lineItemsTotal + Number(formData.transportCharges);
  const emptyLines = formData.products.filter((item) => Number(item.quantity) <= 0).length === formData.products.length;

  const handleSubmit = async () => {
    if (!selectedSO) return toast.error("Pehle order select karein");
    if (!formData.warehouse_id) return toast.error("Pehle warehouse select karein");
    if (emptyLines) return toast.error("Kam az kam ek line ki delivery quantity honi chahiye.");

    const tId = toast.loading("Saving & Dispatching...");
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/distribution/deliveries/${selectedSO.so_id}`,
        {
          orderId: selectedSO.so_id,
          ...formData,
          products: formData.products.map((item) => ({
            so_line_id: item.so_line_id,
            product_id: item.product_id,
            delivered_qty: item.quantity,
            sale_price: item.sale_price,
            batch_id: item.selected_batch_id ? Number(item.selected_batch_id) : undefined
          })),
          totalAmount: grandTotal
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      toast.success("Order Synced Successfully!", { id: tId });
      setSelectedSO(null);
      setFormData({ distributorName: '', orderDate: '', status: 'pending', remarks: '', warehouse_id: '', transportCharges: 0, products: [] });
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
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">
            DELIVERY <span className="text-emerald-500">NOTE</span>
          </h1>
        </header>

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
                <div className="p-4 bg-black/40">
                  <input className="w-full bg-slate-800 rounded-xl py-2 px-4 text-sm outline-none" placeholder="Search..."
                    value={soSearch} onChange={(e) => setSoSearch(e.target.value)} />
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {filteredOrders.map((so) => (
                    <div key={so.so_id} onClick={() => handleSOSelection(so)}
                      className="px-6 py-4 hover:bg-emerald-600 cursor-pointer border-b border-white/5 flex justify-between">
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
                <span className="text-lg font-black italic">
                  {formData.warehouse_id
                    ? warehouses.find(w => w.warehouse_id === Number(formData.warehouse_id))?.name?.toUpperCase()
                    : "Select Warehouse..."}
                </span>
              </div>
              <ChevronDown size={20} />
            </div>
            {isWhOpen && (
              <div className="absolute z-[999] mt-2 w-full bg-[#1e293b] border border-slate-700 rounded-2xl overflow-hidden shadow-2xl">
                <div className="max-h-60 overflow-y-auto">
                  {warehouses.map((wh) => (
                    <div key={wh.warehouse_id}
                      onClick={() => { setFormData({ ...formData, warehouse_id: String(wh.warehouse_id) }); setIsWhOpen(false); }}
                      className="px-6 py-4 hover:bg-amber-600 cursor-pointer border-b border-white/5">
                      <p className="font-bold uppercase">{wh.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {isFetching ? (
          <div className="py-20 flex flex-col items-center">
            <Loader2 className="animate-spin text-emerald-500 mb-4" size={40} />
            <p className="text-xs font-black uppercase tracking-widest">Fetching Order Details...</p>
          </div>
        ) : selectedSO && (
          <div className="space-y-10">
            <div className="rounded-3xl border border-blue-500/10 bg-blue-500/5 px-6 py-5 text-sm text-slate-200">
              <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-blue-300">
                <AlertTriangle size={15} />
                Delivery note sirf sales order ki remaining quantities ke mutabiq banegi
              </div>
            </div>

            <div className="bg-[#0f172a]/40 border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="px-10 py-6 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <h2 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                  <Package size={16} className="text-emerald-500" /> Dispatch Line Items
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[1100px]">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-black/20 border-b border-white/5">
                      <th className="px-6 py-5">Product Name</th>
                      <th className="px-6 py-5 w-24 text-center">Ordered</th>
                      <th className="px-6 py-5 w-24 text-center">Delivered</th>
                      <th className="px-6 py-5 w-24 text-center">Remaining</th>
                      <th className="px-6 py-5 w-28 text-center">Deliver Qty</th>
                      <th className="px-6 py-5 w-48">Batch</th>
                      <th className="px-6 py-5 w-36 text-amber-400">Sale Price</th>
                      <th className="px-6 py-5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {formData.products.map((item: DeliveryRow, idx: number) => (
                      <tr key={item.so_line_id} className="hover:bg-white/[0.01]">
                        <td className="px-6 py-4 font-bold text-white">{item.productName}</td>
                        <td className="px-6 py-4 text-center text-slate-300">{item.orderedQty}</td>
                        <td className="px-6 py-4 text-center text-slate-400">{item.deliveredQty}</td>
                        <td className="px-6 py-4 text-center text-emerald-400 font-black">{item.remainingQty}</td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            max={item.remainingQty}
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 w-full text-emerald-400 font-mono text-center outline-none"
                            value={item.quantity}
                            onChange={(e) => handleProductQuantityChange(idx, Number(e.target.value))}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <select
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 w-full text-white text-xs outline-none"
                            value={item.selected_batch_id}
                            onChange={(e) => handleBatchChange(idx, e.target.value)}
                          >
                            <option value="">Select Batch</option>
                            {getProductBatches(item.product_id).map((batch: any) => {
                              const batchItem = batch.batchitem.find((entry: any) => entry.product_id === item.product_id);
                              const availableQty = Number(batchItem?.available_quantity || 0);
                              return (
                                <option key={batch.batch_id} value={batch.batch_id}>
                                  {batch.batch_number} ({availableQty})
                                </option>
                              );
                            })}
                          </select>
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            min="0"
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-2 w-full text-amber-400 font-mono text-center outline-none"
                            value={item.sale_price}
                            onChange={(e) => handleSalePriceChange(idx, Number(e.target.value))}
                          />
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-white font-black italic">
                          {(Number(item.quantity) * Number(item.sale_price)).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className={labelClass}>Transport Charges (PKR)</label>
                  <div className="relative">
                    <Truck className="absolute left-4 top-3.5 text-blue-500" size={16} />
                    <input type="number"
                      className={`${inputStyle} pl-12 text-blue-400 font-bold`}
                      value={formData.transportCharges}
                      onChange={(e) => setFormData({ ...formData, transportCharges: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <textarea rows={3}
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-[2rem] p-6 text-sm outline-none focus:border-emerald-500"
                  placeholder="Dispatch instructions..."
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                />
              </div>

              <div className="bg-white/[0.03] border border-white/5 rounded-[3rem] p-10 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex justify-between text-slate-500 text-xs font-bold uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span>PKR {lineItemsTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-blue-400 text-xs font-bold uppercase tracking-widest">
                    <span>Transport (+)</span>
                    <span>PKR {Number(formData.transportCharges).toLocaleString()}</span>
                  </div>
                  <div className="h-px bg-white/10 my-4"></div>
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">Total Payable</span>
                    <span className="text-5xl font-black text-white italic tracking-tighter leading-none">
                      <span className="text-sm font-medium opacity-40 mr-2 uppercase">PKR</span>
                      {grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
                <button onClick={handleSubmit}
                  className="mt-10 w-full bg-emerald-500 text-black py-6 rounded-2xl font-black text-xs tracking-[0.4em] hover:bg-emerald-400 transition-all flex items-center justify-center gap-3">
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
