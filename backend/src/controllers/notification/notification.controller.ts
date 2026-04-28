import { Request, Response } from 'express';
import { NotificationService } from '../../services/notification.service.js';

export const getNotifications = async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 10;
    const data = await NotificationService.getNotifications(limit);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createNotification = async (req: Request, res: Response) => {
  try {
    const { message, type } = req.body;
    if (!message) return res.status(400).json({ success: false, message: 'Message required' });
    const data = await NotificationService.createNotification(message, type);
    res.status(201).json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const syncLowStock = async (req: Request, res: Response) => {
  try {
    const count = await NotificationService.syncLowStockNotifications();
    res.json({ success: true, newNotifications: count });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markRead = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data = await NotificationService.markRead(id);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const markAllRead = async (req: Request, res: Response) => {
  try {
    await NotificationService.markAllRead();
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const count = await NotificationService.getUnreadCount();
    res.json({ success: true, count });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
};
