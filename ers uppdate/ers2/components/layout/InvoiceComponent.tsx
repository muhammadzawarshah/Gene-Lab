"use client";

import React from 'react';

// --- TYPES (Aapke main page se match karte hue) ---
interface OrderItem {
  so_line_id: number;
  product: { name: string; id?: any };
  quantity: any;
  unit_price: any;
  line_total: any;
  product_id: string;
  tax?: { name: string; rate: any; type: string } | null;
}

interface Order {
  so_id: number;
  party: { name: string };
  salesorderline: OrderItem[];
  status: string;
  total_amount: any;
  order_date: string;
}

interface InvoiceProps {
  order: Order | null;
}

export const InvoiceComponent = ({ order }: InvoiceProps) => {
  if (!order) return <div className="p-10 text-center text-gray-500">No Order Selected</div>;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '---';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  };

  const formatCurrency = (amount: any) => {
    const num = parseFloat(amount);
    return isNaN(num) ? "0.00" : num.toLocaleString(undefined, { minimumFractionDigits: 2 });
  };

  // Compute tax from lines (use first line's tax as order-level tax)
  const grossSubtotal = order.salesorderline.reduce((s, i) => s + parseFloat(i.line_total || 0), 0);
  const firstTax = order.salesorderline.find(i => i.tax)?.tax ?? null;
  const taxAmount = firstTax
    ? firstTax.type === 'percentage'
      ? (grossSubtotal * parseFloat(firstTax.rate)) / 100
      : parseFloat(firstTax.rate)
    : parseFloat(order.total_amount) - grossSubtotal;
  const computedTaxAmount = isNaN(taxAmount) || taxAmount < 0 ? 0 : taxAmount;

  return (
    <div className="bg-white p-8 text-black shadow-sm mx-auto my-0 print:shadow-none print:p-0 w-full max-w-[800px] border h-[60vh] border-gray-100 print:border-none overflow-y-auto overflow-x-hidden">
      
      {/* HEADER SECTION */}
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
          <h2 className="text-2xl font-bold border-b-2 border-black w-full text-right pb-1 mb-2 uppercase tracking-widest">Invoice</h2>
          <div className="border border-black p-2 min-w-[160px]">
            <div className="flex justify-between text-[11px] mb-1">
              <span className="font-semibold uppercase mr-4">Invoice #</span>
              <span className="font-bold">{order.so_id}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="font-semibold uppercase mr-4">Date:</span>
              <span className="font-bold">{formatDate(order.order_date)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* BILL TO SECTION */}
      <div className="mb-6">
        <div className="border border-black p-2 w-[320px] bg-gray-50">
          <p className="text-[10px] font-black underline mb-1 italic uppercase">Bill To</p>
          <p className="text-sm font-black uppercase tracking-wide">{order.party?.name || "N/A"}</p>
        </div>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="w-full">
        <table className="w-full border-collapse border border-black text-[11px]">
          <thead className="bg-gray-100">
            <tr className="uppercase font-bold">
              <th className="border border-black px-1 py-1.5 w-10">S.No</th>
              <th className="border border-black px-2 py-1.5 text-left">Product Description</th>
              <th className="border border-black px-1 py-1.5 w-20">Qty</th>
              <th className="border border-black px-1 py-1.5 w-24">Rate</th>
              <th className="border border-black px-2 py-1.5 text-right w-32">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.salesorderline?.map((item, index) => (
              <tr key={index} className="h-8">
                <td className="border border-black text-center">{index + 1}</td>
                <td className="border border-black px-2 font-bold uppercase">{item.product?.name}</td>
                <td className="border border-black text-center">{item.quantity}</td>
                <td className="border border-black text-center">{formatCurrency(item.unit_price)}</td>
                <td className="border border-black px-2 text-right font-semibold">{formatCurrency(item.line_total)}</td>
              </tr>
            ))}
            
            {/* Empty Rows to maintain height (Optional) */}
            {order.salesorderline?.length < 8 && Array.from({ length: 8 - order.salesorderline.length }).map((_, i) => (
              <tr key={`empty-${i}`} className="h-8">
                <td className="border border-black text-center"></td>
                <td className="border border-black px-2"></td>
                <td className="border border-black text-center"></td>
                <td className="border border-black text-center"></td>
                <td className="border border-black px-2 text-right"></td>
              </tr>
            ))}
          </tbody>
          
          {/* TOTALS SECTION */}
          <tfoot className="font-bold italic">
            <tr>
              <td colSpan={3} className="border-none"></td>
              <td className="border border-black px-2 py-1 bg-gray-50 text-[10px] uppercase">Gross Total:</td>
              <td className="border border-black px-2 py-1 text-right">PKR {formatCurrency(grossSubtotal)}</td>
            </tr>
            {computedTaxAmount > 0 && (
              <tr>
                <td colSpan={3} className="border-none"></td>
                <td className="border border-black px-2 py-1 bg-gray-50 text-[10px] uppercase">
                  {firstTax ? `${firstTax.name} (${firstTax.rate}${firstTax.type === 'percentage' ? '%' : ' PKR'})` : 'Tax'}:
                </td>
                <td className="border border-black px-2 py-1 text-right">+PKR {formatCurrency(computedTaxAmount)}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3} className="border-none"></td>
              <td className="border border-black px-2 py-2 bg-gray-100 uppercase text-xs">Net Total</td>
              <td className="border border-black px-2 py-2 text-right bg-gray-100 text-sm decoration-double underline">
                PKR {formatCurrency(order.total_amount)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* FOOTER: WARRANTY & SIGNATURE */}
      <div className="mt-12 flex justify-between items-end gap-8">
        <div className="flex-1 border border-black p-3 text-[9px] leading-[1.3] text-justify uppercase font-serif">
          <h4 className="text-center font-bold border-b border-black mb-2 pb-1 underline">FORM 2A (SEE RULES 19&30) WARRANTY UNDER SECTION 23(1) OF THE DRUG ACT 1976</h4>
          <p className="italic">
            I MUHAMMAD ANWER BEING A PERSON RESIDENT IN PAKISTAN CARRYING ON A BUSINESS AT PLOT# 287, SEC-5, K.I.A, KARACHI PAKISTAN UNDER THE NAME OF GENE LABORATORIES (PVT) LTD, THANK YOU FOR YOUR BUSINESS AND I WOULD APPRECIATE YOUR SUPPORT IN FUTURE TO OUR BUSINESS CONTRAT AND HOPE TO CONTINUE THE SAME IN LONG RUN.
          </p>
        </div>

        <div className="w-[180px] flex flex-col items-center">
          <div className="mb-[-15px] opacity-20 rotate-12">
             <div className="w-20 h-20 rounded-full border-4 border-double border-red-600 flex items-center justify-center text-center text-[7px] font-bold text-red-600 p-1">
               GENE LABORATORIES <br/> DISTRIBUTION MANAGER
             </div>
          </div>
          <div className="w-full border-t-2 border-black text-center pt-1 mt-6">
            <p className="text-[10px] font-black italic uppercase">Authorized Signature</p>
          </div>
        </div>
      </div>

      {/* PRINT STYLE HELPER (Only visible on screen) */}
      <p className="mt-4 text-[9px] text-gray-400 italic text-center print:hidden">
        * Computer generated invoice. Signature is required for legal validity.
      </p>
    </div>
  );
};