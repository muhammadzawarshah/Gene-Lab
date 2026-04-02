import { prisma } from '../lib/prisma.js';

export class DistrictService {
  static async getByProvince(provinceId: number) {
    return await prisma.district.findMany({
      where: { province_id: provinceId },
      orderBy: { name: 'asc' },
      select: { district_id: true, name: true },
    });
  }

  static async listAll() {
    return await prisma.district.findMany({
      orderBy: { name: 'asc' },
      include: { province: { select: { name: true } } },
    });
  }
}
