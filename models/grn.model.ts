import { prisma } from "../lib/prisma";

interface grnData {
  grn_id   : number;
  grn_number  : string;
  po_id       : number;
  received_date : Date;
  received_by   : string;
  status        : string;
  purchaseorder : String;
  grnline       : Array<object>;
}

class GrnModel {
    async createGrn(data: grnData) {
        const grn = await prisma.grn.create({
            data: {
                grn_number: data.grn_number,
                po_id: data.po_id,
                received_date: data.received_date,
                received_by: data.received_by,
                status: data.status,
            },
        });
        return grn;
    }
    async getGrnById(grn_id: number) {
        const grn = await prisma.grn.findUnique({
            where: { grn_id },
        });
        return grn;
    }
    async updateGrn(grn_id: number, data: Partial<grnData>) {
        const grn = await prisma.grn.update({
            where: { grn_id },
            data,
        });
        return grn;
    }
    async deleteGrn(grn_id: number) {
        const grn = await prisma.grn.delete({
            where: { grn_id },
        });
        return grn;
    }
    async listGrns() {
        const grns = await prisma.grn.findMany();
        return grns;
    }
}

export default GrnModel;