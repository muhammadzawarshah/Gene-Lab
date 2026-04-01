"use client";

import React from 'react';

// --- TYPES ---
interface DeliveryLineItem {
    delv_note_line_id: number;
    product: { name: string; sku_code?: string };
    batch?: { batch_number: string; expiry_date?: string; manufacturing_date?: string };
    delivered_qty: any;
    uom?: { name: string };
    remarks?: string;
}

interface DeliveryNoteData {
    delv_note_id: number;
    delivery_number: string;
    delv_date: string;
    status: string;
    discount?: string;
    transportcharges?: string;
    nettotal?: string;
    salesorder?: {
        so_id: number;
        party?: { name: string };
    };
    deliverynoteline: DeliveryLineItem[];
}

interface DeliveryNoteReportProps {
    data: DeliveryNoteData | null;
}

export const DeliveryNoteReportComponent = ({ data }: DeliveryNoteReportProps) => {
    if (!data) return <div className="p-10 text-center text-gray-500">No Delivery Note Selected</div>;

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
                    <h2 className="text-2xl font-bold border-b-2 border-black w-full text-right pb-1 mb-2 uppercase tracking-widest">Delivery Note</h2>
                    <div className="border border-black p-2 min-w-[160px]">
                        <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-semibold uppercase mr-4">DN #</span>
                            <span className="font-bold">{data.delivery_number}</span>
                        </div>
                        <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-semibold uppercase mr-4">DN ID:</span>
                            <span className="font-bold">{data.delv_note_id}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span className="font-semibold uppercase mr-4">Date:</span>
                            <span className="font-bold">{formatDate(data.delv_date)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* CUSTOMER SECTION */}
            <div className="mb-6">
                <div className="border border-black p-2 w-[320px] bg-gray-50">
                    <p className="text-[10px] font-black underline mb-1 italic uppercase">Delivered To (Customer)</p>
                    <p className="text-sm font-black uppercase tracking-wide">{data.salesorder?.party?.name || "N/A"}</p>
                    {data.salesorder?.so_id && (
                        <p className="text-[10px] text-gray-600 mt-1">SO Ref: #{data.salesorder.so_id}</p>
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
                            <th className="border border-black px-1 py-1.5 w-12 text-center">UoM</th>
                            <th className="border border-black px-1 py-1.5 w-16 text-right">Qty</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.deliverynoteline?.map((item, index) => (
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
                                <td className="border border-black px-2 text-right font-semibold">{item.delivered_qty}</td>
                            </tr>
                        ))}

                        {/* Empty Rows */}
                        {(data.deliverynoteline?.length || 0) < 8 && Array.from({ length: 8 - (data.deliverynoteline?.length || 0) }).map((_, i) => (
                            <tr key={`empty-${i}`} className="h-8">
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

                    {/* TOTALS SECTION */}
                    <tfoot className="font-bold italic">
                        <tr>
                            <td colSpan={5} className="border-none"></td>
                            <td className="border border-black px-2 py-1 bg-gray-50 text-[10px] uppercase">Discount:</td>
                            <td className="border border-black px-2 py-1 text-right">PKR {formatCurrency(data.discount || 0)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} className="border-none"></td>
                            <td className="border border-black px-2 py-1 bg-gray-50 text-[10px] uppercase">Transport:</td>
                            <td className="border border-black px-2 py-1 text-right">PKR {formatCurrency(data.transportcharges || 0)}</td>
                        </tr>
                        <tr>
                            <td colSpan={5} className="border-none"></td>
                            <td className="border border-black px-2 py-2 bg-gray-100 uppercase text-xs">Net Total</td>
                            <td className="border border-black px-2 py-2 text-right bg-gray-100 text-sm decoration-double underline">
                                PKR {formatCurrency(data.nettotal || 0)}
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
                            GENE LABORATORIES <br /> DISTRIBUTION MANAGER
                        </div>
                    </div>
                    <div className="w-full border-t-2 border-black text-center pt-1 mt-6">
                        <p className="text-[10px] font-black italic uppercase">Authorized Signature</p>
                    </div>
                </div>
            </div>

            <p className="mt-4 text-[9px] text-gray-400 italic text-center print:hidden">
                * Computer generated Delivery Note. Signature is required for legal validity.
            </p>
        </div>
    );
};
