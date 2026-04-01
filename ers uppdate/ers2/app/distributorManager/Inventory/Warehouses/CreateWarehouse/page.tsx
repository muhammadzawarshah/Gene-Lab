"use client";

import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Cookies from 'js-cookie';
import { 
  Warehouse, MapPin, Save, 
  Loader2, ChevronRight, Hash, Globe, ShieldCheck, Search, AlertTriangle
} from 'lucide-react';
import { Toaster, toast } from 'sonner';

// --- 1. ENHANCED SECURITY: SANITIZATION & VALIDATION ---
const sanitizeInput = (str: string) => {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>'"%;()&+]/g, '') 
    .replace(/SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND|--|#/gi, '') 
    .trim();
};

// Updated Logic: Ab ye exact names ko check karega
const getProvinceShortCode = (name: string): string => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('khyber') || lowerName.includes('pakhtunkhwa') || lowerName.includes('kpk')) return 'KPK-';
  if (lowerName.includes('sindh')) return 'SIND-';
  if (lowerName.includes('punjab')) return 'PUN-';
  if (lowerName.includes('balochistan')) return 'BAL-';
  if (lowerName.includes('islamabad')) return 'ICT-';
  return 'WH-';
};

interface LocationData {
  province_id: number; // Based on your API response
  name: string;
}

export default function SecureWarehouseRegistry() {
  const currentUserId = Cookies.get('userId') || 'GUEST_USER';
  const authToken = Cookies.get('auth_token');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [provinces, setProvinces] = useState<LocationData[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  const [honeypot, setHoneypot] = useState('');

  const [formData, setFormData] = useState({
    warehouseCode: '',
    name: '',
    city: '',
    districtId: '',
    districtName: '',
    address: '',
    provinceId: ''
  });

  const api = useMemo(() => axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY'
    }
  }), [authToken]);

  // Initial Fetch: Provinces
  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const res = await api.get('/api/v1/erp/setup-data');
        // Check if data is nested under res.data.data.provinces or direct
        const provData = res.data.data?.provinces || res.data.provinces || [];
        setProvinces(provData);
      } catch (err) {
        toast.error("Security Alert: System could not fetch secure data.");
      }
    };
    if (authToken) fetchProvinces();
  }, [api, authToken]);

  // Handle Province Change: auto-generate code + load districts
  useEffect(() => {
    if (!formData.provinceId) {
      setDistricts([]);
      setFormData(prev => ({ ...prev, warehouseCode: '' }));
      return;
    }

    const selectedProvince = provinces.find(p => p.province_id.toString() === formData.provinceId.toString());
    if (!selectedProvince) return;

    const prefix = getProvinceShortCode(selectedProvince.name);

    const fetchAll = async () => {
      setDistrictsLoading(true);
      try {
        const [distRes, whRes] = await Promise.all([
          api.get(`/api/v1/district?provinceId=${formData.provinceId}`),
          api.get('/api/v1/warehouse/list')
        ]);
        setDistricts(distRes.data.data || []);

        // Count warehouses already in this province to generate next number
        const allWarehouses: any[] = whRes.data.data || [];
        const provinceCount = allWarehouses.filter(
          w => w.location === parseInt(formData.provinceId)
        ).length;
        const nextNum = (provinceCount + 1).toString().padStart(3, '0');
        setFormData(prev => ({ ...prev, warehouseCode: `${prefix}${nextNum}` }));
      } catch (err) {
        toast.error("Failed to load region data.");
      } finally {
        setDistrictsLoading(false);
      }
    };
    fetchAll();
  }, [formData.provinceId, api, provinces]);

  const filteredDistricts = useMemo(() => {
    return districts.filter(d => d.name.toLowerCase().includes(districtSearch.toLowerCase()));
  }, [districts, districtSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: sanitizeInput(value) }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return console.warn("Bot detected.");

    if (!formData.name || !formData.warehouseCode || !formData.provinceId || !formData.districtId) {
      return toast.warning("Validation Error", { description: "All required fields must be verified." });
    }

    setIsSubmitting(true);
    try {
      const securePayload = {
        name: formData.name,
        locationId: parseInt(formData.provinceId),
        districtId: formData.districtId ? parseInt(formData.districtId) : undefined,
        type: formData.warehouseCode.toUpperCase(),
      };

      await api.post('/api/v1/warehouse/create', securePayload);
      toast.success("Entry Committed", { icon: <ShieldCheck className="text-emerald-400" /> });
      
      setFormData({ warehouseCode: '', name: '', city: '', districtId: '', districtName: '', address: '', provinceId: '' });
    } catch (err: any) {
      const errorMsg = err.response?.status === 403 ? "Access Denied: Unrecognized Signature" : "Submission Failed";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // UI Helper Classes
  const inputClass = "w-full bg-[#020617] border border-slate-800 rounded-xl p-3.5 text-white text-sm outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/50 transition-all placeholder:text-slate-700";
  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-[0.2em] ml-1";

  return (
    <div className="text-slate-300 p-4 md:p-10 min-h-screen bg-transparent select-none">
      <Toaster position="top-right" richColors theme="dark" />

      <div className="max-w-4xl mx-auto mb-10 flex justify-between items-end border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">
            System <span className="text-blue-500">Registry</span>
          </h1>
          <p className="text-[10px] text-emerald-500 mt-1 font-mono uppercase">● SSL Encryption Active</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Operator ID</p>
          <p className="text-xs text-slate-400 font-mono">{currentUserId.substring(0, 12)}...</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-[#0f172a]/80 border border-white/10 rounded-[2rem] p-8 shadow-2xl backdrop-blur-xl">
          
          <input 
            type="text" 
            className="absolute opacity-0 -z-50 pointer-events-none" 
            value={honeypot} 
            onChange={(e) => setHoneypot(e.target.value)} 
          />

          <div className="mb-10">
            <label className={labelClass}>Initialize Region Selection *</label>
            <div className="relative group">
              <Globe className="absolute left-4 top-4 text-blue-500 group-focus-within:animate-pulse" size={18} />
              <select 
                name="provinceId" 
                value={formData.provinceId} 
                onChange={handleInputChange} 
                className={inputClass + " pl-12 cursor-pointer appearance-none border-blue-500/20 text-blue-100"}
                required
              >
                <option value="">Select Region...</option>
                {provinces.map(p => (
                  <option key={p.province_id} value={p.province_id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronRight className="absolute right-4 top-4 text-slate-600 rotate-90" size={16} />
            </div>
          </div>

          {formData.provinceId ? (
            <form onSubmit={handleSave} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                <div className="group">
                  <label className={labelClass}>Encrypted Warehouse Code *</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-4 text-slate-600" size={16} />
                    <input 
                      name="warehouseCode" 
                      value={formData.warehouseCode} 
                      onChange={handleInputChange} 
                      className={inputClass + " pl-11 font-mono text-blue-400"} 
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Registry Title *</label>
                  <input name="name" value={formData.name} onChange={handleInputChange} className={inputClass} required />
                </div>

                <div className="relative">
                  <label className={labelClass}>District Verification * {districtsLoading && <Loader2 className="inline animate-spin ml-2" size={10} />}</label>
                  <div 
                    onClick={() => !districtsLoading && setIsDistrictOpen(!isDistrictOpen)}
                    className={inputClass + " flex items-center justify-between cursor-pointer"}
                  >
                    <span className="flex items-center gap-3">
                      <MapPin size={16} className="text-slate-600" />
                      {formData.districtName || "Search District..."}
                    </span>
                    <ChevronRight className={isDistrictOpen ? 'rotate-90' : ''} size={16} />
                  </div>

                  {isDistrictOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-[#020617] border border-white/10 rounded-xl shadow-2xl overflow-hidden">
                      <div className="p-2 bg-slate-900/50 flex items-center gap-2">
                        <Search size={14} className="text-slate-500" />
                        <input 
                          className="bg-transparent w-full text-xs text-white outline-none" 
                          placeholder="Filter Districts..." 
                          value={districtSearch}
                          onChange={(e) => setDistrictSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {filteredDistricts.map(d => (
                          <div 
                            key={d.district_id}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, districtId: d.district_id, districtName: d.name }));
                              setIsDistrictOpen(false);
                            }}
                            className="p-3 text-xs hover:bg-blue-600/30 cursor-pointer border-b border-white/5"
                          >
                            {d.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className={labelClass}>Operational City</label>
                  <input name="city" value={formData.city} onChange={handleInputChange} className={inputClass} />
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Physical Deployment Address</label>
                  <textarea name="address" value={formData.address} onChange={handleInputChange} rows={2} className={inputClass + " resize-none"} />
                </div>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-6 border-t border-white/5">
                <div className="flex items-center gap-2 text-[9px] text-slate-600 uppercase font-black">
                  <AlertTriangle size={12} className="text-amber-600" />
                  Entries are audited in real-time
                </div>
                
                <div className="flex gap-4 w-full md:w-auto">
                  <button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="flex-1 md:flex-none px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <><ShieldCheck size={16} /> Commit Transaction</>}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl opacity-40">
              <ShieldCheck size={48} className="text-slate-700 mb-2" />
              <p className="text-xs uppercase tracking-[0.3em] font-bold">Waiting for regional auth...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}