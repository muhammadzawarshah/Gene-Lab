"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { 
  Search, RefreshCcw, Database, 
  Warehouse, ShieldCheck, Loader2, Calendar,
  Hash, Package, DollarSign, Activity
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

  const authToken = Cookies.get('auth_token');

  const secureApi = axios.create({
    baseURL: API_BASE,
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  // --- 1. FETCH ALL WAREHOUSES ---
  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const res = await secureApi.get('/api/v1/warehouse/list');
        setWarehouses(res.data.data || []);
      } catch (err) {
        toast.error("WAREHOUSE_FETCH_ERROR");
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchWarehouses();
  }, []);

  // --- 2. FETCH STOCK BY WAREHOUSE ID (Using your new Controller Logic) ---
  const fetchStock = async (warehouseId: string) => {
    if (!warehouseId) return;
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
      }));
      setStockData(mappedData);
      toast.success("LEDGER_SYNC_COMPLETE", { description: `${mappedData.length} items loaded.` });
    } catch (err: any) {
      // 404 = warehouse exists but has no stock — show empty table, not an error
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
    fetchStock(id);
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
                  <option value="" className="bg-slate-950">--- SELECT WAREHOUSE ---</option>
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
            onClick={() => fetchStock(selectedWarehouse)}
            disabled={!selectedWarehouse || isLoading}
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
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {!selectedWarehouse ? (
                <tr>
                  <td colSpan={7} className="py-40 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-20">
                      <Database size={60} />
                      <p className="text-xs font-black uppercase tracking-[0.5em]">Select a warehouse to decrypt stock data</p>
                    </div>
                  </td>
                </tr>
              ) : isLoading ? (
                <tr>
                   <td colSpan={7} className="py-40 text-center">
                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Querying Node Database...</p>
                  </td>
                </tr>
              ) : filteredData.length > 0 ? (
                filteredData.map((row, index) => (
                  <tr key={row.id} className="group hover:bg-emerald-500/[0.02] transition-colors">
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
                        row.stock > 0 ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5" : "text-rose-400 border-rose-500/20 bg-rose-500/5"
                      )}>
                        {row.stock}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                      <div className="text-[10px] font-bold text-slate-500 italic">
                        {row.reserved}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="flex items-center gap-1 text-xs font-bold text-blue-400">
                        <DollarSign size={12} />
                        {Number(row.price).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {row.uom}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-center">
                        <div className="flex justify-center">
                          {row.stock > 0 ? (
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                          ) : (
                            <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                          )}
                        </div>
                    </td>
                  </tr>
                ))
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