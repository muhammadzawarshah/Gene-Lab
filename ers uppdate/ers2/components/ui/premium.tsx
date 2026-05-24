"use client";

import React from "react";
import { motion } from "framer-motion";
import { Activity, LucideIcon, Search, Sparkles } from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

type PremiumShellProps = {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function PremiumPage({ children, className, ...props }: PremiumShellProps) {
  return (
    <div className={cn("relative mx-auto w-full max-w-[1720px] pb-16 text-slate-600", className)} {...props}>
      {children}
    </div>
  );
}

type PremiumHeroProps = {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

export function PremiumHero({
  eyebrow = "Gene Laboratories",
  title,
  description,
  icon: Icon = Sparkles,
  meta,
  actions,
  children,
  className,
}: PremiumHeroProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={cn(
        "app-panel-strong premium-hero relative overflow-hidden rounded-[2rem] p-5 md:p-8",
        className
      )}
    >
      <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 left-20 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="app-soft-badge inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-blue-500">
              <Icon size={13} />
              {eyebrow}
            </span>
            {meta}
          </div>
          <h1 className="max-w-5xl text-3xl font-black leading-tight tracking-tight text-white md:text-5xl xl:text-6xl">
            {title}
          </h1>
          {description && (
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-500 md:text-base">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>

      {children && <div className="relative z-10 mt-7">{children}</div>}
    </motion.section>
  );
}

type PremiumCardProps = {
  children: React.ReactNode;
  className?: string;
  strong?: boolean;
};

export function PremiumCard({ children, className, strong = false }: PremiumCardProps) {
  return (
    <div className={cn(strong ? "app-panel-strong" : "app-panel", "rounded-[1.75rem] p-5 md:p-6", className)}>
      {children}
    </div>
  );
}

type MetricCardProps = {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tone?: "blue" | "emerald" | "amber" | "rose" | "violet" | "cyan";
  note?: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

const toneMap = {
  blue: "from-[#125a9d] to-[#0099dc]",
  emerald: "from-emerald-500 to-teal-500",
  amber: "from-amber-500 to-orange-500",
  rose: "from-rose-500 to-pink-500",
  violet: "from-violet-500 to-indigo-500",
  cyan: "from-cyan-500 to-blue-500",
};

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = "blue",
  note,
  className,
  onClick,
}: MetricCardProps) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      onClick={onClick}
      className={cn(
        "app-panel group relative overflow-hidden rounded-[1.6rem] p-5 transition-all hover:border-blue-500/25",
        onClick && "cursor-pointer",
        className
      )}
    >
      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className={cn("mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg", toneMap[tone])}>
            <Icon size={21} />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <div className="mt-2 truncate text-2xl font-black tracking-tight text-white md:text-3xl">{value}</div>
          {note && <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>}
        </div>
      </div>
    </motion.div>
  );
}

type SearchPanelProps = {
  children?: React.ReactNode;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
};

export function SearchPanel({ children, value, onChange, placeholder = "Search records...", className }: SearchPanelProps) {
  return (
    <PremiumCard className={cn("p-3 md:p-4", className)}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        {onChange ? (
          <div className="relative min-w-0">
            <Search className="absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={value}
              onChange={(event) => onChange(event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.6] py-4 pl-12 pr-5 text-sm font-semibold text-white outline-none transition-all focus:border-blue-500/40"
            />
          </div>
        ) : (
          <div />
        )}
        {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
      </div>
    </PremiumCard>
  );
}

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={cn("app-panel flex min-h-[320px] flex-col items-center justify-center rounded-[2rem] border-dashed p-8 text-center", className)}>
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
        <Icon size={30} />
      </div>
      <h3 className="text-xl font-black tracking-tight text-white">{title}</h3>
      {description && <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">{description}</p>}
    </div>
  );
}

type StatusPillProps = {
  children: React.ReactNode;
  tone?: "blue" | "emerald" | "amber" | "rose" | "slate";
  className?: string;
};

const statusTone = {
  blue: "border-blue-500/20 bg-blue-500/10 text-blue-500",
  emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
  amber: "border-amber-500/20 bg-amber-500/10 text-amber-500",
  rose: "border-rose-500/20 bg-rose-500/10 text-rose-500",
  slate: "border-slate-500/15 bg-slate-500/10 text-slate-500",
};

export function StatusPill({ children, tone = "slate", className }: StatusPillProps) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em]", statusTone[tone], className)}>
      {children}
    </span>
  );
}

type PharmaOrbProps = {
  className?: string;
  compact?: boolean;
};

export function PharmaOrb({ className, compact = false }: PharmaOrbProps) {
  return (
    <div
      className={cn(
        "pharma-orb pointer-events-none relative isolate mx-auto",
        compact ? "h-36 w-36" : "h-64 w-64 md:h-80 md:w-80",
        className
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.92),rgba(6,182,212,0.2)_32%,rgba(37,99,235,0.12)_58%,transparent_70%)] blur-[1px]" />
      <div className="pharma-orb-ring absolute inset-6 rounded-full border border-cyan-400/25" />
      <div className="pharma-orb-ring pharma-orb-ring-alt absolute inset-12 rounded-full border border-emerald-400/20" />
      <div className="absolute left-[18%] top-[30%] h-8 w-20 rotate-[-24deg] rounded-full bg-gradient-to-r from-[#2563eb] to-[#06b6d4] shadow-2xl shadow-blue-500/20" />
      <div className="absolute bottom-[28%] right-[15%] h-8 w-24 rotate-[24deg] rounded-full bg-gradient-to-r from-[#10b981] to-[#8b5cf6] shadow-2xl shadow-emerald-500/20" />
      <div className="absolute left-[44%] top-[42%] flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 bg-white/55 text-blue-500 shadow-xl backdrop-blur-md">
        <Activity size={22} />
      </div>
      <span className="absolute left-[12%] top-[16%] h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_22px_rgba(6,182,212,0.55)]" />
      <span className="absolute bottom-[18%] left-[28%] h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_22px_rgba(16,185,129,0.5)]" />
      <span className="absolute right-[20%] top-[22%] h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_18px_rgba(139,92,246,0.45)]" />
    </div>
  );
}

export function PharmaKitVisual({ className }: { className?: string }) {
  return (
    <div className={cn("pharma-kit pointer-events-none relative h-64 w-80", className)} aria-hidden="true">
      <div className="absolute inset-x-10 bottom-6 h-10 rounded-full bg-blue-900/10 blur-2xl" />
      <div className="pharma-kit-wave absolute inset-x-0 top-2 h-32 rounded-[50%] border-t border-blue-300/30" />
      <div className="absolute bottom-8 left-16 h-28 w-44 rounded-[1.5rem] bg-gradient-to-br from-[#dbeafe] via-[#7c8cff] to-[#2f55ff] shadow-[0_30px_55px_rgba(37,99,235,0.28)]">
        <div className="absolute inset-x-8 -top-5 h-9 rounded-t-[1.2rem] border-x-[12px] border-t-[10px] border-[#94a3ff]" />
        <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-white text-blue-600 shadow-xl">
          <span className="text-3xl font-black leading-none">+</span>
        </div>
        <div className="absolute bottom-4 left-1/2 h-3 w-16 -translate-x-1/2 rounded-full bg-white/80" />
      </div>
      <div className="absolute bottom-32 left-28 h-16 w-10 rotate-[-22deg] rounded-full bg-gradient-to-b from-white to-blue-200 shadow-xl">
        <div className="absolute inset-x-0 top-1/2 h-px bg-blue-300" />
        <span className="absolute left-1/2 top-4 h-2 w-2 -translate-x-1/2 rounded-full bg-blue-500" />
      </div>
      <div className="absolute bottom-32 left-44 h-20 w-12 rotate-[18deg] rounded-[0.9rem] bg-gradient-to-b from-violet-200 to-blue-500 shadow-xl">
        <div className="grid grid-cols-2 gap-1 p-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="h-2.5 w-2.5 rounded-full bg-white/80" />
          ))}
        </div>
      </div>
      <div className="absolute left-16 top-16 flex h-12 w-12 items-center justify-center rounded-full bg-white/75 text-blue-600 shadow-xl backdrop-blur">
        <span className="text-3xl font-black">+</span>
      </div>
      <div className="absolute right-10 top-10 h-8 w-8 rounded-full bg-white/75 shadow-xl">
        <span className="absolute inset-2 rotate-45 rounded-full bg-gradient-to-r from-rose-500 to-rose-300" />
      </div>
      <div className="absolute left-28 top-12 h-8 w-8 rounded-full bg-white/75 shadow-xl">
        <span className="absolute inset-2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-300" />
      </div>
    </div>
  );
}

type DataRibbonProps = {
  items: Array<{ label: string; value: React.ReactNode; tone?: "blue" | "emerald" | "amber" | "rose" | "violet" | "cyan" }>;
  className?: string;
};

export function DataRibbon({ items, className }: DataRibbonProps) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {items.map((item) => (
        <div key={item.label} className="app-soft-badge rounded-[1.25rem] px-4 py-3">
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
          <div className="mt-1 text-sm font-black text-white">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function SparklineCard({ values, color = "#2563eb" }: { values: number[]; color?: string }) {
  const data = values.map((value, index) => ({ index, value }));

  return (
    <div className="mt-5 h-16">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`spark-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            fill={`url(#spark-${color.replace("#", "")})`}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PremiumAreaChart({
  data,
  color = "#2563eb",
  label = "Value",
}: {
  data: Array<{ label: string; value: number; comparison?: number }>;
  color?: string;
  label?: string;
}) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="premiumAreaPrimary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="premiumAreaComparison" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#94a3b8" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              border: "1px solid #dce8f3",
              borderRadius: 14,
              boxShadow: "0 18px 40px rgba(8,35,63,0.12)",
            }}
          />
          {data.some((item) => item.comparison !== undefined) && (
            <Area type="monotone" dataKey="comparison" name="Previous" stroke="#94a3b8" strokeWidth={2} fill="url(#premiumAreaComparison)" dot={false} />
          )}
          <Area type="monotone" dataKey="value" name={label} stroke={color} strokeWidth={3} fill="url(#premiumAreaPrimary)" dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PremiumDonutChart({
  data,
  centerLabel,
}: {
  data: Array<{ name: string; value: number; color: string }>;
  centerLabel?: React.ReactNode;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="grid items-center gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
      <div className="relative h-56">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>
              {data.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                border: "1px solid #dce8f3",
                borderRadius: 14,
                boxShadow: "0 18px 40px rgba(8,35,63,0.12)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Total</span>
          <span className="mt-1 text-xl font-black text-slate-900">{centerLabel ?? total.toLocaleString()}</span>
        </div>
      </div>
      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-4 rounded-2xl border border-[#dce8f3] bg-white/65 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
              <span className="text-sm font-bold text-slate-700">{item.name}</span>
            </div>
            <span className="text-sm font-black text-slate-900">{item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
