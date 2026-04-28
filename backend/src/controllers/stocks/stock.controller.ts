// src/controllers/stock.controller.ts
import { Request, Response } from 'express';
import { StockService } from '../../services/stock.service.js';
import { prisma } from '../../lib/prisma.js';

export class StockController {
  /**
   * GET /api/v1/stock/warehouse/:warehouseId
   * Warehouse ki base par stock, product details, price aur UOM get karne ke liye
   */
  static async getStockByWarehouse(req: Request, res: Response) {
    try {
      const { warehouseId } = req.params;

      if (!warehouseId || isNaN(Number(warehouseId))) {
        return res.status(400).json({
          success: false,
          message: "Valid Warehouse ID lazmi hai."
        });
      }

      const stockData = await StockService.getWarehouseStock(Number(warehouseId));

      if (!stockData || stockData.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Is warehouse mein koi stock nahi mila.",
          data: []
        });
      }

      const formattedStock = stockData.map((item: any) => ({
        stock_id: item.stock_item_id,
        product_id: item.product_id,
        warehouse_id: item.warehouse_id,
        product_name: item.product?.name,
        product_code: item.product?.sku_code,
        uom: item.product?.uom?.name || 'N/A',
        on_hand: Number(item.quantity_on_hand),
        reserved: Number(item.reserved_quantity),
        available: Number(item.quantity_on_hand) - Number(item.reserved_quantity),
        unit_price: item.product?.productprice?.[0]?.unit_price || 0,
        currency: item.product?.productprice?.[0]?.currency || 'PKR',
        min_qty: item.reorder_point !== null ? Number(item.reorder_point) : null,
        max_qty: item.max_quantity !== null ? Number(item.max_quantity) : null
      }));

      return res.status(200).json({
        success: true,
        count: formattedStock.length,
        data: formattedStock
      });
    } catch (error: any) {
      console.error("Stock Controller Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal Server Error: Stock fetch karne mein masla hua.",
        error: error.message
      });
    }
  }

  static async getCombinedStock(req: Request, res: Response) {
    try {
      const stockData = await StockService.getCombinedStockSummary();

      return res.status(200).json({
        success: true,
        count: stockData.length,
        data: stockData
      });
    } catch (error: any) {
      console.error("Combined Stock Controller Error:", error);
      return res.status(500).json({
        success: false,
        message: "Combined stock fetch karne mein masla hua.",
        error: error.message
      });
    }
  }

  static async getAlerts(req: Request, res: Response) {
    try {
      const alerts = await StockService.getStockAlerts();
      return res.status(200).json({ success: true, data: alerts });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async updateLimits(req: Request, res: Response) {
    try {
      const { stock_item_id } = req.params;
      const { min_qty, max_qty } = req.body;
      const result = await StockService.updateStockLimits(
        Number(stock_item_id),
        min_qty !== undefined ? Number(min_qty) : null,
        max_qty !== undefined ? Number(max_qty) : null
      );
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  }

  static async stockTransfer(req: Request, res: Response) {
    try {
      const { from_warehouse_id, to_warehouse_id, items } = req.body;

      if (!from_warehouse_id || !to_warehouse_id) {
        return res.status(400).json({
          success: false,
          message: 'Source and destination warehouses are required.'
        });
      }

      if (Number(from_warehouse_id) === Number(to_warehouse_id)) {
        return res.status(400).json({
          success: false,
          message: 'Source and destination warehouses must be different.'
        });
      }

      if (!Array.isArray(items) || !items.length) {
        return res.status(400).json({
          success: false,
          message: 'At least one transfer item is required.'
        });
      }

      const transaction = await prisma.$transaction(async (tx) => {
        const results = [];

        for (const item of items) {
          const transferQty = Number(item.quantity || 0);

          if (!item.product_id || transferQty <= 0) {
            throw new Error('Each transfer item must include a product and positive quantity.');
          }

          const sourceStock = await tx.stockitem.findUnique({
            where: {
              product_id_warehouse_id: {
                product_id: item.product_id,
                warehouse_id: Number(from_warehouse_id),
              },
            },
          });

          const availableQty = sourceStock
            ? Number(sourceStock.quantity_on_hand || 0) - Number(sourceStock.reserved_quantity || 0)
            : 0;

          if (!sourceStock || availableQty < transferQty) {
            throw new Error(`Insufficient stock for product ${item.product_id}. Available: ${availableQty}`);
          }

          const updatedSourceStock = await tx.stockitem.update({
            where: {
              product_id_warehouse_id: {
                product_id: item.product_id,
                warehouse_id: Number(from_warehouse_id),
              },
            },
            data: {
              quantity_on_hand: { decrement: transferQty },
            },
          });

          const destStock = await tx.stockitem.upsert({
            where: {
              product_id_warehouse_id: {
                product_id: item.product_id,
                warehouse_id: Number(to_warehouse_id),
              },
            },
            update: {
              quantity_on_hand: { increment: transferQty },
            },
            create: {
              product_id: item.product_id,
              warehouse_id: Number(to_warehouse_id),
              quantity_on_hand: transferQty,
              uom_id: item.uom_id || sourceStock.uom_id || 1,
            },
          });

          const movement = await tx.stockmovement.create({
            data: {
              mov_type: 'TRANSFER',
              product_id: item.product_id,
              warehouse_from_id: Number(from_warehouse_id),
              warehouse_to_id: Number(to_warehouse_id),
              quantity: transferQty,
              uom_id: item.uom_id || sourceStock.uom_id || 1,
              posted_at: new Date(),
            },
          });

          results.push({ movement, sourceStock: updatedSourceStock, destStock });
        }

        return results;
      });

      return res.status(200).json({
        success: true,
        message: "Stock successfully moved between warehouses.",
        data: transaction,
      });
    } catch (error: any) {
      console.error("Transfer Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Internal Server Error"
      });
    }
  }
}
