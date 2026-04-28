"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import { motion } from "framer-motion";
import {
  Loader2,
  ChevronRight,
  ArrowLeft,
  FileText,
  Download,
  Printer,
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

interface GLAccount {
  gl_account_id: number;
  gl_account_code: string;
  name: string;
  type: string;
  parent_account_id: number | null;
  is_control_account: boolean;
  parent_name: string | null;
  balance: {
    opening_balance: number;
    debit_total: number;
    credit_total: number;
    closing_balance: number;
  };
}

interface LedgerLine {
  journal_line_id: number;
  date: string;
  journal_number: string;
  journal_type: string;
  narration: string | null;
  party: string | null;
  debit: number;
  credit: number;
  running_balance: number;
}

const TYPE_COLOR: Record<string, string> = {
  ASSET: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  LIABILITY: "text-rose-400 bg-rose-500/10 border-rose-500/20",
  EQUITY: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  INCOME: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  EXPENSE: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

const formatStatementDate = (dateStr?: string) => {
  if (!dateStr) return new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-GB").replace(/\//g, "-");
};

const formatCurrency = (value: number) =>
  Math.abs(Number(value || 0)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function GeneralLedger() {
  const [accounts, setAccounts] = useState<GLAccount[]>([]);
  const [selected, setSelected] = useState<GLAccount | null>(null);
  const [lines, setLines] = useState<LedgerLine[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingLines, setLoadingLines] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const headers = { Authorization: `Bearer ${Cookies.get("auth_token")}` };

  useEffect(() => {
    axios
      .get(`${API}/api/v1/finance/ledger`, { headers })
      .then((response) => setAccounts(response.data.data || []))
      .finally(() => setLoadingList(false));
  }, []);

  const openAccount = async (account: GLAccount) => {
    setSelected(account);
    setLoadingLines(true);
    const response = await axios.get(`${API}/api/v1/finance/ledger/${account.gl_account_id}`, {
      headers,
    });
    setLines(response.data.data?.lines || []);
    setLoadingLines(false);
  };

  const statementData = useMemo(() => {
    if (!selected) return null;

    const entries: LedgerStatementEntry[] = lines.map((line) => ({
      id: String(line.journal_line_id),
      reference: line.journal_number,
      date: line.date,
      type: line.journal_type,
      description: line.narration || line.party || "Journal entry",
      debit: Number(line.debit || 0),
      credit: Number(line.credit || 0),
      balance: Number(line.running_balance || 0),
    }));

    const summaryItems: LedgerStatementSummaryItem[] = [
      { label: "Account Code", value: selected.gl_account_code },
      { label: "Opening Balance", value: `PKR ${formatCurrency(selected.balance.opening_balance)}` },
      { label: "Total Debit", value: `PKR ${formatCurrency(selected.balance.debit_total)}` },
      { label: "Total Credit", value: `PKR ${formatCurrency(selected.balance.credit_total)}` },
      { label: "Closing Balance", value: `PKR ${formatCurrency(selected.balance.closing_balance)}` },
    ];

    return {
      fileName: `General_Ledger_${selected.gl_account_code}.pdf`,
      title: "General Ledger Statement",
      documentLabel: "Ledger Statement",
      documentNumber: `GL-${selected.gl_account_code}`,
      documentDate: formatStatementDate(entries[entries.length - 1]?.date),
      partyLabel: "Account / Ledger Head",
      partyName: selected.name,
      partyDetails: [
        `Account Type: ${selected.type}`,
        selected.parent_name ? `Parent: ${selected.parent_name}` : "",
        `Entries: ${entries.length}`,
      ].filter(Boolean),
      summaryItems,
      entries,
      footerNote:
        "General ledger statement generated from the accountant dashboard. Preview, PDF aur print teeno ek hi report style ko follow karte hain.",
      signatureLabel: "Accountant Signature",
    };
  }, [selected, lines]);

  if (!selected) {
    return (
      <div className="p-4 font-sans text-slate-300 md:p-10">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-10">
          <h1 className="text-4xl font-black uppercase tracking-tighter text-white italic">
            General <span className="text-blue-500">Ledger</span>
          </h1>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500 italic">
            Chart of Accounts | Current Period
          </p>
        </motion.div>

        {loadingList ? (
          <div className="flex flex-col items-center gap-4 py-32">
            <Loader2 className="animate-spin text-blue-500" size={40} />
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">
              Loading Accounts...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {accounts.map((account, index) => (
              <motion.div
                key={account.gl_account_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => !account.is_control_account && openAccount(account)}
                className={cn(
                  "flex items-center justify-between rounded-[2rem] border px-6 py-5 transition-all",
                  account.is_control_account
                    ? "border-white/5 bg-[#050b1d] opacity-70"
                    : "cursor-pointer border-white/5 bg-[#050b1d] hover:border-blue-500/30 hover:bg-[#060d22]"
                )}
              >
                <div className="flex items-center gap-5">
                  <span className="w-10 shrink-0 text-[10px] font-black text-slate-600">
                    {account.gl_account_code}
                  </span>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3
                        className={cn(
                          "text-sm font-black uppercase tracking-tighter italic",
                          account.is_control_account ? "text-slate-400" : "text-white"
                        )}
                      >
                        {account.name}
                      </h3>
                      <span
                        className={cn(
                          "rounded-lg border px-2 py-0.5 text-[8px] font-black uppercase",
                          TYPE_COLOR[account.type] || "border-white/10 bg-white/5 text-slate-500"
                        )}
                      >
                        {account.type}
                      </span>
                      {account.is_control_account && (
                        <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-black uppercase text-slate-500">
                          Control
                        </span>
                      )}
                    </div>
                    {account.parent_name && (
                      <p className="mt-0.5 text-[9px] uppercase text-slate-600">
                        Under: {account.parent_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div className="hidden text-right md:block">
                    <p className="text-[9px] uppercase text-slate-600">Debit</p>
                    <p className="text-sm font-black text-white italic">
                      {formatCurrency(account.balance.debit_total)}
                    </p>
                  </div>
                  <div className="hidden text-right md:block">
                    <p className="text-[9px] uppercase text-slate-600">Credit</p>
                    <p className="text-sm font-black text-white italic">
                      {formatCurrency(account.balance.credit_total)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] uppercase text-slate-600">Balance</p>
                    <p
                      className={cn(
                        "text-base font-black italic",
                        account.balance.closing_balance >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      PKR {formatCurrency(account.balance.closing_balance)}
                    </p>
                  </div>
                  {!account.is_control_account && <ChevronRight size={16} className="text-slate-600" />}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 font-sans text-slate-300 md:p-10">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelected(null)}
            className="rounded-2xl border border-white/10 bg-white/5 p-3 transition-all hover:bg-white/10"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-white italic">
              {selected.gl_account_code} — {selected.name}
            </h1>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500 italic">
              {selected.type} • {lines.length} Entries
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 transition-all hover:bg-white/10 hover:text-white"
          >
            <FileText size={14} /> Report
          </button>
          <button
            onClick={() => statementData && exportLedgerStatementPdf(statementData)}
            className="flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 transition-all hover:bg-blue-500 hover:text-white"
          >
            <Download size={14} /> PDF
          </button>
          <button
            onClick={() => printElementById("general-ledger-statement-print-area", "General Ledger Statement")}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 transition-all hover:bg-white/10 hover:text-white"
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Opening Balance", value: selected.balance.opening_balance, color: "text-white" },
          { label: "Total Debit", value: selected.balance.debit_total, color: "text-blue-400" },
          { label: "Total Credit", value: selected.balance.credit_total, color: "text-rose-400" },
          {
            label: "Closing Balance",
            value: selected.balance.closing_balance,
            color: selected.balance.closing_balance >= 0 ? "text-emerald-400" : "text-rose-400",
          },
        ].map((item) => (
          <div key={item.label} className="rounded-[2rem] border border-white/5 bg-[#050b1d] p-6">
            <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-600">
              {item.label}
            </p>
            <p className={cn("text-xl font-black italic", item.color)}>
              PKR {formatCurrency(item.value)}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#050b1d]">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Journal #
                </th>
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Narration
                </th>
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Debit
                </th>
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Credit
                </th>
                <th className="px-6 py-4 text-right text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingLines ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <Loader2 className="mx-auto animate-spin text-blue-500" size={28} />
                  </td>
                </tr>
              ) : lines.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="py-16 text-center text-[10px] font-black uppercase tracking-widest text-slate-600"
                  >
                    No Entries Found
                  </td>
                </tr>
              ) : (
                lines.map((line, index) => (
                  <motion.tr
                    key={line.journal_line_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.02 }}
                    className="border-b border-white/[0.03] transition-all hover:bg-white/[0.02]"
                  >
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(line.date).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-6 py-4 font-bold text-blue-400">{line.journal_number}</td>
                    <td className="px-6 py-4">
                      <span className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[8px] font-black uppercase text-slate-400">
                        {line.journal_type}
                      </span>
                    </td>
                    <td className="max-w-[200px] px-6 py-4 text-slate-400">
                      {line.narration || line.party || "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-blue-400">
                      {line.debit > 0 ? formatCurrency(line.debit) : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-rose-400">
                      {line.credit > 0 ? formatCurrency(line.credit) : "—"}
                    </td>
                    <td
                      className={cn(
                        "px-6 py-4 text-right font-black italic",
                        line.running_balance >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {formatCurrency(line.running_balance)}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {statementData && (
        <>
          <div
            id="general-ledger-statement-print-area"
            className="pointer-events-none fixed -left-[200vw] top-0 w-[920px] opacity-0"
            aria-hidden="true"
          >
            <LedgerStatementSheet
              title={statementData.title}
              documentLabel={statementData.documentLabel}
              documentNumber={statementData.documentNumber}
              documentDate={statementData.documentDate}
              partyLabel={statementData.partyLabel}
              partyName={statementData.partyName}
              partyDetails={statementData.partyDetails}
              summaryItems={statementData.summaryItems}
              entries={statementData.entries}
              footerNote={statementData.footerNote}
              signatureLabel={statementData.signatureLabel}
            />
          </div>

          <LedgerStatementModal
            isOpen={isPreviewOpen}
            title={statementData.title}
            onClose={() => setIsPreviewOpen(false)}
            onDownloadPdf={() => exportLedgerStatementPdf(statementData)}
            onPrint={() => printElementById("general-ledger-statement-print-area", "General Ledger Statement")}
          >
            <LedgerStatementSheet
              title={statementData.title}
              documentLabel={statementData.documentLabel}
              documentNumber={statementData.documentNumber}
              documentDate={statementData.documentDate}
              partyLabel={statementData.partyLabel}
              partyName={statementData.partyName}
              partyDetails={statementData.partyDetails}
              summaryItems={statementData.summaryItems}
              entries={statementData.entries}
              footerNote={statementData.footerNote}
              signatureLabel={statementData.signatureLabel}
            />
          </LedgerStatementModal>
        </>
      )}
    </div>
  );
}
