// src/services/purchase.service.ts
import { prisma } from '../lib/prisma.js';


export class PurchaseService {
  static async createPO(data: any) {
    return await prisma.purchaseorder.create({
      data: {
        party_id_supplier: data.supplierId,
        order_date: new Date(),
        status: 'DRAFT',
        total_amount: data.totalAmount,
        purchaseorderline: {
          create: data.items.map((item: any) => ({
            product_id: item.productId,
            quantity: item.quantity,
            uom_id: item.uomId,
            unit_price: item.unitPrice,
            line_total: item.quantity * item.unitPrice
          }))
        }
      } as any
    });
  }

  static async purchaselist(){
  
      const po=await prisma.purchaseorder.findMany();
      const pol= await prisma.purchaseorderline.findMany();

      return {
        po,pol
      }
  }
}