import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "../lib/prisma";
import { batch, grn, product, purchaseorderline, uom } from "../generated/prisma/client";

interface grnline {
    grn_line_id  : number;
    grn_id       : number;
    product_id   : string;
    received_qty : Decimal;
    uom_id       : number;
    batch_id     : number;
    expiry_date  : Date;
    po_line_id   : number;
    remarks      : string;
    batch        : batch;
    grn          : grn;
    purchaseorderline : purchaseorderline;
    product      : product;
    uom          : uom;
}

class GrnlineModel {
    async create(data: Omit<grnline, 'grn_line_id' | 'batch' | 'grn' | 'purchaseorderline' | 'product' | 'uom'>): Promise<grnline> {
        return prisma.grnline.create({ data });
    }
    async findById(grn_line_id: number): Promise<grnline | null> {
        return prisma.grnline.findUnique({
            where: { grn_line_id },
            include: { batch: true, grn: true, purchaseorderline: true, product: true, uom: true }
        });
    }
    async update(grn_line_id: number, data: Partial<Omit<grnline, 'grn_line_id' | 'batch' | 'grn' | 'purchaseorderline' | 'product' | 'uom'>>): Promise<grnline> {
        return prisma.grnline.update({
            where: { grn_line_id },
            data
        });
    }
    async delete(grn_line_id: number): Promise<grnline> {
        return prisma.grnline.delete({
            where: { grn_line_id }
        });
    }
    async findAll(): Promise<grnline[]> {
        return prisma.grnline.findMany({
            include: { batch: true, grn: true, purchaseorderline: true, product: true, uom: true }
        });
    }
}

export default  GrnlineModel;
 