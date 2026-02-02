"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';
import { 
  Plus, Trash2, User, Package, Send, Calculator, Loader2 
} from 'lucide-react';

// --- Types ---
interface OrderItem {
  id: number;
  categoryId: string; 
  productId: string;
  qty: number;
  price: number; 
  availableProducts: any[]; 
}

export default function CreateSalesOrder() {
  const [items, setItems] = useState<OrderItem[]>([
    { id: Date.now(), categoryId: '', productId: '', qty: 1, price: 0, availableProducts: [] }
  ]);
  
  const [distributors, setDistributors] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedDistributor, setSelectedDistributor] = useState("");
  const [issubmitting, setIsSubmitting] = useState(false);

  // API Config
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const token = Cookies.get('virtue_token');
  const currentUserId = Cookies.get('user_id'); 

  const secureApi = useMemo(() => axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
    }
  }), [token, API_URL, API_KEY]);

  // Load Distributors & Categories
  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const [distRes, catRes] = await Promise.all([
          secureApi.get('/api/v1/party/customers'),
          secureApi.get('/api/v1/category/')
        ]);
        setDistributors(distRes.data || []);
        setCategories(catRes.data?.category || []);
      } catch (err) {
        toast.error("Master data load failed.");
      }
    };
    fetchMasterData();
  }, [secureApi]);

  // Handle Category Selection
  const handleCategoryChange = async (itemId: number, catId: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, categoryId: catId, productId: '', price: 0, availableProducts: [] } : item
    ));

    if (!catId) return;

    try {
      const res = await secureApi.get(`/api/v1/product/category/${catId}`);
      const productData = res.data?.data || res.data || [];
      setItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, availableProducts: productData } : item
      ));
    } catch (err) {
      toast.error("Products load failed.");
    }
  };

  // Handle Product Selection & unit_price Extraction
  const handleProductChange = (itemId: number, prodId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const selectedProd = item.availableProducts.find(p => p.product_id === prodId);
        
        let finalPrice = 0;
        if (selectedProd && Array.isArray(selectedProd.productprice) && selectedProd.productprice.length > 0) {
          // Aapke backend mein 'unit_price' key aa rahi hai
          const priceObj = selectedProd.productprice[0];
          finalPrice = priceObj.unit_price || priceObj.price || 0;
        }

        return { 
          ...item, 
          productId: prodId, 
          price: Number(finalPrice) || 0 
        };
      }
      return item;
    }));
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), categoryId: '', productId: '', qty: 1, price: 0, availableProducts: [] }]);
  };

  const removeItem = (id: number) => {
    if (items.length > 1) setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: number, field: keyof OrderItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const grandTotal = items.reduce((acc, item) => acc + (item.qty * item.price), 0);

  // Place Order
  const transmitOrder = async () => {
    if (!selectedDistributor) return toast.error("Please select a distributor.");
    if (grandTotal <= 0) return toast.error("Order amount cannot be zero.");

    try {
      setIsSubmitting(true);
      const payload = {
        user_id: currentUserId,
        customerId: selectedDistributor,
        items: items.map(({ productId, qty, price }) => ({ productId, qty, price })),
        total_amount: grandTotal,
      };

      await secureApi.post('/api/v1/distribution/sales-orders', payload);
      toast.success("Order Placed Successfully!");
      
      // Reset Form
      setItems([{ id: Date.now(), categoryId: '', productId: '', qty: 1, price: 0, availableProducts: [] }]);
      setSelectedDistributor("");
    } catch (err) {
      toast.error("Failed to place order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 p-6 lg:p-12 min-h-screen text-white bg-[#020617]">
      <Toaster position="top-right" theme="dark" richColors />
      
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-black italic uppercase text-blue-500 tracking-tighter">
          Create Sales Order
        </h1>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          
          {/* Distributor Selection */}
          <div className="bg-white/[0.02] border border-white/[0.08] p-8 rounded-[2rem] shadow-2xl">
            <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2">
              <User size={14} className="text-blue-500" /> Distributor Node
            </h3>
            <select 
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-sm font-bold text-white outline-none focus:border-blue-500/50"
              value={selectedDistributor}
              onChange={(e) => setSelectedDistributor(e.target.value)}
            >
              <option value="" className="bg-[#020617]">Select Target Distributor</option>
              {distributors.map((d) => (
                <option key={d.party_id} value={d.party_id} className="bg-[#020617]">{d.name}</option>
              ))}
            </select>
          </div>

          {/* Product Items */}
          <div className="bg-white/[0.02] border border-white/[0.08] p-8 rounded-[2rem]">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                <Package size={14} className="text-purple-500" /> SKU Manifest
              </h3>
              <button onClick={addItem} className="px-5 py-2 bg-blue-600 rounded-xl text-[10px] font-black uppercase hover:bg-blue-500">+ Add New SKU</button>
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {items.map((item) => (
                  <motion.div key={item.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid grid-cols-12 gap-4 items-center bg-white/[0.01] p-5 rounded-[1.5rem] border border-white/[0.05] hover:border-blue-500/20 transition-all">
                    
                    {/* Category Dropdown */}
                    <div className="col-span-12 md:col-span-3">
                      <select 
                        onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                        value={item.categoryId}
                        className="w-full bg-transparent text-[11px] font-black text-slate-400 uppercase outline-none"
                      >
                        <option value="" className="bg-[#020617]">Category</option>
                        {categories.map((c) => (
                          <option key={c.product_category_id} value={c.product_category_id} className="bg-[#020617]">{c.category}</option>
                        ))}
                      </select>
                    </div>

                    {/* Product Dropdown */}
                    <div className="col-span-12 md:col-span-4 border-l border-white/10 pl-4">
                      <select 
                        disabled={!item.categoryId}
                        value={item.productId}
                        onChange={(e) => handleProductChange(item.id, e.target.value)}
                        className="w-full bg-transparent text-sm font-bold text-white outline-none"
                      >
                        <option value="" className="bg-[#020617]">Choose Product</option>
                        {item.availableProducts.map((p) => (
                          <option key={p.product_id} value={p.product_id} className="bg-[#020617]">{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity Input */}
                    <div className="col-span-6 md:col-span-2">
                      <input 
                        type="number" 
                        value={item.qty} 
                        onChange={(e) => updateItem(item.id, 'qty', Math.max(1, parseInt(e.target.value) || 0))} 
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs font-mono text-center text-white outline-none" 
                      />
                    </div>

                    {/* Price Display */}
                    <div className="col-span-6 md:col-span-2 text-center text-sm font-black text-emerald-500 font-mono">
                      {item.price > 0 ? item.price.toLocaleString() : "0.00"}
                    </div>

                    {/* Remove Action */}
                    <div className="col-span-12 md:col-span-1 flex justify-end">
                      <button onClick={() => removeItem(item.id)} className="text-slate-600 hover:text-rose-500 p-2">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Summary Sticky Card */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-600/20 to-transparent border border-blue-500/20 p-10 rounded-[2.5rem] sticky top-10 text-center shadow-2xl">
            <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-10">
              <Calculator size={14} className="inline mr-2" /> Settlement
            </h3>
            <div className="flex flex-col gap-2 mb-10">
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Grand Total</span>
              <span className="text-5xl font-black text-white italic tracking-tighter font-mono">
                PKR {grandTotal.toLocaleString()}
              </span>
            </div>
            <button 
              disabled={issubmitting} 
              onClick={transmitOrder} 
              className="w-full py-5 bg-white text-black rounded-[1.5rem] font-black uppercase text-xs hover:bg-blue-600 hover:text-white transition-all shadow-xl"
            >
              {issubmitting ? <Loader2 className="animate-spin" size={20} /> : "Complete Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}