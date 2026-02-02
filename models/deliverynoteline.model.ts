import { prisma } from "../lib/prisma";

interface  Deliverynoteline {
    delv_note_line_id : number | undefined,
    delv_note_id      : number,
    product_id        : string,
    delivered_qty     : number,
    uom_id            : number,
    batch_id          : number | undefined,
    so_line_id        : number | undefined,
    remarks           : string | undefined,
    batch             : any,
    deliverynote      : any,
    product           : any,
    salesorderline    : any,
    uom               : any
}

class DeliverynotelineModel{
    static async getDeliverynoteline(delvNoteLineId: number) {
        const deliverynoteline = prisma.deliverynoteline.findUnique({
            where: { delv_note_line_id: delvNoteLineId },
        });
        return deliverynoteline;
    }
    static async createDeliverynoteline(data: Deliverynoteline) {
        const newDeliverynoteline = await prisma.deliverynoteline.create({
            data: { 
                delv_note_line_id : data.delv_note_line_id,
                delv_note_id      : data.delv_note_id,
                product_id        : data.product_id,
                delivered_qty     : data.delivered_qty,
                uom_id            : data.uom_id,
                batch_id          : data.batch_id,
                so_line_id        : data.so_line_id,
                remarks           : data.remarks,
                batch             : {connect: data.batch},
                deliverynote      : {connect: data.deliverynote},
                product           : {connect: data.product},
                salesorderline    : {connect: data.salesorderline},
                uom               : {connect: data.uom}
                },
        });
        return newDeliverynoteline;
    }

    static async updateDeliverynoteline(delvNoteLineId: number, data: Partial<Deliverynoteline>) {
        const updatedDeliverynoteline = await prisma.deliverynoteline.update({
            where: { delv_note_line_id: delvNoteLineId },
            data: {
                ...data,
            },
        });
        return updatedDeliverynoteline;
    }

    static async deleteDeliverynoteline(delvNoteLineId: number) {
        const deletedDeliverynoteline = await prisma.deliverynoteline.delete({
            where: { delv_note_line_id: delvNoteLineId },
        });
        return deletedDeliverynoteline;
    }

}
export default DeliverynotelineModel;