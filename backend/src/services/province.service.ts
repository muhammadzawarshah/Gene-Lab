import { prisma } from '../lib/prisma.js';

export class ProvinceService {
  // 1. Create Province
  static async createProvince(data: { id: number; name: string }) {
    return await prisma.province.create({
      data: {
        province_id: data.id,
        name: data.name
      }
    });
  }

  // 2. List All Provinces (Dropdowns ke liye zaroori hai)
  static async listProvinces() {
    return await prisma.province.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { warehouse: true } } // Ye bhi batayega kis province mein kitne warehouses hain
      }
    });
  }

  // 3. Delete Province
  static async deleteProvince(id: number) {
    // Check karein ke kahin ye province kisi warehouse se linked toh nahi
    const linkedWarehouses = await prisma.warehouse.count({ where: { location: id } });
    if (linkedWarehouses > 0) {
      throw new Error("CANNOT_DELETE: This province is linked to active warehouses.");
    }
    return await prisma.province.delete({ where: { province_id: id } });
  }
}