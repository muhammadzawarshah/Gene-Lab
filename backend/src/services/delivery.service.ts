// src/services/delivery.service.ts
import { prisma } from '../lib/prisma.js';
import { source_doctype_enum } from "@prisma/client";

export class DeliveryService {
static async shipOrder(
  soId: number, 
  warehouseId: number, 
  discount: string, 
  transportCharges: string, 
  totalAmount: string, 
  products: any[] 
) {
  return await prisma.$transaction(async (tx) => {
    
    // 1. Sales order lines fetch karein
    const orderLines = await tx.salesorderline.findMany({
      where: { so_id: Number(soId) }
    });

    if (!orderLines || orderLines.length === 0) {
      throw new Error("Sales Order has no items in database.");
    }

    // --- 2. DELIVERY NUMBER GENERATION ---
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); 
    const lastDelivery = await tx.deliverynote.findFirst({
      where: { delivery_number: { startsWith: `DN-${dateStr}` } },
      orderBy: { delivery_number: 'desc' }
    });

    let nextSeq = "001";
    if (lastDelivery && lastDelivery.delivery_number) {
      const parts = lastDelivery.delivery_number.split('-');
      if (parts.length === 3) {
        const lastSeq = parseInt(parts[2] as any);
        nextSeq = (lastSeq + 1).toString().padStart(3, '0');
      }
    }
    const deliveryNumber = `DN-${dateStr}-${nextSeq}`;

    // 3. Delivery Note Master Record create karein
    const delivery = await tx.deliverynote.create({
      data: {
        so_id: Number(soId),
        delivery_number: deliveryNumber, 
        delv_date: today,
        status: 'POSTED',
        discount: String(discount || "0"),
        transportcharges: String(transportCharges || "0"),
        nettotal: String(totalAmount || "0"),
      }
    });

    // 4. Loop through each line item
    for (const line of orderLines) {
      
      // --- MATCHING LOGIC ---
      // Frontend array mein is product ko dhoondo (Matching UUIDs as Strings)
      const matchedProduct = (products || []).find(p => 
        String(p.product_id) === String(line.product_id) || String(p.id) === String(line.product_id)
      );

      let finalBatchId = null;

      if (matchedProduct) {
        // User ne dropdown se jo batch number (string) select kiya hai
        const selectedBatchNumber = matchedProduct.batch; 

        // Us product ke batchOptions mein se asli batch_id (integer) nikalo
        const batchData = (matchedProduct.batchOptions || []).find((b: any) => 
          String(b.batch_number) === String(selectedBatchNumber)
        );

        if (batchData) {
          finalBatchId = Number(batchData.batch_id);
        }
      }

      // --- 5. STOCK RECORD CHECK ---
      const existingStock = await tx.stockitem.findUnique({
        where: {
          product_id_warehouse_id: {
            product_id: line.product_id,
            warehouse_id: Number(warehouseId)
          }
        }
      });

      if (!existingStock) {
        throw new Error(`Stock record not found for Product ID: ${line.product_id}`);
      }

      // 6. Delivery Note Line create karein (Mapping frontend batch to DB ID)
      await tx.deliverynoteline.create({
        data: {
          delv_note_id: delivery.delv_note_id,
          product_id: line.product_id,
          delivered_qty: line.quantity,
          uom_id: line.uom_id,
          batch_id: finalBatchId, // <--- Ab ye perfect Integer store hoga (NaN nahi aayega)
          so_line_id: line.so_line_id,
          remarks: "Shipped from warehouse"
        }
      });

      // 7. Inventory Update (Quantity kam karein)
      await tx.stockitem.update({
        where: {
          product_id_warehouse_id: {
            product_id: line.product_id,
            warehouse_id: Number(warehouseId)
          }
        },
        data: {
          quantity_on_hand: { decrement: line.quantity },
          reserved_quantity: { decrement: line.quantity } 
        }
      });

      // 8. Stock Movement (History)
      await tx.stockmovement.create({
        data: {
          mov_type: 'OUTBOUND',
          source_doctype: 'SALE_ORDER', 
          product_id: line.product_id,
          warehouse_from_id: Number(warehouseId),
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
            uom: true,
            batch: true
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
            batch: true,
            salesorderline: {
              select: {
                unit_price: true,
                line_total: true,
                tax: { select: { name: true, rate: true, type: true } }
              }
            }
          }
        }
      }
    });
  }
}