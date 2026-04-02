// src/services/purchase.service.ts
import { prisma } from '../lib/prisma.js';
import { ProductPriceService } from './productprice.service.js';


export class PurchaseService {
  static async createPO(data: any) {
    // Validate effective dates for items that have price_type
    if (data.items && Array.isArray(data.items)) {
      for (const item of data.items) {
        if (item.price_type && item.product_id) {
          // This will throw if price is expired or not found
          await ProductPriceService.getActivePrice(item.product_id, item.price_type);
        }
      }
    }

    return await prisma.purchaseorder.create({
      data: {
        party_id_supplier: data.supplierId,
        order_date: new Date(),
        status: 'DRAFT',
        total_amount: data.totalAmount,
        purchaseorderline: {
          create: data.items.map((item: any) => ({
            product_id: item.productId || item.product_id,
            quantity: item.quantity || item.total_unit,
            uom_id: item.uomId || item.uom_id || 1,
            unit_price: item.unitPrice || item.approved_rate,
            line_total: (item.quantity || item.total_unit) * (item.unitPrice || item.approved_rate)
          }))
        }
      } as any
    });
  }

  static async purchaselist() {

    const po = await prisma.purchaseorder.findMany({
      include: {
        party: { // 'supplier' ki jagah 'party' use karein
          select: {
            name: true // Check karein ke aapke table mein field 'name' hai ya 'party_name'
          }
        }
      }
    });
    const pol = await prisma.purchaseorderline.findMany();

    return {
      po, pol
    }
  }

  static async purchaseonpoid(id: string) {
    const po = await prisma.purchaseorder.findUnique({
      where: {
        po_id: Number(id) as any
      }
    })

    const pol = await prisma.purchaseorderline.findMany({
      where: {
        po_id: Number(id) as any
      },
      include: {
        product: true
      }
    })
    return {
      po, pol
    }
  }

  static async updatePO(poId: number, data: any) {
    return await prisma.$transaction(async (tx) => {

      // 1. Check if PO exists
      const existingPO = await tx.purchaseorder.findUnique({
        where: { po_id: Number(poId) },
        include: { purchaseorderline: true }
      });

      if (!existingPO) {
        throw new Error("Purchase Order not found");
      }

      // 2. Update Main Purchase Order
      await tx.purchaseorder.update({
        where: { po_id: Number(poId) },
        data: {
          status: data.status ?? existingPO.status,
          // Frontend se financials.netTotal use ho raha hai
          total_amount: data.financials?.netTotal ?? existingPO.total_amount
        }
      });

      // --- LOGIC CHECK: Agr items hain to process karo, nahi to skip ---
      if (data.items && Array.isArray(data.items) && data.items.length > 0) {

        for (const item of data.items) {
          // Matching using product_id from your JSON
          const existingLine = existingPO.purchaseorderline.find(
            (l) => l.product_id === item.product_id
          );

          const newQty = parseFloat(item.total_unit || 0);
          const newPrice = parseFloat(item.approved_rate || 0);
          const lineTotal = newQty * newPrice;

          if (existingLine) {
            // Update existing line
            await tx.purchaseorderline.update({
              where: { po_line_id: existingLine.po_line_id },
              data: {
                quantity: newQty,
                unit_price: newPrice,
                line_total: lineTotal
              }
            });
          } else {
            // Create new line if not exists
            await tx.purchaseorderline.create({
              data: {
                po_id: Number(poId),
                product_id: item.product_id,
                quantity: newQty,
                uom_id: Number(item.uom_id) || 1,
                unit_price: newPrice,
                line_total: lineTotal
              }
            });
          }
        }
      }
      // Agar items nahi hain to code yahan se seedha skip ho kar niche chala jayega

      return { success: true, message: "PO updated successfully" };
    });
  }

}