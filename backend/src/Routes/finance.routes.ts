// src/routes/finance.routes.ts
import { Router } from 'express';
import { postInvoice, postPayment , grnInvoice , getinvoice , getspecificinvoice , getpayments , getpurchaseinvoices, createpurchasepayment ,specificpurchaseinvoice , specificcustomerinvoice , getcustomerinvoices ,specificcustomerpayment, getLedger, getLedgerLines, getAccountBalances, getPaymentAllocations, getAccountsDashboard, getPartySummary, getPartyLedger } from '../controllers/paymentsandinvoicing/finance.controller.js';
import { TaxController } from '../controllers/tax/tax.controller.js';
const router = Router();

router.post('/invoices/generate/:deliveryId', postInvoice);
router.post('/payments/receive', postPayment);
router.get('/payments', getpayments);
router.post('/invoice/generate/:id', grnInvoice);
router.get('/getinvoice',getinvoice);
router.get('/specificinvoice/:id',getspecificinvoice);
router.get('/purchaselist',getpurchaseinvoices);
router.post('/payments/purchase',createpurchasepayment);
router.get('/purchase/specific/:id', specificpurchaseinvoice);
router.get('/sales/specific/:id',    specificcustomerinvoice);

router.get('/specificcustomerinvoice/:id', getcustomerinvoices);
router.get('/specificcustomerpayment/:id',specificcustomerpayment);
router.get('/taxes', TaxController.getTaxes);
router.post('/taxes', TaxController.createTax);
router.put('/taxes/:id', TaxController.updateTax);
router.delete('/taxes/:id', TaxController.deleteTax);

router.get('/ledger',              getLedger);
router.get('/ledger/:id',          getLedgerLines);
router.get('/account-balance',     getAccountBalances);
router.get('/payment-allocations', getPaymentAllocations);
router.get('/accounts-dashboard',  getAccountsDashboard);

// Party Ledgers
router.get('/parties/summary/:type',  getPartySummary);
router.get('/parties/ledger/:partyId', getPartyLedger);

export default router;

