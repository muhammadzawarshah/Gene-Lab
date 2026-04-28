// src/services/stock.service.ts
import { prisma } from '../lib/prisma.js';


export class StockService {
  static async reserveStock(tx: any, productId: string, qty: number, warehouseId?: number) {
    if (warehouseId) {
      const stock = await tx.stockitem.findUnique({
        where: {
          product_id_warehouse_id: {
            product_id: productId,
            warehouse_id: Number(warehouseId)
          }
        }
      });

      const availableQty = stock
        ? Number(stock.quantity_on_hand) - Number(stock.reserved_quantity || 0)
        : 0;

      if (!stock || availableQty < qty) {
        throw new Error(`Stock not available for Product: ${productId}. Available: ${availableQty}`);
      }

      return await tx.stockitem.update({
        where: { stock_item_id: stock.stock_item_id },
        data: { reserved_quantity: { increment: qty } }
      });
    }

    const stocks = await tx.stockitem.findMany({
      where: { product_id: productId },
      orderBy: { quantity_on_hand: 'desc' }
    });

    const totalAvailableQty = stocks.reduce((sum: number, stock: any) => {
      return sum + (Number(stock.quantity_on_hand || 0) - Number(stock.reserved_quantity || 0));
    }, 0);

    if (!stocks.length || totalAvailableQty < qty) {
      throw new Error(`Stock not available for Product: ${productId}. Available: ${totalAvailableQty}`);
    }

    let remainingQty = qty;

    for (const stock of stocks) {
      if (remainingQty <= 0) {
        break;
      }

      const availableQty = Number(stock.quantity_on_hand || 0) - Number(stock.reserved_quantity || 0);
      if (availableQty <= 0) {
        continue;
      }

      const reserveQty = Math.min(availableQty, remainingQty);
      await tx.stockitem.update({
        where: { stock_item_id: stock.stock_item_id },
        data: { reserved_quantity: { increment: reserveQty } }
      });

      remainingQty -= reserveQty;
    }

    return { product_id: productId, reserved_quantity: qty };
  }

  static async releaseReservedStock(tx: any, productId: string, qty: number, preferredWarehouseId?: number) {
    if (qty <= 0) {
      return;
    }

    const stocks = await tx.stockitem.findMany({
      where: {
        product_id: productId,
        reserved_quantity: { gt: 0 }
      },
      orderBy: { reserved_quantity: 'desc' }
    });

    const orderedStocks = preferredWarehouseId
      ? [
          ...stocks.filter((stock: any) => stock.warehouse_id === Number(preferredWarehouseId)),
          ...stocks.filter((stock: any) => stock.warehouse_id !== Number(preferredWarehouseId))
        ]
      : stocks;

    let remainingQty = qty;

    for (const stock of orderedStocks) {
      if (remainingQty <= 0) {
        break;
      }

      const reservedQty = Number(stock.reserved_quantity || 0);
      if (reservedQty <= 0) {
        continue;
      }

      const releaseQty = Math.min(reservedQty, remainingQty);
      await tx.stockitem.update({
        where: { stock_item_id: stock.stock_item_id },
        data: {
          reserved_quantity: { decrement: releaseQty }
        }
      });

      remainingQty -= releaseQty;
    }
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
            productprice: {
              where: { effective_to: null },
              orderBy: { effective_from: 'desc' }
            },
          },
        },
      },
      orderBy: {
        product: {
          name: 'asc'
        }
      }
    });
  }

  static async getCombinedStockSummary() {
    const stockItems = await prisma.stockitem.findMany({
      include: {
        product: {
          include: {
            uom: true,
            productprice: {
              where: { effective_to: null },
              orderBy: { effective_from: 'desc' }
            }
          }
        }
      },
      orderBy: {
        product: {
          name: 'asc'
        }
      }
    });

    const grouped = new Map<string, any>();

    for (const item of stockItems as any[]) {
      if (!grouped.has(item.product_id)) {
        grouped.set(item.product_id, {
          product_id: item.product_id,
          product_name: item.product?.name,
          product_code: item.product?.sku_code,
          uom: item.product?.uom?.name || 'N/A',
          on_hand: 0,
          reserved: 0,
          available: 0,
          unit_price: item.product?.productprice?.[0]?.unit_price || 0,
          currency: item.product?.productprice?.[0]?.currency || 'PKR'
        });
      }

      const summary = grouped.get(item.product_id);
      summary.on_hand += Number(item.quantity_on_hand || 0);
      summary.reserved += Number(item.reserved_quantity || 0);
      summary.available = summary.on_hand - summary.reserved;
    }

    return Array.from(grouped.values());
  }

  static async getStockAlerts() {
    const items = await prisma.stockitem.findMany({
      include: {
        product: { select: { name: true, sku_code: true } },
        warehouse: { select: { name: true } }
      }
    });

    const alerts: any[] = [];
    for (const item of items) {
      const onHand = Number(item.quantity_on_hand || 0);
      const min = item.reorder_point ? Number(item.reorder_point) : null;
      const max = item.max_quantity ? Number(item.max_quantity) : null;

      if (min !== null && onHand <= min) {
        alerts.push({
          type: 'LOW',
          stock_item_id: item.stock_item_id,
          product_name: item.product?.name,
          sku: item.product?.sku_code,
          warehouse: item.warehouse?.name,
          on_hand: onHand,
          min_qty: min,
          max_qty: max,
          message: `Low stock: ${item.product?.name} — ${onHand} left (min: ${min})`
        });
      } else if (max !== null && onHand >= max) {
        alerts.push({
          type: 'HIGH',
          stock_item_id: item.stock_item_id,
          product_name: item.product?.name,
          sku: item.product?.sku_code,
          warehouse: item.warehouse?.name,
          on_hand: onHand,
          min_qty: min,
          max_qty: max,
          message: `Excess stock: ${item.product?.name} — ${onHand} units (max: ${max})`
        });
      }
    }
    return alerts;
  }

  static async updateStockLimits(stockItemId: number, minQty: number | null, maxQty: number | null) {
    return prisma.stockitem.update({
      where: { stock_item_id: stockItemId },
      data: {
        reorder_point: minQty !== null ? minQty : undefined,
        max_quantity:  maxQty !== null ? maxQty : undefined
      }
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
