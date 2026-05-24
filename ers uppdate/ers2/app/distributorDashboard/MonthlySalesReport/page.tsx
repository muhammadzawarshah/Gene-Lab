"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { CalendarDays, Loader2, PackageCheck, Save, Search } from "lucide-react";
import { Toaster, toast } from "sonner";

type ProductLine = {
  productId: string;
  productName: string;
  orderedQty: number;
  soldQty: string;
};

const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function CustomerMonthlySalesReport() {
  const [month, setMonth] = useState(currentMonth());
  const [products, setProducts] = useState<ProductLine[]>([]);
  const [search, setSearch] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = Cookies.get("auth_token");
  const userId = Cookies.get("userId") || Cookies.get("user_id") || "";
  const API = process.env.NEXT_PUBLIC_API_URL;
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !userId) return;
      setLoading(true);
      try {
        const [ordersRes, reportRes] = await Promise.all([
          axios.get(`${API}/api/v1/distribution/listcust-sale/${userId}`, { headers }),
          axios.get(`${API}/api/v1/distribution/customer-monthly-sales/${userId}/${month}`, { headers }).catch(() => ({ data: { data: [] } })),
        ]);

        const reportMap = new Map<string, string>(
          (reportRes.data.data || []).map((row: any) => [row.product_id, String(row.sold_qty || "")])
        );

        const productMap = new Map<string, ProductLine>();
        (ordersRes.data.data || []).forEach((order: any) => {
          (order.salesorderline || []).forEach((line: any) => {
            const productId = line.product_id;
            if (!productId) return;
            const current = productMap.get(productId) || {
              productId,
              productName: line.product?.name || "Unknown Product",
              orderedQty: 0,
              soldQty: reportMap.get(productId) || "",
            };
            current.orderedQty += toNumber(line.quantity);
            productMap.set(productId, current);
          });
        });

        setProducts(Array.from(productMap.values()));
      } catch {
        toast.error("Monthly sales report data load nahi ho saka.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, userId, API, month]);

  const filteredProducts = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return products;
    return products.filter((product) => product.productName.toLowerCase().includes(term));
  }, [products, search]);

  const totals = useMemo(
    () =>
      products.reduce(
        (acc, product) => {
          acc.ordered += product.orderedQty;
          acc.sold += toNumber(product.soldQty);
          return acc;
        },
        { ordered: 0, sold: 0 }
      ),
    [products]
  );

  const updateSoldQty = (productId: string, soldQty: string) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.productId === productId
          ? { ...product, soldQty }
          : product
      )
    );
  };

  const handleSubmit = async () => {
    const items = products
      .filter((product) => product.productId && product.soldQty !== "")
      .map((product) => ({
        productId: product.productId,
        soldQty: toNumber(product.soldQty),
      }));

    if (!items.length) {
      toast.error("Kam az kam ek product ki sold quantity enter karein.");
      return;
    }

    setSaving(true);
    try {
      await axios.post(
        `${API}/api/v1/distribution/customer-monthly-sales`,
        { userId, reportMonth: month, remarks, items },
        { headers }
      );
      toast.success("Monthly sales report submit ho gayi.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Report save nahi ho saki.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen p-4 text-slate-900 md:p-8">
      <Toaster richColors theme="light" position="top-right" />

      <div className="mx-auto max-w-[1300px] space-y-6">
        <section className="rounded-[1.5rem] border border-blue-100 bg-white p-6 shadow-[0_10px_30px_rgba(15,42,70,0.06)] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-700">
                <CalendarDays size={14} /> Customer Month End
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-slate-950 md:text-5xl">
                Monthly Sales Report
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold text-slate-500">
                Yahan month ke end par product-wise enter karein ke is month kitne products sale hue.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
              />
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Submit
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Metric label="Products" value={products.length.toLocaleString()} />
          <Metric label="Ordered Qty" value={totals.ordered.toLocaleString()} />
          <Metric label="Sold Qty Entered" value={totals.sold.toLocaleString()} />
        </section>

        <section className="rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,42,70,0.06)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <h2 className="text-sm font-black uppercase tracking-[0.22em] text-slate-600">Product Sales Entry</h2>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search product..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none focus:border-blue-400 focus:bg-white md:w-80"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-blue-600">
              <Loader2 className="animate-spin" size={42} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-slate-400">
              <PackageCheck size={46} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">No products found from your orders</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  <tr>
                    <th className="px-6 py-5">Product</th>
                    <th className="px-6 py-5 text-right">Ordered Qty</th>
                    <th className="px-6 py-5 text-right">Sold Qty This Month</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => (
                    <tr key={product.productId} className="hover:bg-blue-50/30">
                      <td className="px-6 py-5 text-sm font-black uppercase text-slate-950">{product.productName}</td>
                      <td className="px-6 py-5 text-right text-sm font-black text-slate-500">{product.orderedQty.toLocaleString()}</td>
                      <td className="px-6 py-5">
                        <input
                          type="number"
                          min={0}
                          value={product.soldQty}
                          onChange={(event) => updateSoldQty(product.productId, event.target.value)}
                          placeholder="0"
                          className="ml-auto block h-11 w-44 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-right text-sm font-black text-blue-700 outline-none focus:border-blue-400 focus:bg-white"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-slate-100 p-6">
            <textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Remarks optional..."
              className="min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-900 outline-none focus:border-blue-400 focus:bg-white"
            />
          </div>
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,42,70,0.045)]">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}
