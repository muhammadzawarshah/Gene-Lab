"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import {
  Search, RefreshCcw, Database,
  Warehouse, ShieldCheck, Loader2,
  Package, DollarSign, Settings2, X, Save
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { Toaster, toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

export default function WarehouseStockLedger() {
  const [stockData, setStockData] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [limitModal, setLimitModal] = useState<any>(null);
  const [limitForm, setLimitForm] = useState({ min_qty: '', max_qty: '' });
  const [isSavingLimits, setIsSavingLimits] = useState(false);

  const authToken = Cookies.get('auth_token');

  const secureApi = axios.create({
    baseURL: API_BASE,
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  // --- 1. INIT: fetch warehouses + all stock together ---
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const [whRes, stockRes] = await Promise.all([
          secureApi.get('/api/v1/warehouse/list'),
          secureApi.get('/api/v1/stock/combined'),
        ]);
        setWarehouses(whRes.data.data || []);
        const mapped = (stockRes.data.data || []).map((item: any) => ({
          id: item.product_id,
          product_name: item.product_name,
          product_code: item.product_code,
          stock: item.available,
          on_hand: item.on_hand,
          reserved: item.reserved,
          price: Number(item.unit_price) || 0,
          uom: item.uom,
          min_qty: null,
          max_qty: null,
        }));
        setStockData(mapped);
      } catch {
        toast.error("INIT_FETCH_ERROR");
      } finally {
        setIsInitialLoading(false);
        setIsLoading(false);
      }
    };
    init();
  }, []);

  // --- 2. FETCH ALL COMBINED STOCK ---
  const fetchAllStock = async () => {
    setIsLoading(true);
    try {
      const res = await secureApi.get('/api/v1/stock/combined');
      const mapped = (res.data.data || []).map((item: any) => ({
        id: item.product_id,
        product_name: item.product_name,
        product_code: item.product_code,
        stock: item.available,
        on_hand: item.on_hand,
        reserved: item.reserved,
        price: Number(item.unit_price) || 0,
        uom: item.uom,
        min_qty: null,
        max_qty: null,
      }));
      setStockData(mapped);
      toast.success("LEDGER_SYNC_COMPLETE", { description: `${mapped.length} items loaded.` });
    } catch {
      toast.error("LEDGER_SYNC_ERROR");
      setStockData([]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. FETCH STOCK BY WAREHOUSE ID ---
  const fetchStock = async (warehouseId: string) => {
    setIsLoading(true);
    try {
      const res = await secureApi.get(`/api/v1/stock/warehouse/${warehouseId}`);
      const mappedData = (res.data.data || []).map((item: any) => ({
        id: item.stock_id,
        product_name: item.product_name,
        product_code: item.product_code,
        stock: item.available,
        on_hand: item.on_hand,
        reserved: item.reserved,
        price: Number(item.unit_price) || 0,
        uom: item.uom,
        min_qty: item.min_qty,
        max_qty: item.max_qty,
      }));
      setStockData(mappedData);
      toast.success("LEDGER_SYNC_COMPLETE", { description: `${mappedData.length} items loaded.` });
    } catch (err: any) {
      if (err.response?.status === 404) {
        setStockData([]);
      } else {
        toast.error("LEDGER_SYNC_ERROR");
        setStockData([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleWarehouseChange = (id: string) => {
    setSelectedWarehouse(id);
    if (!id) {
      fetchAllStock();
    } else {
      fetchStock(id);
    }
  };

  const openLimitModal = (row: any) => {
    setLimitModal(row);
    setLimitForm({
      min_qty: row.min_qty !== null && row.min_qty !== undefined ? String(row.min_qty) : '',
      max_qty: row.max_qty !== null && row.max_qty !== undefined ? String(row.max_qty) : '',
    });
  };

  const saveLimits = async () => {
    if (!limitModal) return;
    setIsSavingLimits(true);
    try {
      await secureApi.put(`/api/v1/stock/limits/${limitModal.id}`, {
        min_qty: limitForm.min_qty !== '' ? Number(limitForm.min_qty) : null,
        max_qty: limitForm.max_qty !== '' ? Number(limitForm.max_qty) : null,
      });
      toast.success("Stock limits updated!");
      setLimitModal(null);
      if (selectedWarehouse) fetchStock(selectedWarehouse); else fetchAllStock();
    } catch {
      toast.error("Limits save karne mein masla hua.");
    } finally {
      setIsSavingLimits(false);
    }
  };

  const getStockStatus = (row: any) => {
    const stock = Number(row.stock);
    const min = row.min_qty !== null && row.min_qty !== undefined ? Number(row.min_qty) : null;
    const max = row.max_qty !== null && row.max_qty !== undefined ? Number(row.max_qty) : null;
    if (stock === 0) return 'OUT';
    if (min !== null && stock <= min) return 'LOW';
    if (max !== null && stock >= max) return 'HIGH';
    return 'OK';
  };

  // --- SEARCH FILTER ---
  const filteredData = useMemo(() => {
    return stockData.filter(item => 
      item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product_code?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, stockData]);

  if (isInitialLoading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#020617] gap-4">
      <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      <p className="text-emerald-500 font-black uppercase tracking-[0.4em] text-[10px]">Initializing Warehouse Matrix...</p>
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-20 p-6 min-h-screen text-slate-300">
      <Toaster theme="dark" position="top-right" richColors />

      {/* --- HEADER & CONTROLS (UI Untouched) --- */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8 border-b border-white/5 pb-10">
        <div className="space-y-4">
          <h1 className="text-5xl font-black text-white italic tracking-tighter uppercase">
            STOCK <span className="text-emerald-500">LEDGER</span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative group min-w-[300px]">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2 block">Select Target Node (Warehouse)</label>
              <div className="relative">
                <Warehouse className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                <select 
                  value={selectedWarehouse}
                  onChange={(e) => handleWarehouseChange(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-xs text-white outline-none focus:border-emerald-500/50 appearance-none font-bold uppercase tracking-wider transition-all"
                >
                  <option value="" className="bg-slate-950">— ALL WAREHOUSES —</option>
                  {warehouses.map(w => (
                    <option key={w.warehouse_id} value={w.warehouse_id} className="bg-slate-950 uppercase">{w.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Product Code or Name..." 
              className="bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-xs text-white outline-none focus:border-emerald-500/50 w-full sm:w-80 transition-all font-bold uppercase"
            />
          </div>
          <button
            onClick={() => selectedWarehouse ? fetchStock(selectedWarehouse) : fetchAllStock()}
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-black px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} /> {isLoading ? "Syncing..." : "Sync Ledger"}
          </button>
        </div>
      </div>

      {/* --- TABLE AREA (UI Untouched) --- */}
      <div className="bg-[#0f172a]/40 border border-white/5 rounded-[3rem] overflow-hidden backdrop-blur-2xl shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-black/40">
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">SNo</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Product Details</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Available Stock</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Reserved</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">Unit Price</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">UOM</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Min</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Max</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Limits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading ? (
                <tr>
                   <td colSpan={7} className="py-40 text-center">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Querying Node Database...</p>
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((row, index) => {
                  const status = getStockStatus(row);
                  return (
                  <tr key={row.id} className={cn(
                    "group transition-colors",
                    status === 'LOW'  ? "bg-rose-500/[0.03] hover:bg-rose-500/[0.06]" :
                    status === 'HIGH' ? "bg-amber-500/[0.03] hover:bg-amber-500/[0.06]" :
                    status === 'OUT'  ? "bg-rose-900/[0.08] hover:bg-rose-900/[0.12]" :
                    "hover:bg-emerald-500/[0.02]"
                  )}>
                    <td className="px-6 py-6 text-center font-mono text-[10px] text-slate-600">{index + 1}</td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-3">
                        <Package size={14} className="text-emerald-500/50" />
                        <div>
                          <p className="font-black text-white uppercase text-xs tracking-tight">{row.product_name}</p>
                          <p className="text-[9px] font-mono text-slate-500">{row.product_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={cn(
                        "text-xs font-black px-3 py-1 rounded-lg border inline-block min-w-[80px]",
                        status === 'LOW'  ? "text-rose-400 border-rose-500/30 bg-rose-500/10" :
                        status === 'HIGH' ? "text-amber-400 border-amber-500/30 bg-amber-500/10" :
                        status === 'OUT'  ? "text-rose-600 border-rose-900/30 bg-rose-900/10" :
                        "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
                      )}>
                        {row.stock}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="text-[10px] font-bold text-slate-500 italic">{row.reserved}</div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-1 text-xs font-bold text-blue-400">
                        <DollarSign size={12} />
                        {Number(row.price).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{row.uom}</span>
                    </td>
                    <td className="px-6 py-6 text-center font-mono text-[11px] text-slate-500">
                      {row.min_qty !== null && row.min_qty !== undefined ? row.min_qty : <span className="opacity-30">—</span>}
                    </td>
                    <td className="px-6 py-6 text-center font-mono text-[11px] text-slate-500">
                      {row.max_qty !== null && row.max_qty !== undefined ? row.max_qty : <span className="opacity-30">—</span>}
                    </td>
                    <td className="px-6 py-6 text-center">
                      <span className={cn(
                        "text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest border",
                        status === 'LOW'  ? "text-rose-400 bg-rose-500/10 border-rose-500/20" :
                        status === 'HIGH' ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                        status === 'OUT'  ? "text-rose-600 bg-rose-900/10 border-rose-900/20" :
                        "text-emerald-400 bg-emerald-500/5 border-emerald-500/10"
                      )}>
                        {status === 'LOW' ? '⚠ LOW' : status === 'HIGH' ? '⚠ HIGH' : status === 'OUT' ? '✕ OUT' : '✓ OK'}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      {selectedWarehouse ? (
                        <button
                          onClick={() => openLimitModal(row)}
                          className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:border-emerald-500/40 transition-all"
                          title="Set Min/Max limits"
                        >
                          <Settings2 size={14} />
                        </button>
                      ) : (
                        <span className="opacity-20 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-40 text-center text-[10px] font-black uppercase tracking-[0.5em] text-slate-700">
                    No Stock Assets Found in this Node
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* SECURITY FOOTER */}
      <div className="flex items-center justify-between opacity-40 px-8">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em]">
          <ShieldCheck size={12} className="text-emerald-500" />
          End-to-End Encrypted Session
        </div>
        <p className="text-[9px] font-mono tracking-tighter uppercase">NODE_SYNC_STABLE :: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}