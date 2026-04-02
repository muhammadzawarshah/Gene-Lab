import {listgrn} from '../controllers/purchaseservice/RecievedGoods/receiveGoods.controller.js';
import { getSingleGRN } from '../controllers/purchaseservice/RecievedGoods/receiveGoods.controller.js'
import { Router } from 'express';


const router = Router();

router.get('/',listgrn);
router.get('/singlegrn/:id',getSingleGRN)

export default router;