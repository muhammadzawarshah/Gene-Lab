"use client";

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { 
  Save, Loader2, Database, ChevronDown, Home, ShoppingBag, 
  AlertCircle, Tag, Hash, Box, ClipboardList
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

export default function NewGRNPage() {
  const authToken = Cookies.get('auth_token');
  const currentUserId = Cookies.get('userId') || 'GUEST_USER';

  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");
  const [isPoOpen, setIsPoOpen] = useState(false);
  const [poSearch, setPoSearch] = useState("");
  const [isFetchingDetails, setIsFetchingDetails] = useState(false);

  const [formData, setFormData] = useState<any>({
    purchaseNo: '',
    date: '',
    grossTotal: 0,
    totalPayment: 0,
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
    const fetchData = async () => {
      try {
        const [poRes, whRes] = await Promise.all([
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/purchase/listpo`, {
            headers: { Authorization: `Bearer ${authToken}` }
          }),
          axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/warehouse/list`, {
            headers: { Authorization: `Bearer ${authToken}` }
          })
        ]);
        setPurchaseOrders(poRes.data.data?.po || []);
        setWarehouses(whRes.data.data || []);
      } catch (err) { 
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
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/purchase/order/${po.po_id}/items`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      const poData = res.data.data.po; 
      const poLines = res.data.data.pol || []; 

      setFormData({
        purchaseNo: poData.po_id,
        date: poData.order_date?.split('T')[0] || '',
        grossTotal: parseFloat(poData.total_amount) || 0,
        totalPayment: parseFloat(poData.total_amount) || 0,
        items: poLines 
      });
    } catch (err) { 
      toast.error("Items fetch nahi ho sakay"); 
    } finally { 
      setIsFetchingDetails(false); 
    }
  };

  const handleSubmitGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO?.po_id || !selectedWarehouse || formData.items.length === 0) {
      return toast.error("PO ID, Warehouse ID, and Items are required!");
    }

    const tId = toast.loading("Processing GRN Sync...");
    try {
      const payload = {
        poId: Number(selectedPO.po_id),
        warehouseId: Number(selectedWarehouse),
        items: formData.items,
        date: formData.date,
        grossTotal: formData.grossTotal,
        totalPayment: formData.totalPayment,
        userId: currentUserId,
        status: "received"
      };

      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/purchase/grn/receive`, payload, { 
        headers: { Authorization: `Bearer ${authToken}` } 
      });
      
      toast.success("Inventory Updated Successfully!", { id: tId });
      setSelectedPO(null);
      setSelectedWarehouse("");
      setFormData({ purchaseNo: '', date: '', grossTotal: 0, totalPayment: 0, items: [] });
    } catch (err: any) { 
      toast.error(err.response?.data?.message || "Sync Error", { id: tId }); 
    }
  };

  const thStyle = "px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 bg-black/20";

  return (
    <div className="text-slate-300 p-6 bg-[#020617] min-h-screen">
      <Toaster richColors theme="dark" position="top-center" />
      <div className="max-w-[1400px] mx-auto">
        
        <header className="flex items-center gap-4 mb-8 border-b border-white/5 pb-8">
          <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-2xl shadow-blue-500/20">
            <ClipboardList className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">GRN <span className="text-blue-600">INWARD</span></h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase">Enterprise Resource Planning</p>
          </div>
        </header>

        {/* SELECTORS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="relative" ref={poRef}>
            <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Select Purchase Order</label>
            <div onClick={() => setIsPoOpen(!isPoOpen)} className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl py-4 px-6 flex justify-between items-center text-white cursor-pointer hover:border-blue-500 transition-all">
              <span className="font-black italic">{selectedPO ? `PO #${selectedPO.po_id}` : "Choose Order"}</span>
              <ChevronDown size={20} />
            </div>
            {isPoOpen && (
              <div className="absolute z-50 mt-2 w-full bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
                <input className="w-full bg-black/20 p-4 text-xs outline-none border-b border-white/5" placeholder="Filter POs..." value={poSearch} onChange={(e)=>setPoSearch(e.target.value)} />
                <div className="max-h-60 overflow-y-auto">
                  {purchaseOrders.filter(p => p.po_id?.toString().includes(poSearch)).map((po) => (
                    <div key={po.po_id} onClick={() => handlePOSelection(po)} className="px-6 py-4 hover:bg-blue-600 cursor-pointer text-sm font-bold border-b border-white/5">PO #{po.po_id}</div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Select Destination Warehouse</label>
            <div className="relative">
              <Home className="absolute left-5 top-4.5 text-blue-500" size={18} />
              <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)} className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-white outline-none focus:border-blue-500 appearance-none font-black italic shadow-inner">
                <option value="">Choose Warehouse...</option>
                {warehouses.map((wh: any) => (
                  <option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.name} (ID: {wh.warehouse_id})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* DATA TABLE WITH ALL COLUMNS */}
        {isFetchingDetails ? (
           <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" size={40} /></div>
        ) : formData.purchaseNo && (
          <div className="animate-in fade-in duration-500">
            <div className="bg-[#0f172a]/40 border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl mb-8">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={thStyle}>Product / SKU</th>
                      <th className={thStyle}>UOM</th>
                      <th className={thStyle}>Unit Price</th>
                      <th className={thStyle}>Quantity</th>
                      <th className={`${thStyle} text-right`}>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-none">
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-1">
                            <span className="font-black text-slate-200 uppercase text-xs tracking-tight">{item.product?.name}</span>
                            <span className="text-[9px] text-slate-500 font-mono italic">{item.product_id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-xs text-slate-400 font-medium">{item.product?.uom?.name || 'Units'}</td>
                        <td className="px-6 py-5 text-xs font-mono text-slate-400">{item.unit_price}</td>
                        <td className="px-6 py-5">
                          <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg font-black font-mono border border-blue-500/20">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right font-black text-white italic tracking-tighter">
                          {item.line_total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* TOTALS & ACTIONS */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-[#0f172a] p-8 rounded-[2rem] border border-white/5 gap-8">
                <div className="flex flex-col">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-1 text-center md:text-left">Gross Amount Payable</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">PKR <span className="text-blue-600">{formData.grossTotal}</span></p>
                </div>
                <button onClick={handleSubmitGRN} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-16 py-6 rounded-2xl font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3">
                  <Save size={20} /> Confirm Receipt
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}