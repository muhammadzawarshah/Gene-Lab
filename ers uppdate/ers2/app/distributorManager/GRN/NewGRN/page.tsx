"use client";

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
  Save, Loader2, Home,
  ClipboardList, ChevronDown, Box, Truck
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

const calculateLineTotal = (item: any) => {
  const receivedQty = Number(item.received_qty || item.quantity || 0);
  const purchasePrice = Number(item.purchase_price || 0);
  return receivedQty * purchasePrice;
};

export default function NewGRNPage() {
  const authToken = Cookies.get('auth_token');
  const currentUserId = Cookies.get('userId') || 'GUEST_USER';

  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [isPoOpen, setIsPoOpen] = useState(false);
  const [poSearch, setPoSearch] = useState("");
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const [formData, setFormData] = useState<any>({
    purchaseNo: '',
    date: '',
    grossTotal: 0,
    transportCharges: 0,
    netTotal: 0,
    items: []
  });

  const poRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (poRef.current && !poRef.current.contains(e.target as Node)) setIsPoOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    const gross = (formData.items || []).reduce((sum: number, item: any) => {
      return sum + calculateLineTotal(item);
    }, 0);
    const transport = Number(formData.transportCharges) || 0;

    setFormData((prev: any) => ({
      ...prev,
      grossTotal: gross,
      netTotal: gross + transport
    }));
  }, [formData.items, formData.transportCharges]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [poRes, whRes, batchRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/purchase/listpo`, {
            headers: { Authorization: `Bearer ${authToken}` }
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/warehouse/list`, {
            headers: { Authorization: `Bearer ${authToken}` }
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/batch`, {
            headers: { Authorization: `Bearer ${authToken}` }
          })
        ]);
        setPurchaseOrders(poRes.data.data?.po || poRes.data.data || []);
        setWarehouses(whRes.data.data || whRes.data || []);
        setBatches(batchRes.data.data || []);
      } catch {
        toast.error("Records load nahi ho sakay");
      }
    };
    if (authToken) fetchData();
  }, [authToken]);

  const handlePOSelection = async (po: any) => {
    setSelectedPO(po);
    setIsPoOpen(false);
    setIsFetchingDetails(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/purchase/order/${po.po_id}/items`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      const poData = res.data.data.po;
      const poLines = res.data.data.pol || [];

      const initializedLines = poLines.map((item: any) => ({
        ...item,
        received_qty: Number(item.quantity || 0),
        sale_price: '',
        purchase_price: '',
        line_total: 0,
        selected_batch_id: '',
      }));

      setFormData({
        purchaseNo: poData.po_id,
        date: poData.order_date?.split('T')[0] || '',
        grossTotal: 0,
        transportCharges: 0,
        netTotal: 0,
        items: initializedLines
      });
    } catch {
      toast.error("Items load nahi ho sakay");
    } finally {
      setIsFetchingDetails(false);
    }
  };

  const handleItemPriceChange = (index: number, field: 'sale_price' | 'purchase_price', value: string) => {
    setFormData((prev: any) => {
      const updatedItems = [...prev.items];
      const updatedItem = { ...updatedItems[index], [field]: value };
      updatedItems[index] = {
        ...updatedItem,
        line_total: calculateLineTotal(updatedItem)
      };
      return { ...prev, items: updatedItems };
    });
  };

  const getBatchOptions = (productId: string) => {
    return batches.map((batch: any) => {
      const batchItem = Array.isArray(batch.batchitem)
        ? batch.batchitem.find((entry: any) => entry.product_id === productId)
        : null;

      return {
        ...batch,
        productAvailableQty: Number(batchItem?.available_quantity || 0),
        containsProduct: Boolean(batchItem)
      };
    });
  };

  const handleSubmitGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO?.po_id || !selectedWarehouse) return toast.error("PO aur Warehouse select karein!");
    const tId = toast.loading("Confirming GRN...");
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/purchase/grn/receive`, {
        ...formData,
        poId: selectedPO.po_id,
        warehouseId: selectedWarehouse,
        userId: currentUserId,
        status: "received"
      }, { headers: { Authorization: `Bearer ${authToken}` } });
      toast.success("Inventory Updated!", { id: tId });
      setFormData({ purchaseNo: '', date: '', grossTotal: 0, transportCharges: 0, netTotal: 0, items: [] });
      setSelectedPO(null);
    } catch {
      toast.error("Sync Error", { id: tId });
    }
  };

  const thStyle = "px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 bg-black/20 whitespace-nowrap";
  const inputStyle = "bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-[11px] font-bold text-blue-400 outline-none focus:border-blue-500 w-full transition-all";
  const footerInputStyle = "bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500 w-full";
  const filteredPOs = purchaseOrders.filter(p => p.po_id?.toString().includes(poSearch));

  return (
    <div className="text-slate-300 p-6">
      <Toaster richColors theme="dark" position="top-center" />
      <div className="max-w-[1600px] mx-auto">

        <header className="flex items-center gap-4 mb-8 border-b border-white/5 pb-8">
          <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-2xl shadow-blue-500/20">
            <ClipboardList className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">
              GRN <span className="text-blue-600">INWARD</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase">Goods Receipt Note</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="relative" ref={poRef}>
            <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Select Purchase Order</label>
            <div onClick={() => setIsPoOpen(!isPoOpen)} className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl py-4 px-6 flex justify-between items-center text-white cursor-pointer hover:border-blue-500 transition-all shadow-lg">
              <span className="font-black italic">{selectedPO ? `PO #${selectedPO.po_id}` : "Choose Order"}</span>
              <ChevronDown size={20} className={isPoOpen ? 'rotate-180' : ''} />
            </div>
            {isPoOpen && (
              <div className="absolute z-50 mt-2 w-full bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                <input className="w-full bg-black/20 p-4 text-xs outline-none text-white border-b border-white/5" placeholder="Search POs..." value={poSearch} onChange={(e) => setPoSearch(e.target.value)} />
                <div className="max-h-60 overflow-y-auto">
                  {filteredPOs.map((po) => (
                    <div key={po.po_id} onClick={() => handlePOSelection(po)} className="px-6 py-4 hover:bg-blue-600 cursor-pointer text-sm font-bold border-b border-white/5 text-slate-200">
                      PO #{po.po_id}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Target Warehouse</label>
            <div className="relative">
              <Home className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500" size={18} />
              <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)} className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:border-blue-500 appearance-none font-black italic shadow-lg">
                <option value="">Select Warehouse...</option>
                {warehouses.map((wh: any) => (
                  <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.name} (ID: {wh.warehouse_id})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isFetchingDetails ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
        ) : formData.purchaseNo && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-[#0f172a]/40 border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl mb-8">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={thStyle}>Product / SKU</th>
                      <th className={thStyle}>Batch</th>
                      <th className={thStyle}>UOM</th>
                      <th className={thStyle}>PO Qty</th>
                      <th className={thStyle}>Receive Qty</th>
                      <th className={`${thStyle} text-emerald-400`}>Purchase Price (PKR)</th>
                      <th className={`${thStyle} text-amber-400`}>Sale Price (PKR)</th>
                      <th className={`${thStyle} text-right`}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/[0.02] border-b border-white/5 last:border-none transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex flex-col min-w-[150px]">
                            <span className="font-black text-slate-200 text-xs uppercase">{item.product?.name}</span>
                            <span className="text-[9px] text-slate-500 font-mono italic">{item.product_id}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5 min-w-[200px]">
                          <select
                            value={item.selected_batch_id || ''}
                            onChange={(e) => {
                              const batchId = e.target.value;
                              setFormData((prev: any) => {
                                const updatedItems = [...prev.items];
                                updatedItems[idx] = { ...updatedItems[idx], selected_batch_id: batchId };
                                return { ...prev, items: updatedItems };
                              });
                            }}
                            className={`${inputStyle} text-white focus:border-blue-500`}
                          >
                            <option value="">Create New Batch</option>
                            {getBatchOptions(item.product_id).map((batch: any) => (
                              <option key={batch.batch_id} value={batch.batch_id}>
                                {batch.batch_number}{batch.containsProduct ? ` (${batch.productAvailableQty})` : ' (new product)'}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-5 text-xs text-slate-400 font-medium">{item.product?.uom?.name || 'Unit'}</td>
                        <td className="px-6 py-5">
                          <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg font-black font-mono border border-blue-500/20">{item.quantity}</span>
                        </td>
                        <td className="px-4 py-5 min-w-[120px]">
                          <input
                            type="number"
                            min="0"
                            max={Number(item.quantity || 0)}
                            value={item.received_qty ?? item.quantity}
                            onChange={(e) => {
                              const nextQty = Math.min(
                                Number(item.quantity || 0),
                                Math.max(0, Number(e.target.value || 0))
                              );
                              setFormData((prev: any) => {
                                const updatedItems = [...prev.items];
                                const updatedItem = { ...updatedItems[idx], received_qty: nextQty };
                                updatedItems[idx] = {
                                  ...updatedItem,
                                  line_total: calculateLineTotal(updatedItem)
                                };
                                return { ...prev, items: updatedItems };
                              });
                            }}
                            className={`${inputStyle} text-white focus:border-blue-500 text-center`}
                          />
                        </td>
                        <td className="px-4 py-5 min-w-[160px]">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={item.purchase_price}
                            onChange={(e) => handleItemPriceChange(idx, 'purchase_price', e.target.value)}
                            className={`${inputStyle} text-emerald-400 focus:border-emerald-500`}
                          />
                        </td>
                        <td className="px-4 py-5 min-w-[160px]">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={item.sale_price}
                            onChange={(e) => handleItemPriceChange(idx, 'sale_price', e.target.value)}
                            className={`${inputStyle} text-amber-400 focus:border-amber-500`}
                          />
                        </td>
                        <td className="px-6 py-5 text-right font-black text-white italic tracking-tighter">
                          {calculateLineTotal(item).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-[#0f172a] p-8 rounded-[2rem] border border-white/5">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Transport Charges (PKR)</label>
                  <div className="relative">
                    <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={16} />
                    <input type="number" value={formData.transportCharges} onChange={(e) => setFormData({ ...formData, transportCharges: e.target.value })} className={`${footerInputStyle} pl-12 text-blue-400 focus:border-blue-500`} placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div className="bg-blue-600 p-8 rounded-[2rem] shadow-2xl flex flex-col justify-between min-h-[160px]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Net Total</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">PKR <span>{Number(formData.netTotal).toLocaleString()}</span></p>
                  </div>
                  <Box className="text-white/40" size={32} />
                </div>
                <button onClick={handleSubmitGRN} className="w-full bg-white text-blue-600 hover:bg-slate-100 py-4 rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg">
                  <Save size={18} /> Confirm GRN
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
