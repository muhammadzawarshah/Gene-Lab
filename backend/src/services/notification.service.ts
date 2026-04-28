import { prisma } from '../lib/prisma.js';
import { ProductService } from './product.service.js';

export class NotificationService {
  // Last 10 notifications fetch karo
  static async getNotifications(limit = 10) {
    return prisma.notification.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  // System ko check karo aur low stock products ki notifications banao
  static async syncLowStockNotifications() {
    const lowStockProducts = await ProductService.getLowStockProducts();
    let newCount = 0;

    for (const product of lowStockProducts) {
      const message = `⚠️ ${product.name} (SKU: ${product.sku_code}) stock critical hai! (Current: ${product.current_stock}, Min: ${product.min_stock})`;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existing = await prisma.notification.findFirst({
        where: {
          message,
          created_at: { gte: today },
        },
      });

      if (!existing) {
        await prisma.notification.create({
          data: { message, type: 'LOW_STOCK' },
        });
        newCount++;
      }
    }
    return newCount;
  }

  // Nai notification save karo (duplicate check bhi)
  static async createNotification(message: string, type = 'LOW_STOCK') {
    // Aaj ke liye same message already exist karta hai to duplicate mat banao
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.notification.findFirst({
      where: {
        message,
        created_at: { gte: today },
      },
    });

    if (existing) return existing;

    return prisma.notification.create({
      data: { message, type },
    });
  }

  // Ek notification read mark karo
  static async markRead(id: number) {
    return prisma.notification.update({
      where: { id },
      data: { is_read: true },
    });
  }

  // Sab notifications read mark karo
  static async markAllRead() {
    return prisma.notification.updateMany({
      where: { is_read: false },
      data: { is_read: true },
    });
  }

  // Unread count
  static async getUnreadCount() {
    return prisma.notification.count({ where: { is_read: false } });
  }
}
