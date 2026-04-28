"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import {
  Edit3,
  Trash2,
  Search,
  X,
  Save,
  AlertCircle,
  Hash,
  Database,
  Filter,
  Eye,
  ScanLine,
  Layers3,
} from "lucide-react";
import { Toaster, toast } from "sonner";

const HSN_PREFIX_OPTIONS = ["R", "P", "A", "N", "C"];
const CODE_DIGITS = 4;

type ProductRecord = {
  product_id: string;
  sku_code?: string | null;
  name?: string | null;
  description?: string | null;
  hsn_code?: string | null;
  product_cat_id?: number | null;
  uom_id?: number | null;
  mode_id?: number | null;
  productcategory?: { category?: string | null } | null;
  uom?: { name?: string | null; sub_unit_name?: string | null; conversion_to_base?: string | number | null } | null;
  productmode?: { name?: string | null } | null;
};

type SetupOption = {
  product_category_id?: number;
  category?: string;
  uom_id?: number;
  name?: string;
  sub_unit_name?: string;
  conversion_to_base?: string | number | null;
  mode_id?: number;
};

export default function ProductListPage() {
  const authToken = Cookies.get("auth_token");

  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [categories, setCategories] = useState<SetupOption[]>([]);
  const [units, setUnits] = useState<SetupOption[]>([]);
  const [modes, setModes] = useState<SetupOption[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [skuSearch, setSkuSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [viewProduct, setViewProduct] = useState<ProductRecord | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchInitialData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${authToken}` } };
      const [prodRes, catRes] = await Promise.all([
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product`, config),
        axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/erp/setup-data`, config),
      ]);

      const setupData = catRes.data.data || {};

      setProducts(prodRes.data || []);
      setCategories(setupData.categories || []);
      setUnits(setupData.uoms || []);
      setModes(setupData.modes || []);
    } catch (error) {
      toast.error("Database se contact nahi ho saka.");
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchInitialData();
    }
  }, [authToken]);

  const getModeName = (modeId?: number | null) =>
    modes.find((mode) => mode.mode_id === Number(modeId))?.name || "---";

  const getHsnPrefix = (hsnCode?: string | null) => hsnCode?.split("-")?.[0] || "---";
  const formatUomLabel = (uom?: { name?: string | null; sub_unit_name?: string | null; conversion_to_base?: string | number | null } | null) => {
    if (!uom?.name) return "---";
    if (uom.sub_unit_name && uom.conversion_to_base) {
      return `${uom.name} (1 ${uom.name} = ${uom.conversion_to_base} ${uom.sub_unit_name})`;
    }

    return uom.name;
  };
  const formatSkuCode = (skuCode?: string | null) => {
    const numericValue = Number.parseInt(skuCode || "", 10);
    return Number.isFinite(numericValue) ? String(numericValue).padStart(CODE_DIGITS, "0") : "---";
  };

  const formatHsnCode = (hsnCode?: string | null) => {
    if (!hsnCode) return "---";

    const [prefix, rawNumericPart] = hsnCode.split("-");
    const numericValue = Number.parseInt(rawNumericPart || "", 10);

    if (!prefix || !Number.isFinite(numericValue)) {
      return hsnCode;
    }

    return `${prefix}-${String(numericValue).padStart(CODE_DIGITS, "0")}`;
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this product?")) return;

    const toastId = toast.loading("Processing removal...");
    try {
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/product/${id}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      toast.success("Product removed from inventory.", { id: toastId });
      setProducts((prev) => prev.filter((product) => product.product_id !== id));
    } catch (error) {
      toast.error("Delete request failed.", { id: toastId });
    }
  };

  const openEditModal = (product: ProductRecord) => {
    setCurrentProduct({
      product_id: product.product_id,
      name: product.name || "",
      skuCode: product.sku_code || "",
      hsnCode: product.hsn_code || "",
      hsnPrefix: product.hsn_code?.split("-")?.[0] || "R",
      description: product.description || "",
      categoryId: product.product_cat_id ? String(product.product_cat_id) : "",
      uomId: product.uom_id ? String(product.uom_id) : "",
      modeId: product.mode_id ? String(product.mode_id) : "",
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (product: ProductRecord) => {
    setViewProduct(product);
    setIsViewModalOpen(true);
  };

  const handleEditChange = (field: string, value: string) => {
    const cleanValue = value.replace(/<[^>]*>?/gm, "");
    setCurrentProduct((prev: any) => ({ ...prev, [field]: cleanValue }));
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    const toastId = toast.loading("Syncing changes...");

    try {
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/product/${currentProduct.product_id}`,
        {
          ...currentProduct,
          hsnPrefix: currentProduct.hsnPrefix,
        },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      toast.success("Product details updated!", { id: toastId });
      setIsEditModalOpen(false);
      fetchInitialData();
    } catch (error) {
      toast.error("Update failed. Please check inputs.", { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const normalizedSearch = searchQuery.toLowerCase();
        const normalizedSku = skuSearch.toLowerCase();

        const matchesSearch =
          !searchQuery ||
          product.name?.toLowerCase().includes(normalizedSearch) ||
          product.sku_code?.toLowerCase().includes(normalizedSearch) ||
          product.description?.toLowerCase().includes(normalizedSearch) ||
          product.productcategory?.category?.toLowerCase().includes(normalizedSearch) ||
          (product.productmode?.name || getModeName(product.mode_id)).toLowerCase().includes(normalizedSearch);

        const matchesSku =
          !skuSearch || product.sku_code?.toLowerCase().includes(normalizedSku);

        const matchesCategory =
          !selectedCategory || String(product.product_cat_id) === selectedCategory;

        return matchesSearch && matchesSku && matchesCategory;
      }),
    [products, searchQuery, skuSearch, selectedCategory, modes]
  );

  const thClass =
    "px-4 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 bg-[#0b1224] whitespace-nowrap";
  const tdClass = "px-4 py-4 text-sm text-slate-300 border-b border-white/[0.02] align-top";
  const readOnlyInputClass =
    "w-full bg-[#161f35] border border-white/5 rounded-2xl py-4 px-5 outline-none text-white/70 cursor-not-allowed";

  return (
    <div className="text-slate-300 p-6 md:p-10 font-sans">
      <Toaster richColors theme="dark" position="top-right" />

      <div className="max-w-[1900px] mx-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6 border-b border-white/5 pb-10">
          <div className="flex items-center gap-6">
            <div className="bg-emerald-600 p-4 rounded-2xl shadow-2xl shadow-emerald-900/20">
              <Database className="text-white" size={30} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter">
                SECURE <span className="text-emerald-500">INVENTORY</span>
              </h1>
              <p className="text-[10px] text-slate-600 font-bold tracking-[0.4em]">REAL_TIME_DATA_MANAGEMENT</p>
            </div>
          </div>
        </header>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input
              type="text"
              placeholder="Search by name, description, category or mode..."
              className="bg-[#0f172a] border border-white/5 rounded-2xl py-4 pl-12 pr-6 w-full outline-none focus:ring-2 ring-emerald-500/20 text-sm transition-all"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          <div className="relative md:w-[280px]">
            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              placeholder="Search by SKU..."
              className="bg-[#0f172a] border border-white/5 rounded-2xl py-4 pl-12 pr-6 w-full outline-none focus:ring-2 ring-cyan-500/20 text-sm transition-all"
              value={skuSearch}
              onChange={(event) => setSkuSearch(event.target.value)}
            />
          </div>

          <div className="relative md:w-[250px]">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <select
              className="bg-[#0f172a] border border-white/5 rounded-2xl py-4 pl-12 pr-6 w-full outline-none focus:ring-2 ring-amber-500/20 text-sm transition-all text-slate-300 appearance-none cursor-pointer"
              value={selectedCategory}
              onChange={(event) => setSelectedCategory(event.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.product_category_id} value={category.product_category_id}>
                  {category.category}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-[#0f172a]/40 border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-emerald-600/20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className={`${thClass} pl-10`}>
                    <Hash size={12} />
                  </th>
                  <th className={thClass}>Generated SKU</th>
                  <th className={thClass}>Product Name</th>
                  <th className={thClass}>Description</th>
                  <th className={thClass}>Category</th>
                  <th className={thClass}>Unit</th>
                  <th className={thClass}>Mode</th>
                  <th className={thClass}>HSN Prefix</th>
                  <th className={thClass}>Generated HSN</th>
                  <th className={`${thClass} pr-10 text-center`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {filteredProducts.map((product, index) => (
                  <tr key={product.product_id} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="pl-10 py-4 text-[10px] font-bold text-slate-700">{index + 1}</td>
                    <td className={tdClass}>
                      <span className="bg-emerald-500/5 text-emerald-500 px-3 py-1 rounded-full text-[11px] font-mono font-black border border-emerald-500/10 uppercase">
                        {formatSkuCode(product.sku_code)}
                      </span>
                    </td>
                    <td className={`${tdClass} font-bold text-white whitespace-nowrap`}>{product.name || "---"}</td>
                    <td className={`${tdClass} min-w-[260px] text-slate-400`}>
                      <div className="max-w-[280px] whitespace-normal break-words">
                        {product.description || "---"}
                      </div>
                    </td>
                    <td className={tdClass}>{product.productcategory?.category || "---"}</td>
                    <td className={tdClass}>{formatUomLabel(product.uom)}</td>
                    <td className={tdClass}>{product.productmode?.name || getModeName(product.mode_id)}</td>
                    <td className={tdClass}>{getHsnPrefix(product.hsn_code)}</td>
                    <td className={tdClass}>{formatHsnCode(product.hsn_code)}</td>
                    <td className="pr-10 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-40 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => openViewModal(product)}
                          className="p-2 hover:bg-cyan-500 text-slate-400 hover:text-black rounded-xl transition-all"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 hover:bg-emerald-500 text-slate-400 hover:text-black rounded-xl transition-all"
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.product_id)}
                          className="p-2 hover:bg-red-500 text-slate-400 hover:text-white rounded-xl transition-all"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredProducts.length === 0 && (
              <div className="py-20 text-center text-slate-600 font-bold text-xs uppercase tracking-widest">
                No products found matching your criteria.
              </div>
            )}
          </div>
        </div>
      </div>

      {isViewModalOpen && viewProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setIsViewModalOpen(false)} />
          <div className="relative bg-[#0b1224] border border-white/10 w-full max-w-4xl rounded-[3rem] shadow-3xl p-8 md:p-12">
            <div className="flex justify-between items-center gap-4 mb-10">
              <div className="flex items-center gap-4">
                <div className="bg-cyan-500 p-3 rounded-2xl">
                  <Eye className="text-black" size={24} />
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">View Product</h2>
                  <p className="text-[10px] text-slate-600 font-bold tracking-[0.3em] uppercase">Read only details</p>
                </div>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={30} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                { label: "Generated SKU", value: formatSkuCode(viewProduct.sku_code), icon: Hash },
                { label: "Product Name", value: viewProduct.name || "---", icon: Database },
                { label: "Category", value: viewProduct.productcategory?.category || "---", icon: Layers3 },
                { label: "Unit", value: formatUomLabel(viewProduct.uom), icon: Layers3 },
                { label: "Mode", value: viewProduct.productmode?.name || getModeName(viewProduct.mode_id), icon: Layers3 },
                { label: "HSN Prefix", value: getHsnPrefix(viewProduct.hsn_code), icon: ScanLine },
                { label: "Generated HSN", value: formatHsnCode(viewProduct.hsn_code), icon: ScanLine },
              ].map((item) => (
                <div key={item.label} className="bg-[#161f35] border border-white/5 rounded-[1.75rem] p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-white/5 p-2.5 rounded-xl">
                      <item.icon size={16} className="text-cyan-400" />
                    </div>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.22em]">{item.label}</p>
                  </div>
                  <p className="text-sm md:text-base font-bold text-white break-words">{item.value}</p>
                </div>
              ))}

              <div className="md:col-span-2 bg-[#161f35] border border-white/5 rounded-[1.75rem] p-5">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.22em] mb-3">Description</p>
                <p className="text-sm text-slate-300 leading-7 break-words">{viewProduct.description || "---"}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && currentProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={() => !isUpdating && setIsEditModalOpen(false)}
          />
          <div className="relative bg-[#0b1224] border border-white/10 w-full max-w-5xl max-h-[95vh] overflow-y-auto rounded-[3rem] shadow-3xl p-8 md:p-16">
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-500 p-3 rounded-2xl">
                  <Edit3 className="text-black" size={24} />
                </div>
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter">Modify Product</h2>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={32} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Product Name</label>
                <input
                  type="text"
                  className="w-full bg-[#161f35] border border-white/5 rounded-2xl py-4 px-5 outline-none focus:ring-2 ring-emerald-500/30 transition-all text-white [color-scheme:dark]"
                  value={currentProduct.name || ""}
                  onChange={(event) => handleEditChange("name", event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Generated SKU</label>
                <input type="text" className={readOnlyInputClass} value={formatSkuCode(currentProduct.skuCode)} readOnly />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Mode</label>
                <select
                  className="w-full bg-[#161f35] border border-white/5 rounded-2xl py-4 px-5 outline-none focus:ring-2 ring-emerald-500/30 text-white"
                  value={currentProduct.modeId || ""}
                  onChange={(event) => handleEditChange("modeId", event.target.value)}
                >
                  <option value="">Select Mode</option>
                  {modes.map((mode) => (
                    <option key={mode.mode_id} value={mode.mode_id}>
                      {mode.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">HSN Prefix</label>
                <select
                  className="w-full bg-[#161f35] border border-white/5 rounded-2xl py-4 px-5 outline-none focus:ring-2 ring-emerald-500/30 text-white"
                  value={currentProduct.hsnPrefix || "R"}
                  onChange={(event) => handleEditChange("hsnPrefix", event.target.value)}
                >
                  {HSN_PREFIX_OPTIONS.map((prefix) => (
                    <option key={prefix} value={prefix}>
                      {prefix}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Generated HSN</label>
                <input type="text" className={readOnlyInputClass} value={formatHsnCode(currentProduct.hsnCode)} readOnly />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Category</label>
                <select
                  className="w-full bg-[#161f35] border border-white/5 rounded-2xl py-4 px-5 outline-none focus:ring-2 ring-emerald-500/30 text-white"
                  value={currentProduct.categoryId || ""}
                  onChange={(event) => handleEditChange("categoryId", event.target.value)}
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.product_category_id} value={category.product_category_id}>
                      {category.category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Unit (UOM)</label>
                <select
                  className="w-full bg-[#161f35] border border-white/5 rounded-2xl py-4 px-5 outline-none focus:ring-2 ring-emerald-500/30 text-white"
                  value={currentProduct.uomId || ""}
                  onChange={(event) => handleEditChange("uomId", event.target.value)}
                >
                  <option value="">Select UOM</option>
                  {units.map((unit) => (
                    <option key={unit.uom_id} value={unit.uom_id}>
                      {formatUomLabel(unit)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Description / Details</label>
                <textarea
                  className="w-full bg-[#161f35] border border-white/5 rounded-2xl py-4 px-5 outline-none focus:ring-2 ring-emerald-500/30 text-white h-32 resize-none"
                  value={currentProduct.description || ""}
                  onChange={(event) => handleEditChange("description", event.target.value)}
                />
              </div>
            </div>

            <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-white/5 pt-10">
              <div className="flex items-center gap-3 text-slate-500 italic text-[11px] font-bold uppercase tracking-widest">
                <AlertCircle size={16} className="text-emerald-500" />
                This action will permanently overwrite records.
              </div>
              <button
                disabled={isUpdating}
                onClick={handleUpdate}
                className="w-full md:w-auto bg-white text-black px-16 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] hover:bg-emerald-600 hover:text-white transition-all shadow-2xl active:scale-95 flex items-center justify-center gap-4"
              >
                {isUpdating ? "Processing..." : "Sync Changes"}
                <Save size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
