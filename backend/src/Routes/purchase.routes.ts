// src/routes/purchase.routes.ts
import { Router } from 'express';
import { receiveGoods } from '../controllers/purchaseservice/RecievedGoods/receiveGoods.controller.js';
import { listPurchase } from '../controllers/purchaseservice/purchaseservice/purchase.controller.js'
import { purchaseorderlistonpoid } from '../controllers/purchaseservice/purchaseservice/purchase.controller.js'
import { updatepurchasepo } from '../controllers/purchaseservice/purchaseservice/purchase.controller.js'
const router = Router();

router.post('/grn/receive', receiveGoods);
router.get('/listpo', listPurchase)
router.put('/updatepo/:id',updatepurchasepo);
router.get('/order/:poId/items',purchaseorderlistonpoid)

export default router;