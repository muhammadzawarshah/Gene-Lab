"use client";

import React from 'react';

interface InvoiceLine {
  cust_inv_line_id: number;
  product: { name: string; sku_code?: string };
  quantity: any;
  unit_price: any;
  line_total: any;
  discount?: any;
  tax?: { name: string; rate: any; type: string } | null;
}

interface InvoiceData {
  cust_inv_id: number;
  cust_invoice_number?: string;
  cust_invoice_date: string;
  total_amount: any;
  status: string;
  party?: { name: string; phone?: string; email?: string };
  customerinvoiceline: InvoiceLine[];
}

interface Props {
  data: InvoiceData | null;
}

export const CustInvoiceReportComponent = ({ data }: Props) => {
  if (!data) return <div className="p-10 text-center text-gray-500">No Invoice Selected</div>;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric' });

  const invoiceNo = data.cust_invoice_number || `INV-${data.cust_inv_id}`;
  const lines = data.customerinvoiceline || [];
  const emptyRows = lines.length < 8 ? 8 - lines.length : 0;
  const toNumber = (value: any) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };
  const formatCurrency = (amount: any) =>
    toNumber(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const getLineTotal = (line: InvoiceLine) => {
    const lineTotal = toNumber(line.line_total);
    return lineTotal > 0 ? lineTotal : toNumber(line.quantity) * toNumber(line.unit_price);
  };
  const invoiceTotal = toNumber(data.total_amount) || lines.reduce((sum, line) => sum + getLineTotal(line), 0);

  return (
    <div
      id="invoice-print-area"
      className="bg-white p-8 text-black shadow-sm mx-auto my-0 print:shadow-none print:p-0 w-full max-w-[800px] border h-[60vh] border-gray-100 print:border-none overflow-y-auto overflow-x-hidden"
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
        <div className="flex flex-col items-end">
          <h2 className="text-2xl font-bold border-b-2 border-black w-full text-right pb-1 mb-2 uppercase tracking-widest">
            Invoice
          </h2>
          <div className="border border-black p-2 min-w-[160px]">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="font-semibold uppercase mr-4">Invoice #</span>
              <span className="font-bold">{invoiceNo}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold uppercase mr-4">Date:</span>
              <span className="font-bold">{formatDate(data.cust_invoice_date)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* BILL TO */}
      <div className="mb-6">
        <div className="border border-black p-2 w-[320px] bg-gray-50">
          <p className="text-[10px] font-black underline mb-1 italic uppercase">Bill To</p>
          <p className="text-sm font-black uppercase tracking-wide">{data.party?.name || 'N/A'}</p>
          {data.party?.phone && (
            <p className="text-[10px] text-gray-600 mt-1">{data.party.phone}</p>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="w-full">
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead className="bg-gray-100">
            <tr className="uppercase font-bold">
              <th className="border border-black px-1 py-1.5 w-10">S.No</th>
              <th className="border border-black px-2 py-1.5 text-left">Product Description</th>
              <th className="border border-black px-1 py-1.5 w-28">Qty</th>
              <th className="border border-black px-1 py-1.5 w-24 text-right">Unit Price</th>
              <th className="border border-black px-1 py-1.5 w-28 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((item, index) => (
              <tr key={index} className="h-8">
                <td className="border border-black text-center">{index + 1}</td>
                <td className="border border-black px-2 font-bold uppercase">{item.product?.name}</td>
                <td className="border border-black text-center">{item.quantity}</td>
                <td className="border border-black px-2 text-right font-mono">{formatCurrency(item.unit_price)}</td>
                <td className="border border-black px-2 text-right font-mono font-bold">{formatCurrency(getLineTotal(item))}</td>
              </tr>
            ))}
            {Array.from({ length: emptyRows }).map((_, i) => (
              <tr key={`empty-${i}`} className="h-8">
                <td className="border border-black text-center"></td>
                <td className="border border-black px-2"></td>
                <td className="border border-black text-center"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} className="border border-black px-2 py-2 text-right text-[10px] font-black uppercase bg-gray-100">
                Total Price
              </td>
              <td className="border border-black px-2 py-2 text-right font-black font-mono bg-gray-100">
                PKR {formatCurrency(invoiceTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* FOOTER */}
      <div className="mt-12 flex justify-between items-end gap-8">
        <div className="flex-1 border border-black p-3 text-[9px] leading-[1.3] text-justify uppercase font-serif">
          <h4 className="text-center font-bold border-b border-black mb-2 pb-1 underline">
            FORM 2A (SEE RULES 19&30) WARRANTY UNDER SECTION 23(1) OF THE DRUG ACT 1976
          </h4>
          <p className="italic">
            I MUHAMMAD ANWER BEING A PERSON RESIDENT IN PAKISTAN CARRYING ON A BUSINESS AT PLOT# 287, SEC-5,
            K.I.A, KARACHI PAKISTAN UNDER THE NAME OF GENE LABORATORIES (PVT) LTD, THANK YOU FOR YOUR BUSINESS
            AND I WOULD APPRECIATE YOUR SUPPORT IN FUTURE TO OUR BUSINESS CONTRAT AND HOPE TO CONTINUE THE SAME
            IN LONG RUN.
          </p>
        </div>
        <div className="w-[180px] flex flex-col items-center">
          <div className="mb-[-15px] opacity-20 rotate-12">
            <div className="w-20 h-20 rounded-full border-4 border-double border-red-600 flex items-center justify-center text-center text-[7px] font-bold text-red-600 p-1">
              GENE LABORATORIES <br /> DISTRIBUTION MANAGER
            </div>
          </div>
          <div className="w-full border-t-2 border-black text-center pt-1 mt-6">
            <p className="text-[10px] font-black italic uppercase">Authorized Signature</p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[9px] text-gray-400 italic text-center print:hidden">
        * Computer generated invoice. Signature is required for legal validity.
      </p>
    </div>
  );
};
