import { Router } from 'express';
import { createSalesOrder } from '../controllers/sales/sales.controller.js';
import { postDelivery } from '../controllers/deliverycontroller/delivery.controller.js';
import { listDelivery } from '../controllers/deliverycontroller/delivery.controller.js';
import { listsales } from '../controllers/sales/sales.controller.js';
import { listcustsales } from '../controllers/sales/sales.controller.js';
import { createCusOrder } from '../controllers/sales/sales.controller.js';
import { getDashboardStats } from '../controllers/sales/sales.controller.js';
import { getFinancialLedger } from '../controllers/sales/sales.controller.js';
import { getBillingSyncStatus } from '../controllers/sales/sales.controller.js';
import { updateSalesOrder } from '../controllers/sales/sales.controller.js';
import { specificsales } from '../controllers/sales/sales.controller.js';
import { updateDelivery } from '../controllers/deliverycontroller/delivery.controller.js';
import { getspecificDelivery } from '../controllers/deliverycontroller/delivery.controller.js';
const router = Router();

router.post('/sales-orders', createSalesOrder);
router.post('/custsales-order',createCusOrder)
router.post('/deliveries/:soId', postDelivery);
router.get('/listdel', listDelivery );
router.get('/listdel', listDelivery );
router.get('/listsale',listsales);
router.get('/listcust-sale/:id',listcustsales);
router.post('/updatedel', updateDelivery);
router.get('/specificdel/:id',getspecificDelivery);
router.get('/dashboard-stats/:id', getDashboardStats);
router.get('/financial-ledger/:id', getFinancialLedger);
router.get('/billing-sync/:id', getBillingSyncStatus);
router.put('/sales/:id', updateSalesOrder);
router.get('/sales/:id',specificsales);


export default router;