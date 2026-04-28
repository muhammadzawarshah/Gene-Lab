"use client";

import React from "react";

interface PurchaseOrderLine {
  po_line_id: number;
  quantity: string | number;
  unit_price: string | number;
  line_total: string | number;
  product?: {
    name?: string | null;
    sku_code?: string | null;
  } | null;
  uom?: {
    name?: string | null;
  } | null;
}

interface PurchaseOrderData {
  po?: {
    po_id: number;
    order_date?: string | null;
    status?: string | null;
    total_amount?: string | number | null;
    party?: {
      name?: string | null;
      phone?: string | null;
      email?: string | null;
    } | null;
  } | null;
  pol?: PurchaseOrderLine[];
}

interface Props {
  data: PurchaseOrderData | null;
}

export const PurchaseOrderReportComponent = ({ data }: Props) => {
  if (!data?.po) {
    return <div className="p-10 text-center text-gray-500">No Purchase Order Selected</div>;
  }

  const order = data.po;
  const lines = data.pol || [];

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "---";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).replace(/\//g, "-");
  };

  const formatCurrency = (amount: unknown) => {
    const value = parseFloat(String(amount ?? 0));
    return isNaN(value) ? "0.00" : value.toLocaleString(undefined, { minimumFractionDigits: 2 });
  };

  const subTotal = lines.reduce((sum, line) => {
    const lineTotal = parseFloat(String(line.line_total ?? 0));
    return sum + (isNaN(lineTotal) ? 0 : lineTotal);
  }, 0);

  const netTotal = parseFloat(String(order.total_amount ?? subTotal));
  const emptyRows = lines.length < 8 ? 8 - lines.length : 0;

  return (
    <div
      id="purchase-order-print-area"
      className="bg-white p-8 text-black shadow-sm mx-auto my-0 print:shadow-none print:p-0 w-full max-w-[800px] border h-[60vh] border-gray-100 print:border-none overflow-y-auto overflow-x-hidden text-left"
    >
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
            Purchase Order
          </h2>
          <div className="border border-black p-2 min-w-[190px]">
            <div className="flex justify-between text-[11px] mb-1 gap-4">
              <span className="font-semibold uppercase">PO #</span>
              <span className="font-bold">{order.po_id}</span>
            </div>
            <div className="flex justify-between text-[11px] mb-1 gap-4">
              <span className="font-semibold uppercase">Date</span>
              <span className="font-bold">{formatDate(order.order_date)}</span>
            </div>
            <div className="flex justify-between text-[11px] gap-4">
              <span className="font-semibold uppercase">Status</span>
              <span className="font-bold">{order.status || "---"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="border border-black p-2 w-[340px] bg-gray-50">
          <p className="text-[10px] font-black underline mb-1 italic uppercase">Supplier / Vendor</p>
          <p className="text-sm font-black uppercase tracking-wide">{order.party?.name || "N/A"}</p>
          {order.party?.phone && <p className="text-[10px] text-gray-600 mt-1">{order.party.phone}</p>}
          {order.party?.email && <p className="text-[10px] text-gray-600">{order.party.email}</p>}
        </div>
      </div>

      <div className="w-full">
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead className="bg-gray-100">
            <tr className="uppercase font-bold">
              <th className="border border-black px-1 py-1.5 w-10">S.No</th>
              <th className="border border-black px-2 py-1.5 text-left">Item Description</th>
              <th className="border border-black px-1 py-1.5 w-20">SKN</th>
              <th className="border border-black px-1 py-1.5 w-16">UOM</th>
              <th className="border border-black px-1 py-1.5 w-16">Qty</th>
              <th className="border border-black px-1 py-1.5 w-24 text-center">Unit Price</th>
              <th className="border border-black px-2 py-1.5 text-right w-32">Line Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((item, index) => (
              <tr key={item.po_line_id ?? index} className="h-8">
                <td className="border border-black text-center">{index + 1}</td>
                <td className="border border-black px-2 font-bold uppercase">{item.product?.name || "---"}</td>
                <td className="border border-black text-center font-mono">{item.product?.sku_code || "---"}</td>
                <td className="border border-black text-center">{item.uom?.name || "---"}</td>
                <td className="border border-black text-center">{item.quantity || 0}</td>
                <td className="border border-black text-center">{formatCurrency(item.unit_price)}</td>
                <td className="border border-black px-2 text-right font-semibold">{formatCurrency(item.line_total)}</td>
              </tr>
            ))}

            {Array.from({ length: emptyRows }).map((_, index) => (
              <tr key={`empty-${index}`} className="h-8">
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
                <td className="border border-black"></td>
              </tr>
            ))}
          </tbody>

          <tfoot className="font-bold italic">
            <tr>
              <td colSpan={5} className="border-none"></td>
              <td className="border border-black px-2 py-1 bg-gray-50 text-[10px] uppercase">Sub Total</td>
              <td className="border border-black px-2 py-1 text-right">PKR {formatCurrency(subTotal)}</td>
            </tr>
            <tr>
              <td colSpan={5} className="border-none"></td>
              <td className="border border-black px-2 py-2 bg-gray-100 uppercase text-xs">Net Total</td>
              <td className="border border-black px-2 py-2 text-right bg-gray-100 text-sm decoration-double underline">
                PKR {formatCurrency(netTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-12 flex justify-between items-end gap-8">
        <div className="flex-1 border border-black p-3 text-[9px] leading-[1.3] text-justify uppercase font-serif">
          <p className="italic">
            This purchase order is system generated and reflects the approved supplier request with item level quantities,
            rates and order valuation for internal procurement control.
          </p>
        </div>
        <div className="w-[180px] flex flex-col items-center">
          <div className="w-full border-t-2 border-black text-center pt-1 mt-6">
            <p className="text-[10px] font-black italic uppercase">Authorized Signature</p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[9px] text-gray-400 italic text-center print:hidden">
        * Computer generated purchase order preview.
      </p>
    </div>
  );
};
