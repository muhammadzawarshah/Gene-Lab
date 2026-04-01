"use client";

import React from 'react';

interface PaymentReportProps {
  payment: any;
}

const formatDate = (dateStr: string) =>
  dateStr
    ? new Date(dateStr).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

const formatCurrency = (amount: any) => {
  const num = parseFloat(amount);
  return isNaN(num) ? '0.00' : num.toLocaleString(undefined, { minimumFractionDigits: 2 });
};

function numberToWords(amount: number): string {
  if (isNaN(amount) || amount === 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
    'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '');
  };

  const intPart = Math.floor(amount);
  const decPart = Math.round((amount - intPart) * 100);
  let result = convert(intPart) + ' Rupees';
  if (decPart > 0) result += ' and ' + convert(decPart) + ' Paisa';
  return result + ' Only';
}

export const PaymentReportComponent = ({ payment }: PaymentReportProps) => {
  if (!payment) return <div className="p-10 text-center text-gray-500">No Payment Selected</div>;

  const isReceipt = payment.payment_type === 'RECEIPT';
  const voucherType = isReceipt ? 'RECEIPT VOUCHER' : 'PAYMENT VOUCHER';
  const partyLabel = isReceipt ? 'Received From' : 'Paid To';
  const amount = Number(payment.amount || 0);

  return (
    <div
      id="payment-report-print"
      className="bg-white p-8 text-black shadow-sm mx-auto my-0 print:shadow-none print:p-0 w-full max-w-[800px] border border-gray-200 print:border-none overflow-y-auto overflow-x-hidden font-sans"
      style={{ minHeight: '500px' }}
    >
      {/* ── HEADER ── */}
      <div className="flex justify-between items-start mb-6 border-b-2 border-black pb-4">
        <div className="flex flex-col">
          <h1 className="text-5xl font-extrabold italic tracking-tighter text-black leading-none uppercase">GENE</h1>
          <p className="text-[12px] font-bold mt-1">Laboratories (PVT) Ltd.</p>
          <div className="mt-3 text-[11px] leading-snug text-gray-700">
            <p>Korangi Industrial Area, Karachi.</p>
            <p>Tel: +923258000384</p>
            <p>genelaboratories@gmail.com</p>
            <p>www.genelaboratories.co</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <h2
            className={`text-2xl font-black uppercase tracking-widest border-b-2 pb-1 ${
              isReceipt ? 'border-emerald-600 text-emerald-700' : 'border-rose-600 text-rose-700'
            }`}
          >
            {voucherType}
          </h2>
          <div className="border border-black p-2 min-w-[180px] mt-1">
            <div className="flex justify-between text-[11px] mb-1 gap-4">
              <span className="font-semibold uppercase">Voucher #</span>
              <span className="font-bold">{payment.payment_number || `PMT-${payment.payment_id}`}</span>
            </div>
            <div className="flex justify-between text-[11px] gap-4">
              <span className="font-semibold uppercase">Date</span>
              <span className="font-bold">{formatDate(payment.payment_date)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── PARTY ── */}
      <div className="mb-5">
        <div className="border border-black p-2 w-full bg-gray-50">
          <p className="text-[10px] font-black underline mb-1 italic uppercase">{partyLabel}</p>
          <p className="text-sm font-black uppercase tracking-wide">{payment.party?.name || 'N/A'}</p>
        </div>
      </div>

      {/* ── DETAIL TABLE ── */}
      <table className="w-full border-collapse border border-black text-[11px] mb-6">
        <thead className="bg-gray-100">
          <tr className="uppercase font-bold">
            <th className="border border-black px-2 py-1.5 text-left">Description</th>
            <th className="border border-black px-2 py-1.5 text-center w-32">Method</th>
            <th className="border border-black px-2 py-1.5 text-center w-36">Reference No.</th>
            <th className="border border-black px-2 py-1.5 text-right w-36">Amount (PKR)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="h-10">
            <td className="border border-black px-2 font-bold uppercase">
              {isReceipt ? 'Payment Received' : 'Payment Made'}{' '}
              {payment.notes ? `– ${payment.notes}` : ''}
            </td>
            <td className="border border-black px-2 text-center uppercase">{payment.method || '—'}</td>
            <td className="border border-black px-2 text-center font-mono">{payment.reference_number || '—'}</td>
            <td className="border border-black px-2 text-right font-semibold">{formatCurrency(amount)}</td>
          </tr>
          {/* empty filler rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="h-8">
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
              <td className="border border-black px-2" />
            </tr>
          ))}
        </tbody>
        <tfoot className="font-bold">
          <tr>
            <td colSpan={2} className="border-none" />
            <td className="border border-black px-2 py-1.5 bg-gray-50 uppercase text-[10px] text-right">
              Total Amount
            </td>
            <td className="border border-black px-2 py-1.5 text-right">PKR {formatCurrency(amount)}</td>
          </tr>
        </tfoot>
      </table>

      {/* ── AMOUNT IN WORDS ── */}
      <div className="border border-black p-2 mb-6 bg-gray-50">
        <span className="text-[10px] font-black uppercase italic mr-2">Amount in Words:</span>
        <span className="text-[11px] font-bold uppercase">{numberToWords(amount)}</span>
      </div>

      {/* ── FOOTER: WARRANTY + SIGNATURE ── */}
      <div className="mt-8 flex justify-between items-end gap-8">
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
              GENE LABORATORIES <br /> {isReceipt ? 'ACCOUNTS MANAGER' : 'ACCOUNTS MANAGER'}
            </div>
          </div>
          <div className="w-full border-t-2 border-black text-center pt-1 mt-6">
            <p className="text-[10px] font-black italic uppercase">Authorized Signature</p>
          </div>
        </div>
      </div>

      <p className="mt-4 text-[9px] text-gray-400 italic text-center print:hidden">
        * Computer generated voucher. Signature is required for legal validity.
      </p>
    </div>
  );
};
