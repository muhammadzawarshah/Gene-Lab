// src/services/delivery.service.ts
import { prisma } from '../lib/prisma.js';


export class DeliveryService {
  static async shipOrder(soId: number, warehouseId: number) {
    return await prisma.$transaction(async (tx) => {
      const orderLines = await tx.salesorderline.findMany({ where: { so_id: soId } });

      const delivery = await tx.deliverynote.create({
        data: { delv_note_id: 0, so_id: soId, delv_date: new Date(), status: 'POSTED' }
      });

      for (const line of orderLines) {
       
        await tx.stockitem.update({
          where: { 
            product_id_warehouse_id: { product_id: line.product_id, warehouse_id: warehouseId } 
          },
          data: {
            quantity_on_hand: { decrement: line.quantity },
            reserved_quantity: { decrement: line.quantity }
          }
        });

       
        await tx.stockmovement.create({
          data: {
            stock_mov_id: 0,
            mov_type: 'OUTBOUND',
            source_doctype: 'SALE ORDER',
            product_id: line.product_id,
            quantity: line.quantity,
            uom_id: line.uom_id,
            posted_at: new Date()
          }
        });
      }
      return delivery;
    });
  }

  static async deliverylist(){
    return prisma.deliverynote.findMany();
  }
}