import { Router } from 'express';
import {
  getNotifications,
  createNotification,
  markRead,
  markAllRead,
  getUnreadCount,
  syncLowStock,
} from '../controllers/notification/notification.controller.js';

const router = Router();

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.post('/sync-low-stock', syncLowStock);
router.post('/', createNotification);
router.patch('/:id/read', markRead);
router.patch('/read-all', markAllRead);

export default router;
