// src/services/grn.service.ts
import { prisma } from '../lib/prisma.js';


export class GrnService {
 static async processGRN(poId: number, warehouseId: number, items: any[]) {
  return await prisma.$transaction(async (tx) => {
    
    // 1. Create GRN Header
    const grn = await tx.grn.create({
      data: {
        po_id: Number(poId),
        received_date: new Date(),
        status: 'COMPLETED',
        grn_number: `GRN-${Date.now()}`
      }
    });

    for (const item of items) {
      // 2. Create Batch (Ensuring IDs are handled)
      const batch = await tx.batch.create({
        data: {
          product_id: item.product_id,
          batch_number: item.batch_number,
          manufacturing_date: new Date(item.manufacturing_date),
          expiry_date: new Date(item.expiry_date),
          received_quantity: Number(item.received_qty),
          available_quantity: Number(item.received_qty),
          status: 'ACTIVE',
        } as any
      });

      // 3. Create GRN Line Record
      await tx.grnline.create({
        data: {
          grn_id: grn.grn_id,
          product_id: item.product_id,
          received_qty: Number(item.received_qty),
          uom_id: item.uomId || 1,
          batch_id: batch.batch_id,
          expiry_date: new Date(item.expiry_date),
          po_line_id: item.po_line_id || null, 
          remarks: "Received through GRN process"
        }
      });

      // 4. Stock Inventory Update
      await tx.stockitem.upsert({
        where: { 
          product_id_warehouse_id: { 
            product_id: item.product_id, 
            warehouse_id: Number(warehouseId) 
          } 
        },
        update: { quantity_on_hand: { increment: Number(item.received_qty) } },
        create: {
          product_id: item.product_id,
          warehouse_id:Number(warehouseId),
          uom_id: item.uomId || 1,
          quantity_on_hand: Number(item.received_qty),
          reserved_quantity: 0
        }
      });
    }

    // 5. UPDATE PURCHASE ORDER STATUS (Crucial Step)
    // Note: 'RECEIVED' value aapke purchase_order_enum mein honi chahiye
    await tx.purchaseorder.update({
      where: { po_id: Number(poId) },
      data: { 
        status: 'RECIEVED' // Ensure this matches your Prisma Enum exactly
      }
    });

    return grn;
  });
}
}