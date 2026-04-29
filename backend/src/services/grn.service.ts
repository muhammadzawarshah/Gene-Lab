import { prisma } from '../lib/prisma.js';


export class GrnService {
  private static async syncPurchaseOrderStatus(tx: any, poId: number) {
    const poLines = await tx.purchaseorderline.findMany({
      where: { po_id: Number(poId) }
    });

    const allGrnLines = await tx.grnline.findMany({
      where: { grn: { po_id: Number(poId) } }
    });

    const receivedByLine = allGrnLines.reduce((acc: Record<number, number>, line: any) => {
      if (!line.po_line_id) {
        return acc;
      }

      acc[line.po_line_id] = (acc[line.po_line_id] || 0) + Number(line.received_qty || 0);
      return acc;
    }, {});

    const isFullyReceived = poLines.every((line: any) => {
      const receivedQty = receivedByLine[line.po_line_id] || 0;
      return receivedQty >= Number(line.quantity || 0);
    });

    const hasAnyReceipt = Object.values(receivedByLine).some((qty) => Number(qty) > 0);
    const nextStatus = isFullyReceived ? 'COMPLETED' : hasAnyReceipt ? 'PARTIAL' : 'APPROVED';

    await tx.purchaseorder.update({
      where: { po_id: Number(poId) },
      data: { status: nextStatus }
    });

    return nextStatus;
  }

  static async processGRN(poId: number, warehouseId: number, items: any[], discount : string ,transportCharges : string , netTotal : number ) {
  return await prisma.$transaction(async (tx) => {
    const warehouse = await tx.warehouse.findUnique({
      where: { warehouse_id: Number(warehouseId) },
      select: { warehouse_id: true, location: true }
    });

    if (!warehouse) {
      throw new Error('Selected warehouse not found');
    }

    const poLines = await tx.purchaseorderline.findMany({
      where: { po_id: Number(poId) }
    });

    if (!poLines.length) {
      throw new Error('Purchase order items not found');
    }

    const existingGrnLines = await tx.grnline.findMany({
      where: { grn: { po_id: Number(poId) } }
    });

    const existingReceivedByLine = existingGrnLines.reduce((acc: Record<number, number>, line: any) => {
      if (!line.po_line_id) {
        return acc;
      }

      acc[line.po_line_id] = (acc[line.po_line_id] || 0) + Number(line.received_qty || 0);
      return acc;
    }, {});

    const grn = await tx.grn.create({
      data: {
        po_id: Number(poId),
        received_date: new Date(),
        status: 'COMPLETED',
        grn_number: `GRN-${Date.now()}`,
        discount: discount !== undefined && discount !== null ? String(discount) : null,
        transportcharges: transportCharges !== undefined && transportCharges !== null ? String(transportCharges) : null,
        nettotal: String(netTotal)
      }
    });

    let receivedItemsCount = 0;

    for (const item of items) {
      const qtyToReceive = Number(item.received_qty || item.quantity || 0);

      if (isNaN(qtyToReceive) || qtyToReceive < 0) {
        throw new Error(`Invalid quantity for product ${item.product_id}`);
      }

      if (qtyToReceive === 0) {
        continue;
      }

      const poLineId = Number(item.po_line_id || 0);
      const poLine = poLines.find((line: any) => line.po_line_id === poLineId);

      if (!poLine) {
        throw new Error(`PO line not found for product ${item.product_id}`);
      }

      const alreadyReceived = existingReceivedByLine[poLine.po_line_id] || 0;
      const remainingQty = Number(poLine.quantity || 0) - alreadyReceived;

      if (qtyToReceive > remainingQty) {
        throw new Error(`Received quantity exceeds remaining PO quantity for product ${item.product_id}`);
      }

      let batchEntry: any;
      const selectedBatchId = Number(item.batch_id || item.selected_batch_id || 0);

      if (selectedBatchId) {
        batchEntry = await tx.batch.findUnique({
          where: { batch_id: selectedBatchId },
          include: {
            batchitem: {
              where: { product_id: item.product_id }
            }
          }
        });

        if (!batchEntry) {
          throw new Error(`Selected batch not found for product ${item.product_id}`);
        }

        await tx.batch.update({
          where: { batch_id: selectedBatchId },
          data: {
            location_id: warehouse.location ?? null
          }
        });

        const existingBatchItem = batchEntry.batchitem?.[0];

        if (existingBatchItem) {
          await tx.batchitem.update({
            where: { item_id: existingBatchItem.item_id },
            data: {
              received_quantity: { increment: qtyToReceive },
              available_quantity: { increment: qtyToReceive }
            }
          });
        } else {
          await tx.batchitem.create({
            data: {
              batch_id: selectedBatchId,
              product_id: item.product_id,
              received_quantity: qtyToReceive,
              available_quantity: qtyToReceive
            }
          });
        }
      } else {
        // 2. Batch Number generate karein agar nahi diya gaya
        const bNumber = item.batch_number || `BT-${Date.now()}-${item.product_id.slice(0, 4)}`;

        // 3. Create new batch
        batchEntry = await tx.batch.create({
          data: {
            batch_number: bNumber,
            manufacturing_date: item.mfg_date ? new Date(item.mfg_date) : null,
            expiry_date: item.expiry_date ? new Date(item.expiry_date) : null,
            status: 'ACTIVE',
            location_id: warehouse.location ?? null,
            batchitem: {
              create: {
                product_id: item.product_id,
                received_quantity: qtyToReceive,
                available_quantity: qtyToReceive,
              }
            }
          }
        });
      }

      // 4. Create GRN Line
      await tx.grnline.create({
        data: {
          grn_id: grn.grn_id,
          product_id: item.product_id,
          received_qty: qtyToReceive,
          uom_id: Number(item.uom_id || poLine.uom_id || 1),
          batch_id: batchEntry.batch_id,
          po_line_id: poLine.po_line_id,
          sale_price: item.sale_price ? parseFloat(item.sale_price) : null,
          purchase_price: item.purchase_price ? parseFloat(item.purchase_price) : null,
          remarks: "Received through automated GRN"
        }
      });

      // 5. Update Stock Item
      await tx.stockitem.upsert({
        where: {
          product_id_warehouse_id: {
            product_id: item.product_id,
            warehouse_id: Number(warehouseId)
          }
        },
        update: { 
          quantity_on_hand: { increment: qtyToReceive } 
        },
        create: {
          product_id: item.product_id,
          warehouse_id: Number(warehouseId),
          uom_id: Number(item.uom_id || poLine.uom_id || 1),
          quantity_on_hand: qtyToReceive,
          reserved_quantity: 0
        }
      });

      // 6. Stock Movement
      await tx.stockmovement.create({
        data: {
          mov_type: "GRN",
          product_id: item.product_id,
          warehouse_to_id: Number(warehouseId),
          quantity: qtyToReceive,
          uom_id: Number(item.uom_id || poLine.uom_id || 1),
          batch_id: batchEntry.batch_id,
          posted_at: new Date(),
          source_doctype: "GRN",
          source_doc_id: "RELATIONSHIP"
        }
      });

      existingReceivedByLine[poLine.po_line_id] = alreadyReceived + qtyToReceive;
      receivedItemsCount += 1;
    }

    if (!receivedItemsCount) {
      throw new Error('At least one item with received quantity is required');
    }

    await GrnService.syncPurchaseOrderStatus(tx, Number(poId));

    return grn;
  });
}

  static async listgrn() {
  return await prisma.grn.findMany({
    include: {
      // 1. Purchase Order aur Supplier ki detail nikalne ke liye
      purchaseorder: {
        include: {
          party: {
            select: {
              name: true, // Supplier ka naam
            }
          }
        }
      },
      // 2. GRN ki lines aur unse juda product/batch data
      grnline: {
        include: {
          product: {
            select: {
              name: true,
              sku_code: true
            }
          },
          batch: {
            select: {
              batch_number: true,
              expiry_date: true,
              manufacturing_date: true
            }
          },
          uom: {
            select: {
              name: true
            }
          },
          purchaseorderline: {
            select: {
              unit_price: true,
              line_total: true,
              tax: {
                select: {
                  name: true,
                  rate: true,
                  type: true
                }
              }
            }
          }
        }
      }
    },
    orderBy: {
      received_date: 'desc' // Newest GRN sabse upar
    }
  });
}

static async getGRNById(identifier: string | number) {
  const isNumeric = !isNaN(Number(identifier));
  
  // Base query filter build karein
  const whereCondition = isNumeric 
    ? { grn_id: Number(identifier) } 
    : { grn_number: String(identifier) };

  return await prisma.grn.findFirst({
    where: whereCondition,
    include: {
      purchaseorder: {
        include: {
          party: { select: { name: true } }
        }
      },
      grnline: {
        include: {
          product: { select: { name: true, sku_code: true } },
          batch: { select: { batch_number: true, expiry_date: true, manufacturing_date: true } },
          uom: { select: { name: true } },
          purchaseorderline: { select: { unit_price: true, line_total: true, tax: { select: { name: true, rate: true, type: true } } } }
        }
      }
    }
  });
}
}
