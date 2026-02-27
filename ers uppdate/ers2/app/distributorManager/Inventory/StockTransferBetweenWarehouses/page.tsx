"use client";

import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import {
  ArrowLeftRight, Warehouse, Calendar, Plus, Trash2, Save, Loader2,
  ChevronRight, Layers, ClipboardList, ShieldCheck, ThermometerSnowflake,
  FileUp, Hash, User, FileText, AlertCircle
} from "lucide-react";
import { Toaster, toast } from "sonner";

/* ================= TYPES ================= */
interface TransferItem {
  id: string;
  productName: string;
  batchNo: string;
  expiryDate: string;
  availableQty: number; 
  transferQty: number;
  bonusQty: number;
}

export default function UltimateTransferPage() {
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState("Guest");

  // Auth Integration
  useEffect(() => {
    const userId = Cookies.get("userId"); 
    if (userId) setCurrentUser(userId);
  }, []);

  const [formData, setFormData] = useState({
    transferId: `ST-${Math.floor(100000 + Math.random() * 900000)}`,
    transferDate: new Date().toISOString().split("T")[0],
    referenceNo: "",
    status: "Draft",
    sourceWarehouse: "",
    sourceStorage: "Room Temp",
    destWarehouse: "",
    expectedArrival: "",
    qcRequired: "No",
    arrivalTemp: "",
    notes: "",
    attachmentName: ""
  });

  const [items, setItems] = useState<TransferItem[]>([
    { id: Math.random().toString(36).substr(2, 9), productName: "", batchNo: "", expiryDate: "", availableQty: 0, transferQty: 0, bonusQty: 0 },
  ]);

  /* ---------- LIVE STOCK FETCHING ---------- */
  const fetchStockLevel = async (id: string, productName: string) => {
    if (!formData.sourceWarehouse || productName.length < 3) return;
    try {
      const res = await axios.get(`${API_BASE_URL}/inventory/stock`, {
        params: { warehouse: formData.sourceWarehouse, product: productName },
        headers: { Authorization: `Bearer ${Cookies.get("auth_token")}` }
      });
      const stock = res.data.availableStock || 0;
      setItems(prev => prev.map(item => item.id === id ? { ...item, availableQty: stock } : item));
    } catch (err) {
      console.error("Stock fetch error", err);
    }
  };

  /* ---------- HANDLERS ---------- */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const updateItem = (id: string, field: keyof TransferItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === "transferQty" && value > item.availableQty) {
          toast.warning(`Warning: Exceeding available stock (${item.availableQty})`);
        }
        return updated;
      }
      return item;
    }));
    if (field === "productName") fetchStockLevel(id, value);
  };

  const addItemRow = () => {
    setItems(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), productName: "", batchNo: "", expiryDate: "", availableQty: 0, transferQty: 0, bonusQty: 0 }]);
  };

  const removeItemRow = (id: string) => {
    if (items.length > 1) setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSubmit = async (submitType: "Draft" | "Post") => {
    if (!formData.sourceWarehouse || !formData.destWarehouse) return toast.error("Select Warehouses!");
    
    setIsSubmitting(true);
    try {
      const payload = { ...formData, requestedBy: currentUser, items, type: submitType };
      await axios.post(`${API_BASE_URL}/inventory/transfer`, payload, {
        headers: { Authorization: `Bearer ${Cookies.get("auth_token")}` }
      });
      toast.success(`Transfer ${submitType === 'Post' ? 'Posted' : 'Saved'}!`);
      if (submitType === "Post") setTimeout(() => window.location.reload(), 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Operation Failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const glassInput = "w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-slate-500";
  const selectStyle = `${glassInput} cursor-pointer [&>option]:bg-[#0f172a] [&>option]:text-white`;
  const labelStyle = "flex items-center gap-2 text-[10px] font-black text-blue-400/80 uppercase mb-2 tracking-[0.2em] ml-1";

  return (
    <div className="bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950 p-4 md:p-10 text-slate-300">
      <Toaster position="top-center" richColors theme="dark" />

      <div className="max-w-7xl mx-auto animate-in fade-in zoom-in-95 duration-500">
        
        {/* HEADER */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 text-blue-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">
              <Layers size={14} className="animate-pulse" /> 
              <span>WMS Integrated</span> <ChevronRight size={12} className="text-slate-700" /> <span>Stock Transfer</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase italic">
              Move <span className="text-blue-600 not-italic">Inventory</span>
            </h1>
          </div>
          <div className="px-5 py-3 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
            <label className={labelStyle}><Hash size={10}/> Request ID</label>
            <span className="text-blue-400 font-mono text-sm font-bold">{formData.transferId}</span>
          </div>
        </div>

        <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
          
          {/* SECTION 1: LOGISTICS */}
          <div className="p-8 border-b border-white/5 grid grid-cols-1 md:grid-cols-4 gap-6 bg-white/[0.01]">
            <div>
              <label className={labelStyle}><Calendar size={12}/> Transfer Date</label>
              <input type="date" name="transferDate" value={formData.transferDate} onChange={handleInputChange} className={glassInput} />
            </div>
            <div>
              <label className={labelStyle}><User size={12}/> Initiated By</label>
              <input type="text" value={currentUser} readOnly className={`${glassInput} opacity-50`} />
            </div>
            <div>
              <label className={labelStyle}><FileText size={12}/> Ref Number</label>
              <input type="text" name="referenceNo" placeholder="TR-REF-001" value={formData.referenceNo} onChange={handleInputChange} className={glassInput} />
            </div>
            <div>
              <label className={labelStyle}><ShieldCheck size={12}/> Priority Status</label>
              <select name="status" value={formData.status} onChange={handleInputChange} className={selectStyle}>
                <option value="Draft">Draft</option>
                <option value="Pending">Pending Approval</option>
                <option value="Urgent">Urgent Transfer</option>
              </select>
            </div>
          </div>

          {/* SECTION 2: WAREHOUSE ROUTING */}
          <div className="p-8 bg-white/[0.01] border-b border-white/5 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
              <h3 className="text-xs font-black uppercase text-white mb-6 flex items-center gap-2"><Warehouse size={14} className="text-red-400" /> Source Warehouse</h3>
              <div className="grid grid-cols-2 gap-4">
                <select name="sourceWarehouse" value={formData.sourceWarehouse} onChange={handleInputChange} className={selectStyle}>
                  <option value="">Select Origin</option>
                  <option value="Main-Vault">Main Vault</option>
                  <option value="Sub-Store-A">Sub Store A</option>
                </select>
                <select name="sourceStorage" value={formData.sourceStorage} onChange={handleInputChange} className={selectStyle}>
                  <option value="Room Temp">Ambient</option>
                  <option value="Cold Chain">Cold Chain (2-8°C)</option>
                </select>
              </div>
            </div>

            <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
              <h3 className="text-xs font-black uppercase text-white mb-6 flex items-center gap-2"><ArrowLeftRight size={14} className="text-emerald-400" /> Destination Target</h3>
              <div className="grid grid-cols-2 gap-4">
                <select name="destWarehouse" value={formData.destWarehouse} onChange={handleInputChange} className={selectStyle}>
                  <option value="">Select Target</option>
                  <option value="North-Wing">North Wing</option>
                  <option value="South-Hub">South Hub</option>
                </select>
                <input type="date" name="expectedArrival" value={formData.expectedArrival} onChange={handleInputChange} className={glassInput} />
              </div>
            </div>
          </div>

          {/* SECTION 3: ITEM TABLE */}
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-widest"><ClipboardList size={16} className="text-blue-500" /> Manifest Details</h2>
              <button onClick={addItemRow} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all active:scale-95"><Plus size={14} /> Add Product</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-y-3">
                <thead>
                  <tr className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    <th className="px-4 text-left">Product</th>
                    <th className="px-4 text-left">Batch</th>
                    <th className="px-4 text-center">In-Stock</th>
                    <th className="px-4 text-center">Transfer</th>
                    <th className="px-4 text-center">Bonus</th>
                    <th className="px-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="group bg-white/[0.02] hover:bg-white/[0.05] transition-all rounded-xl">
                      <td className="p-2 w-1/3"><input className={glassInput} placeholder="Product..." value={item.productName} onChange={(e) => updateItem(item.id, "productName", e.target.value)} /></td>
                      <td className="p-2"><input className={`${glassInput} font-mono`} placeholder="Batch" value={item.batchNo} onChange={(e) => updateItem(item.id, "batchNo", e.target.value)} /></td>
                      <td className="p-2 text-center">
                         <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-3 py-1 rounded-lg">{item.availableQty}</span>
                      </td>
                      <td className="p-2">
                        <div className="relative">
                          <input type="number" className={`${glassInput} text-center font-bold ${item.transferQty > item.availableQty ? 'border-red-500' : ''}`} value={item.transferQty} onChange={(e) => updateItem(item.id, "transferQty", Number(e.target.value))} />
                          {item.transferQty > item.availableQty && <AlertCircle size={12} className="absolute right-2 top-3 text-red-500" />}
                        </div>
                      </td>
                      <td className="p-2"><input type="number" className={`${glassInput} text-center text-emerald-400`} placeholder="0" value={item.bonusQty} onChange={(e) => updateItem(item.id, "bonusQty", Number(e.target.value))} /></td>
                      <td className="p-2 text-center"><button onClick={() => removeItemRow(item.id)} className="p-2 text-slate-700 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={18} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: QC & DOCUMENTS (WAPIS ADDED) */}
          <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-white/5 bg-white/[0.01]">
            <div>
              <label className={labelStyle}><ShieldCheck size={12}/> Quality Compliance</label>
              <select name="qcRequired" value={formData.qcRequired} onChange={handleInputChange} className={selectStyle}>
                <option value="No">Bypass Quality Check</option>
                <option value="Yes">Inspection Required</option>
              </select>
              {formData.sourceStorage === "Cold Chain" && (
                <div className="mt-4 animate-in slide-in-from-top-2">
                  <label className={labelStyle}><ThermometerSnowflake size={12}/> Temperature Check (°C)</label>
                  <input type="text" name="arrivalTemp" placeholder="e.g. 4.2" value={formData.arrivalTemp} onChange={handleInputChange} className={glassInput} />
                </div>
              )}
            </div>
            <div>
              <label className={labelStyle}><FileUp size={12}/> Document Attachment</label>
              <div onClick={() => fileInputRef.current?.click()} className="h-[100px] border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center bg-white/5 hover:border-blue-500/50 cursor-pointer transition-all">
                <FileUp className="text-slate-600 mb-1" />
                <span className="text-[9px] font-bold text-slate-500 uppercase">{formData.attachmentName || "Upload File"}</span>
                <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setFormData(prev => ({...prev, attachmentName: e.target.files?.[0].name || ""}))} />
              </div>
            </div>
            <div>
              <label className={labelStyle}><FileText size={12}/> Final Remarks</label>
              <textarea name="notes" placeholder="Any instructions..." value={formData.notes} onChange={handleInputChange} className={`${glassInput} h-[100px] resize-none`} />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="p-8 bg-white/5 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
             <button className="text-slate-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all">Discard Request</button>
             <div className="flex gap-4 w-full md:w-auto">
                <button onClick={() => handleSubmit("Draft")} className="flex-1 md:flex-none px-10 py-4 border border-white/10 text-white rounded-2xl font-bold text-xs uppercase hover:bg-white/10 transition-all">Save Draft</button>
                <button disabled={isSubmitting} onClick={() => handleSubmit("Post")} className="flex-1 md:flex-none px-14 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 shadow-2xl shadow-blue-600/40 flex items-center justify-center gap-3">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Confirm & Post</>}
                </button>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}