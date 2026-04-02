import { Router } from 'express';
import { productcategorycontroller } from '../controllers/productcategory/productcategory.controller.js';

const router = Router();

router.post('/', productcategorycontroller.createcategory);
router.get('/', productcategorycontroller.listcategory);
router.get('/:id', productcategorycontroller.specificcategory);
router.put('/:id',productcategorycontroller.updatecategory);
router.delete('/:id',productcategorycontroller.deletecategory)

export default router;