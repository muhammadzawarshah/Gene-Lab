"use client";

import React, { useState, useMemo, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster, toast } from "sonner";
import {
  Search,
  User,
  Download,
  FileText,
  ArrowUpRight,
  Printer,
  Wallet,
  MessageSquare,
  Loader2,
  ShieldCheck,
  Lock,
  AlertTriangle,
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
import { DataRibbon, EmptyState, PremiumHero, PremiumPage, SearchPanel, StatusPill } from "@/components/ui/premium";

interface LedgerEntry {
  id: string;
  invoice_ref: string | null;
  date: string;
  type: "Invoice" | "Payment" | "Return";
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalBalance: number;
  lastActive: string;
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

export default function CustomerLedger() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<Record<string, LedgerEntry[]>>({});
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  const token = Cookies.get("auth_token");
  const userId = Cookies.get("userId") || Cookies.get("user_id");

  const secureApi = axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Secure-Client-ID": userId,
    },
  });

  useEffect(() => {
    const fetchAccounts = async () => {
      setIsLoading(true);
      try {
        if (!userId || !token) throw new Error("Security Violation: Unauthorized Access");
        const res = await secureApi.get("/api/v1/finance/parties/summary/CUSTOMER");
        setCustomers(res.data);
      } catch {
        toast.error("ENCRYPTION ERROR", {
          description: "Session might be expired. Re-authenticate.",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedCustomer && !ledgerEntries[selectedCustomer.id]) {
      const fetchDetails = async () => {
        try {
          const safeId = selectedCustomer.id.replace(/[^a-zA-Z0-9-]/g, "");
          const res = await secureApi.get(`/api/v1/finance/parties/receivable-ledger/${safeId}`);
          setLedgerEntries((prev) => ({ ...prev, [selectedCustomer.id]: res.data }));
        } catch {
          toast.error("ACCESS DENIED", {
            description: "Record is locked or unavailable.",
          });
        }
      };
      fetchDetails();
    }
  }, [selectedCustomer]);

  const safeSearch = useMemo(() => {
    return search.replace(/[${};"']/g, "");
  }, [search]);

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(safeSearch.toLowerCase()) ||
        customer.id.includes(safeSearch)
    );
  }, [safeSearch, customers]);

  const buildStatementData = (customer: Customer) => {
    const entries = ledgerEntries[customer.id] || [];
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
      statementEntries[statementEntries.length - 1]?.balance ?? Number(customer.totalBalance || 0);

    const summaryItems: LedgerStatementSummaryItem[] = [
      { label: "Statement Type", value: "Customer Ledger" },
      { label: "Total Entries", value: String(statementEntries.length) },
      { label: "Total Debit", value: formatCurrency(totalDebit) },
      { label: "Total Credit", value: formatCurrency(totalCredit) },
      { label: "Closing Balance", value: formatCurrency(closingBalance) },
    ];

    return {
      fileName: `Customer_Ledger_${customer.name.replace(/\s+/g, "_")}.pdf`,
      title: "Customer Ledger Statement",
      documentLabel: "Ledger Statement",
      documentNumber: `CL-${customer.id}`,
      documentDate: formatStatementDate(statementEntries[statementEntries.length - 1]?.date),
      partyLabel: "Bill To / Customer",
      partyName: customer.name,
      partyDetails: [
        customer.phone ? `Phone: ${customer.phone}` : "",
        customer.email ? `Email: ${customer.email}` : "",
        customer.lastActive ? `Last Active: ${customer.lastActive}` : "",
      ].filter(Boolean),
      summaryItems,
      entries: statementEntries,
      footerNote:
        "Customer ledger statement generated from the accountant dashboard. Is preview, PDF aur print ka layout same rakha gaya hai.",
      signatureLabel: "Accountant Signature",
    };
  };

  const handleExportLedger = (customer: Customer) => {
    const entries = ledgerEntries[customer.id] || [];
    const csvHeader = "Date,Description,Type,Debit,Credit,Balance\n";
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
    link.download = `SECURE_LEDGER_${customer.name}_${Date.now()}.csv`;
    link.click();
    toast.success("LEDGER EXPORTED", { description: "Verified file downloaded." });
  };

  const handleDownloadPdf = (customer: Customer) => {
    exportLedgerStatementPdf(buildStatementData(customer));
    toast.success("PDF READY", {
      description: "Ledger PDF report generated successfully.",
    });
  };

  const handlePrintStatement = () => {
    printElementById("customer-ledger-statement-print-area", "Customer Ledger Statement");
  };

  const handleWhatsAppStatement = (customer: Customer) => {
    const text = `Verified Statement: Salaam ${customer.name}, your balance at Nexus is PKR ${customer.totalBalance.toLocaleString()}. Ref: ${userId?.slice(0, 5)}`;
    window.open(`https://wa.me/${customer.phone}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const selectedStatement = selectedCustomer ? buildStatementData(selectedCustomer) : null;

  return (
    <PremiumPage>
      <Toaster position="top-right" theme="light" richColors />

      <PremiumHero
        eyebrow="Accounts Receivable"
        icon={Wallet}
        title={<>Client <span className="text-blue-500">Ledger</span></>}
        description="A financial command view for customer receivables, statements, PDF export, print, and WhatsApp communication."
        meta={<StatusPill tone="blue">Session: {userId?.slice(0, 8) || "Secure"}</StatusPill>}
      >
        <DataRibbon
          items={[
            { label: "Customers", value: customers.length },
            { label: "Visible", value: filteredCustomers.length },
            { label: "Selected", value: selectedCustomer?.name || "None" },
            { label: "Balance", value: selectedCustomer ? formatCurrency(selectedCustomer.totalBalance) : "PKR 0.00" },
          ]}
        />
      </PremiumHero>

      <SearchPanel className="mx-auto mt-6 max-w-7xl" value={search} onChange={setSearch} placeholder="Search customer name or account id..." />

      <div className="mx-auto mt-6 grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-4">
          <div className="mb-4 flex items-center justify-between px-2">
            <h2 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <Lock size={10} className="text-blue-500" /> Active Protocol Accounts
            </h2>
            {isLoading && <Loader2 size={14} className="animate-spin text-blue-500" />}
          </div>

          <div className="custom-scrollbar h-[calc(100vh-360px)] min-h-[420px] space-y-3 overflow-y-auto pr-2">
            {filteredCustomers.map((customer) => (
              <motion.div
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                whileHover={{ x: 5, backgroundColor: "rgba(255,255,255,0.03)" }}
                className={cn(
                  "group relative flex cursor-pointer items-center justify-between overflow-hidden rounded-[1.45rem] border p-5 transition-all",
                  selectedCustomer?.id === customer.id
                    ? "border-blue-400 bg-blue-600 text-white shadow-2xl shadow-blue-600/25"
                    : "app-panel hover:border-blue-500/20"
                )}
              >
                <div className="flex items-center gap-5">
                  <div
                    className={cn(
                      "flex h-14 w-14 items-center justify-center rounded-2xl shadow-inner transition-colors",
                      selectedCustomer?.id === customer.id ? "bg-white/20" : "bg-white/5"
                    )}
                  >
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tighter italic transition-all group-hover:tracking-normal">
                      {customer.name}
                    </h3>
                    <p
                      className={cn(
                        "mt-1 text-[10px] font-black",
                        selectedCustomer?.id === customer.id ? "text-blue-100" : "text-slate-600"
                      )}
                    >
                      NET: PKR {customer.totalBalance.toLocaleString()}
                    </p>
                  </div>
                </div>
                {customer.totalBalance > 0 && selectedCustomer?.id !== customer.id && (
                  <div className="absolute right-10 top-0">
                    <div className="rounded-b-lg border-b border-rose-500/30 bg-rose-500/20 px-3 py-1 text-[8px] font-black text-rose-500">
                      DEBT
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {selectedCustomer ? (
              <motion.div
                key={selectedCustomer.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="app-panel flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-white/5 shadow-2xl"
              >
                <div className="flex flex-col items-center justify-between gap-6 border-b border-white/5 bg-white/[0.45] p-6 md:flex-row md:p-8">
                  <div className="flex items-center gap-8">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] border border-blue-500/20 bg-blue-600/10 text-blue-500 shadow-inner">
                      <Wallet size={36} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black uppercase tracking-tighter text-white italic">
                        {selectedCustomer.name}
                      </h2>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="border-r border-white/10 pr-3 text-[10px] font-black uppercase tracking-widest text-slate-500">
                          ID: {selectedCustomer.id}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">
                          {selectedCustomer.phone}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleWhatsAppStatement(selectedCustomer)}
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
                      onClick={() => handleDownloadPdf(selectedCustomer)}
                      className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5 text-blue-400 transition-all hover:bg-blue-500 hover:text-white"
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

                <div className="custom-scrollbar max-h-[500px] flex-1 overflow-x-auto overflow-y-auto p-4 md:p-6">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 z-10 bg-white">
                      <tr className="border-b border-white/5 text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">
                        <th className="w-12 px-4 py-6">S.No</th>
                        <th className="px-4 py-6">Invoice No</th>
                        <th className="px-8 py-6">Timestamp</th>
                        <th className="px-8 py-6">Narration</th>
                        <th className="px-8 py-6 text-rose-500">Debit</th>
                        <th className="px-8 py-6 text-emerald-500">Credit</th>
                        <th className="px-8 py-6">Account Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {!ledgerEntries[selectedCustomer.id] ? (
                        <tr>
                          <td colSpan={7} className="py-20 text-center">
                            <Loader2 className="mx-auto mb-4 animate-spin text-blue-500" size={32} />
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600">
                              Decrypting Entries...
                            </p>
                          </td>
                        </tr>
                      ) : (
                        ledgerEntries[selectedCustomer.id].map((entry, idx) => (
                          <tr
                            key={entry.id}
                            className="group transition-colors hover:bg-white/[0.03]"
                          >
                            <td className="px-4 py-8 text-center text-[11px] font-black text-slate-600">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-8">
                              <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">
                                {entry.id || "—"}
                              </span>
                            </td>
                            <td className="px-8 py-8 text-[11px] font-black uppercase italic text-slate-500">
                              {entry.date}
                            </td>
                            <td className="px-8 py-8">
                              <p className="text-xs font-black uppercase tracking-tight text-slate-200 transition-colors group-hover:text-white">
                                {entry.description}
                              </p>
                            </td>
                            <td className="px-8 py-8 text-xs font-black italic text-rose-500">
                              {entry.debit > 0 ? entry.debit.toLocaleString() : "—"}
                            </td>
                            <td className="px-8 py-8 text-xs font-black italic text-emerald-500">
                              {entry.credit > 0 ? entry.credit.toLocaleString() : "—"}
                            </td>
                            <td className="px-8 py-8">
                              <span className="rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-xs font-black tracking-tighter text-white shadow-inner">
                                PKR {entry.balance.toLocaleString()}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.45] p-6 md:p-8">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                      System Status: Integrity Verified
                    </p>
                  </div>
                  <button className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-500 transition-all hover:gap-6">
                    View Forensic Audit Trail{" "}
                    <ArrowUpRight size={14} className="group-hover:text-white" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <EmptyState icon={User} title="No customer selected" description="Select a customer account to open ledger entries, statement preview, PDF export, and print tools." className="min-h-[600px]" />
            )}
          </AnimatePresence>
        </div>
      </div>

      {selectedStatement && (
        <>
          <div
            id="customer-ledger-statement-print-area"
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
            onDownloadPdf={() => handleDownloadPdf(selectedCustomer!)}
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
    </PremiumPage>
  );
}

