import { Router } from 'express';
import { PartyController } from '../controllers/party/party.controller.js';

const router = Router();

router.post('/', PartyController.addParty);
router.get('/customers', PartyController.listCustomers);
router.get('/suppliers', PartyController.listSuppliers);

export default router;