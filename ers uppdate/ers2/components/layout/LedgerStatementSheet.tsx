"use client";

import React from "react";

export interface LedgerStatementEntry {
  id: string;
  reference?: string | null;
  date: string;
  type?: string | null;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface LedgerStatementSummaryItem {
  label: string;
  value: string;
}

export interface LedgerStatementSheetProps {
  title: string;
  documentLabel: string;
  documentNumber: string;
  documentDate: string;
  partyLabel: string;
  partyName: string;
  partyDetails?: string[];
  summaryItems: LedgerStatementSummaryItem[];
  entries: LedgerStatementEntry[];
  footerNote?: string;
  signatureLabel?: string;
  className?: string;
}

const formatCurrency = (amount: number) =>
  `PKR ${Math.abs(Number(amount || 0)).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (dateStr: string) => {
  if (!dateStr) return "---";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    .replace(/\//g, "-");
};

export const LedgerStatementSheet = ({
  title,
  documentLabel,
  documentNumber,
  documentDate,
  partyLabel,
  partyName,
  partyDetails = [],
  summaryItems,
  entries,
  footerNote = "This ledger statement is generated from the Gene Laboratories ERP and reflects live accountant dashboard balances on the issue date.",
  signatureLabel = "Authorized Signature",
  className = "",
}: LedgerStatementSheetProps) => {
  const printableRows = [...entries];
  while (printableRows.length < 10) {
    printableRows.push({
      id: `empty-${printableRows.length}`,
      reference: "",
      date: "",
      type: "",
      description: "",
      debit: 0,
      credit: 0,
      balance: 0,
    });
  }

  return (
    <div
      className={`mx-auto w-full max-w-[920px] rounded-[2rem] border border-slate-200 bg-white p-6 text-black shadow-[0_30px_80px_rgba(15,23,42,0.12)] sm:p-8 ${className}`}
    >
      <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
        <div className="max-w-[420px]">
          <h1 className="text-4xl font-black italic uppercase tracking-[-0.08em] text-slate-900 sm:text-5xl">
            GENE
          </h1>
          <p className="mt-1 text-[12px] font-bold uppercase tracking-[0.2em] text-slate-700">
            Laboratories (PVT) Ltd.
          </p>
          <div className="mt-5 space-y-1 text-[11px] leading-relaxed text-slate-600">
            <p>Korangi Industrial Area, Karachi.</p>
            <p>Tel: +92 325 8000384</p>
            <p>genelaboratories@gmail.com</p>
            <p>www.genelaboratories.co</p>
          </div>
        </div>

        <div className="w-full max-w-[280px] border border-slate-400">
          <div className="border-b border-slate-400 px-4 py-3 text-center">
            <p className="text-lg font-semibold tracking-[0.16em] text-slate-800">
              {documentLabel}
            </p>
          </div>
          <div className="grid grid-cols-[1fr_1.1fr] text-[11px]">
            <div className="border-r border-b border-slate-400 px-3 py-2 font-semibold text-slate-600">
              Ref #
            </div>
            <div className="border-b border-slate-400 px-3 py-2 text-right font-bold text-slate-900">
              {documentNumber}
            </div>
            <div className="border-r border-slate-400 px-3 py-2 font-semibold text-slate-600">
              Date
            </div>
            <div className="px-3 py-2 text-right font-bold text-slate-900">
              {documentDate}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
          {partyLabel}
        </p>
        <div className="mt-2 border border-slate-400 px-4 py-3">
          <p className="text-sm font-black uppercase tracking-[0.08em] text-slate-900">
            {partyName || "N/A"}
          </p>
          {partyDetails.filter(Boolean).map((detail, index) => (
            <p key={`${detail}-${index}`} className="mt-1 text-[11px] text-slate-600">
              {detail}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-[10px] sm:text-[11px]">
          <thead>
            <tr className="bg-slate-50 uppercase">
              <th className="border border-slate-400 px-2 py-2 text-center font-bold">
                S.No
              </th>
              <th className="border border-slate-400 px-2 py-2 text-left font-bold">
                Ref
              </th>
              <th className="border border-slate-400 px-2 py-2 text-left font-bold">
                Date
              </th>
              <th className="border border-slate-400 px-2 py-2 text-left font-bold">
                Narration
              </th>
              <th className="border border-slate-400 px-2 py-2 text-left font-bold">
                Type
              </th>
              <th className="border border-slate-400 px-2 py-2 text-right font-bold">
                Debit
              </th>
              <th className="border border-slate-400 px-2 py-2 text-right font-bold">
                Credit
              </th>
              <th className="border border-slate-400 px-2 py-2 text-right font-bold">
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {printableRows.map((entry, index) => (
              <tr key={entry.id || `${entry.reference}-${index}`} className="align-top">
                <td className="border border-slate-300 px-2 py-2 text-center text-slate-700">
                  {entry.description || entry.reference || entry.date ? index + 1 : ""}
                </td>
                <td className="border border-slate-300 px-2 py-2 font-medium text-slate-700">
                  {entry.reference || "-"}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-slate-700">
                  {entry.date ? formatDate(entry.date) : ""}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-slate-800">
                  {entry.description || ""}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-slate-700">
                  {entry.type || "-"}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right text-slate-700">
                  {entry.debit ? formatCurrency(entry.debit) : ""}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right text-slate-700">
                  {entry.credit ? formatCurrency(entry.credit) : ""}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right font-semibold text-slate-900">
                  {entry.description || entry.reference || entry.date
                    ? formatCurrency(entry.balance)
                    : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="border border-slate-300 px-4 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
            {title}
          </p>
          <p className="mt-3 text-[11px] leading-6 text-slate-600">
            {footerNote}
          </p>
        </div>

        <div className="border border-slate-300">
          {summaryItems.map((item, index) => (
            <div
              key={`${item.label}-${index}`}
              className={`grid grid-cols-[1fr_auto] gap-4 px-4 py-3 text-[11px] ${
                index !== summaryItems.length - 1 ? "border-b border-slate-300" : ""
              }`}
            >
              <span className="font-semibold uppercase tracking-[0.14em] text-slate-500">
                {item.label}
              </span>
              <span className="text-right font-black text-slate-900">{item.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-[520px] border border-slate-400 px-4 py-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Form 2A style statement note
          </p>
          <p className="mt-2 text-[10px] uppercase leading-5 text-slate-700">
            This document is generated for ledger verification and can be used for
            accountant review, customer discussion, and vendor reconciliation.
          </p>
        </div>

        <div className="w-full max-w-[220px]">
          <div className="mb-4 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-double border-slate-400 text-center text-[8px] font-bold uppercase leading-tight text-slate-500">
              Gene
              <br />
              Accounts
              <br />
              Verified
            </div>
          </div>
          <div className="border-t-2 border-slate-800 pt-2 text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-800">
              {signatureLabel}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
