import { Router } from 'express';
import { 
  createWarehouse, 
  getWarehouses, 
   deleteWarehouse,
  updateWarehouse 
} from "../controllers/warehouse/warehouse.controller.js"

const router = Router();


router.post('/create', createWarehouse);


router.get('/list', getWarehouses);


router.delete('/delete/:id', deleteWarehouse);


router.put('/update/:id', updateWarehouse);

export default router;