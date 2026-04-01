import { Router } from 'express';
import { ProductPriceController } from '../controllers/productprice/productprice.controller.js';

const router = Router();

// GET all product prices
router.get('/', ProductPriceController.list);

// GET prices by product id
router.get('/product/:productId', ProductPriceController.listByProduct);

// GET active price by product_id + price_type (lookup)
router.get('/lookup', ProductPriceController.lookup);

// GET single price record
router.get('/:id', ProductPriceController.getOne);

// POST create new price
router.post('/', ProductPriceController.create);

// PUT update existing price
router.put('/:id', ProductPriceController.update);

// DELETE a price record
router.delete('/:id', ProductPriceController.remove);

export default router;
