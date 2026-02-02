// src/services/report.service.ts
import { prisma } from '../lib/prisma.js';


export class ReportService {
  /**
   * Generates a real-time summary of stock across all warehouses
   */
  static async getStockSummary() {
    // Using Prisma's groupBy to aggregate current availability
    const stock = await prisma.stockitem.groupBy({
      by: ['product_id', 'warehouse_id'],
      _sum: {
        quantity_on_hand: true,
        reserved_quantity: true,
      },
    });

    return stock.map(item => ({
      productId: item.product_id,
      warehouseId: item.warehouse_id,
      availableQty: Number(item._sum.quantity_on_hand || 0) - Number(item._sum.reserved_quantity || 0),
      onHand: Number(item._sum.quantity_on_hand || 0)
    }));
  }

  /**
   * Fetches the Profit/Loss view by calculating (Sales - Tax)
   */
  static async getSalesReport(startDate: Date, endDate: Date) {
    return await prisma.customerinvoice.findMany({
      where: {
        cust_invoice_date: { gte: startDate, lte: endDate },
        status: 'PAID'
      },
      select: {
        cust_invoice_number: true,
        total_amount: true,
        cust_invoice_date: true,
        party: { select: { name: true } }
      }
    });
  }
}