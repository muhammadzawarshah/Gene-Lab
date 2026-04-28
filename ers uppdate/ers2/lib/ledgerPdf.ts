import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type {
  LedgerStatementEntry,
  LedgerStatementSummaryItem,
} from "@/components/layout/LedgerStatementSheet";

export interface LedgerPdfPayload {
  fileName: string;
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

export const exportLedgerStatementPdf = ({
  fileName,
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
}: LedgerPdfPayload) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 42;
  const rightBoxX = pageWidth - margin - 220;
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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("GENE", margin, 58);

  doc.setFontSize(10);
  doc.text("Laboratories (PVT) Ltd.", margin, 75);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const addressLines = [
    "Korangi Industrial Area, Karachi.",
    "Tel: +92 325 8000384",
    "genelaboratories@gmail.com",
    "www.genelaboratories.co",
  ];
  addressLines.forEach((line, index) => {
    doc.text(line, margin, 95 + index * 12);
  });

  doc.rect(rightBoxX, 42, 220, 74);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(documentLabel, rightBoxX + 110, 64, { align: "center" });
  doc.line(rightBoxX, 74, rightBoxX + 220, 74);
  doc.line(rightBoxX, 95, rightBoxX + 220, 95);
  doc.line(rightBoxX + 78, 74, rightBoxX + 78, 116);

  doc.setFontSize(9);
  doc.text("Ref #", rightBoxX + 10, 88);
  doc.text(documentNumber, rightBoxX + 210, 88, { align: "right" });
  doc.text("Date", rightBoxX + 10, 109);
  doc.text(documentDate, rightBoxX + 210, 109, { align: "right" });

  let y = 140;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(partyLabel.toUpperCase(), margin, y);
  y += 8;
  doc.rect(margin, y, pageWidth - margin * 2, 34 + partyDetails.filter(Boolean).length * 11);
  doc.setFontSize(10);
  doc.text(partyName || "N/A", margin + 10, y + 14);
  doc.setFont("helvetica", "normal");
  partyDetails.filter(Boolean).forEach((line, index) => {
    doc.text(line, margin + 10, y + 28 + index * 11);
  });

  const tableStartY = y + 50 + partyDetails.filter(Boolean).length * 11;
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: margin, right: margin },
    theme: "grid",
    head: [
      ["S.No", "Ref", "Date", "Narration", "Type", "Debit", "Credit", "Balance"],
    ],
    body: printableRows.map((entry, index) => [
      entry.description || entry.reference || entry.date ? index + 1 : "",
      entry.reference || (entry.description || entry.date ? "-" : ""),
      entry.date ? formatDate(entry.date) : "",
      entry.description || "",
      entry.type || (entry.description || entry.date ? "-" : ""),
      entry.debit ? formatCurrency(entry.debit) : "",
      entry.credit ? formatCurrency(entry.credit) : "",
      entry.description || entry.reference || entry.date ? formatCurrency(entry.balance) : "",
    ]),
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 5,
      lineColor: [148, 163, 184],
      lineWidth: 0.5,
      textColor: [15, 23, 42],
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [15, 23, 42],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 32, halign: "center" },
      1: { cellWidth: 62 },
      2: { cellWidth: 58 },
      3: { cellWidth: 150 },
      4: { cellWidth: 52 },
      5: { cellWidth: 68, halign: "right" },
      6: { cellWidth: 68, halign: "right" },
      7: { cellWidth: 76, halign: "right" },
    },
  });

  const finalY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
    tableStartY + 180;

  autoTable(doc, {
    startY: finalY + 16,
    margin: { left: pageWidth / 2, right: margin },
    theme: "grid",
    body: summaryItems.map((item) => [item.label, item.value]),
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 6,
      lineColor: [148, 163, 184],
      lineWidth: 0.5,
      textColor: [15, 23, 42],
    },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "right", fontStyle: "bold" },
    },
  });

  const summaryEndY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
    finalY + 80;

  let footerTop = Math.max(summaryEndY + 18, pageHeight - 140);
  if (footerTop + 95 > pageHeight - 20) {
    doc.addPage();
    footerTop = 72;
  }
  doc.rect(margin, footerTop, pageWidth - margin * 2 - 210, 54);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`${title.toUpperCase()} NOTE`, margin + 10, footerTop + 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const footerLines = doc.splitTextToSize(
    footerNote,
    pageWidth - margin * 2 - 230
  );
  doc.text(footerLines, margin + 10, footerTop + 27);

  const signatureX = pageWidth - margin - 180;
  doc.circle(signatureX + 65, footerTop + 20, 28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("GENE", signatureX + 65, footerTop + 13, { align: "center" });
  doc.text("ACCOUNTS", signatureX + 65, footerTop + 21, { align: "center" });
  doc.text("VERIFIED", signatureX + 65, footerTop + 29, { align: "center" });
  doc.line(signatureX, footerTop + 64, signatureX + 140, footerTop + 64);
  doc.setFontSize(8);
  doc.text(signatureLabel, signatureX + 70, footerTop + 76, { align: "center" });

  doc.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
};
