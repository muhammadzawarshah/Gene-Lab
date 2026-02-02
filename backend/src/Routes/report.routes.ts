// src/routes/report.routes.ts
import { Router } from 'express';
import { ReportController } from '../controllers/report/report.controller.js';

const router = Router();

// Flow E: Analytics & Summaries
router.get('/inventory-summary', ReportController.getInventoryDashboard);
router.get('/financial-performance', ReportController.getFinancialReport);

export default router;