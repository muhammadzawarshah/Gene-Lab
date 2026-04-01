"use client";

import React from 'react';

interface InvoiceLine {
  suppl_inv_line_id: number;
  product: { name: string; sku_code?: string };
  quantity: any;
  unit_price: any;
  line_total: any;
  tax?: { name: string; rate: any; type: string } | null;
}

interface InvoiceData {
  suppl_inv_id: number;
  suppl_invoice_number?: string;
  suppl_invoice_date: string;
  total_amount: any;
  status: string;
  party?: { name: string; phone?: string; email?: string; addresses?: { line1?: string; line2?: string; city?: string }[] };
  supplierinvoiceline: InvoiceLine[];
}

interface Props {
  data: InvoiceData | null;
}

export const PurchaseInvoiceReportComponent = ({ data }: Props) => {
  if (!data) return <div className="p-10 text-center text-gray-500">No Invoice Selected</div>;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount: any) => {
    const num = parseFloat(amount);
    return isNaN(num) ? "0.00" : num.toLocaleString(undefined, { minimumFractionDigits: 2 });
  };

  const invoiceNo = data.suppl_invoice_number || `PBILL-${data.suppl_inv_id}`;
  const lines = data.supplierinvoiceline || [];
  const emptyRows = lines.length < 8 ? 8 - lines.length : 0;

  return (
    <div
      id="invoice-print-area"
      className="bg-white p-8 text-black shadow-sm mx-auto my-0 print:shadow-none print:p-0 w-full max-w-[800px] border h-[60vh] border-gray-100 print:border-none overflow-y-auto overflow-x-hidden text-left"
    >
      {/* HEADER */}
      <div className="flex justify-between items-start mb-8">
        <div className="flex flex-col">
          <h1 className="text-5xl font-extrabold italic tracking-tighter text-black leading-none uppercase">GENE</h1>
          <p className="text-[12px] font-bold mt-1">Laboratories (PVT) Ltd.</p>
          <div className="mt-4 text-[11px] leading-tight text-gray-700">
            <p>Korangi Industrial Area, Karachi.</p>
            <p>Tel: +923258000384</p>
            <p>genelaboratories@gmail.com</p>
            <p>www.genelaboratories.co</p>
          </div>
        </div>
        <div className="flex flex-col items-end text-right">
          <h2 className="text-2xl font-bold border-b-2 border-black w-full text-right pb-1 mb-2 uppercase tracking-widest">
            Purchase Bill
          </h2>
          <div className="border border-black p-2 min-w-[160px]">
            <div className="flex justify-between text-[11px] mb-1 gap-4">
              <span className="font-semibold uppercase">Bill #</span>
              <span className="font-bold">{invoiceNo}</span>
            </div>
            <div className="flex justify-between text-[11px] gap-4">
              <span className="font-semibold uppercase">Date:</span>
              <span className="font-bold">{formatDate(data.suppl_invoice_date)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* VENDOR INFO */}
      <div className="mb-6">
        <div className="border border-black p-2 w-[320px] bg-gray-50">
          <p className="text-[10px] font-black underline mb-1 italic uppercase">Vendor / Supplier</p>
          <p className="text-sm font-black uppercase tracking-wide">{data.party?.name || 'N/A'}</p>
          {data.party?.addresses?.[0] && (
            <p className="text-[10px] text-gray-600 mt-1">
              {[data.party.addresses[0].line1, data.party.addresses[0].line2, data.party.addresses[0].city].filter(Boolean).join(', ')}
            </p>
          )}
          {data.party?.phone && (
            <p className="text-[10px] text-gray-600">{data.party.phone}</p>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="w-full">
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead className="bg-gray-100">
            <tr className="uppercase font-bold">
              <th className="border border-black px-1 py-1.5 w-10">S.No</th>
              <th className="border border-black px-2 py-1.5 text-left">Item Description</th>
              <th className="border border-black px-1 py-1.5 w-20">Qty</th>
              <th className="border border-black px-1 py-1.5 w-24 text-center">Unit Price</th>
              <th className="border border-black px-2 py-1.5 text-right w-32">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((item, index) => (
              <tr key={index} className="h-8">
                <td className="border border-black text-center">{index + 1}</td>
                <td className="border border-black px-2 font-bold uppercase">{item.product?.name}</td>
                <td className="border border-black text-center">{item.quantity}</td>
                <td className="border border-black text-center">{formatCurrency(item.unit_price)}</td>
                <td className="border border-black px-2 text-right font-semibold">{formatCurrency(item.line_total)}</td>
              </tr>
            ))}
            {Array.from({ length: emptyRows }).map((_, i) => (
              <tr key={`empty-${i}`} className="h-8">
                <td className="border border-black text-center"></td>
                <td className="border border-black px-2"></td>
                <td className="border border-black text-center"></td>
                <td className="border border-black text-center"></td>
                <td className="border border-black px-2 text-right"></td>
              </tr>
            ))}
          </tbody>
          <tfoot className="font-bold italic">
            <tr>
              <td colSpan={3} className="border-none"></td>
              <td className="border border-black px-2 py-1 bg-gray-50 text-[10px] uppercase">Sub Total:</td>
              <td className="border border-black px-2 py-1 text-right">PKR {formatCurrency(lines.reduce((sum, item) => sum + parseFloat(item.line_total || 0), 0))}</td>
            </tr>
            {lines.some(l => l.tax) && (
              <tr>
                <td colSpan={3} className="border-none"></td>
                <td className="border border-black px-2 py-1 bg-blue-50 text-[10px] uppercase text-blue-600">Purchase Tax:</td>
                <td className="border border-black px-2 py-1 text-right text-blue-600">
                  +PKR {formatCurrency(lines.reduce((sum: number, item: any) => {
                    if (!item.tax) return sum;
                    const taxRate = parseFloat(item.tax?.rate || 0);
                    const lineTotal = parseFloat(item.line_total || 0);
                    const taxAmount = item.tax?.type === 'percentage' 
                      ? (lineTotal * taxRate) / 100 
                      : taxRate;
                    return sum + (isNaN(taxAmount) ? 0 : taxAmount);
                  }, 0))}
                </td>
              </tr>
            )}
            <tr>
              <td colSpan={3} className="border-none"></td>
              <td className="border border-black px-2 py-2 bg-gray-100 uppercase text-xs">Total Payable</td>
              <td className="border border-black px-2 py-2 text-right bg-gray-100 text-sm decoration-double underline">
                PKR {formatCurrency(data.total_amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* FOOTER */}
      <div className="mt-12 flex justify-between items-end gap-8">
        <div className="flex-1 border border-black p-3 text-[9px] leading-[1.3] text-justify uppercase font-serif">
          <p className="italic">
            Certified that the goods described above have been received in good condition and matched with the approved purchase order. This record is subject to internal audit and financial reconciliation at Gene Laboratories (PVT) Ltd.
          </p>
        </div>
        <div className="w-[180px] flex flex-col items-center">
          <div className="w-full border-t-2 border-black text-center pt-1 mt-6">
            <p className="text-[10px] font-black italic uppercase">Accountant Signature</p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[9px] text-gray-400 italic text-center print:hidden">
        * Computer generated purchase record. For internal use only.
      </p>
    </div>
  );
};
