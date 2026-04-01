import { Router } from 'express';
import { UserController } from '../controllers/user/user.controller.js';

const router = Router();

router.post('/register', UserController.register);
router.post('/login', UserController.login);
router.get('/', UserController.listAll);
router.get('/iduser/:id', UserController.getuser);
router.post('/profile/:id', UserController.updateProfile);
router.post('/changepassword/:id', UserController.changePassword);
router.post('/:id', UserController.updatePartner);
export default router;