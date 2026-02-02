import { Decimal } from "@prisma/client/runtime/client";
import { prisma } from "../lib/prisma";

interface Batch {
    batch_id: number | undefined,
    product_id: string,
    batch_number: string,
    manufacture_date: Date,
    expiry_date: Date,
    recieved_quantity: Decimal,
    available_quantity: Decimal,
    status: string,
    location_id : number,
    province_id : string,
    product : string,
    deliverynoteline : Array<any>,
    grnline : Array<any>,
    stockmovementline : Array<any>,
}

class batchmodel{
    static async getBatch(batchId: number) {
        const batch = prisma.batch.findUnique({
            where: { batch_id: batchId },
        });
        return batch;
    }

    static async createBatch(data: Batch) {
        const newBatch = await prisma.batch.create({
            data: { 
                batch_id: data.batch_id,
                product_id: data.product_id,
                batch_number: data.batch_number,
                manufacture_date: data.manufacture_date,
                expiry_date: data.expiry_date,
                recieved_quantity: data.recieved_quantity,
                available_quantity: data.available_quantity,
                status: data.status,
                location_id : data.location_id,
                province_id : data.province_id,
                product : data.product,
                deliverynoteline : {connect: data.deliverynoteline},
                grnline : {connect: data.grnline},
                stockmovementline : {connect: data.stockmovementline},
             },
        });
        return newBatch;
    }
    static async updateBatch(batchId: number, data: Partial<Batch>) {
        const updatedBatch = await prisma.batch.update({
            where: { batch_id: batchId },
            data: {
                ...data,
            },
        });
        return updatedBatch;
    }
    static async deleteBatch(batchId: number) {
        const deletedBatch = await prisma.batch.delete({
            where: { batch_id: batchId },
        });
        return deletedBatch;
    }

}

export default batchmodel;