// src/services/stock.service.ts
import { prisma } from '../lib/prisma.js';


export class StockService {
  static async reserveStock(tx: any, productId: string, warehouseId: number, qty: number) {
    const stock = await tx.stockitem.findUnique({
      where: { product_id_warehouse_id: { product_id: productId, warehouse_id: warehouseId } }
    });

    if (!stock || (Number(stock.quantity_on_hand) - Number(stock.reserved_quantity) < qty)) {
      throw new Error(`Stock not available for Product: ${productId}`);
    }

    return await tx.stockitem.update({
      where: { stock_item_id: stock.stock_item_id },
      data: { reserved_quantity: { increment: qty } }
    });
  }

  

  static async getWarehouseStock(warehouseId: number) {
    return await prisma.stockitem.findMany({
      where: {
        warehouse_id: warehouseId,
      },
      include: {
        product: {
          include: {
            uom: true, // Unit of Measure details
            productprice: true,
          },
        },
      },
    });
  }

  static async recordMovement(tx: any, data: {
    mov_type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT'; // aapke enum ke mutabiq
    product_id: string;
    uom_id: number;
    quantity: number;
    warehouse_from_id?: number;
    warehouse_to_id?: number;
    source_doctype?: string;
    source_doc_id?: string;
    batch_id?: number;
  }) {
    return await tx.stockmovement.create({
      data: {
        mov_type: data.mov_type,
        product_id: data.product_id,
        uom_id: data.uom_id,
        quantity: data.quantity,
        warehouse_from_id: data.warehouse_from_id,
        warehouse_to_id: data.warehouse_to_id,
        source_doctype: data.source_doctype,
        source_doc_id: data.source_doc_id,
        batch_id: data.batch_id,
        posted_at: new Date()
      }
    });
  }
}