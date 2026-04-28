import { Router } from 'express';
import { ERPController } from '../controllers/master.controller.js';

const router = Router();

// Master Endpoints
router.post('/product', ERPController.createProduct);
router.post('/party', ERPController.addParty);
router.get('/setup-data', ERPController.getDropdowns);

// UOM Routes
router.get('/uom', ERPController.getAllUOMs);
router.post('/uom', ERPController.createUOM);
router.put('/uom/:id', ERPController.updateUOM);
router.delete('/uom/:id', ERPController.deleteUOM);

// Mode Routes
router.get('/mode', ERPController.getAllModes);
router.post('/mode', ERPController.createMode);
router.put('/mode/:id', ERPController.updateMode);
router.delete('/mode/:id', ERPController.deleteMode);

// Transaction Endpoints
router.post('/purchase/order', ERPController.createPurchaseOrder);
router.get('/purchase/pick-grn/:id', ERPController.pickGRN);
router.post('/purchase/receive-stock', ERPController.receiveGoods);


router.get('/orders/:po_id/items', ERPController.getPOItems);


router.post('/receive-stock', ERPController.receiveGoods);


router.get('/orders/open', ERPController.getOpenPOs);


export default router;