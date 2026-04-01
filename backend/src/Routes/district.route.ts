import { Router } from 'express';
import { getDistrictsByProvince, getAllDistricts } from '../controllers/district/district.controller.js';

const router = Router();

// GET /api/v1/district?provinceId=1  → districts for a specific province
router.get('/', getDistrictsByProvince);

// GET /api/v1/district/all  → all districts with province info
router.get('/all', getAllDistricts);

export default router;
