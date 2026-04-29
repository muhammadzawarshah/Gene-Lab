"use client";

import React from 'react';

// --- TYPES ---
interface GRNLineItem {
    grn_line_id: number;
    product: { name: string; sku_code?: string };
    batch?: { batch_number: string; expiry_date?: string; manufacturing_date?: string };
    received_qty: any;
    purchase_price?: any;
    sale_price?: any;
    uom?: { name: string };
    remarks?: string;
    purchaseorderline?: {
        unit_price: any;
        line_total: any;
        tax?: { name: string; rate: any; type: string } | null;
    } | null;
}

interface GRNData {
    grn_id: number;
    grn_number: string;
    received_date: string;
    status: string;
    discount?: string;
    transportcharges?: string;
    nettotal?: string;
    purchaseorder?: {
        po_id: number;
        party?: { name: string };
    };
    grnline: GRNLineItem[];
}

interface GRNReportProps {
    data: GRNData | null;
}

export const GRNReportComponent = ({ data }: GRNReportProps) => {
    if (!data) return <div className="p-10 text-center text-gray-500">No GRN Selected</div>;

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '---';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    };

    const formatCurrency = (amount: any) => {
        const num = parseFloat(amount);
        return isNaN(num) ? "0.00" : num.toLocaleString(undefined, { minimumFractionDigits: 2 });
    };

    const toNumber = (value: any) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
    };

    const getLineUnitPrice = (line: GRNLineItem) => {
        const grnPurchasePrice = toNumber(line.purchase_price);
        if (grnPurchasePrice > 0) return grnPurchasePrice;

        const poUnitPrice = toNumber(line.purchaseorderline?.unit_price);
        return poUnitPrice > 0 ? poUnitPrice : 0;
    };

    const getLineTotal = (line: GRNLineItem) => {
        const poLineTotal = toNumber(line.purchaseorderline?.line_total);
        if (poLineTotal > 0) return poLineTotal;

        return toNumber(line.received_qty) * getLineUnitPrice(line);
    };

    const grossTotal = data.grnline?.reduce((sum, line) => {
        return sum + getLineTotal(line);
    }, 0) || 0;

    const discount   = parseFloat(data.discount || '0') || 0;
    const transport  = parseFloat(data.transportcharges || '0') || 0;

    // Tax: sum from purchaseorderlines if available
    const taxTotal = data.grnline?.reduce((sum, line) => {
        const pol = line.purchaseorderline;
        if (!pol?.tax) return sum;
        const lt = getLineTotal(line);
        const rate = parseFloat(pol.tax.rate ?? 0) || 0;
        const taxAmt = pol.tax.type === 'percentage' ? (lt * rate) / 100 : rate;
        return sum + taxAmt;
    }, 0) || 0;

    return (
        <div className="bg-white p-8 text-black shadow-sm mx-auto my-0 print:shadow-none print:p-0 w-full max-w-[800px] border h-[60vh] border-gray-100 print:border-none overflow-y-auto overflow-x-hidden">

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
                    <h2 className="text-2xl font-bold border-b-2 border-black w-full text-right pb-1 mb-2 uppercase tracking-widest">Goods Received Note</h2>
                    <div className="border border-black p-2 min-w-[160px]">
                        <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-semibold uppercase mr-4">GRN #</span>
                            <span className="font-bold">{data.grn_number}</span>
                        </div>
                        <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-semibold uppercase mr-4">GRN ID:</span>
                            <span className="font-bold">{data.grn_id}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span className="font-semibold uppercase mr-4">Date:</span>
                            <span className="font-bold">{formatDate(data.received_date)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* SUPPLIER */}
            <div className="mb-6">
                <div className="border border-black p-2 w-[320px] bg-gray-50">
                    <p className="text-[10px] font-black underline mb-1 italic uppercase">Received From (Supplier)</p>
                    <p className="text-sm font-black uppercase tracking-wide">{data.purchaseorder?.party?.name || "N/A"}</p>
                    {data.purchaseorder?.po_id && (
                        <p className="text-[10px] text-gray-600 mt-1">PO Ref: #{data.purchaseorder.po_id}</p>
                    )}
                </div>
            </div>

            {/* PRODUCTS TABLE */}
            <div className="w-full">
                <table className="w-full border-collapse border border-black text-[11px]">
                    <thead className="bg-gray-100">
                        <tr className="uppercase font-bold text-[10px]">
                            <th className="border border-black px-1 py-1.5 w-8">S.No</th>
                            <th className="border border-black px-2 py-1.5 text-left">Product Name</th>
                            <th className="border border-black px-1 py-1.5 w-20">Batch</th>
                            <th className="border border-black px-1 py-1.5 w-16 text-center">MFG</th>
                            <th className="border border-black px-1 py-1.5 w-16 text-center">EXP</th>
                            <th className="border border-black px-1 py-1.5 w-8 text-center">UoM</th>
                            <th className="border border-black px-1 py-1.5 w-12 text-right">Qty</th>
                            <th className="border border-black px-1 py-1.5 w-16 text-right">Price</th>
                            <th className="border border-black px-1 py-1.5 w-20 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.grnline?.map((item, index) => (
                            <tr key={index} className="h-8">
                                <td className="border border-black text-center">{index + 1}</td>
                                <td className="border border-black px-2 font-bold uppercase">{item.product?.name}</td>
                                <td className="border border-black text-center font-mono">{item.batch?.batch_number || '---'}</td>
                                <td className="border border-black text-center text-[9px]">
                                    {formatDate(item.batch?.manufacturing_date)}
                                </td>
                                <td className="border border-black text-center text-[9px]">
                                    {formatDate(item.batch?.expiry_date)}
                                </td>
                                <td className="border border-black text-center">{item.uom?.name || 'Units'}</td>
                                <td className="border border-black px-1 text-right font-semibold">{item.received_qty}</td>
                                <td className="border border-black px-1 text-right font-mono">
                                    {getLineUnitPrice(item) > 0 ? formatCurrency(getLineUnitPrice(item)) : '---'}
                                </td>
                                <td className="border border-black px-1 text-right font-semibold">
                                    {getLineTotal(item) > 0 ? formatCurrency(getLineTotal(item)) : '---'}
                                </td>
                            </tr>
                        ))}
                        {(data.grnline?.length || 0) < 6 && Array.from({ length: 6 - (data.grnline?.length || 0) }).map((_, i) => (
                            <tr key={`empty-${i}`} className="h-8">
                                <td className="border border-black"></td>
                                <td className="border border-black"></td>
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
                            <td colSpan={7} className="border-none"></td>
                            <td className="border border-black px-2 py-1 bg-gray-50 text-[10px] uppercase">Gross Total:</td>
                            <td className="border border-black px-2 py-1 text-right">PKR {formatCurrency(grossTotal)}</td>
                        </tr>
                        {taxTotal > 0 && (
                            <tr>
                                <td colSpan={7} className="border-none"></td>
                                <td className="border border-black px-2 py-1 bg-gray-50 text-[10px] uppercase">Tax:</td>
                                <td className="border border-black px-2 py-1 text-right">PKR {formatCurrency(taxTotal)}</td>
                            </tr>
                        )}
                        <tr>
                            <td colSpan={7} className="border-none"></td>
                            <td className="border border-black px-2 py-1 bg-gray-50 text-[10px] uppercase">Discount:</td>
                            <td className="border border-black px-2 py-1 text-right">PKR {formatCurrency(discount)}</td>
                        </tr>
                        <tr>
                            <td colSpan={7} className="border-none"></td>
                            <td className="border border-black px-2 py-1 bg-gray-50 text-[10px] uppercase">Transport:</td>
                            <td className="border border-black px-2 py-1 text-right">PKR {formatCurrency(transport)}</td>
                        </tr>
                        <tr>
                            <td colSpan={7} className="border-none"></td>
                            <td className="border border-black px-2 py-2 bg-gray-100 uppercase text-xs">Net Total</td>
                            <td className="border border-black px-2 py-2 text-right bg-gray-100 text-sm decoration-double underline">
                                PKR {formatCurrency(data.nettotal || grossTotal + taxTotal - discount + transport)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* FOOTER */}
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
                            GENE LABORATORIES <br /> WAREHOUSE MANAGER
                        </div>
                    </div>
                    <div className="w-full border-t-2 border-black text-center pt-1 mt-6">
                        <p className="text-[10px] font-black italic uppercase">Authorized Signature</p>
                    </div>
                </div>
            </div>

            <p className="mt-4 text-[9px] text-gray-400 italic text-center print:hidden">
                * Computer generated GRN. Signature is required for legal validity.
            </p>
        </div>
    );
};
