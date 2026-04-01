import { Router } from 'express';
import { ProductController } from '../controllers/product/product.controller.js';

const router = Router();


router.post('/', ProductController.create);

router.get('/', ProductController.list);

router.get('/expired-report', ProductController.getExpiredReport);

router.get('/category/:id', ProductController.getproductoncategory);

router.get('/:id', ProductController.getOne);

router.put('/:id', ProductController.update);

router.delete('/:id', ProductController.delete);

export default router;