"use client";

import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import {
  Search,
  Truck,
  Download,
  Printer,
  ArrowUpRight,
  Landmark,
  MessageSquare,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Lock,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  LedgerStatementSheet,
  type LedgerStatementEntry,
  type LedgerStatementSummaryItem,
} from "@/components/layout/LedgerStatementSheet";
import { LedgerStatementModal } from "@/components/layout/LedgerStatementModal";
import { exportLedgerStatementPdf } from "@/lib/ledgerPdf";
import { printElementById } from "@/lib/printElement";

interface VendorEntry {
  id: string;
  invoice_ref: string | null;
  date: string;
  type: "Purchase" | "Payment" | "Return";
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface Vendor {
  id: string;
  name: string;
  company: string;
  phone: string;
  totalDue: number;
  lastPurchase: string;
}

const formatStatementDate = (dateStr?: string) => {
  if (!dateStr) return new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-GB").replace(/\//g, "-");
};

const formatCurrency = (value: number) =>
  `PKR ${Math.abs(Number(value || 0)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function VendorLedger() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [ledgerData, setLedgerData] = useState<Record<string, VendorEntry[]>>({});
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const currentUserId = Cookies.get("userId") || Cookies.get("user_id");
  const token = Cookies.get("auth_token");

  const secureApi = axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      "x-api-key": API_KEY,
      "x-user-id": currentUserId,
    },
  });

  useEffect(() => {
    const fetchVendors = async () => {
      setIsLoading(true);
      try {
        if (!currentUserId || !token) throw new Error("AUTH_INVALID");
        const response = await secureApi.get("/api/v1/finance/parties/summary/SUPPLIER");
        const normalizedVendors = (Array.isArray(response.data) ? response.data : []).map((vendor: any) => ({
          ...vendor,
          name: vendor.name || vendor.company || "Unknown Supplier",
          company: vendor.company || vendor.name || "Unknown Supplier",
          phone: vendor.phone || "N/A",
          totalDue: Number(vendor.totalDue || vendor.totalBalance || 0),
          lastPurchase: vendor.lastPurchase || vendor.lastActive || "N/A",
        }));
        setVendors(normalizedVendors);
      } catch {
        toast.error("SECURITY ALERT", {
          description: "Unauthorized access detected or session expired.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchVendors();
  }, []);

  useEffect(() => {
    if (selectedVendor && !ledgerData[selectedVendor.id]) {
      const fetchDetails = async () => {
        try {
          const safeId = selectedVendor.id.replace(/[^a-zA-Z0-9-]/g, "");
          const response = await secureApi.get(`/api/v1/finance/parties/ledger/${safeId}`);
          setLedgerData((prev) => ({ ...prev, [selectedVendor.id]: response.data }));
        } catch {
          toast.error("DATA LOCK", {
            description: "Failed to retrieve encrypted ledger.",
          });
        }
      };
      fetchDetails();
    }
  }, [selectedVendor]);

  const handleExportCSV = (vendor: Vendor) => {
    const entries = ledgerData[vendor.id] || [];
    const csvHeader = "Date,Description,Type,Debit(Paid),Credit(Due),Balance\n";
    const csvRows = entries
      .map((entry) => {
        const safeDesc = entry.description.replace(/^[=+\-@]/, "'");
        return `${entry.date},${safeDesc},${entry.type},${entry.debit},${entry.credit},${entry.balance}`;
      })
      .join("\n");

    const blob = new Blob([csvHeader + csvRows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `SECURE_LEDGER_${vendor.company.replace(/\s+/g, "_")}.csv`;
    link.click();
    toast.success("VERIFIED EXPORT", {
      description: "CSV Statement generated successfully.",
    });
  };

  const filteredVendors = useMemo(() => {
    const safeSearch = search.toLowerCase().replace(/[${};"']/g, "");
    return vendors.filter(
      (vendor) =>
        (vendor.name || "").toLowerCase().includes(safeSearch) ||
        (vendor.company || "").toLowerCase().includes(safeSearch)
    );
  }, [search, vendors]);

  const buildStatementData = (vendor: Vendor) => {
    const entries = ledgerData[vendor.id] || [];
    const statementEntries: LedgerStatementEntry[] = entries.map((entry) => ({
      id: entry.id,
      reference: entry.invoice_ref || entry.id,
      date: entry.date,
      type: entry.type,
      description: entry.description,
      debit: Number(entry.debit || 0),
      credit: Number(entry.credit || 0),
      balance: Number(entry.balance || 0),
    }));

    const totalDebit = statementEntries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredit = statementEntries.reduce((sum, entry) => sum + entry.credit, 0);
    const closingBalance =
      statementEntries[statementEntries.length - 1]?.balance ?? Number(vendor.totalDue || 0);

    const summaryItems: LedgerStatementSummaryItem[] = [
      { label: "Statement Type", value: "Supplier Ledger" },
      { label: "Total Entries", value: String(statementEntries.length) },
      { label: "Total Paid", value: formatCurrency(totalDebit) },
      { label: "Total Due", value: formatCurrency(totalCredit) },
      { label: "Net Liability", value: formatCurrency(closingBalance) },
    ];

    return {
      fileName: `Supplier_Ledger_${vendor.company.replace(/\s+/g, "_")}.pdf`,
      title: "Supplier Ledger Statement",
      documentLabel: "Ledger Statement",
      documentNumber: `VL-${vendor.id}`,
      documentDate: formatStatementDate(statementEntries[statementEntries.length - 1]?.date),
      partyLabel: "Vendor / Supplier",
      partyName: vendor.company,
      partyDetails: [
        vendor.name ? `Contact: ${vendor.name}` : "",
        vendor.phone ? `Phone: ${vendor.phone}` : "",
        vendor.lastPurchase ? `Last Purchase: ${vendor.lastPurchase}` : "",
      ].filter(Boolean),
      summaryItems,
      entries: statementEntries,
      footerNote:
        "Supplier ledger statement generated from the accountant dashboard. Preview, PDF aur print teeno ka layout same rakha gaya hai.",
      signatureLabel: "Accountant Signature",
    };
  };

  const handleDownloadPdf = (vendor: Vendor) => {
    exportLedgerStatementPdf(buildStatementData(vendor));
    toast.success("PDF READY", {
      description: "Supplier ledger PDF generated successfully.",
    });
  };

  const handlePrintStatement = () => {
    printElementById("vendor-ledger-statement-print-area", "Supplier Ledger Statement");
  };

  const handleWhatsAppUpdate = (vendor: Vendor) => {
    const text = `Verified Statement: Assalam-o-Alaikum ${vendor.name}, our outstanding balance for ${vendor.company} is PKR ${vendor.totalDue.toLocaleString()}. Please verify records.`;
    window.open(`https://wa.me/${vendor.phone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const selectedStatement = selectedVendor ? buildStatementData(selectedVendor) : null;

  return (
    <div className="relative min-h-screen overflow-hidden p-4 font-sans text-slate-300 md:p-10">
      <Toaster position="top-right" theme="dark" richColors />

      <div className="pointer-events-none absolute right-10 top-5 flex items-center gap-2 opacity-20">
        <ShieldCheck size={14} className="text-amber-500" />
        <span className="text-[8px] font-black uppercase tracking-widest">
          Nexus Security Protocol Active
        </span>
      </div>

      <div className="mx-auto mb-12 flex max-w-7xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-5xl font-black uppercase tracking-tighter text-white italic">
            Supplier <span className="text-amber-500">Ledger</span>
          </h1>
          <p className="mt-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500 italic">
            <Lock size={10} className="text-amber-500" /> Secure Accounts Payable Console
          </p>
        </motion.div>

        <div className="group relative w-full md:w-96">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-amber-500"
            size={18}
          />
          <input
            type="text"
            placeholder="VALIDATE SUPPLIER HASH..."
            className="w-full rounded-2xl border border-white/5 bg-[#050b1d] py-5 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-white shadow-2xl outline-none transition-all focus:border-amber-500"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <div className="mb-2 flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Authenticated Entities
            </h2>
            {isLoading && <Loader2 size={14} className="animate-spin text-amber-500" />}
          </div>

          <div className="custom-scrollbar h-[calc(100vh-300px)] space-y-4 overflow-y-auto pr-2">
            {filteredVendors.map((vendor) => (
              <motion.div
                key={vendor.id}
                onClick={() => setSelectedVendor(vendor)}
                whileHover={{ x: 5, backgroundColor: "rgba(251, 191, 36, 0.05)" }}
                className={cn(
                  "group relative flex cursor-pointer items-center justify-between overflow-hidden rounded-[2.5rem] border p-8 transition-all",
                  selectedVendor?.id === vendor.id
                    ? "border-amber-400 bg-amber-500 text-black shadow-2xl shadow-amber-500/20"
                    : "border-white/5 bg-[#050b1d] hover:border-white/10"
                )}
              >
                <div className="flex items-center gap-5">
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner transition-colors",
                      selectedVendor?.id === vendor.id ? "bg-black/10" : "bg-white/5"
                    )}
                  >
                    <Truck size={22} />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tighter italic">
                      {vendor.company}
                    </h3>
                    <p
                      className={cn(
                        "mt-1 text-[10px] font-black",
                        selectedVendor?.id === vendor.id ? "text-amber-900" : "text-slate-600"
                      )}
                    >
                      PAYABLE: PKR {vendor.totalDue.toLocaleString()}
                    </p>
                  </div>
                </div>
                {vendor.totalDue > 500000 && selectedVendor?.id !== vendor.id && (
                  <div className="absolute right-10 top-0">
                    <span className="rounded-b-lg border-b border-rose-500/50 bg-rose-500/20 px-3 py-1 text-[8px] font-black text-rose-500">
                      HIGH RISK
                    </span>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedVendor ? (
              <motion.div
                key={selectedVendor.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex h-full flex-col overflow-hidden rounded-[4rem] border border-white/5 bg-[#050b1d] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)]"
              >
                <div className="flex flex-col items-center justify-between gap-6 border-b border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent p-10 md:flex-row">
                  <div className="flex items-center gap-8">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] border border-amber-500/20 bg-amber-500/10 text-amber-500 shadow-inner">
                      <Landmark size={36} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black uppercase tracking-tighter text-white italic">
                        {selectedVendor.company}
                      </h2>
                      <div className="mt-2 flex items-center gap-4">
                        <span className="rounded-full border border-white/5 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          SUPPLIER: {selectedVendor.id}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                          {selectedVendor.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleWhatsAppUpdate(selectedVendor)}
                      className="rounded-2xl bg-emerald-500/10 p-5 text-emerald-500 shadow-xl transition-all hover:bg-emerald-500 hover:text-white"
                    >
                      <MessageSquare size={20} />
                    </button>
                    <button
                      onClick={() => setIsPreviewOpen(true)}
                      className="rounded-2xl border border-white/5 bg-white/5 p-5 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                    >
                      <FileText size={20} />
                    </button>
                    <button
                      onClick={() => handleDownloadPdf(selectedVendor)}
                      className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-400 transition-all hover:bg-amber-500 hover:text-[#020617]"
                    >
                      <Download size={20} />
                    </button>
                    <button
                      onClick={handlePrintStatement}
                      className="rounded-2xl border border-white/5 bg-white/5 p-5 text-slate-400 transition-all hover:bg-white/10 hover:text-white"
                    >
                      <Printer size={20} />
                    </button>
                  </div>
                </div>

                <div className="custom-scrollbar max-h-[500px] flex-1 overflow-x-auto overflow-y-auto p-8">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 z-10 bg-[#050b1d]">
                      <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
                        <th className="w-12 px-4 py-6">S.No</th>
                        <th className="px-4 py-6">Invoice No</th>
                        <th className="px-8 py-6">Timestamp</th>
                        <th className="px-8 py-6">Transaction Detail</th>
                        <th className="px-8 py-6 text-emerald-500">Paid (-)</th>
                        <th className="px-8 py-6 text-rose-500">Payable (+)</th>
                        <th className="px-8 py-6">Net Liability</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {!ledgerData[selectedVendor.id] ? (
                        <tr>
                          <td colSpan={7} className="py-24 text-center">
                            <Loader2 className="mx-auto mb-4 animate-spin text-amber-500" size={32} />
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600">
                              Verifying Blockchain Hashes...
                            </p>
                          </td>
                        </tr>
                      ) : (
                        ledgerData[selectedVendor.id].map((entry, idx) => (
                          <tr
                            key={entry.id}
                            className="group transition-colors hover:bg-white/[0.03]"
                          >
                            <td className="px-4 py-8 text-center text-[11px] font-black text-slate-600">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-8">
                              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                                {entry.id || "—"}
                              </span>
                            </td>
                            <td className="px-8 py-8 text-[11px] font-black uppercase italic text-slate-500">
                              {entry.date}
                            </td>
                            <td className="px-8 py-8">
                              <p className="text-xs font-black uppercase tracking-tight text-slate-200 transition-colors group-hover:text-amber-500">
                                {entry.description}
                              </p>
                            </td>
                            <td className="px-8 py-8 text-xs font-black italic text-emerald-500">
                              {entry.debit > 0 ? `PKR ${entry.debit.toLocaleString()}` : "—"}
                            </td>
                            <td className="px-8 py-8 text-xs font-black italic text-rose-500">
                              {entry.credit > 0 ? `PKR ${entry.credit.toLocaleString()}` : "—"}
                            </td>
                            <td className="px-8 py-8">
                              <span className="rounded-xl border border-white/5 bg-white/5 px-5 py-2 text-xs font-black tracking-tighter text-white">
                                PKR {entry.balance.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.01] p-10">
                  <div className="flex items-center gap-4">
                    <ShieldAlert size={18} className="text-amber-500/50" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Total Outstanding:{" "}
                      <span className="ml-2 text-sm text-white italic">
                        PKR {selectedVendor.totalDue.toLocaleString()}
                      </span>
                    </p>
                  </div>
                  <button className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-amber-500 transition-all hover:gap-6">
                    Full Procurement Audit{" "}
                    <ArrowUpRight size={14} className="group-hover:text-white" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="flex h-full min-h-[600px] flex-col items-center justify-center rounded-[4rem] border-2 border-dashed border-white/5 bg-white/[0.01] text-slate-700">
                <Truck size={80} className="mb-6 opacity-10" />
                <h3 className="text-xl font-black uppercase tracking-tighter text-slate-600 italic">
                  Secure Vault Standby
                </h3>
                <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.4em]">
                  Select a supplier identity to decrypt procurement history
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mx-auto mt-10 flex max-w-7xl items-center justify-between text-[8px] font-black uppercase tracking-[0.5em] opacity-30">
        <p>User-Session: {currentUserId?.slice(0, 10)}...-Encrypted</p>
        <p>Nexus Ledger Protocol v4.0.2</p>
      </div>

      {selectedStatement && (
        <>
          <div
            id="vendor-ledger-statement-print-area"
            className="pointer-events-none fixed -left-[200vw] top-0 w-[920px] opacity-0"
            aria-hidden="true"
          >
            <LedgerStatementSheet
              title={selectedStatement.title}
              documentLabel={selectedStatement.documentLabel}
              documentNumber={selectedStatement.documentNumber}
              documentDate={selectedStatement.documentDate}
              partyLabel={selectedStatement.partyLabel}
              partyName={selectedStatement.partyName}
              partyDetails={selectedStatement.partyDetails}
              summaryItems={selectedStatement.summaryItems}
              entries={selectedStatement.entries}
              footerNote={selectedStatement.footerNote}
              signatureLabel={selectedStatement.signatureLabel}
            />
          </div>

          <LedgerStatementModal
            isOpen={isPreviewOpen}
            title={selectedStatement.title}
            onClose={() => setIsPreviewOpen(false)}
            onDownloadPdf={() => handleDownloadPdf(selectedVendor!)}
            onPrint={handlePrintStatement}
          >
            <LedgerStatementSheet
              title={selectedStatement.title}
              documentLabel={selectedStatement.documentLabel}
              documentNumber={selectedStatement.documentNumber}
              documentDate={selectedStatement.documentDate}
              partyLabel={selectedStatement.partyLabel}
              partyName={selectedStatement.partyName}
              partyDetails={selectedStatement.partyDetails}
              summaryItems={selectedStatement.summaryItems}
              entries={selectedStatement.entries}
              footerNote={selectedStatement.footerNote}
              signatureLabel={selectedStatement.signatureLabel}
            />
          </LedgerStatementModal>
        </>
      )}
    </div>
  );
}
