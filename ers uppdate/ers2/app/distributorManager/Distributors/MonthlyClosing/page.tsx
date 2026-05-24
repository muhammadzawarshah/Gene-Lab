"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { CalendarDays, Download, Loader2, PackageCheck, Search, TrendingUp, Truck, Users } from "lucide-react";
import { Toaster, toast } from "sonner";

type ProductRow = {
  productId: string;
  productName: string;
  orderedQty: number;
  sentQty: number;
};

type DistributorSummary = {
  partyId: string;
  distributorName: string;
  orderedQty: number;
  sentQty: number;
  productMap: Map<string, ProductRow>;
};

const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getMonthBounds = (monthValue: string) => {
  const [year, month] = monthValue.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return { start, end };
};

const isInsideMonth = (dateValue: string | null | undefined, monthValue: string) => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const { start, end } = getMonthBounds(monthValue);
  return date >= start && date < end;
};

const getCurrentMonthValue = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
};

export default function MonthlyClosingReport() {
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [monthlyReports, setMonthlyReports] = useState<any[]>([]);
  const [month, setMonth] = useState(getCurrentMonthValue());
  const [search, setSearch] = useState("");
  const [expandedParty, setExpandedParty] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authToken = Cookies.get("auth_token");
  const headers = { Authorization: `Bearer ${authToken}` };
  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const fetchReportData = async () => {
      if (!authToken) return;
      setIsLoading(true);
      try {
        const [deliveriesRes, monthlyReportsRes] = await Promise.all([
          axios.get(`${API_BASE}/api/v1/distribution/listdel`, { headers }),
          axios.get(`${API_BASE}/api/v1/distribution/manager-monthly-sales/${month}`, { headers }).catch(() => null),
        ]);
        const deliveryRows = deliveriesRes.data.data || [];
        let submittedReports = monthlyReportsRes?.data?.data || [];

        if (!submittedReports.length) {
          const customerMap = new Map<string, { party_id: string; name: string; user_id: number }>();
          deliveryRows.forEach((delivery: any) => {
            const party = delivery.salesorder?.party;
            if (party?.user_id) {
              customerMap.set(String(party.user_id), {
                party_id: party.party_id || delivery.salesorder?.party_id_customer,
                name: party.name,
                user_id: Number(party.user_id),
              });
            }
          });

          const fallbackReports = await Promise.all(
            Array.from(customerMap.values()).map(async (customer) => {
              try {
                const reportRes = await axios.get(`${API_BASE}/api/v1/distribution/customer-monthly-sales/${customer.user_id}/${month}`, { headers });
                return (reportRes.data.data || []).map((report: any) => ({
                  ...report,
                  party_id: report.party_id || customer.party_id,
                  party: report.party || customer,
                }));
              } catch {
                return [];
              }
            })
          );

          submittedReports = fallbackReports.flat();
        }

        setDeliveries(deliveryRows);
        setMonthlyReports(submittedReports);
      } catch {
        toast.error("Monthly closing report data load nahi ho saka.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportData();
  }, [authToken, API_BASE, month]);

  const reportRows = useMemo(() => {
    const map = new Map<string, DistributorSummary>();

    const getSummary = (partyId: string, name: string) => {
      const key = partyId || name || "unknown";
      if (!map.has(key)) {
        map.set(key, {
          partyId: key,
          distributorName: name || "Unknown Distributor",
          orderedQty: 0,
          sentQty: 0,
          productMap: new Map<string, ProductRow>(),
        });
      }
      return map.get(key)!;
    };

    const addProduct = (
      summary: DistributorSummary,
      productId: string,
      productName: string,
      orderedQty: number,
      sentQty: number
    ) => {
      const key = productId || productName || "unknown-product";
      const current = summary.productMap.get(key) || {
        productId: key,
        productName: productName || "Unknown Product",
        orderedQty: 0,
        sentQty: 0,
      };

      current.orderedQty += orderedQty;
      current.sentQty += sentQty;
      summary.productMap.set(key, current);
    };

    monthlyReports.forEach((report) => {
      const qty = toNumber(report.sold_qty);
      const summary = getSummary(report.party_id, report.party?.name);
      summary.orderedQty += qty;
      addProduct(summary, report.product_id, report.product?.name, qty, 0);
    });

    deliveries
      .filter((delivery) => isInsideMonth(delivery.delv_date || delivery.created_at, month))
      .forEach((delivery) => {
        const salesOrder = delivery.salesorder || {};
        const summary = getSummary(salesOrder.party_id_customer, salesOrder.party?.name);
        (delivery.deliverynoteline || []).forEach((line: any) => {
          const qty = toNumber(line.delivered_qty);
          summary.sentQty += qty;
          addProduct(summary, line.product_id, line.product?.name, 0, qty);
        });
      });

    return Array.from(map.values())
      .filter((row) => row.distributorName.toLowerCase().includes(search.toLowerCase().trim()))
      .sort((a, b) => b.sentQty - a.sentQty);
  }, [monthlyReports, deliveries, month, search]);

  const totals = useMemo(
    () =>
      reportRows.reduce(
        (acc, row) => {
          acc.orderedQty += row.orderedQty;
          acc.sentQty += row.sentQty;
          return acc;
        },
        { orderedQty: 0, sentQty: 0 }
      ),
    [reportRows]
  );

  const exportCsv = () => {
    const lines = [
      "Distributor,Product,Month,Sale Qty,Sent Qty,Remaining Qty",
      ...reportRows.flatMap((row) =>
        Array.from(row.productMap.values()).map((product) => {
          const remaining = Math.max(product.sentQty - product.orderedQty, 0);
          return [
            row.distributorName,
            product.productName,
            month,
            product.orderedQty,
            product.sentQty,
            remaining,
          ]
            .map((item) => `"${String(item).replace(/"/g, '""')}"`)
            .join(",");
        })
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Monthly_Closing_${month}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-4 text-slate-900 md:p-8">
      <Toaster richColors theme="light" position="top-right" />

      <div className="mx-auto max-w-[1500px] space-y-6">
        <section className="overflow-hidden rounded-[1.5rem] border border-blue-100 bg-white p-6 shadow-[0_10px_30px_rgba(15,42,70,0.06)] md:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-700">
                <CalendarDays size={14} /> Month End Closing
              </div>
              <h1 className="text-4xl font-black uppercase tracking-tight text-slate-950 md:text-5xl">
                Distributor Closing Report
              </h1>
              <p className="mt-3 max-w-3xl text-sm font-semibold text-slate-500">
                Har distributor ka monthly view: is month order/sale quantity, hum ne kitna bheja, aur kitna remaining hai.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search distributor..."
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-bold text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white sm:w-72"
                />
              </div>
              <input
                type="month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none transition-all focus:border-blue-400 focus:bg-white"
              />
              <button
                onClick={exportCsv}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-blue-500"
              >
                <Download size={16} /> Export
              </button>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard icon={Users} label="Distributors" value={reportRows.length.toLocaleString()} tone="blue" />
          <StatCard icon={TrendingUp} label="Customer Sold Qty" value={totals.orderedQty.toLocaleString()} tone="emerald" />
          <StatCard icon={Truck} label="Sent Qty" value={totals.sentQty.toLocaleString()} tone="violet" />
        </section>

        <section className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,42,70,0.06)]">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="text-sm font-black uppercase tracking-[0.22em] text-slate-600">Distributor Wise Closing</h2>
          </div>

          {isLoading ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 text-blue-600">
              <Loader2 className="animate-spin" size={42} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Loading monthly closing...</p>
            </div>
          ) : reportRows.length === 0 ? (
            <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-slate-400">
              <PackageCheck size={46} />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">No monthly activity found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left">
                <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  <tr>
                    <th className="px-6 py-5">Distributor</th>
                    <th className="px-6 py-5 text-right">Sale Qty</th>
                    <th className="px-6 py-5 text-right">Sent Qty</th>
                    <th className="px-6 py-5 text-right">Remaining</th>
                    <th className="px-6 py-5 text-right">Progress</th>
                    <th className="px-6 py-5 text-right">Products</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportRows.map((row) => {
                    const remaining = Math.max(row.sentQty - row.orderedQty, 0);
                    const progress = row.sentQty > 0 ? Math.min((row.orderedQty / row.sentQty) * 100, 100) : 0;
                    const isExpanded = expandedParty === row.partyId;

                    return (
                      <React.Fragment key={row.partyId}>
                        <tr className="cursor-pointer transition-colors hover:bg-blue-50/40" onClick={() => setExpandedParty(isExpanded ? null : row.partyId)}>
                          <td className="px-6 py-5">
                            <p className="text-sm font-black uppercase text-slate-950">{row.distributorName}</p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">{month}</p>
                          </td>
                          <td className="px-6 py-5 text-right font-black text-emerald-600">{row.orderedQty.toLocaleString()}</td>
                          <td className="px-6 py-5 text-right font-black text-blue-600">{row.sentQty.toLocaleString()}</td>
                          <td className="px-6 py-5 text-right font-black text-rose-600">{remaining.toLocaleString()}</td>
                          <td className="px-6 py-5 text-right">
                            <div className="ml-auto h-2 w-36 overflow-hidden rounded-full bg-slate-100">
                              <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="mt-1 text-[10px] font-black text-slate-500">{progress.toFixed(0)}%</p>
                          </td>
                          <td className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-500">
                            {row.productMap.size} items
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={6} className="bg-slate-50 px-6 py-5">
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                {Array.from(row.productMap.values()).map((product) => {
                                  const productRemaining = Math.max(product.sentQty - product.orderedQty, 0);
                                  return (
                                    <div key={product.productId} className="rounded-2xl border border-slate-200 bg-white p-4">
                                      <p className="text-xs font-black uppercase text-slate-900">{product.productName}</p>
                                      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                                        <MiniMetric label="Sale" value={product.orderedQty} />
                                        <MiniMetric label="Sent" value={product.sentQty} />
                                        <MiniMetric label="Left" value={productRemaining} danger />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "blue" | "emerald" | "violet" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(15,42,70,0.045)]">
      <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${tones[tone]}`}>
        <Icon size={22} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function MiniMetric({ label, value, danger }: { label: string; value: number; danger?: boolean }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-black ${danger ? "text-rose-600" : "text-slate-900"}`}>{value.toLocaleString()}</p>
    </div>
  );
}
