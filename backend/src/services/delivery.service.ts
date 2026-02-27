// src/services/delivery.service.ts
import { prisma } from '../lib/prisma.js';
import { source_doctype_enum } from "@prisma/client";

export class DeliveryService {
 static async shipOrder(soId: number, warehouseId: number) {
    return await prisma.$transaction(async (tx) => {
      // 1. Sales order lines fetch karein
      const orderLines = await tx.salesorderline.findMany({
        where: { so_id: soId }
      });

      if (orderLines.length === 0) throw new Error("Sales Order has no items.");

      // --- 2. AUTO GENERATE DELIVERY NUMBER (DN-YYYYMMDD-00X) ---
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // e.g., 20260224
      
      const lastDelivery = await tx.deliverynote.findFirst({
        where: { delivery_number: { startsWith: `DN-${dateStr}` } },
        orderBy: { delivery_number: 'desc' }
      });

      let nextSeq = "001";
      if (lastDelivery && lastDelivery.delivery_number) {
        const lastSeq = parseInt(lastDelivery.delivery_number.split('-')[2] as any);
        nextSeq = (lastSeq + 1).toString().padStart(3, '0');
      }
      const deliveryNumber = `DN-${dateStr}-${nextSeq}`;

      // 3. Delivery Note create karein
      const delivery = await tx.deliverynote.create({
        data: {
          so_id: soId,
          delivery_number: deliveryNumber, 
          delv_date: today,
          status: 'POSTED'
        }
      });

      for (const line of orderLines) {
        // --- 4. PRE-CHECK STOCK RECORD (Strict Update Logic) ---
        const existingStock = await tx.stockitem.findUnique({
          where: {
            product_id_warehouse_id: {
              product_id: line.product_id,
              warehouse_id: warehouseId
            }
          }
        });

        if (!existingStock) {
          throw new Error(`Stock record not found for product ID: ${line.product_id} in Warehouse ID: ${warehouseId}. Please initialize stock first.`);
        }

        // 5. Delivery Note Line create karein
        await tx.deliverynoteline.create({
          data: {
            delv_note_id: delivery.delv_note_id,
            product_id: line.product_id,
            delivered_qty: line.quantity,
            uom_id: line.uom_id,
            so_line_id: line.so_line_id,
            remarks: "Shipped from warehouse"
          }
        });

        // 6. Stock Item update (Inventory kam karein)
        await tx.stockitem.update({
          where: {
            product_id_warehouse_id: {
              product_id: line.product_id,
              warehouse_id: warehouseId
            }
          },
          data: {
            quantity_on_hand: { decrement: line.quantity },
            reserved_quantity: { decrement: line.quantity }
          }
        });

        // 7. Stock Movement record create karein
        await tx.stockmovement.create({
          data: {
            mov_type: 'OUTBOUND',
            source_doctype: source_doctype_enum.SALE_ORDER,
            product_id: line.product_id,
            warehouse_from_id: warehouseId,
            quantity: line.quantity,
            uom_id: line.uom_id,
            posted_at: new Date()
          }
        });
      }

      return delivery;
    });
  }

  static async deliverylist() {
    return prisma.deliverynote.findMany({
      include: {
        salesorder: {
          include: {
            party: true 
          }
        },
        deliverynoteline: {
          include: {
            product: {
              include: {
                productprice: true
              }
            },
            uom: true
          },
        },
      },
      orderBy: { delv_date: 'desc' }
    });
  }

  
  static async updateDelivery(delvNoteId: number, lines: any[], remarks?: string) {
    return await prisma.$transaction(async (tx) => {
      
      // A. Loop through lines and update quantities
      for (const line of lines) {
        await tx.deliverynoteline.update({
          where: { delv_note_line_id: line.delv_note_line_id },
          data: {
            delivered_qty: Number(line.delivered_qty),
            remarks: line.remarks || remarks
          }
        });

       
      }

      // B. Update Main Delivery Note Status to COMPLETED
      const updatedDelivery = await tx.deliverynote.update({
        where: { delv_note_id: delvNoteId },
        data: { 
          status: 'COMPLETED',
          delivered_by: 'SYSTEM_SYNC' // Ya current user ka naam
        }
      });

      return updatedDelivery;
    });
  }

  // --- 3. VIEW METHOD (For the Eye Icon) ---
  static async getDeliveryDetails(id: string) {
    return prisma.deliverynote.findFirst({
      where: { delivery_number: id },
      include: {
        salesorder: { include: { party: true } },
        deliverynoteline: {
          include: {
            product: true,
            uom: true,
            batch: true
          }
        }
      }
    });
  }
}