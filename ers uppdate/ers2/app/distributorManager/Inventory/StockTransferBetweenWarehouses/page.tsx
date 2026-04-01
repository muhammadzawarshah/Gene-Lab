"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Select from "react-select";
import {
  ArrowLeftRight,
  Warehouse,
  Trash2,
  Save,
  Loader2,
  Package,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { Toaster, toast } from "sonner";

/* ================= TYPES ================= */
interface Category {
  product_category_id: string;
  category: string;
}

interface Product {
  product_id: string;
  name: string;
  sku: string;
}

interface Batch {
  batch_number: string;
  expiry_date: string;
  mfg_date: string;
  stock?: number;
}

interface TransferItem {
  category_id: string;
  product_id: string;
  batch_no: string;
  expiry: string;
  mfg: string;
  availableQty: number;
  transferQty: number;
  price: string;
  batchOptions: Batch[];
}

export default function InventoryTransferPro() {
  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const authToken = Cookies.get("auth_token");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [warehouseOptions, setWarehouseOptions] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productsMap, setProductsMap] = useState<{
    [key: string]: Product[];
  }>({});

  const [sourceWH, setSourceWH] = useState<any>(null);
  const [destWH, setDestWH] = useState<any>(null);

  const createEmptyRow = (): TransferItem => ({
    category_id: "",
    product_id: "",
    batch_no: "",
    expiry: "",
    mfg: "",
    availableQty: 0,
    transferQty: 0,
    price: "0",
    batchOptions: []
  });

  const [rows, setRows] = useState<TransferItem[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow()
  ]);

  /* ================= INITIAL LOAD ================= */
  useEffect(() => {
    if (!authToken) return;

    const loadData = async () => {
      try {
        const [whRes, catRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/v1/warehouse/list`, {
            headers: { Authorization: `Bearer ${authToken}` }
          }),
          axios.get(`${API_BASE_URL}/api/v1/category`, {
            headers: { Authorization: `Bearer ${authToken}` }
          })
        ]);

        setWarehouseOptions(
          whRes.data.data.map((w: any) => ({
            value: w.warehouse_id,
            label: w.name
          }))
        );

        setCategories(catRes.data.category || []);
      } catch {
        toast.error("Initial data load failed.");
      }
    };

    loadData();
  }, [authToken]);

  /* ================= FETCH PRODUCTS ================= */
  const fetchProducts = async (catId: string) => {
    if (!catId || productsMap[catId]) return;

    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/v1/product/category/${catId}`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      setProductsMap(prev => ({
        ...prev,
        [catId]: res.data
      }));
    } catch {
      toast.error("Products fetch error.");
    }
  };

  /* ================= FETCH BATCHES ================= */
  const fetchProductBatches = async (
    index: number,
    productId: string
  ) => {
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/v1/batch`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      const allBatches: any[] = res.data?.data || [];

      // Only batches that contain this product (via batchitem)
      const filtered = allBatches
        .filter(b => b.batchitem?.some((i: any) => i.product_id === productId))
        .map(b => {
          const item = b.batchitem.find((i: any) => i.product_id === productId);
          return {
            batch_number: b.batch_number,
            expiry_date: b.expiry_date,
            mfg_date: b.manufacturing_date,   // schema field name
            stock: Number(item?.available_quantity) || 0
          };
        });

      setRows(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], batchOptions: filtered };
        return updated;
      });
    } catch {
      toast.error("Batch fetch error.");
    }
  };

  /* ================= HANDLE INPUT ================= */
  const handleInputChange = (
    index: number,
    field: keyof TransferItem,
    value: any
  ) => {
    if (!sourceWH && field === "category_id") {
      toast.warning("Pehle Origin Warehouse select karein.");
      return;
    }

    setRows(prev => {
      const updatedRows = [...prev];
      const row = { ...updatedRows[index] };

      row[field] = value;

      if (field === "category_id") {
        row.product_id = "";
        row.batch_no = "";
        row.batchOptions = [];
        row.transferQty = 0;
        row.availableQty = 0;
        fetchProducts(value);
      }

      if (field === "product_id") {
        row.batch_no = "";
        row.batchOptions = [];
        row.transferQty = 0;
        row.availableQty = 0;

        if (value) fetchProductBatches(index, value);

        if (index === prev.length - 1 && value) {
          updatedRows.push(createEmptyRow());
        }
      }

      if (field === "batch_no") {
        const selected = row.batchOptions.find(
          b => b.batch_number === value
        );

        if (selected) {
          row.expiry = selected.expiry_date
            ? new Date(selected.expiry_date)
                .toISOString()
                .split("T")[0]
            : "";

          row.mfg = selected.mfg_date
            ? new Date(selected.mfg_date)
                .toISOString()
                .split("T")[0]
            : "";

          row.availableQty = selected.stock || 0;
          row.transferQty = 0;
        }
      }

      if (field === "transferQty") {
        const qty = Number(value);

        row.transferQty = qty
      }

      updatedRows[index] = row;
      return updatedRows;
    });
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async () => {
    // 1. Debugging: Check karein variables mein data hai ya nahi
    console.log("Source:", sourceWH);
    console.log("Destination:", destWH);

    // 2. Validation
    if (!sourceWH?.value || !destWH?.value) {
      toast.error("Please select both Origin and Destination warehouses.");
      return;
    }

    const validRows = rows.filter(
      (r) => r.product_id && r.batch_no && Number(r.transferQty) > 0
    );

    if (!validRows.length) {
      toast.error("Kam az kam ek valid item add karein.");
      return;
    }

    // 3. Payload Construction (Key names backend requirement ke mutabiq check karein)
    const payload = {
      from_warehouse_id: sourceWH.value, // Ensure value is sent
      to_warehouse_id: destWH.value,   // Ensure value is sent
      transfer_date: new Date().toISOString(),
      items: validRows.map(item => ({
        product_id: item.product_id,
        category_id: item.category_id,
        batch_number: item.batch_no,
        quantity: Number(item.transferQty)
      }))
    };

    console.log("Final Payload to Backend:", payload);

    setIsSubmitting(true);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/v1/Stock/move`,
        payload,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (response.status === 200 || response.status === 201) {
        toast.success("Stock Transfer completed successfully.");
        setSourceWH(null);
        setDestWH(null);
        setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
      }
    } catch (err: any) {
      console.error("API Error:", err.response?.data);
      toast.error(err.response?.data?.message || "Transfer failed.");
    } finally {
      setIsSubmitting(false);
    }
  };
  /* ================= UI (UNCHANGED) ================= */

  const customSelectStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: "#0f172a",
      borderColor: "rgba(255, 255, 255, 0.05)",
      borderRadius: "14px",
      padding: "5px",
      color: "white",
      boxShadow: "none"
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: "#0b1224",
      zIndex: 100
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused
        ? "#1e293b"
        : "transparent",
      color: "white",
      fontSize: "13px"
    }),
    singleValue: (base: any) => ({
      ...base,
      color: "white",
      fontWeight: "600"
    }),
    placeholder: (base: any) => ({
      ...base,
      color: "#64748b"
    })
  };

  const inputClass =
    "w-full bg-[#0f172a] border border-white/5 rounded-xl py-2.5 px-3 text-white text-xs outline-none [&>option]:bg-[#0f172a] [&>option]:text-white";

  const readOnlyInput =
    "w-full bg-black/20 border border-white/5 rounded-xl py-2.5 px-3 text-slate-500 text-xs text-center outline-none cursor-not-allowed";

  return (
    <div className="max-w-[1800px] mx-auto p-6 md:p-10 text-slate-300">
      <Toaster richColors theme="dark" position="top-right" />

      {/* HEADER */}
      <header className="flex items-center gap-6 mb-10 border-b border-white/5 pb-8">
        <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-600/20 ring-4 ring-blue-600/10">
          <ArrowLeftRight className="text-white" size={30} />
        </div>
        <div>
          <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
            Stock <span className="text-blue-500">Transfer</span>
          </h1>
          <p className="text-[10px] text-slate-500 font-bold tracking-[0.4em] mt-2 italic flex items-center gap-2">
            <ShieldCheck size={14} className="text-blue-500" /> BATCH_LEDGER_ACTIVE
          </p>
        </div>
      </header>

      {/* WAREHOUSE SELECTORS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 bg-[#0f172a]/40 p-10 rounded-[2.5rem] border border-white/5">
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-[11px] font-black text-blue-400 uppercase tracking-[0.2em] ml-2">
            <Warehouse size={14}/> Origin Warehouse
          </label>
          <Select 
            options={warehouseOptions} 
            styles={customSelectStyles}
            value={sourceWH} 
            placeholder="Select Source..."
            onChange={(v) => {setSourceWH(v); setRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);}} 
          />
        </div>
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] ml-2">
            <CheckCircle2 size={14}/> Destination Target
          </label>
          <Select 
            options={warehouseOptions} 
            styles={customSelectStyles}
            value={destWH} 
            placeholder="Select Destination..."
            onChange={setDestWH} 
          />
        </div>
      </div>

      {/* DYNAMIC TABLE */}
      <div className="bg-[#020617] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-white/[0.03]">
                <th className="p-6 text-center text-[10px] font-black text-slate-600 uppercase tracking-widest w-16">#</th>
                <th className="p-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Category</th>
                <th className="p-6 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Product</th>
                <th className="p-6 text-left text-[10px] font-black text-blue-400 uppercase tracking-widest">Batch</th>
                <th className="p-6 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">MFG</th>
                <th className="p-6 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">Expiry</th>
                <th className="p-6 text-center text-[10px] font-black text-blue-400 uppercase tracking-widest">Transfer Qty</th>
                <th className="p-6 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((row, index) => (
                <tr key={index} className="group hover:bg-white/[0.01] transition-all">
                  <td className="p-4 text-center font-black text-slate-800 text-xs">{index + 1}</td>
                  
                  <td className="p-3 w-56">
                    <select className={inputClass} value={row.category_id} onChange={(e) => handleInputChange(index, 'category_id', e.target.value)}>
                      <option value="">Select Category</option>
                      {categories.map(cat => <option key={cat.product_category_id} value={cat.product_category_id}>{cat.category}</option>)}
                    </select>
                  </td>

                  <td className="p-3 w-72">
                    <select className={inputClass} disabled={!row.category_id} value={row.product_id} onChange={(e) => handleInputChange(index, 'product_id', e.target.value)}>
                      <option value="">Select Product</option>
                      {(productsMap[row.category_id] || []).map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
                    </select>
                  </td>

                  <td className="p-3 w-52">
                    <select className={`${inputClass} !bg-blue-500/5 !border-blue-500/20 text-blue-400 font-bold`} disabled={!row.product_id} value={row.batch_no} onChange={(e) => handleInputChange(index, 'batch_no', e.target.value)}>
                      <option value="">Select Batch</option>
                      {row.batchOptions.map(b => <option key={b.batch_number} value={b.batch_number}>{b.batch_number}</option>)}
                    </select>
                  </td>

                  <td className="p-3 w-40">
                    <input type="text" readOnly className={readOnlyInput} value={row.mfg || '---'} />
                  </td>

                  <td className="p-3 w-40">
                    <input type="text" readOnly className={readOnlyInput + " !text-orange-500/70"} value={row.expiry || '---'} />
                  </td>

                  {/* <td className="p-3 w-32">
                    <input type="text" readOnly className={readOnlyInput + " !text-emerald-500/70 font-bold"} value={row.availableQty || '0'} />
                  </td> */}

                  <td className="p-3 w-32">
                    <input 
                      type="number" 
                      className="bg-blue-600/10 ring-2 ring-blue-500/20 w-full text-center py-2.5 rounded-xl text-blue-400 font-black text-sm outline-none focus:ring-blue-500" 
                      value={row.transferQty || ''} 
                      onChange={(e) => handleInputChange(index, 'transferQty', Number(e.target.value))} 
                    />
                  </td>

                  <td className="p-3 text-center">
                    <button onClick={() => setRows(rows.filter((_, i) => i !== index))} className="p-2 text-slate-800 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FOOTER */}
        <div className="p-10 bg-white/[0.01] border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4 bg-white/5 px-8 py-4 rounded-[2rem] border border-white/5">
            <Package className="text-blue-500" size={20} />
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Status</span>
              <span className="text-[11px] font-bold text-emerald-500 uppercase italic mt-1">Ready to Transmit</span>
            </div>
          </div>
          
          <button 
            onClick={handleSubmit}
            disabled={!destWH || isSubmitting || !rows.some(r => r.transferQty > 0)}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-black px-20 py-6 rounded-[2rem] uppercase text-[12px] tracking-[0.4em] transition-all flex items-center justify-center gap-4 shadow-2xl shadow-blue-500/40 active:scale-95 disabled:opacity-20"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Transmit Manifest
          </button>
        </div>
      </div>
    </div>
  );
}