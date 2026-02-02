import { prisma } from "../lib/prisma";
import { purchase_order_enum } from "../generated/prisma/enums";
import { Decimal } from "@prisma/client/runtime/client";
import { json } from "node:stream/consumers";

interface purchaseorder {
    party_id_supplier: string;
    order_date: Date;
    expected_del_date: Date;
    status: purchase_order_enum;
    total_amount: Decimal;
    grn: Array<any>;
    purchaseorderline: Array<any>;
    supplierinvoice: Array<any>;
}

interface purchaseorderline {
    po_id: Number;
    product_id: String;
    quantity: Decimal;
    uom_id: Number;
    unit_price: Decimal;
    line_total: Decimal;
    tax_id: Number;
    grnline: Array<any>;
}


class puchaseorders {
    static async readall() {
        try {
            const po = await prisma.purchaseorder.findMany();
            const pol = await prisma.purchaseorderline.findMany();
            return {
                po,
                pol
            }
        } catch (error) {
            return error;
        }
    }

    static async readonly(id: string) {
        try {
            const po = await prisma.purchaseorder.findUnique({
                where: {
                    po_id: Number(id)
                }
            })

            const pol = await prisma.purchaseorderline.findUnique({
                where: {
                    po_line_id: po?.po_id
                }
            })

            return {
                po,
                pol
            }
        } catch (error) {
            return error
        }
    }

    static async createpo(params: purchaseorder, lineparams: purchaseorderline) {
        try {
            const po = await prisma.purchaseorder.create({
                data: {
                    party_id_supplier: params.party_id_supplier,
                    order_date: String(Date.now()),
                    expected_del_date: String(Date.now()),
                    status: "DRAFT",
                    total_amount: params.total_amount
                }
            })
            const pol = await prisma.purchaseorder.create({
                data: {
                    po_id: Number(po.po_id),
                    product_id: lineparams.product_id,
                    quantity: lineparams.quantity,
                    uom_id: Number(lineparams.uom_id),
                    unit_price: lineparams.unit_price,
                    line_total: lineparams.line_total,
                    tax_id: lineparams.tax_id,
                    grnline: {
                        connect: params.grn.map((grnId: number) => ({
                            grn_id: grnId,
                        })),
                    }
                }
            })

            return { po, pol };
        } catch (error) {
            return error
        }
    }

    static async updatepo(params: purchaseorder, id: string,paramsline : purchaseorderline) {
        try {
            const po = await prisma.purchaseorder.update({
                where: {
                    po_id: Number(id),
                },
                data: {
                    party_id_supplier: params.party_id_supplier,
                    order_date: new Date(params.order_date),
                    expected_del_date: new Date(params.expected_del_date),
                    status: params.status,
                    total_amount: params.total_amount,

                    grn: {
                        connect: params.grn.map((grnId: number) => ({
                            grn_id: grnId,
                        })),
                    },

                    purchaseorderline: {
                        connect: params.purchaseorderline.map((lineId: number) => ({
                            pol_id: lineId,
                        })),
                    },

                    supplierinvoice: {
                        connect: params.supplierinvoice.map((invId: number) => ({
                            invoice_id: invId,
                        })),
                    },
                },
            });

            const pol = await prisma.purchaseorderline.update({
                where: {
                    po_line_id= params.purchaseorderline
                },
                data: {
                    po_id: po.po_id,
                    product_id: paramsline.product_id,
                    quantity: paramsline.quantity,
                    uom_id: paramsline.uom_id,
                    unit_price: paramsline.unit_price,
                    line_total: paramsline.line_total,
                    tax_id: paramsline.tax_id,
                    grnline: {
                        connect: paramsline.grnline.map((grnId: number) => ({
                            grn_line_id: grnId,
                        })),
                    } 
                }
            })

            return po;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }
   

}

export default puchaseorders;