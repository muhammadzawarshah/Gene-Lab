"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Cookies from "js-cookie";
import {
  LayoutDashboard,
  ShoppingCart,
  FileCheck,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  ShieldCheck,
  Calendar,
  ChevronRight,
  Sparkles,
  Wallet,
  Loader2,
} from "lucide-react";

type ActivityItem = {
  action: string;
  timestamp: string;
  refId: string;
};

type DashboardStats = {
  revenue: number;
  totalOrders: number;
  pendingInvoices: number;
  lowStock: number;
  recentActivity: ActivityItem[];
};

type StatCardProps = {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  trend?: number;
  tone: string;
  subtitle: string;
  onClick?: () => void;
};

const StatCard = ({ title, value, icon: Icon, trend, tone, subtitle, onClick }: StatCardProps) => (
  <div
    onClick={onClick}
    className={`app-panel group relative overflow-hidden rounded-[2rem] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/20 ${
      onClick ? "cursor-pointer" : ""
    }`}
  >
    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500/60 to-transparent opacity-60" />
    <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-500/10 blur-3xl transition-all duration-300 group-hover:scale-110" />

    <div className="relative z-10 flex items-start justify-between gap-4">
      <div>
        <div
          className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-gradient-to-br text-white shadow-lg ${tone}`}
        >
          <Icon size={24} />
        </div>
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">{title}</p>
        <h3 className="mt-3 text-3xl font-black tracking-tight text-white md:text-[2rem]">{value}</h3>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      </div>

      {trend !== undefined && (
        <div
          className={`app-soft-badge inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] ${
            trend > 0 ? "text-emerald-500" : "text-rose-500"
          }`}
        >
          {trend > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  </div>
);

export default function DistributorManagerDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = Cookies.get("auth_token");
  const currentUserId = Cookies.get("user_id");
  const API_BASE = process.env.NEXT_PUBLIC_API_URL;

  const api = useMemo(
    () =>
      axios.create({
        baseURL: API_BASE,
        headers: { Authorization: `Bearer ${token}` },
      }),
    [token, API_BASE]
  );

  const formattedRevenue = useMemo(
    () =>
      stats
        ? `PKR ${new Intl.NumberFormat("en-PK").format(stats.revenue)}`
        : "PKR 0",
    [stats]
  );

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/api/v1/distribution/manager-dashboard");
        // Backend returns { success: true, data: { revenue, totalOrders, ... } }
        const payload = response.data?.data ?? response.data;
        setStats(payload);
      } catch (err: any) {
        console.error("Dashboard fetch failed:", err);
        setError("Dashboard data load nahi ho saka. Backend check karein.");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [api]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="app-panel-strong flex flex-col items-center rounded-[2rem] px-10 py-8">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
          <p className="mt-4 text-[11px] font-black uppercase tracking-[0.3em] text-blue-500">
            Loading Dashboard
          </p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="app-panel-strong flex flex-col items-center rounded-[2rem] px-10 py-8 text-center">
          <AlertTriangle className="h-12 w-12 text-rose-500" />
          <p className="mt-4 text-[11px] font-black uppercase tracking-[0.3em] text-rose-500">
            {error || "Koi data nahi mila"}
          </p>
        </div>
      </div>
    );
  }

  const quickActions = [
    {
      label: "Create Sales Order",
      sub: "Open a fresh booking flow for your distributor network.",
      icon: ShoppingCart,
      tone: "from-blue-600 to-cyan-500",
      href: "/distributorManager/SalesOrders/CreateSalesOrder",
    },
    {
      label: "Invoice Forge",
      sub: "Review billing, generate invoices, and clear pending dues.",
      icon: FileCheck,
      tone: "from-emerald-500 to-teal-500",
      href: "/distributorManager/Invoices/SaleInvoice",
    },
    {
      label: "Inventory Vault",
      sub: "Track stock health, batches, and warehouse readiness in one place.",
      icon: Package,
      tone: "from-violet-500 to-indigo-500",
      href: "/distributorManager/Inventory/AddStock",
    },
    {
      label: "User Control",
      sub: "Manage team access, activity visibility, and approvals faster.",
      icon: Users,
      tone: "from-amber-500 to-orange-500",
      href: "/distributorManager/Distributors/DistributorList",
    },
  ];

  return (
    <div className="pb-20">
      <section className="app-panel-strong relative overflow-hidden rounded-[2.75rem] p-8 md:p-10">
        <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-sky-400/18 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-6 h-44 w-44 rounded-full bg-blue-500/14 blur-3xl" />

        <div className="relative z-10 grid gap-8 lg:grid-cols-[1.6fr_0.95fr]">
          <div>
            <div className="app-soft-badge inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.26em] text-blue-500">
              <Sparkles size={12} />
              Distribution Manager
            </div>

            <div className="mt-6 max-w-3xl">
              <h1 className="flex flex-wrap items-center gap-3 text-4xl font-black tracking-tight text-white md:text-6xl">
                <LayoutDashboard className="text-blue-500" size={42} />
                Command Center
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-slate-500 md:text-lg">
                Real-time system overview — orders, invoices, stock aur revenue sab backend se live.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="app-soft-badge inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                <ShieldCheck size={12} className="text-emerald-500" />
                Secure Node: {currentUserId || "LOCAL_HOST"}
              </div>
              <div className="app-soft-badge inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                <Calendar size={12} className="text-blue-500" />
                {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="app-panel rounded-[2.2rem] p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">Operator Snapshot</p>

            <div className="mt-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-2xl font-black text-white shadow-xl shadow-blue-500/20">
                {currentUserId ? currentUserId.charAt(0).toUpperCase() : "A"}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-500">Authorized Operator</p>
                <p className="mt-2 text-2xl font-black tracking-tight text-white">Administrator</p>
              </div>
            </div>

            <div className="mt-8 grid gap-3">
              <div className="app-soft-badge flex items-center justify-between rounded-[1.35rem] px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Revenue Flow</span>
                <span className="text-sm font-black text-emerald-500">{formattedRevenue}</span>
              </div>
              <div className="app-soft-badge flex items-center justify-between rounded-[1.35rem] px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Invoice Queue</span>
                <span className="text-sm font-black text-amber-500">{stats.pendingInvoices} open</span>
              </div>
              <div className="app-soft-badge flex items-center justify-between rounded-[1.35rem] px-4 py-3">
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Stock Watch</span>
                <span className="text-sm font-black text-rose-500">{stats.lowStock} alerts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Gross Revenue"
          value={formattedRevenue}
          icon={TrendingUp}
          tone="from-emerald-500 to-teal-500"
          subtitle="Total revenue from all sales orders."
        />
        <StatCard
          title="Active Orders"
          value={stats.totalOrders}
          icon={ShoppingCart}
          tone="from-blue-600 to-cyan-500"
          subtitle="Draft + Approved + Partial orders."
        />
        <StatCard
          title="Pending Invoices"
          value={stats.pendingInvoices}
          icon={FileCheck}
          tone="from-amber-500 to-orange-500"
          subtitle="Invoices awaiting payment or posting."
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStock}
          icon={AlertTriangle}
          tone="from-rose-500 to-pink-500"
          subtitle="Click to view critical products."
          onClick={() => router.push("/distributorManager/Products/ProductList")}
        />
      </section>

      <section className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-[1fr_1.4fr]">
        <div className="space-y-6">
          <div className="app-panel rounded-[2.3rem] p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">Quick Actions</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Fast access modules</h2>
              </div>
              <div className="app-soft-badge rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
                Ready
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {quickActions.map((item) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className="group app-soft-badge flex w-full items-center justify-between rounded-[1.6rem] px-4 py-4 text-left transition-all duration-300 hover:border-blue-500/25 hover:bg-blue-500/5"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-[1rem] bg-gradient-to-br text-white shadow-lg ${item.tone}`}
                    >
                      <item.icon size={22} />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.16em] text-white">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">{item.sub}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-600 transition-all group-hover:translate-x-1 group-hover:text-blue-500" />
                </button>
              ))}
            </div>
          </div>

          <div className="app-panel rounded-[2.3rem] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[1.1rem] bg-gradient-to-br from-blue-600 to-cyan-500 text-white">
                <Wallet size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">Cash Health</p>
                <h3 className="mt-1 text-xl font-black tracking-tight text-white">
                  {stats.totalOrders > 0 ? "Working capital active" : "No orders yet"}
                </h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              {stats.totalOrders} active orders aur {stats.pendingInvoices} pending invoices pipeline mein hain.
              Low stock alerts: {stats.lowStock} items reorder point ke barabar ya neeche hain.
            </p>
          </div>
        </div>

        <div className="app-panel rounded-[2.5rem] p-6 md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">Operational Logs</p>
              <h2 className="mt-2 flex items-center gap-3 text-2xl font-black tracking-tight text-white">
                <Activity className="text-blue-500" />
                Activity feed
              </h2>
            </div>
            <div className="app-soft-badge inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live Feed
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {stats.recentActivity.length === 0 ? (
              <div className="app-soft-badge flex items-center justify-center rounded-[1.8rem] px-5 py-8">
                <p className="text-sm text-slate-500">Koi recent activity nahi mili</p>
              </div>
            ) : (
              stats.recentActivity.map((log, index) => (
                <div
                  key={`${log.refId}-${index}`}
                  className="app-soft-badge flex flex-col gap-4 rounded-[1.8rem] px-5 py-4 transition-all duration-300 hover:border-blue-500/20 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-blue-500/10 text-sm font-black text-blue-500">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-[0.14em] text-white">{log.action}</p>
                      <p className="mt-1 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
                        <Calendar size={12} />
                        {log.timestamp}
                      </p>
                    </div>
                  </div>

                  <div className="text-left md:text-right">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-500">Ref: {log.refId}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500">
                      Verified
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
