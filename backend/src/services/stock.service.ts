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

  static async recordMovement(tx: any, data: any) {
    return await tx.stockmovement.create({
      data: {
        ...data,
        posted_at: new Date()
      }
    });
  }
}