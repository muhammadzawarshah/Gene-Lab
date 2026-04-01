import { prisma } from '../lib/prisma.js';

const batchInclude = {
  province: { select: { province_id: true, name: true } },
  batchitem: {
    include: {
      product: { select: { product_id: true, name: true, sku_code: true } }
    }
  }
};

export class BatchService {

  static async listBatches() {
    return await prisma.batch.findMany({
      include: batchInclude,
      orderBy: { batch_id: 'desc' }
    });
  }

  static async getBatchById(id: number) {
    return await prisma.batch.findUnique({
      where: { batch_id: id },
      include: batchInclude
    });
  }

  static async createBatch(data: {
    batch_number: string;
    manufacturing_date?: string;
    expiry_date?: string;
    status?: string;
    location_id?: number;
    items: { product_id: string; received_quantity: number; available_quantity: number }[];
  }) {
    return await prisma.batch.create({
      data: {
        batch_number: data.batch_number,
        manufacturing_date: data.manufacturing_date ? new Date(data.manufacturing_date) : null,
        expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
        status: data.status || 'ACTIVE',
        location_id: data.location_id ? Number(data.location_id) : null,
        batchitem: {
          create: data.items.map(i => ({
            product_id: i.product_id,
            received_quantity: Number(i.received_quantity),
            available_quantity: Number(i.available_quantity ?? i.received_quantity),
          }))
        }
      },
      include: batchInclude
    });
  }

  static async updateBatch(id: number, data: {
    batch_number?: string;
    manufacturing_date?: string;
    expiry_date?: string;
    status?: string;
    location_id?: number;
    items?: { product_id: string; received_quantity: number; available_quantity: number }[];
  }) {
    // Delete old items and recreate — simplest safe approach
    await prisma.batchitem.deleteMany({ where: { batch_id: id } });

    return await prisma.batch.update({
      where: { batch_id: id },
      data: {
        batch_number: data.batch_number,
        manufacturing_date: data.manufacturing_date ? new Date(data.manufacturing_date) : undefined,
        expiry_date: data.expiry_date ? new Date(data.expiry_date) : undefined,
        status: data.status,
        location_id: data.location_id ? Number(data.location_id) : undefined,
        batchitem: data.items ? {
          create: data.items.map(i => ({
            product_id: i.product_id,
            received_quantity: Number(i.received_quantity),
            available_quantity: Number(i.available_quantity ?? i.received_quantity),
          }))
        } : undefined
      },
      include: batchInclude
    });
  }

  static async deleteBatch(id: number) {
    // batchitems cascade-delete via schema
    return await prisma.batch.delete({ where: { batch_id: id } });
  }
}
