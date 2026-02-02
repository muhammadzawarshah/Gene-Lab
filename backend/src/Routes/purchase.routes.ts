// src/routes/purchase.routes.ts
import { Router } from 'express';
import { receiveGoods } from '../controllers/purchaseservice/RecievedGoods/receiveGoods.controller.js';
import { listPurchase } from '../controllers/purchaseservice/purchaseservice/purchase.controller.js'

const router = Router();

router.post('/grn/receive', receiveGoods);
router.get('/listpo', listPurchase)

export default router;