"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Search, Package, Clock, CheckCircle2, 
  Truck, ChevronRight, Hash, Calendar, Layers,
  Box, Info, Activity, Loader2, ShieldCheck
} from 'lucide-react';
import { cn } from "@/lib/utils";

// --- Types ---
type POStatus = 'Pending' | 'Approved' | 'Partially Delivered' | 'Delivered' | 'DRAFT';

interface OrderDetail {
  sku: string;
  name: string;
  qty: number;
  price: string;
}

interface Order {
  id: string;
  date: string;
  totalItems: number;
  amount: string;
  status: POStatus;
  progress: number;
  items: OrderDetail[];
}

// Backend 'DRAFT' status ko 'Pending' wali theme dene ke liye mapping
const statusTheme: Record<string, { accent: string; glow: string; icon: any }> = {
  'DRAFT': { accent: '#94a3b8', glow: 'bg-slate-500/5', icon: Clock },
  'Pending': { accent: '#94a3b8', glow: 'bg-slate-500/5', icon: Clock },
  'Approved': { accent: '#3b82f6', glow: 'bg-blue-500/5', icon: CheckCircle2 },
  'Partially Delivered': { accent: '#f59e0b', glow: 'bg-amber-500/5', icon: Truck },
  'Delivered': { accent: '#10b981', glow: 'bg-emerald-500/5', icon: Package },
};

export default function MyOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const token = Cookies.get('auth_token');

  const currentUserId = useMemo(() => {
    const rawUser = Cookies.get('virtue_user');
    if (!rawUser) return null;
    try {
      const decoded = decodeURIComponent(rawUser);
      return JSON.parse(decoded).id;
    } catch (err) { return null; }
  }, []);

  const secureApi = useMemo(() => axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'x-user-id': currentUserId,
      'Content-Type': 'application/json'
    }
  }), [token, API_URL, API_KEY, currentUserId]);

  // --- DATA MAPPING LOGIC ---
  const fetchOrders = useCallback(async () => {
    if (!currentUserId) return; 

    try {
      setLoading(true);
      const response = await secureApi.get(`/api/v1/distribution/listcust-sale/${currentUserId}`);
      
      // Backend data ko UI ke mutabiq map karna
      const mappedOrders: Order[] = (response.data.data || []).map((raw: any) => ({
        id: raw.so_id.toString(),
        date: new Date(raw.order_date).toLocaleDateString('en-GB'), // "DD/MM/YYYY" format
        totalItems: raw.salesorderline?.length || 0,
        amount: `PKR ${raw.total_amount}`,
        status: raw.status, // e.g., 'DRAFT'
        progress: raw.status === 'Delivered' ? 100 : raw.status === 'DRAFT' ? 10 : 50, // Static logic for progress
        items: (raw.salesorderline || []).map((line: any) => ({
          sku: line.product_id.slice(0, 5).toUpperCase(), // Product ID ka chota hissa as SKU
          name: line.product?.name || "Unknown Product",
          qty: line.quantity,
          price: line.unit_price
        }))
      }));

      setOrders(mappedOrders);
      
    } catch (err: any) {
      toast.error("ENCRYPTION ERROR", { description: "Failed to fetch secure consignment data." });
    } finally {
      setLoading(false);
    }
  }, [currentUserId, secureApi]);

  useEffect(() => {
    if (currentUserId) fetchOrders();
  }, [currentUserId, fetchOrders]);

  // Client-side search filter for UI stability
  const filteredOrders = useMemo(() => {
    return orders.filter(o => o.id.includes(searchQuery.toUpperCase()));
  }, [orders, searchQuery]);

  return (
    <div className="min-h-screen p-4 md:p-10 text-slate-300 font-sans bg-[#020617]">
      <Toaster position="top-right" theme="dark" richColors />
      
      {/* HEADER - Same as your UI */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mb-12 flex flex-col lg:flex-row items-center justify-between gap-8 bg-white/[0.01] border border-white/5 p-6 rounded-[2rem] backdrop-blur-3xl relative z-20"
      >
        <div className="flex items-center gap-5">
          <div className="p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 rotate-3">
            <Layers className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase italic">Live <span className="text-blue-500">Consignments</span></h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Secure Node: {currentUserId ? currentUserId.toString().slice(0, 8) : "WAITING..."}...
            </p>
          </div>
        </div>

        <div className="relative group w-full lg:w-96">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-all" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="FILTER BY ORDER ID..." 
            className="w-full bg-[#050b1d] border border-white/10 rounded-full py-4 pl-14 pr-6 text-[10px] font-black tracking-[0.2em] outline-none focus:border-blue-500/40 transition-all text-white placeholder:text-slate-700"
          />
        </div>
      </motion.div>

      {/* ORDER CARDS */}
      <div className="grid grid-cols-1 gap-5 max-w-7xl mx-auto relative z-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Decrypting Ledger...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredOrders.length > 0 ? filteredOrders.map((order, index) => {
              const theme = statusTheme[order.status] || statusTheme['Pending'];
              const isExpanded = expandedId === order.id;

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 100, delay: index * 0.05 }}
                  className={cn(
                    "relative group bg-gradient-to-br from-white/[0.03] to-transparent border border-white/5 rounded-[2.5rem] p-1 transition-all duration-500",
                    isExpanded ? "border-blue-500/40 shadow-2xl shadow-blue-500/5" : "hover:border-white/20"
                  )}
                >
                  <div className="bg-[#020617] rounded-[2.3rem] overflow-hidden relative">
                    <div className="p-8 flex flex-wrap lg:flex-nowrap items-center gap-10">
                      <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: theme.accent }} />

                      <div className="w-full lg:w-64 space-y-3">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Hash size={12} className="text-blue-500" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Reference</span>
                        </div>
                        <h2 className="text-2xl font-black text-white italic">{order.id}</h2>
                        <div className="flex items-center gap-2 text-slate-600 font-bold text-[10px]">
                          <Calendar size={12} /> {order.date}
                        </div>
                      </div>

                      <div className="flex-1 w-full min-w-[280px]">
                        <div className="flex justify-between items-center mb-4">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-xl", theme.glow)}>
                              <theme.icon size={18} style={{ color: theme.accent }} />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-white italic">{order.status}</span>
                          </div>
                          <span className="text-[10px] font-black text-slate-600 uppercase italic">{order.progress}% DISPATCHED</span>
                        </div>
                        <div className="h-4 bg-[#0a0f1d] border border-white/5 rounded-full p-1 shadow-inner overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }} 
                            animate={{ width: `${order.progress}%` }} 
                            className="h-full rounded-full relative"
                            style={{ backgroundColor: theme.accent }}
                          >
                             <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
                          </motion.div>
                        </div>
                      </div>

                      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex items-center gap-8 min-w-[200px]">
                        <div className="h-10 w-[1px] bg-white/10" />
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Items</p>
                          <p className="text-lg font-black text-white italic">{order.totalItems}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Net Worth</p>
                          <p className="text-lg font-black text-blue-500 italic">
                            {order.amount?.split(' ')[1] || "0"} <span className="text-[8px] text-slate-600 underline">PKR</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-center">
                        <motion.button 
                          onClick={() => setExpandedId(isExpanded ? null : order.id)}
                          animate={{ rotate: isExpanded ? 90 : 0 }}
                          whileHover={{ scale: 1.1 }}
                          className={cn(
                            "w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300",
                            isExpanded ? "bg-white text-[#020617]" : "bg-blue-600 text-white shadow-blue-600/20"
                          )}
                        >
                          <ChevronRight size={24} />
                        </motion.button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-white/5 bg-white/[0.01]"
                        >
                          <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="space-y-6">
                              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                <Box size={14} /> Consignment Breakdown
                              </h4>
                              <div className="space-y-3">
                                {order.items.map((item, i) => (
                                  <div key={i} className="flex justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all">
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-bold text-slate-500">#{item.sku}</div>
                                      <span className="text-xs font-black text-white uppercase italic">{item.name}</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-xs font-bold text-slate-400">QTY: {item.qty}</span>
                                      <p className="text-xs font-black text-blue-500 italic">PKR {item.price}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-6">
                              <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] flex items-center gap-2">
                                <Activity size={14} /> Secure Transit Logs
                              </h4>
                              <div className="p-8 rounded-[2rem] bg-blue-500/5 border border-blue-500/10 space-y-6 relative overflow-hidden">
                                 <div className="flex gap-4">
                                   <div className="w-2 h-2 rounded-full bg-blue-500/30 mt-1"/>
                                   <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed italic">Packet verified by secure node. ID: {order.id}</p>
                                 </div>
                                 <div className="flex gap-4">
                                   <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse mt-1 shadow-[0_0_10px_#3b82f6]"/>
                                   <p className="text-[10px] font-bold text-white uppercase leading-relaxed tracking-wider italic">
                                     Current: {order.status === 'Delivered' ? 'Cycle Terminated' : 'Negotiating next logistics hop...'}
                                   </p>
                                 </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            }) : (
              <div className="text-center py-20 bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem]">
                 <Package className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No active consignments found.</p>
              </div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}