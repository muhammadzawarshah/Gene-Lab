"use client";

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { 
  Save, Loader2, Home, 
  ClipboardList, ChevronDown, Calendar, Hash, Tag, Box, Truck, Percent, Layers
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

  const [itemBatches, setItemBatches] = useState<{ [key: string]: any[] }>({});

  const [formData, setFormData] = useState<any>({
    purchaseNo: '',
    date: '',
    grossTotal: 0,
    discount: 0,          // % value
    transportCharges: 0,  // PKR value
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

  /* ---------------- Initial Load ---------------- */
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
        setPurchaseOrders(poRes.data.data?.po || poRes.data.data || []);
        setWarehouses(whRes.data.data || whRes.data || []);
      } catch {
        toast.error("Records load nahi ho sakay"); 
      }
    };
    if (authToken) fetchData();
  }, [authToken]);

  /* =========================================================
     ✅ FIXED CALCULATION LOGIC (DISCOUNT % + TRANSPORT PKR)
     ========================================================= */
  useEffect(() => {

    const gross = Number(formData.grossTotal) || 0;
    const discountPercent = Number(formData.discount) || 0;
    const transport = Number(formData.transportCharges) || 0;

    // Prevent negative or >100%
    const safeDiscount =
      discountPercent < 0 ? 0 :
      discountPercent > 100 ? 100 :
      discountPercent;

    const discountAmount = (gross * safeDiscount) / 100;
    const net = gross - discountAmount + transport;

    setFormData((prev: any) => ({
      ...prev,
      netTotal: net
    }));

  }, [formData.grossTotal, formData.discount, formData.transportCharges]);

  /* ---------------- Rest Code SAME ---------------- */
  // 👇 Everything below is EXACTLY same as your original

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

      const setupRes = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/setup-data`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const allBatches = setupRes.data.data.batch || [];

      const batchesMap: any = {};
      poLines.forEach((item: any) => {
        const pid = String(item.product_id).trim();
        batchesMap[pid] = allBatches.filter(
          (b: any) => b.batchitem?.some((bi: any) => String(bi.product_id).trim() === pid)
        );
      });

      setItemBatches(batchesMap);

      const initializedLines = poLines.map((item: any) => ({
        ...item,
        batch_no: '',
        expiry_date: '',
        manufacturing_date: ''
      }));

      setFormData({
        purchaseNo: poData.po_id,
        date: poData.order_date?.split('T')[0] || '',
        grossTotal: parseFloat(poData.total_amount) || 0,
        discount: 0,
        transportCharges: 0,
        netTotal: parseFloat(poData.total_amount) || 0,
        items: initializedLines 
      });
    } catch { 
      toast.error("Items load nahi ho sakay"); 
    } finally { 
      setIsFetchingDetails(false); 
    }
  };

  const handleBatchChange = (index: number, selectedBatchId: string) => {
    setFormData((prev: any) => {
      const updatedItems = [...prev.items];
      const row = { ...updatedItems[index] };

      const productId = String(row.product_id).trim();
      const batches = itemBatches[productId] || [];

      const batchInfo = batches.find(
        (b: any) => String(b.batch_id) === String(selectedBatchId)
      );

      if (batchInfo) {
        row.batch_no = batchInfo.batch_id;
        row.manufacturing_date =
          batchInfo.manufacturing_date
            ? batchInfo.manufacturing_date.split('T')[0]
            : '';
        row.expiry_date =
          batchInfo.expiry_date
            ? batchInfo.expiry_date.split('T')[0]
            : '';
      } else {
        row.batch_no = '';
        row.manufacturing_date = '';
        row.expiry_date = '';
      }

      updatedItems[index] = row;
      return { ...prev, items: updatedItems };
    });
  };

  const handleSubmitGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO?.po_id || !selectedWarehouse) return toast.error("Selection missing!");

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
      setFormData({ purchaseNo: '', date: '', grossTotal: 0, discount: 0, transportCharges: 0, netTotal: 0, items: [] });
      setSelectedPO(null);
    } catch { 
      toast.error("Sync Error", { id: tId }); 
    }
  };

  // UI/Styles
  const thStyle = "px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 bg-black/20 whitespace-nowrap";
  const inputStyle = "bg-[#0f172a] border border-slate-800 rounded-lg px-3 py-2 text-[11px] font-bold text-blue-400 outline-none focus:border-blue-500 w-full transition-all";
  const footerInputStyle = "bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-blue-500 w-full";

  const filteredPOs = purchaseOrders.filter(p => p.po_id?.toString().includes(poSearch));

  return (
    <div className="text-slate-300 p-6">
      <Toaster richColors theme="dark" position="top-center" />
      <div className="max-w-[1600px] mx-auto">
        
        <header className="flex items-center gap-4 mb-8 border-b border-white/5 pb-8">
          <div className="bg-blue-600 p-4 rounded-[1.5rem] shadow-2xl shadow-blue-500/20"><ClipboardList className="text-white" size={28} /></div>
          <div>
            <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase">GRN <span className="text-blue-600">INWARD</span></h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-[0.3em] uppercase">Enterprise Batch Management</p>
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
              <div className="absolute z-50 mt-2 w-full bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-200">
                <input className="w-full bg-black/20 p-4 text-xs outline-none text-white border-b border-white/5" placeholder="Search POs..." value={poSearch} onChange={(e)=>setPoSearch(e.target.value)} />
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
                {warehouses.map((wh: any) => (<option key={wh.warehouse_id} value={wh.warehouse_id}>{wh.name} (ID: {wh.warehouse_id})</option>))}
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
                      <th className={thStyle}>UOM</th>
                      <th className={thStyle}>Unit Price</th>
                      <th className={thStyle}>Batch Selection</th>
                      <th className={thStyle}>MFG Date</th>
                      <th className={thStyle}>Expiry Date</th>
                      <th className={thStyle}>Qty</th>
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
                        <td className="px-6 py-5 text-xs text-slate-400 font-medium">{item.product?.uom?.name || 'Unit'}</td>
                        <td className="px-6 py-5 text-xs font-mono text-slate-400">{item.unit_price}</td>
                        
                        <td className="px-4 py-5 min-w-[160px]">
                          <select 
                            value={item.batch_no}
                            onChange={(e) => handleBatchChange(idx, e.target.value)}
                            className={`${inputStyle} bg-[#1e293b]`}
                          >
                            <option value="">Select Batch</option>
                            {itemBatches[item.product_id]?.map((b: any) => (
                              <option key={b.batch_id} value={b.batch_id}>{b.batch_number}</option>
                            ))}
                          </select>
                        </td>

                        <td className="px-4 py-5 min-w-[140px]">
                           <input type="date" value={item.manufacturing_date} readOnly className={`${inputStyle} opacity-50 cursor-not-allowed`} />
                        </td>

                        <td className="px-4 py-5 min-w-[140px]">
                           <input type="date" value={item.expiry_date} readOnly className={`${inputStyle} opacity-50 cursor-not-allowed`} />
                        </td>

                        <td className="px-6 py-5">
                          <span className="bg-blue-500/10 text-blue-400 px-3 py-1.5 rounded-lg font-black font-mono border border-blue-500/20">{item.quantity}</span>
                        </td>
                        <td className="px-6 py-5 text-right font-black text-white italic tracking-tighter">{item.line_total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#0f172a] p-8 rounded-[2rem] border border-white/5">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Apply Discount</label>
                  <div className="relative">
                    <Percent className="absolute left-4 top-1/2 -translate-y-1/2 text-red-500" size={16} />
                    <input type="number" value={formData.discount} onChange={(e) => setFormData({...formData, discount: e.target.value})} className={`${footerInputStyle} pl-12 text-red-400 focus:border-red-500`} placeholder="0.00" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-2 block tracking-widest">Transport</label>
                  <div className="relative">
                    <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500" size={16} />
                    <input type="number" value={formData.transportCharges} onChange={(e) => setFormData({...formData, transportCharges: e.target.value})} className={`${footerInputStyle} pl-12 text-blue-400 focus:border-blue-500`} placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div className="bg-blue-600 p-8 rounded-[2rem] shadow-2xl flex flex-col justify-between min-h-[180px]">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-[0.3em]">Final Total</p>
                    <p className="text-4xl font-black text-white italic tracking-tighter">PKR <span>{formData.netTotal}</span></p>
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