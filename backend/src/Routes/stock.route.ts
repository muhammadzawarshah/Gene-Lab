// src/routes/stock.routes.ts
import { Router } from 'express';
import { StockController } from '../controllers/stocks/stock.controller.js';

const router = Router();

/**
 * @route   GET /api/v1/stock/warehouse/:warehouseId
 * @desc    Warehouse ki base par product stock, prices aur UOM details get karein
 * @access  Private (Authentication middleware yahan add kiya ja sakta hai)
 */
router.get(
  '/warehouse/:warehouseId', 
  StockController.getStockByWarehouse
);

/**
 * @route   POST /api/v1/stock/reserve
 * @desc    Order ke liye stock reserve karein (Transaction based)
 */
// router.post('/reserve', StockController.handleStockReservation);

/**
 * @route   GET /api/v1/stock/movements
 * @desc    Stock ki history/movements check karein
 */
// router.get('/movements', StockController.getStockMovements);


router.post(
  '/move', 
  StockController.stockTransfer
);
export default router;