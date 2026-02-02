// src/routes/finance.routes.ts
import { Router } from 'express';
import { postInvoice, postPayment } from '../controllers/paymentsandinvoicing/finance.controller.js';

const router = Router();

router.post('/invoices/generate/:deliveryId', postInvoice);
router.post('/payments/receive', postPayment);

export default router;

