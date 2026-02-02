import { prisma } from "../lib/prisma";

interface deliverynote {
    delv_note_id   :number | undefined,
    delivery_number : string,
    so_id           : number,
    delv_date       : Date,
    delivered_by    : string,
    status          : string,
    salesorder      : any,
    deliverynoteline : Array<any>,
}

class DeliverynoteModel{
    static async getDeliverynote(delvNoteId: number) {
        const deliverynote = prisma.deliverynote.findUnique({
            where: { delv_note_id: delvNoteId },
        }); 
        return deliverynote;
    }
    static async createDeliverynote(data: deliverynote) {
        const newDeliverynote = await prisma.deliverynote.create({
            data: {
                delv_note_id   : data.delv_note_id,
                delivery_number : data.delivery_number,
                so_id           : data.so_id,
                delv_date       : data.delv_date,
                delivered_by    : data.delivered_by,
                status          : data.status,
                salesorder      : {connect: data.salesorder},
                deliverynoteline : {connect: data.deliverynoteline}
                },
        });
        return newDeliverynote;
    }
    static async updateDeliverynote(delvNoteId: number, data: Partial<deliverynote>) {
        const updatedDeliverynote = await prisma.deliverynote.update({
            where: { delv_note_id: delvNoteId },
            data: {
                ...data,
            },
        });
        return updatedDeliverynote;
    }

    static async deleteDeliverynote(delvNoteId: number) {
        const deletedDeliverynote = await prisma.deliverynote.delete({
            where: { delv_note_id: delvNoteId },
        });
        return deletedDeliverynote;
    }

}
export default DeliverynoteModel;