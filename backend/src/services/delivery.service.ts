// src/services/delivery.service.ts
import { prisma } from '../lib/prisma.js';

export class DeliveryService {
static async syncSalesOrderStatus(tx: any, soId: number) {
  const orderLines = await tx.salesorderline.findMany({
    where: { so_id: Number(soId) }
  });

  const allDeliveryLines = await tx.deliverynoteline.findMany({
    where: {
      deliverynote: {
        so_id: Number(soId)
      }
    }
  });

  const deliveredByLine = allDeliveryLines.reduce((acc: Record<number, number>, line: any) => {
    if (!line.so_line_id) {
      return acc;
    }

    acc[line.so_line_id] = (acc[line.so_line_id] || 0) + Number(line.delivered_qty || 0);
    return acc;
  }, {});

  const isFullyDelivered = orderLines.every((line: any) => {
    const deliveredQty = deliveredByLine[line.so_line_id] || 0;
    return deliveredQty >= Number(line.quantity || 0);
  });

  const hasAnyDelivery = Object.values(deliveredByLine).some((qty) => Number(qty) > 0);
  const nextStatus = isFullyDelivered ? 'COMPLETED' : hasAnyDelivery ? 'PARTIAL' : 'APPROVED';

  await tx.salesorder.update({
    where: { so_id: Number(soId) },
    data: { status: nextStatus }
  });

  return nextStatus;
}

static async shipOrder(
  soId: number, 
  warehouseId: number, 
  discount: string, 
  transportCharges: string, 
  totalAmount: string, 
  products: any[] 
) {
  return await prisma.$transaction(async (tx) => {
    
    const orderLines = await tx.salesorderline.findMany({
      where: { so_id: Number(soId) }
    });

    if (!orderLines || orderLines.length === 0) {
      throw new Error("Sales Order has no items in database.");
    }

    const existingDeliveryLines = await tx.deliverynoteline.findMany({
      where: {
        deliverynote: {
          so_id: Number(soId)
        }
      }
    });

    const deliveredByLine = existingDeliveryLines.reduce((acc: Record<number, number>, line: any) => {
      if (!line.so_line_id) {
        return acc;
      }

      acc[line.so_line_id] = (acc[line.so_line_id] || 0) + Number(line.delivered_qty || 0);
      return acc;
    }, {});

    const requestedLines = (products || [])
      .map((item: any) => {
        const requestedQty = Number(item.delivered_qty ?? item.quantity ?? item.total_unit ?? 0);
        return {
          ...item,
          requestedQty
        };
      })
      .filter((item: any) => item.requestedQty > 0);

    if (!requestedLines.length) {
      throw new Error('At least one delivery line with quantity is required.');
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
        status: 'PENDING',
        discount: String(discount || "0"),
        transportcharges: String(transportCharges || "0"),
        nettotal: String(totalAmount || "0"),
      }
    });

    for (const item of requestedLines) {
      const orderLine = item.so_line_id
        ? orderLines.find((line: any) => line.so_line_id === Number(item.so_line_id))
        : orderLines.find((line: any) => line.product_id === item.product_id);

      if (!orderLine) {
        throw new Error(`Sales order line not found for product ${item.product_id}`);
      }

      const alreadyDelivered = deliveredByLine[orderLine.so_line_id] || 0;
      const remainingQty = Number(orderLine.quantity || 0) - alreadyDelivered;

      if (item.requestedQty > remainingQty) {
        throw new Error(`Delivery quantity exceeds remaining sales order quantity for product ${orderLine.product_id}`);
      }

      let finalBatchId = item.batch_id ? Number(item.batch_id) : (orderLine.batch_id ? Number(orderLine.batch_id) : null);
      if (!finalBatchId && item.batch) {
        const batchData = (item.batchOptions || []).find((batch: any) =>
          String(batch.batch_number) === String(item.batch)
        );
        if (batchData) {
          finalBatchId = Number(batchData.batch_id);
        }
      }

      const existingStock = await tx.stockitem.findUnique({
        where: {
          product_id_warehouse_id: {
            product_id: orderLine.product_id,
            warehouse_id: Number(warehouseId)
          }
        }
      });

      if (!existingStock || Number(existingStock.quantity_on_hand || 0) < item.requestedQty) {
        throw new Error(`Insufficient warehouse stock for Product ID: ${orderLine.product_id}`);
      }

      await tx.deliverynoteline.create({
        data: {
          delv_note_id: delivery.delv_note_id,
          product_id: orderLine.product_id,
          delivered_qty: item.requestedQty,
          uom_id: orderLine.uom_id,
          batch_id: finalBatchId,
          so_line_id: orderLine.so_line_id,
          sale_price: item.sale_price !== undefined && item.sale_price !== null
            ? Number(item.sale_price)
            : orderLine.sale_price
              ? Number(orderLine.sale_price)
              : null,
          purchase_price: null,
          remarks: "Shipped from warehouse"
        }
      });

      await tx.stockitem.update({
        where: {
          product_id_warehouse_id: {
            product_id: orderLine.product_id,
            warehouse_id: Number(warehouseId)
          }
        },
        data: {
          quantity_on_hand: { decrement: item.requestedQty }
        }
      });

      await tx.stockmovement.create({
        data: {
          mov_type: 'OUTBOUND',
          source_doctype: 'SALE_ORDER', 
          product_id: orderLine.product_id,
          warehouse_from_id: Number(warehouseId),
          quantity: item.requestedQty,
          uom_id: orderLine.uom_id,
          posted_at: new Date()
        }
      });

      deliveredByLine[orderLine.so_line_id] = alreadyDelivered + item.requestedQty;
    }

    const nextStatus = await DeliveryService.syncSalesOrderStatus(tx, Number(soId));

    await tx.deliverynote.update({
      where: { delv_note_id: delivery.delv_note_id },
      data: { status: 'COMPLETED' }
    });

    return {
      ...delivery,
      status: nextStatus
    };
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
