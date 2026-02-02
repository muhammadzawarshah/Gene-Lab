import { prisma } from '../lib/prisma.js';

export class WarehouseService {
  // 1. Create: Naya Warehouse (Name, LocationID, Type)
static async createWarehouse(data: { name: string; locationId: number; type: string }) {
  // 1. Pehle sabse bari ID nikalein (Manual ID Management)
  const lastWarehouse = await prisma.warehouse.findFirst({
    orderBy: { warehouse_id: 'desc' },
    select: { warehouse_id: true }
  });

  const nextId = (lastWarehouse?.warehouse_id || 0) + 1;

  console.log(`Creating Warehouse: ${data.name} with ID: ${nextId}`);

  return await prisma.warehouse.create({
    data: {
      warehouse_id: nextId, // Hum ne manually ID manage kar li
      name: data.name,
      location: Number(data.locationId),
      type: data.type && data.type.trim() !== "" ? data.type : "GENERAL"
    }
  });
}

  // 2. Read: Saare Warehouses with Province Names
  static async listWarehouses() {
    return await prisma.warehouse.findMany({
      include: {
        province: true,
        _count: { select: { stockitem: true } }
      },
      orderBy: { warehouse_id: 'asc' }
    });
  }

  // 3. Update: Edit details
  static async updateWarehouse(id: number, data: { name?: string; locationId?: number; type?: string }) {
    // 1. Pehle check karein ke warehouse exist karta hai
    const existing = await prisma.warehouse.findUnique({
      where: { warehouse_id: id }
    });

    if (!existing) {
      throw new Error(`Warehouse with ID ${id} not found.`);
    }

    // 2. Data update karein
    return await prisma.warehouse.update({
      where: { warehouse_id: id },
      data: {
        name: data.name !== undefined ? data.name : existing.name,
        location: data.locationId !== undefined ? Number(data.locationId) : existing.location,
        type: data.type !== undefined ? data.type : existing.type
      }
    });
  }

  // 4. Delete: Safely remove warehouse
  static async deleteWarehouse(id: number) {
    // Check if stock exists
    const stock = await prisma.stockitem.count({ where: { warehouse_id: id } });
    if (stock > 0) throw new Error("WAREHOUSE_NOT_EMPTY");

    return await prisma.warehouse.delete({ where: { warehouse_id: id } });
  }
}