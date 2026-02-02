import { Router } from 'express';
import { UserController } from '../controllers/user/user.controller.js';

const router = Router();

router.post('/register', UserController.register);
router.post('/login', UserController.login);
router.get('/', UserController.listAll);
router.post('/:id',UserController.updatePartner);
router.get('/iduser/:id',UserController.getuser);
export default router;