import { Router } from 'express';
import { addProvince, getProvinces } from '../controllers/province/province.controller.js';

const router = Router();

router.post('/add', addProvince);
router.get('/all', getProvinces);

export default router;