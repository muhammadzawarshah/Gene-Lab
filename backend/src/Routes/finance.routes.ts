// src/routes/finance.routes.ts
import { Router } from 'express';
import { postInvoice, postPayment , grnInvoice , getinvoice , getspecificinvoice , getpayments , getpurchaseinvoices, createpurchasepayment ,specificpurchaseinvoice , specificcustomerinvoice ,specificcustomerpayment } from '../controllers/paymentsandinvoicing/finance.controller.js';

const router = Router();

router.post('/invoices/generate/:deliveryId', postInvoice);
router.post('/payments/receive', postPayment);
router.get('/payments', getpayments);
router.post('/invoice/generate/:id', grnInvoice);
router.get('/getinvoice',getinvoice);
router.get('/specificinvoice/:id',getspecificinvoice);
router.get('/purchaselist',getpurchaseinvoices);
router.post('/payments/purchase',createpurchasepayment);
router.get('/specificinvoice/:id',specificpurchaseinvoice);
router.get('/specificcustomerinvoice/:id',specificcustomerinvoice);
router.get('/specificcustomerpayment/:id',specificcustomerpayment);

export default router;

