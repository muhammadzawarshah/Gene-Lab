"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Plus, Trash2, ShoppingBag, Send, 
  Calculator, ChevronDown, Loader2, ShieldAlert
} from 'lucide-react';
import { cn } from "@/lib/utils";

interface Category {
  product_category_id: number;
  category: string;
}

interface Product {
  product_id: string;
  name: string;
  productprice: { unit_price: string }[];
  uom_id: number; // Backend needs uom_id
}

interface POItem {
  categoryId: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
  uomId: number; // Added for backend compatibility
  availableProducts: Product[];
  isLoadingProducts: boolean;
}

export default function CreatePO() {
  const [items, setItems] = useState<POItem[]>([
    { categoryId: '', productId: '', quantity: 1, price: 0, total: 0, uomId: 0, availableProducts: [], isLoadingProducts: false }
  ]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingCats, setLoadingCats] = useState(true);

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

  const secureApi = axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'x-user-id': currentUserId,
      'Content-Type': 'application/json'
    }
  });

  useEffect(() => {
    const fetchCats = async () => {
      try {
        setLoadingCats(true);
        const res = await secureApi.get('/api/v1/category/');
        if (res.data && res.data.category) {
          setCategories(res.data.category);
        }
      } catch (err) {
        toast.error("SYSTEM ERROR", { description: "Categories load nahi ho sakiin." });
      } finally {
        setLoadingCats(false);
      }
    };
    fetchCats();
  }, []);

  const fetchProductsByCategoryId = async (index: number, catId: string) => {
    try {
      const res = await secureApi.get(`/api/v1/product/category/${catId}`);
      setItems(prev => {
        const updated = [...prev];
        updated[index].availableProducts = res.data || [];
        updated[index].isLoadingProducts = false;
        return updated;
      });
    } catch (err) {
      toast.error("PRODUCT ERROR", { description: "Items fetch karne mein masla hua." });
      setItems(prev => {
        const updated = [...prev];
        updated[index].isLoadingProducts = false;
        return updated;
      });
    }
  };

  const updateItem = (index: number, field: keyof POItem, value: any) => {
    const updatedItems = [...items];
    const current = { ...updatedItems[index] };

    if (field === 'categoryId') {
      current.categoryId = value;
      current.productId = '';
      current.price = 0;
      current.total = 0;
      current.availableProducts = [];
      if (value) {
        current.isLoadingProducts = true;
        updatedItems[index] = current;
        setItems(updatedItems);
        fetchProductsByCategoryId(index, value);
      } else {
        updatedItems[index] = current;
        setItems(updatedItems);
      }
    } 
    else if (field === 'productId') {
      const prod = current.availableProducts.find(p => p.product_id === value);
      current.productId = value;
      current.price = parseFloat(prod?.productprice?.[0]?.unit_price || "0");
      current.uomId = prod?.uom_id || 0; // Capture UOM for backend
      current.total = current.quantity * current.price;
      updatedItems[index] = current;
      setItems(updatedItems);
    } 
    else if (field === 'quantity') {
      current.quantity = Math.max(1, value);
      current.total = current.quantity * current.price;
      updatedItems[index] = current;
      setItems(updatedItems);
    }
  };

  const addItem = () => setItems([...items, { categoryId: '', productId: '', quantity: 1, price: 0, total: 0, uomId: 0, availableProducts: [], isLoadingProducts: false }]);
  
  const removeItem = (index: number) => {
    const filtered = items.filter((_, i) => i !== index);
    setItems(filtered.length ? filtered : [{ categoryId: '', productId: '', quantity: 1, price: 0, total: 0, uomId: 0, availableProducts: [], isLoadingProducts: false }]);
  };

  const grandTotal = items.reduce((acc, curr) => acc + curr.total, 0);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      // BACKEND MAPPING: Using 'qty' instead of 'quantity' as per your function
      const payload = {
        createdBy: currentUserId,
        items: items.map(i => ({ 
          productId: i.productId, 
          qty: i.quantity, // Your backend expects item.qty
          price: i.price,
          uomId: i.uomId // Your backend uses Number(item.uomId)
        })),
        totalAmount: grandTotal,
        timestamp: new Date().toISOString()
      };
      
      await secureApi.post('/api/v1/distribution/custsales-order', payload);
      toast.success("PO SUCCESS", { description: "Order submit ho gaya hai." });
      setItems([{ categoryId: '', productId: '', quantity: 1, price: 0, total: 0, uomId: 0, availableProducts: [], isLoadingProducts: false }]);
    } catch (err: any) {
      toast.error("FAILED", { description: err.response?.data?.message || "Submission mein error aaya." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- UI Renders exactly as requested ---
  return (
    <div className="min-h-screen p-8 text-slate-200 bg-[#020617] font-sans">
      <Toaster position="top-right" theme="dark" richColors />
      
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase italic text-white flex items-center gap-3">
            <Plus className="text-blue-500 w-8 h-8 p-1 bg-blue-500/10 rounded-lg shadow-lg" />
            VIRTUE <span className="text-blue-500">ORDERS</span>
          </h1>
          <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.4em] mt-2">Inventory Management System</p>
        </div>
        <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl flex items-center gap-6">
          <div className="text-right border-r border-white/10 pr-6">
            <p className="text-[10px] font-black text-slate-500 uppercase">Subtotal</p>
            <p className="text-xl font-black text-blue-500 italic">PKR {grandTotal.toLocaleString()}</p>
          </div>
          <Calculator className="text-blue-500 opacity-50" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
            {items.map((item, index) => (
              <motion.div key={index} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] group hover:bg-white/[0.04] transition-all">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Category</label>
                    <div className="relative">
                      <select 
                        value={item.categoryId}
                        onChange={(e) => updateItem(index, 'categoryId', e.target.value)}
                        className="w-full bg-[#020617] border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold text-white appearance-none focus:border-blue-500/50 outline-none"
                      >
                        <option value="">{loadingCats ? "Fetching..." : "Select Category"}</option>
                        {categories.map((cat) => (
                          <option key={cat.product_category_id} value={cat.product_category_id}>{cat.category}</option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                  </div>

                  <div className="flex-[2] space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Material Description</label>
                    <div className="relative">
                      <select 
                        disabled={!item.categoryId || item.isLoadingProducts}
                        value={item.productId}
                        onChange={(e) => updateItem(index, 'productId', e.target.value)}
                        className={cn(
                          "w-full bg-[#020617] border border-white/10 rounded-2xl py-3 px-4 text-xs font-bold text-white appearance-none outline-none transition-all",
                          (!item.categoryId || item.isLoadingProducts) ? "opacity-30 cursor-not-allowed" : "focus:border-blue-500/50"
                        )}
                      >
                        <option value="">
                          {item.isLoadingProducts ? "Syncing Database..." : item.categoryId ? "Choose Product" : "← Select Category First"}
                        </option>
                        {item.availableProducts.map((p) => (
                          <option key={p.product_id} value={p.product_id}>{p.name}</option>
                        ))}
                      </select>
                      {item.isLoadingProducts ? <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-blue-500" /> : <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 mt-6 pt-4">
                  <div className="flex items-center gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-slate-500 uppercase">Qty</p>
                      <input 
                        type="number" value={item.quantity} 
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-20 bg-white/[0.03] border border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-white outline-none focus:border-blue-500/50"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                       <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Row Total</p>
                       <p className="text-sm font-black text-white italic">PKR {item.total.toLocaleString()}</p>
                    </div>
                    <button onClick={() => removeItem(index)} className="p-3 rounded-2xl bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 transition-all">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <button onClick={addItem} className="w-full py-5 border-2 border-dashed border-white/5 rounded-[2rem] text-slate-500 hover:text-blue-500 hover:border-blue-500/20 hover:bg-blue-500/5 transition-all font-black text-[10px] uppercase tracking-[0.4em] flex items-center justify-center gap-2">
            <Plus size={16} /> Add New Row
          </button>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-8 p-8 rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-blue-600/10 to-transparent backdrop-blur-3xl shadow-2xl">
            <div className="flex items-center gap-3 mb-8">
              <ShoppingBag className="w-5 h-5 text-blue-500" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Confirmation</h3>
            </div>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase">
                <span>Total Lines</span>
                <span className="text-white">{items.length}</span>
              </div>
              <div className="h-px bg-white/5 my-4" />
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Net Payable</span>
                <span className="text-2xl font-black text-white tracking-tighter italic">PKR {grandTotal.toLocaleString()}</span>
              </div>
            </div>
            <button 
              onClick={handleSubmit} 
              disabled={isSubmitting || grandTotal === 0}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 disabled:opacity-20"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <><Send size={16} /> Submit Order</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}