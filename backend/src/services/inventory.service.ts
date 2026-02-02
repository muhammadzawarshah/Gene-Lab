import { prisma } from '../lib/prisma.js';

export class InventoryService {
  
  static async getStockLedger() {
    const movements = await prisma.stockmovement.findMany({
      include: {
        product: { select: { name: true } },
        // Schema ke exact relation names use kiye hain yahan:
        warehouse_stockmovement_warehouse_from_idTowarehouse: { select: { name: true } },
        warehouse_stockmovement_warehouse_to_idTowarehouse: { select: { name: true } },
      },
      orderBy: { posted_at: 'desc' },
    });

    return movements.map((mov) => {
      // Logic: Agar warehouse_to_id hai, matlab stock aya hai (Inbound)
      const isInbound = !!mov.warehouse_to_id;
      
      return {
        id: `TXN-${mov.stock_mov_id}`,
        date: mov.posted_at ? new Date(mov.posted_at).toLocaleDateString('en-GB') : 'N/A',
        item: mov.product?.name || 'Unknown Item',
        // Warehouse ka naam pick karne ki logic
        warehouse: isInbound 
          ? mov.warehouse_stockmovement_warehouse_to_idTowarehouse?.name 
          : mov.warehouse_stockmovement_warehouse_from_idTowarehouse?.name || 'Central Store',
        qty: isInbound ? `+${mov.quantity}` : `-${mov.quantity}`,
        type: isInbound ? 'Inbound' : 'Outbound',
        status: 'Verified'
      };
    });
  }

  // 2. Existing Adjust Stock Logic
  static async adjustStock(data: any) {
    return await prisma.$transaction(async (tx) => {
      const currentStock = await tx.stockitem.findUnique({
        where: { product_id_warehouse_id: { product_id: data.productId, warehouse_id: data.warehouseId } }
      });

      if (!currentStock) throw new Error("Stock record not found");

      const movement = await tx.stockmovement.create({
        data: {
          mov_type: 'ADJUSTMENT',
          product_id: data.productId,
          warehouse_to_id: data.qty > 0 ? data.warehouseId : null,
          warehouse_from_id: data.qty < 0 ? data.warehouseId : null,
          quantity: Math.abs(data.qty),
          uom_id: data.uomId,
          posted_at: new Date(),
        }
      });

      await tx.stockitem.update({
        where: { product_id_warehouse_id: { product_id: data.productId, warehouse_id: data.warehouseId } },
        data: { quantity_on_hand: { increment: data.qty } }
      });

      return { success: true, movementId: movement.stock_mov_id };
    });
  }
}