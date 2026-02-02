import { Router } from 'express';
import { InventoryController } from '../controllers/inventory/inventory.controller.js';

const router = Router();

// Endpoint: GET /api/inventory/ledger
router.get('/ledger', InventoryController.getLedger);

// Endpoint: DELETE /api/inventory/ledger/delete/:id
router.delete('/ledger/delete/:id', InventoryController.deleteEntry);

export default router;