import { Router } from 'express';
import { BatchController } from '../controllers/batch/batch.controller.js';

const router = Router();

// GET all batches
router.get('/', BatchController.list);

// GET single batch
router.get('/:id', BatchController.getOne);

// POST create batch
router.post('/', BatchController.create);

// PUT update batch
router.put('/:id', BatchController.update);

// DELETE batch
router.delete('/:id', BatchController.remove);

export default router;
